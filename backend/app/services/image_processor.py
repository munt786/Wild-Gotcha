import base64
import logging
from typing import Tuple
import cv2
import numpy as np
from fastapi import HTTPException, status
from app.core.config import settings

logger = logging.getLogger(__name__)


class ImageProcessor:
    """
    OpenCV-based image processing & animal localization pipeline:
    1. Validates byte payload and decodes image format
    2. Validates image dimensions and channels
    3. Detects salient animal/object subject and crops tightly around it
    4. Resizes to canonical 224x224 input tensor size
    5. Converts color space (BGR -> RGB)
    6. Normalizes pixel values using ImageNet mean & std for MobileNetV2
    7. Generates a compressed base64 thumbnail of the cropped creature for MongoDB Dex storage
    """

    def __init__(self, target_size: int = settings.INPUT_IMAGE_SIZE):
        self.target_size = target_size

    def isolate_foreground_and_crop(self, cv_image: np.ndarray) -> Tuple[np.ndarray, np.ndarray, float]:
        """
        Removes background clutter and isolates the foreground creature/subject using GrabCut
        and edge-contour localization.
        
        Returns:
            - isolated_bgr: Creature foreground with background neutralized (for AI classifier)
            - cropped_bgr: Tightly cropped bounding box around the creature
            - fg_ratio: Percentage of frame occupied by the subject
        """
        height, width = cv_image.shape[:2]
        try:
            # 1. Downscale large images for high-speed segmentation (< 0.8s)
            scale = min(1.0, 360.0 / max(height, width))
            sw = max(32, int(width * scale))
            sh = max(32, int(height * scale))
            small = cv2.resize(cv_image, (sw, sh), interpolation=cv2.INTER_AREA)

            # 2. Estimate subject bounding box using bilateral filtering & Canny contours
            gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
            filtered = cv2.bilateralFilter(gray, 7, 50, 50)
            edges = cv2.Canny(filtered, 30, 120)
            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
            dilated = cv2.dilate(edges, kernel, iterations=2)
            contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

            total_area = sh * sw
            best_rect = None
            if contours:
                valid_cnts = [c for c in contours if 0.03 * total_area < cv2.contourArea(c) < 0.95 * total_area]
                if valid_cnts:
                    valid_cnts.sort(key=cv2.contourArea, reverse=True)
                    bx, by, bw, bh = cv2.boundingRect(valid_cnts[0])
                    # Add 8% contextual margin
                    px, py = int(bw * 0.08), int(bh * 0.08)
                    x1 = max(1, bx - px)
                    y1 = max(1, by - py)
                    x2 = min(sw - 2, bx + bw + px)
                    y2 = min(sh - 2, by + bh + py)
                    best_rect = (x1, y1, x2 - x1, y2 - y1)

            if not best_rect or best_rect[2] < 15 or best_rect[3] < 15:
                # Viewfinder center 84% region
                best_rect = (int(sw * 0.08), int(sh * 0.08), int(sw * 0.84), int(sh * 0.84))

            # 3. Fast GrabCut Foreground/Background Segmentation (2 iterations)
            mask = np.zeros((sh, sw), np.uint8)
            bgdModel = np.zeros((1, 65), np.float64)
            fgdModel = np.zeros((1, 65), np.float64)
            cv2.grabCut(small, mask, best_rect, bgdModel, fgdModel, 2, cv2.GC_INIT_WITH_RECT)

            # Foreground mask: Definite FG (1) or Probable FG (3)
            fg_mask_small = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 1, 0).astype('uint8')

            # Upscale mask back to original resolution
            fg_mask = cv2.resize(fg_mask_small, (width, height), interpolation=cv2.INTER_NEAREST)

            # 4. Smooth mask edges for natural transition
            fg_mask_blur = cv2.GaussianBlur(fg_mask.astype(np.float32), (7, 7), 0)
            alpha = np.expand_dims(fg_mask_blur, axis=2)

            # 5. Composite foreground with neutral studio background (gray 128)
            # This completely removes distracting background clutter (sofa, walls, floor, grass clutter)
            neutral_bg = np.full_like(cv_image, 128)
            isolated_bgr = (cv_image.astype(np.float32) * alpha + neutral_bg.astype(np.float32) * (1.0 - alpha)).astype(np.uint8)

            # 6. Calculate bounding box of the segmented foreground creature
            ys, xs = np.where(fg_mask > 0)
            if len(ys) > 0 and len(xs) > 0:
                min_y, max_y = max(0, int(np.min(ys))), min(height, int(np.max(ys)) + 1)
                min_x, max_x = max(0, int(np.min(xs))), min(width, int(np.max(xs)) + 1)
                
                # Add 10% breathing room
                pad_y = int((max_y - min_y) * 0.10)
                pad_x = int((max_x - min_x) * 0.10)
                y1 = max(0, min_y - pad_y)
                y2 = min(height, max_y + pad_y)
                x1 = max(0, min_x - pad_x)
                x2 = min(width, max_x + pad_x)

                cropped_bgr = isolated_bgr[y1:y2, x1:x2]
                fg_ratio = float(len(ys) / (height * width))
                logger.info("Background removed! Subject isolated: %dx%d (FG ratio: %.2f)", x2 - x1, y2 - y1, fg_ratio)
                return isolated_bgr, cropped_bgr, fg_ratio

        except Exception as e:
            logger.warning("Background removal fallback to center crop: %s", str(e))

        # Safe fallback: Central 82% crop
        crop_size = int(min(height, width) * 0.82)
        start_y = max(0, (height - crop_size) // 2)
        start_x = max(0, (width - crop_size) // 2)
        center_crop = cv_image[start_y : start_y + crop_size, start_x : start_x + crop_size]
        return cv_image, center_crop, 0.50

    def _bgr_to_tensor(self, cv_bgr: np.ndarray) -> np.ndarray:
        """Converts an OpenCV BGR image into normalized NCHW tensor (1, 3, 224, 224)."""
        ch, cw = cv_bgr.shape[:2]
        interpolation = cv2.INTER_AREA if (cw > self.target_size and ch > self.target_size) else cv2.INTER_LINEAR
        resized_bgr = cv2.resize(cv_bgr, (self.target_size, self.target_size), interpolation=interpolation)

        # Convert BGR -> RGB
        rgb_image = cv2.cvtColor(resized_bgr, cv2.COLOR_BGR2RGB)

        # Normalize with ImageNet standard mean & std for MobileNetV2
        float_image = rgb_image.astype(np.float32) / 255.0
        mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
        normalized = (float_image - mean) / std

        # Transpose to NCHW format: (1, 3, 224, 224)
        chw_tensor = np.transpose(normalized, (2, 0, 1))
        return np.expand_dims(chw_tensor, axis=0)

    def validate_and_preprocess(self, image_bytes: bytes) -> Tuple[np.ndarray, np.ndarray, str]:
        """
        Executes complete OpenCV pipeline on raw uploaded image bytes.

        Returns:
            Tuple of:
              - subject_tensor: np.ndarray of shape (1, 3, 224, 224) (tightly cropped to creature)
              - full_tensor: np.ndarray of shape (1, 3, 224, 224) (balanced whole frame)
              - thumbnail_base64: str of JPEG compressed thumbnail data URI
        """
        if not image_bytes or len(image_bytes) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Empty image payload received. Please provide a valid picture.",
            )

        # 1. Decode raw bytes into OpenCV BGR numpy array
        try:
            np_buffer = np.frombuffer(image_bytes, dtype=np.uint8)
            cv_image = cv2.imdecode(np_buffer, cv2.IMREAD_COLOR)
        except Exception as e:
            logger.error("Failed to decode image buffer: %s", str(e))
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Corrupted or invalid image data: {str(e)}",
            )

        if cv_image is None or cv_image.size == 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Could not decode image. Ensure file is a valid JPG, PNG, or WEBP.",
            )

        # 2. Check image dimensions
        height, width = cv_image.shape[:2]
        if height < 32 or width < 32:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Image resolution too small ({width}x{height}). Minimum required is 32x32.",
            )

        # 3. Remove background and isolate creature foreground
        isolated_bgr, cropped_subject_bgr, fg_ratio = self.isolate_foreground_and_crop(cv_image)

        # 4. Generate clean thumbnail of the isolated creature for Dex storage
        thumbnail_base64 = self._generate_thumbnail_base64(cropped_subject_bgr)

        # 5. Build tensors: isolated creature crop + neutralized full view
        subject_tensor = self._bgr_to_tensor(cropped_subject_bgr)
        full_tensor = self._bgr_to_tensor(isolated_bgr)

        return subject_tensor, full_tensor, thumbnail_base64

    def _generate_thumbnail_base64(self, cv_bgr_img: np.ndarray, max_dim: int = 150) -> str:
        """Compresses down to a compact JPEG data URI for MongoDB storage."""
        try:
            h, w = cv_bgr_img.shape[:2]
            scale = max_dim / max(h, w)
            new_w, new_h = max(1, int(w * scale)), max(1, int(h * scale))
            thumb = cv2.resize(cv_bgr_img, (new_w, new_h), interpolation=cv2.INTER_AREA)

            encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), 70]
            success, encoded_img = cv2.imencode(".jpg", thumb, encode_param)
            if success:
                b64_str = base64.b64encode(encoded_img.tobytes()).decode("utf-8")
                return f"data:image/jpeg;base64,{b64_str}"
        except Exception as e:
            logger.warning("Failed to generate thumbnail: %s", str(e))
        return ""


image_processor = ImageProcessor()

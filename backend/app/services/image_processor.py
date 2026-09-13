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
    OpenCV-based image processing pipeline:
    1. Validates byte payload and decodes image format
    2. Validates image dimensions and channels
    3. Resizes to canonical 224x224 input tensor size
    4. Converts color space (BGR -> RGB)
    5. Normalizes pixel values into [-1.0, 1.0] expected by MobileNetV2
    6. Generates a compressed base64 thumbnail for MongoDB Dex storage
    """

    def __init__(self, target_size: int = settings.INPUT_IMAGE_SIZE):
        self.target_size = target_size

    def validate_and_preprocess(self, image_bytes: bytes) -> Tuple[np.ndarray, str]:
        """
        Executes complete OpenCV pipeline on raw uploaded image bytes.

        Returns:
            Tuple of:
              - preprocessed_tensor: np.ndarray of shape (1, target_size, target_size, 3)
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

        # 3. Viewfinder ROI Crop: Isolate the animal in the center viewfinder frame
        # Removes background noise and maximizes pixels focused on the animal specimen
        crop_size = int(min(height, width) * 0.78)
        start_y = max(0, (height - crop_size) // 2)
        start_x = max(0, (width - crop_size) // 2)
        cropped_animal_bgr = cv_image[start_y : start_y + crop_size, start_x : start_x + crop_size]

        if cropped_animal_bgr.size == 0:
            cropped_animal_bgr = cv_image

        # 4. Generate small base64 thumbnail of the cropped animal for Dex history
        thumbnail_base64 = self._generate_thumbnail_base64(cropped_animal_bgr)

        # 5. Resize cropped animal to target tensor dimension (224x224)
        ch, cw = cropped_animal_bgr.shape[:2]
        interpolation = cv2.INTER_AREA if (cw > self.target_size and ch > self.target_size) else cv2.INTER_LINEAR
        resized_bgr = cv2.resize(cropped_animal_bgr, (self.target_size, self.target_size), interpolation=interpolation)

        # 5. Convert Color Space: OpenCV BGR -> Standard RGB
        rgb_image = cv2.cvtColor(resized_bgr, cv2.COLOR_BGR2RGB)

        # 6. Normalize with ImageNet standard mean and std for MobileNetV2
        float_image = rgb_image.astype(np.float32) / 255.0
        mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
        normalized = (float_image - mean) / std

        # 7. Transpose to NCHW format: (1, 3, 224, 224) for ONNX Runtime
        chw_tensor = np.transpose(normalized, (2, 0, 1))
        batched_tensor = np.expand_dims(chw_tensor, axis=0)

        logger.debug("Preprocessed tensor shape: %s, dtype: %s", batched_tensor.shape, batched_tensor.dtype)
        return batched_tensor, thumbnail_base64

    def _generate_thumbnail_base64(self, cv_bgr_img: np.ndarray, max_dim: int = 150) -> str:
        """Compresses down to a compact JPEG data URI for MongoDB storage."""
        try:
            h, w = cv_bgr_img.shape[:2]
            scale = max_dim / max(h, w)
            new_w, new_h = max(1, int(w * scale)), max(1, int(h * scale))
            thumb = cv2.resize(cv_bgr_img, (new_w, new_h), interpolation=cv2.INTER_AREA)

            encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), 65]
            success, encoded_img = cv2.imencode(".jpg", thumb, encode_param)
            if success:
                b64_str = base64.b64encode(encoded_img.tobytes()).decode("utf-8")
                return f"data:image/jpeg;base64,{b64_str}"
        except Exception as e:
            logger.warning("Failed to generate thumbnail: %s", str(e))
        return ""


image_processor = ImageProcessor()

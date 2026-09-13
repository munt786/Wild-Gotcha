import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { SwitchCamera } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const VIEWFINDER_SIZE = Math.min(width * 0.70, 280);

export interface ScannerViewHandle {
  takePicture: () => void;
  pickFromGallery: () => void;
}

interface ScannerViewProps {
  onCapture: (imageUri: string) => void;
  isAnalyzing: boolean;
}

export const ScannerView = forwardRef<ScannerViewHandle, ScannerViewProps>(
  ({ onCapture, isAnalyzing }, ref) => {
    const [permission, requestPermission] = useCameraPermissions();
    const [cameraRef, setCameraRef] = useState<any>(null);

    // Hardware camera configuration & detection
    const [cameraFacing, setCameraFacing] = useState<'back' | 'front'>('back');
    const [isMirrored, setIsMirrored] = useState<boolean>(true); // Mirrored for front camera / webcam
    const [bestPictureSize, setBestPictureSize] = useState<string | undefined>(undefined);
    const [cameraInfo, setCameraInfo] = useState<string>('Best Sensor • 4K AF');
    const [maxHardwareZoom, setMaxHardwareZoom] = useState<number>(100);
    const [zoomLadder, setZoomLadder] = useState<number[]>([1, 2, 5, 10, 30, 100]);

    // Active zoom & flash mode
    const [flashMode, setFlashMode] = useState<'off' | 'on'>('off');
    const [selectedZoom, setSelectedZoom] = useState<number>(1);
    const [zoomLevel, setZoomLevel] = useState<number>(0); // 0.0 to 1.0 for CameraView

    // Helper to find active DOM video track in Web browsers
    const getActiveVideoTrack = (): MediaStreamTrack | null => {
      if (Platform.OS !== 'web' || typeof document === 'undefined') return null;
      try {
        const videoElements = document.querySelectorAll('video');
        for (let i = 0; i < videoElements.length; i++) {
          const v = videoElements[i] as HTMLVideoElement;
          if (v && v.srcObject && (v.srcObject as MediaStream).getVideoTracks) {
            const tracks = (v.srcObject as MediaStream).getVideoTracks();
            if (tracks.length > 0) return tracks[0];
          }
        }
      } catch (e) {
        console.log('Error querying video tracks:', e);
      }
      return null;
    };

    // Apply horizontal mirror (scaleX -1) and zoom scale to live video elements strictly contained
    const applyVideoTransform = (mirror: boolean, zoomMultiplier: number) => {
      if (Platform.OS !== 'web' || typeof document === 'undefined') return;
      try {
        const videoElements = document.querySelectorAll('video');
        videoElements.forEach((v) => {
          // Lock video strictly to its parent container so zooming NEVER expands the page
          v.style.position = 'absolute';
          v.style.top = '0';
          v.style.left = '0';
          v.style.width = '100%';
          v.style.height = '100%';
          v.style.objectFit = 'cover';

          const mirrorFactor = mirror ? -1 : 1;
          const zoomScale = zoomMultiplier > 1 ? Math.min(2.2, 1 + (zoomMultiplier - 1) * 0.15) : 1;
          v.style.transform = `scaleX(${mirrorFactor}) scale(${zoomScale})`;
          v.style.transformOrigin = 'center center';
          v.style.transition = 'transform 0.20s ease-out';
        });
      } catch (e) {
        console.log('Video transform note:', e);
      }
    };

    // Dynamic Zoom Ladder Builder based on detected device hardware
    const buildZoomLadder = (max: number): number[] => {
      if (max >= 100) return [1, 2, 5, 10, 30, 100];
      if (max >= 50) return [1, 2, 5, 10, 25, 50];
      if (max >= 30) return [1, 2, 5, 10, 20, 30];
      if (max >= 15) return [1, 2, 3, 5, 10, 15];
      if (max >= 10) return [1, 2, 3, 5, 10];
      if (max >= 5) return [1, 2, 3, 5];
      return [1, 2, 3];
    };

    // 1. Detect device camera sensor, front/webcam mirror & zoom capabilities
    useEffect(() => {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
        const probeHardware = () => {
          const track = getActiveVideoTrack();
          if (track) {
            const capabilities = (track as any).getCapabilities ? (track as any).getCapabilities() : {};
            const settings = track.getSettings ? track.getSettings() : {};
            const label = (track.label || '').toLowerCase();

            // Detect if front camera / webcam: Auto-enable mirror so left movement = left screen!
            const isFront =
              settings.facingMode === 'user' ||
              label.includes('front') ||
              label.includes('integrated') ||
              label.includes('facetime') ||
              label.includes('webcam') ||
              label.includes('user') ||
              label.includes('camera2 1');

            const shouldMirror = isFront || cameraFacing === 'front';
            setIsMirrored(shouldMirror);
            setCameraFacing(isFront ? 'front' : 'back');
            applyVideoTransform(shouldMirror, selectedZoom);

            // Check if device supports hardware zoom
            let detectedMax = 100;
            if (capabilities.zoom && typeof capabilities.zoom.max === 'number') {
              detectedMax = Math.round(capabilities.zoom.max);
              setMaxHardwareZoom(detectedMax);
            }

            const ladder = buildZoomLadder(detectedMax);
            setZoomLadder(ladder);

            // Update sensor resolution label
            const w = settings.width || 1920;
            const h = settings.height || 1080;
            const mp = ((w * h) / 1000000).toFixed(1);
            setCameraInfo(isFront ? `${mp}MP Front • Natural Mirror` : `${mp}MP 4K • Autofocus`);
          } else {
            // Default webcam on desktop: Mirror on so movements match intuition!
            setIsMirrored(true);
            applyVideoTransform(true, selectedZoom);
          }
        };

        const timer1 = setTimeout(probeHardware, 400);
        const timer2 = setTimeout(probeHardware, 1200);
        return () => {
          clearTimeout(timer1);
          clearTimeout(timer2);
        };
      }
    }, [permission?.granted, cameraFacing]);

    // 2. Native Expo Camera Ready: Query Maximum Resolution on Physical Device
    const handleCameraReady = async () => {
      if (cameraRef && typeof cameraRef.getAvailablePictureSizesAsync === 'function') {
        try {
          const sizes: string[] = await cameraRef.getAvailablePictureSizesAsync();
          if (sizes && sizes.length > 0) {
            const sorted = [...sizes].sort((a, b) => {
              const [w1, h1] = a.split('x').map(Number);
              const [w2, h2] = b.split('x').map(Number);
              return (w2 * h2) - (w1 * h1);
            });

            const maxResolution = sorted[0];
            setBestPictureSize(maxResolution);

            const [w, h] = maxResolution.split('x').map(Number);
            const megapixels = ((w * h) / 1000000).toFixed(1);
            setCameraInfo(`${megapixels}MP Sensor • Continuous AF`);
          }
        } catch (e) {
          console.log('Native camera sizes query:', e);
        }
      }
    };

    // Toggle camera front/back facing and mirroring
    const toggleCameraFacing = () => {
      const nextFacing = cameraFacing === 'back' ? 'front' : 'back';
      const nextMirrored = nextFacing === 'front';
      setCameraFacing(nextFacing);
      setIsMirrored(nextMirrored);
      applyVideoTransform(nextMirrored, selectedZoom);
      setCameraInfo(nextFacing === 'front' ? 'Front Camera • Mirrored' : 'Rear Camera • Active');
    };

    // Apply zoom seamlessly across both Native CameraView and WebRTC VideoTrack
    const applyZoom = (multiplier: number) => {
      setSelectedZoom(multiplier);

      // 1. Normalize zoom between 0.0 and 1.0 for expo-camera CameraView
      const normalized = Math.min(1.0, Math.max(0.0, (multiplier - 1) / (maxHardwareZoom - 1)));
      setZoomLevel(normalized);

      // 2. Direct hardware zoom constraint or viewport scale on Web
      if (Platform.OS === 'web') {
        try {
          const track = getActiveVideoTrack();
          let hardwareApplied = false;

          if (track && (track as any).getCapabilities) {
            const capabilities = (track as any).getCapabilities();
            if (capabilities.zoom) {
              const minZ = capabilities.zoom.min || 1;
              const maxZ = capabilities.zoom.max || maxHardwareZoom;
              const hardwareZoom = Math.min(maxZ, Math.max(minZ, multiplier));
              track.applyConstraints({
                advanced: [{ zoom: hardwareZoom } as any],
              });
              hardwareApplied = true;
            }
          }

          // Apply video transformation preserving mirror state
          applyVideoTransform(isMirrored, multiplier);
        } catch (e) {
          console.log('Hardware zoom apply note:', e);
        }
      }
    };

    const toggleFlash = () => {
      setFlashMode((prev) => (prev === 'off' ? 'on' : 'off'));
    };

    const handleCapture = async () => {
      if (cameraRef && !isAnalyzing) {
        try {
          const photo = await cameraRef.takePictureAsync({
            quality: 1.0, // Best possible resolution & sharpness (100% uncompressed)
            skipProcessing: false, // Ensures hardware ISP sharpening, denoising & clarity
            shutterSound: false,
          });
          if (photo && photo.uri) {
            onCapture(photo.uri);
          }
        } catch (err: any) {
          Alert.alert('Camera Error', err.message || 'Failed to capture photo.');
        }
      } else if (!permission?.granted) {
        handlePickFromGallery();
      }
    };

    const handlePickFromGallery = async () => {
      if (isAnalyzing) return;
      try {
        const res = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: false, // Keep maximum camera sensor detail & resolution
          quality: 1.0, // Lossless 100% quality
        });
        if (!res.canceled && res.assets && res.assets[0]) {
          onCapture(res.assets[0].uri);
        }
      } catch (err: any) {
        Alert.alert('Gallery Error', err.message || 'Could not select photo.');
      }
    };

    useImperativeHandle(ref, () => ({
      takePicture: handleCapture,
      pickFromGallery: handlePickFromGallery,
    }));

    return (
      <View style={styles.container}>
        {/* Camera Viewport: strictly clipped so zoom NEVER expands the app or shifts the UI */}
        <View style={styles.cameraClipContainer}>
          {permission?.granted ? (
            <CameraView
              style={StyleSheet.absoluteFillObject}
              facing={cameraFacing}
              mirror={isMirrored}
              mode="picture"
              autofocus="on"
              pictureSize={bestPictureSize}
              enableTorch={flashMode === 'on'}
              zoom={zoomLevel}
              onCameraReady={handleCameraReady}
              ref={(ref) => setCameraRef(ref)}
            />
          ) : (
            <View style={styles.permissionBox}>
              <Text style={styles.permissionEmoji}>📷</Text>
              <Text style={styles.permissionTitle}>Camera Access Required</Text>
              <Text style={styles.permissionText}>
                Gotcha! Lens needs camera access to capture and catalog wildlife.
              </Text>
              <TouchableOpacity
                style={styles.permissionBtn}
                onPress={requestPermission}
                activeOpacity={0.85}
              >
                <Text style={styles.permissionBtnText}>ALLOW CAMERA</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.galleryLink}
                onPress={handlePickFromGallery}
                activeOpacity={0.8}
              >
                <Text style={styles.galleryLinkText}>Select from Photos</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 1. TOP BAR: Flash (Left) • Sensor Badge (Center) • Controls: Flip & Gallery (Right) */}
        <View style={styles.topBar}>
          {/* Flash Button */}
          <TouchableOpacity
            style={[styles.topCircleBtn, flashMode === 'on' && styles.topCircleBtnActive]}
            onPress={toggleFlash}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.boltIcon}>⚡</Text>
          </TouchableOpacity>

          {/* Sensor & Mode Badge */}
          <View style={styles.topSensorBadge}>
            <View style={styles.greenLiveDot} />
            <Text style={styles.topSensorBadgeText} numberOfLines={1}>
              {cameraInfo}
            </Text>
          </View>

          {/* Right Controls: Camera Flip (Mirror) & Gallery Button */}
          <View style={styles.topRightActions}>
            <TouchableOpacity
              style={styles.topCircleBtn}
              onPress={toggleCameraFacing}
              activeOpacity={0.8}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <SwitchCamera size={18} color="#FFFFFF" strokeWidth={2.2} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.topCircleBtn}
              onPress={handlePickFromGallery}
              activeOpacity={0.8}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.topGalleryIcon}>◫</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. CENTER VIEWFINDER AREA (Isolated in preview zone - ZERO overlap with zoom pills!) */}
        <View style={styles.viewfinderArea}>
          <View style={styles.whiteRoundedFrame} />
        </View>

        {/* 3. DYNAMIC ZOOM MULTIPLIER LADDER (Positioned with clear breathing room above bottom nav) */}
        <View style={styles.zoomLadderContainer}>
          <View style={styles.zoomLadderCapsule}>
            {zoomLadder.map((multiplier) => {
              const isSelected = selectedZoom === multiplier;
              return (
                <TouchableOpacity
                  key={multiplier}
                  style={[
                    styles.zoomPill,
                    isSelected && styles.zoomPillActive,
                  ]}
                  onPress={() => applyZoom(multiplier)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.zoomPillText,
                      isSelected && styles.zoomPillTextActive,
                    ]}
                  >
                    {multiplier}x
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Full-Screen Analyzing Overlay */}
        {isAnalyzing && (
          <View style={styles.analyzingBackdrop}>
            <View style={styles.analyzingCard}>
              <ActivityIndicator size="large" color="#111111" />
              <Text style={styles.analyzingTitle}>Cropping & Scanning Animal</Text>
              <Text style={styles.analyzingSubtitle}>
                OpenCV isolating viewfinder ROI for precision species classification...
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    position: 'relative',
    overflow: 'hidden',
  },
  cameraClipContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    zIndex: 1,
  },
  permissionBox: {
    flex: 1,
    backgroundColor: '#FCFCFC',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  permissionEmoji: {
    fontSize: 52,
    marginBottom: 16,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111111',
    marginBottom: 8,
  },
  permissionText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  permissionBtn: {
    backgroundColor: '#111111',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 999,
  },
  permissionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  galleryLink: {
    marginTop: 18,
    paddingVertical: 10,
  },
  galleryLinkText: {
    color: '#888888',
    fontSize: 13,
    fontWeight: '600',
  },

  // 1. Top Bar Layout
  topBar: {
    position: 'absolute',
    top: 48,
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 90,
  },
  topCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(25, 25, 25, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topCircleBtnActive: {
    backgroundColor: 'rgba(50, 50, 50, 0.90)',
    borderColor: '#FBBF24',
  },
  topSensorBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(25, 25, 25, 0.75)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    marginHorizontal: 8,
    maxWidth: width * 0.50,
  },
  greenLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  topSensorBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F9FAFB',
    letterSpacing: 0.2,
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topFlipIcon: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  topGalleryIcon: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  boltIcon: {
    fontSize: 18,
    color: '#FBBF24',
  },

  // 2. Viewfinder Area
  viewfinderArea: {
    position: 'absolute',
    top: 100,
    bottom: 180,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
    zIndex: 50,
  },
  whiteRoundedFrame: {
    width: VIEWFINDER_SIZE,
    height: VIEWFINDER_SIZE,
    borderRadius: 38,
    borderWidth: 2.8,
    borderColor: '#FFFFFF',
    backgroundColor: 'transparent',
  },

  // 3. Zoom Ladder Capsule
  zoomLadderContainer: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 90,
  },
  zoomLadderCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 20, 20, 0.72)',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    gap: 4,
  },
  zoomPill: {
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 999,
  },
  zoomPillActive: {
    backgroundColor: '#FFFFFF',
  },
  zoomPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  zoomPillTextActive: {
    color: '#111111',
    fontWeight: '900',
  },

  // 4. Analyzing Overlay
  analyzingBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99,
    padding: 24,
  },
  analyzingCard: {
    backgroundColor: '#FFFFFF',
    padding: 28,
    borderRadius: 24,
    alignItems: 'center',
    width: '88%',
  },
  analyzingTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111111',
    marginTop: 16,
  },
  analyzingSubtitle: {
    fontSize: 13,
    color: '#666666',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
  },
});

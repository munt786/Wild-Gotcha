import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { LayoutGrid, Camera, Layers } from 'lucide-react-native';
import { ActiveTab } from '../types';
import { SHADOWS } from '../theme/colors';

interface BottomNavBarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onCenterPress: () => void;
  isAnalyzing?: boolean;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  onSelectTab,
  onCenterPress,
  isAnalyzing = false,
}) => {
  const isScanner = activeTab === 'SCANNER';
  const isDex = activeTab === 'INDEX';
  const isCollection = activeTab === 'CATCHES' || activeTab === 'PROFILE';

  return (
    <View style={styles.floatingNavContainer}>
      <View style={styles.buttonsRow}>
        {/* Left Floating Circular Button: Dex / Category Grid (hidden on camera) */}
        {!isScanner && (
          <TouchableOpacity
            style={[
              styles.sideCircleBtn,
              isDex && styles.sideCircleBtnActive,
            ]}
            onPress={() => onSelectTab('INDEX')}
            activeOpacity={0.8}
          >
            <LayoutGrid
              size={22}
              color={isDex ? '#111111' : '#9CA3AF'}
            />
          </TouchableOpacity>
        )}

        {/* Center Floating Circular Button: Camera / Shutter */}
        <TouchableOpacity
          style={[
            styles.centerShutterBtn,
            isScanner && styles.centerShutterBtnOnCamera,
            isAnalyzing && styles.centerShutterDisabled,
          ]}
          onPress={onCenterPress}
          activeOpacity={0.85}
          disabled={isAnalyzing}
        >
          {isScanner ? (
            <View style={styles.innerShutterCircle} />
          ) : (
            <Camera size={26} color="#FFFFFF" />
          )}
        </TouchableOpacity>

        {/* Right Floating Circular Button: Collection / Catches (hidden on camera) */}
        {!isScanner && (
          <TouchableOpacity
            style={[
              styles.sideCircleBtn,
              isCollection && styles.sideCircleBtnActive,
            ]}
            onPress={() => onSelectTab('CATCHES')}
            activeOpacity={0.8}
          >
            <Layers
              size={22}
              color={isCollection ? '#111111' : '#9CA3AF'}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  floatingNavContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 36 : 26,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 95,
    pointerEvents: 'box-none',
  },
  buttonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  sideCircleBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EFEFEF',
    ...SHADOWS.soft,
  },
  sideCircleBtnActive: {
    backgroundColor: '#F3F4F6',
    borderColor: '#D1D5DB',
  },
  centerShutterBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    ...SHADOWS.soft,
  },
  centerShutterBtnOnCamera: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  innerShutterCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFFFFF',
  },
  centerShutterDisabled: {
    opacity: 0.6,
  },
});

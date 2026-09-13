import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
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
  isAnalyzing,
}) => {
  return (
    <View style={styles.floatingNavContainer}>
      <View style={styles.buttonsRow}>
        {/* Left Floating Circular Button (⊞ Index Grid) */}
        <TouchableOpacity
          style={[
            styles.sideCircleBtn,
            activeTab === 'INDEX' && styles.sideCircleBtnActive,
          ]}
          onPress={() => onSelectTab('INDEX')}
          activeOpacity={0.8}
        >
          {/* 4-square Grid Icon */}
          <View style={styles.gridIconBox}>
            <View style={[styles.gridSquare, activeTab === 'INDEX' && styles.gridSquareActive]} />
            <View style={[styles.gridSquare, activeTab === 'INDEX' && styles.gridSquareActive]} />
            <View style={[styles.gridSquare, activeTab === 'INDEX' && styles.gridSquareActive]} />
            <View style={[styles.gridSquare, activeTab === 'INDEX' && styles.gridSquareActive]} />
          </View>
        </TouchableOpacity>

        {/* Center Floating Circular Button (📷 Large Black Camera Shutter) */}
        <TouchableOpacity
          style={[
            styles.centerShutterBtn,
            isAnalyzing && styles.centerShutterDisabled,
          ]}
          onPress={onCenterPress}
          activeOpacity={0.88}
          disabled={isAnalyzing}
        >
          {/* Custom Clean White Camera Icon */}
          <View style={styles.cameraIconWrapper}>
            <View style={styles.cameraNotch} />
            <View style={styles.cameraBody}>
              <View style={styles.cameraLens} />
            </View>
          </View>
        </TouchableOpacity>

        {/* Right Floating Circular Button (≘ Catches Inventory) */}
        <TouchableOpacity
          style={[
            styles.sideCircleBtn,
            activeTab === 'CATCHES' && styles.sideCircleBtnActive,
          ]}
          onPress={() => onSelectTab('CATCHES')}
          activeOpacity={0.8}
        >
          {/* 3-Layers Stack Icon */}
          <View style={styles.layersIconWrapper}>
            <View style={[styles.layerBar, activeTab === 'CATCHES' && styles.layerBarActive]} />
            <View style={[styles.layerBar, activeTab === 'CATCHES' && styles.layerBarActive]} />
            <View style={[styles.layerBar, activeTab === 'CATCHES' && styles.layerBarActive]} />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  floatingNavContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 38 : 28,
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
    gap: 22,
    pointerEvents: 'box-none',
  },
  sideCircleBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.polaroid,
  },
  sideCircleBtnActive: {
    backgroundColor: '#F7F7F7',
    borderWidth: 1.5,
    borderColor: '#111111',
  },
  gridIconBox: {
    width: 20,
    height: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'space-between',
  },
  gridSquare: {
    width: 8.5,
    height: 8.5,
    backgroundColor: '#111111',
    borderRadius: 2.5,
  },
  gridSquareActive: {
    backgroundColor: '#111111',
  },
  layersIconWrapper: {
    width: 22,
    height: 18,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  layerBar: {
    width: 22,
    height: 3.5,
    backgroundColor: '#111111',
    borderRadius: 2,
  },
  layerBarActive: {
    backgroundColor: '#111111',
  },
  centerShutterBtn: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.heavy,
  },
  centerShutterDisabled: {
    opacity: 0.6,
  },
  cameraIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraNotch: {
    width: 10,
    height: 3.5,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    marginBottom: -1,
  },
  cameraBody: {
    width: 32,
    height: 24,
    borderRadius: 6,
    borderWidth: 2.8,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraLens: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2.2,
    borderColor: '#FFFFFF',
  },
});

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Image,
  TouchableOpacity,
  ScrollView,
  Pressable,
  Platform,
  Dimensions,
} from 'react-native';
import { Specimen } from '../types';
import { COLORS, SHADOWS } from '../theme/colors';

const { width } = Dimensions.get('window');

interface SpecimenDetailModalProps {
  visible: boolean;
  specimen: Specimen | null;
  onClose: () => void;
  onRelease?: (specimenId: string) => void;
}

export const SpecimenDetailModal: React.FC<SpecimenDetailModalProps> = ({
  visible,
  specimen,
  onClose,
  onRelease,
}) => {
  const [imageFit, setImageFit] = useState<'contain' | 'cover'>('contain');
  const [viewMode, setViewMode] = useState<'sticker' | 'photo'>('sticker');

  useEffect(() => {
    setImageFit('contain');
    setViewMode('sticker');
  }, [specimen?.id]);

  if (!specimen) return null;

  const hasSticker = Boolean(specimen.sticker_url && specimen.sticker_url !== specimen.image_url);
  const activeImageUri = viewMode === 'sticker' && specimen.sticker_url ? specimen.sticker_url : specimen.image_url;

  // Danger 5-pip color-coded meter from Green (1) to Red (5)
  const pipColors = [
    COLORS.dangerPip1, // Green
    COLORS.dangerPip2, // Lime
    COLORS.dangerPip3, // Yellow
    COLORS.dangerPip4, // Orange
    COLORS.dangerPip5, // Red
  ];

  // Rarity Tiers: Common, Uncommon, Rare, Epic, Legendary
  const getRarityBadgeColor = (rarity: string) => {
    switch (String(rarity || '').toUpperCase()) {
      case 'LEGENDARY':
        return COLORS.rarityLegendary;
      case 'EPIC':
        return COLORS.rarityEpic;
      case 'RARE':
        return COLORS.rarityRare;
      case 'UNCOMMON':
        return COLORS.rarityUncommon;
      default:
        return COLORS.rarityCommon;
    }
  };

  const rarityColor = getRarityBadgeColor(specimen.rarity);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        {/* Background dismiss area */}
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />

        {/* Modal Sheet Container - View allows ScrollView to receive all gestures */}
        <View style={styles.sheetWrapper}>
          <View style={styles.modalSheet}>
            {/* FIXED TOP HEADER: Drag Indicator & Circular Close Button (Always visible on screen!) */}
            <View style={styles.modalTopBar}>
              <View style={styles.topBarSpacer} />
              <View style={styles.dragPill} />
              <TouchableOpacity
                style={styles.topCloseCircle}
                onPress={onClose}
                activeOpacity={0.7}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={styles.topCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Scrollable Content inside bounded card */}
            <ScrollView
              style={styles.scrollContainer}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              bounces={false}
            >
              {/* Sticker vs Full Photo Switcher */}
              {hasSticker && (
                <View style={styles.stickerToggleRow}>
                  <TouchableOpacity
                    style={[styles.stickerToggleBtn, viewMode === 'sticker' && styles.stickerToggleBtnActive]}
                    onPress={() => setViewMode('sticker')}
                  >
                    <Text style={[styles.stickerToggleText, viewMode === 'sticker' && styles.stickerToggleTextActive]}>
                      ✨ Specimen Sticker
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.stickerToggleBtn, viewMode === 'photo' && styles.stickerToggleBtnActive]}
                    onPress={() => setViewMode('photo')}
                  >
                    <Text style={[styles.stickerToggleText, viewMode === 'photo' && styles.stickerToggleTextActive]}>
                      📷 Full Photo
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Polaroid Framed Preview Image with Complete Uncut View */}
              <View
                style={[
                  styles.polaroidFrame,
                  viewMode === 'sticker' && hasSticker && [
                    styles.stickerPolaroidFrame,
                    { borderColor: '#FFFFFF', shadowColor: rarityColor },
                  ],
                ]}
              >
                <TouchableOpacity
                  activeOpacity={0.92}
                  onPress={() => setImageFit((prev) => (prev === 'contain' ? 'cover' : 'contain'))}
                  style={styles.imageContainer}
                >
                  <Image
                    source={{ uri: activeImageUri }}
                    style={styles.polaroidImage}
                    resizeMode={viewMode === 'sticker' && hasSticker ? 'contain' : imageFit}
                  />

                  {/* Sleek Toggle Button: Full Photo vs Zoomed */}
                  {viewMode === 'photo' && (
                    <TouchableOpacity
                      style={styles.fitToggleBadge}
                      onPress={() => setImageFit((prev) => (prev === 'contain' ? 'cover' : 'contain'))}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.fitToggleText}>
                        {imageFit === 'contain' ? '⛶ Full Photo' : '⊡ Zoomed'}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Rarity Pill Tag: Common / Uncommon / Rare / Epic / Legendary */}
                  <View style={[styles.rarityBadge, { backgroundColor: rarityColor }]}>
                    <Text style={styles.rarityBadgeText}>{specimen.rarity}</Text>
                  </View>

                  {viewMode === 'sticker' && hasSticker && (
                    <View style={styles.stickerBadgePill}>
                      <Text style={styles.stickerBadgeText}>🏷️ CLEAN STICKER</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Names, Category & Breed Header */}
              <View style={styles.headerSection}>
                <View style={styles.badgeRow}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{specimen.category}</Text>
                  </View>
                  {specimen.breed ? (
                    <View style={styles.breedBadge}>
                      <Text style={styles.breedBadgeText}>{specimen.breed}</Text>
                    </View>
                  ) : null}
                </View>

                <Text style={styles.commonName}>{specimen.common_name}</Text>
                <Text style={styles.scientificName}>
                  Taxon: <Text style={styles.italic}>{specimen.scientific_name}</Text>
                </Text>
                <Text style={styles.catalogTag}>Catalog {specimen.catalog_id}</Text>
              </View>

              {/* Lore Description */}
              <View style={styles.loreBox}>
                <Text style={styles.loreTitle}>SPECIES LORE</Text>
                <Text style={styles.loreText}>{specimen.lore}</Text>
              </View>

              {/* 2x2 Information Grid */}
              <View style={styles.infoGrid}>
                {/* Biome */}
                <View style={styles.gridCell}>
                  <Text style={styles.cellLabel}>🌲 BIOME</Text>
                  <Text style={styles.cellValue} numberOfLines={2}>
                    {specimen.biome}
                  </Text>
                </View>

                {/* Region */}
                <View style={styles.gridCell}>
                  <Text style={styles.cellLabel}>🗺️ REGION</Text>
                  <Text style={styles.cellValue} numberOfLines={2}>
                    {specimen.region}
                  </Text>
                </View>

                {/* Date Spotted */}
                <View style={styles.gridCell}>
                  <Text style={styles.cellLabel}>📅 DATE SPOTTED</Text>
                  <Text style={styles.cellValue}>{specimen.date_spotted}</Text>
                </View>

                {/* Danger Level (5-pip meter running from Green to Red) */}
                <View style={styles.gridCell}>
                  <Text style={styles.cellLabel}>⚠️ DANGER LEVEL</Text>
                  <View style={styles.pipRow}>
                    {[1, 2, 3, 4, 5].map((pip) => {
                      const isFilled = pip <= specimen.danger_level;
                      const pipColor = isFilled ? pipColors[pip - 1] : COLORS.dangerPipEmpty;
                      return (
                        <View
                          key={pip}
                          style={[
                            styles.pip,
                            { backgroundColor: pipColor },
                          ]}
                        />
                      );
                    })}
                    <Text style={styles.pipRatingText}>
                      {specimen.danger_level}/5
                    </Text>
                  </View>
                </View>
              </View>

              {/* Primary Action Buttons: Done & Release Specimen */}
              <View style={styles.buttonStack}>
                <TouchableOpacity
                  style={styles.doneButton}
                  onPress={onClose}
                  activeOpacity={0.88}
                >
                  <Text style={styles.doneButtonText}>Done</Text>
                </TouchableOpacity>

                {onRelease && (
                  <TouchableOpacity
                    style={styles.releaseButton}
                    onPress={() => {
                      onRelease(specimen.id);
                      onClose();
                    }}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.releaseButtonText}>Release Specimen</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 9999,
  },
  sheetWrapper: {
    width: '100%',
    maxWidth: 480,
    height: '88%',
    maxHeight: 640,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    flex: 1,
    width: '100%',
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 32 : 18,
    overflow: 'hidden',
    ...SHADOWS.heavy,
  },
  modalTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: COLORS.surface,
  },
  topBarSpacer: {
    width: 32,
  },
  dragPill: {
    width: 38,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
  },
  topCloseCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topCloseText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#4B5563',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 24,
  },
  stickerToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    marginVertical: 6,
    padding: 3,
  },
  stickerToggleBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 9,
  },
  stickerToggleBtnActive: {
    backgroundColor: COLORS.surface,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 3,
  },
  stickerToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  stickerToggleTextActive: {
    color: COLORS.textPrimary,
  },
  stickerPolaroidFrame: {
    backgroundColor: '#0B1120',
    borderWidth: 3.5,
    borderRadius: 16,
    shadowOpacity: 0.7,
    shadowRadius: 14,
    elevation: 8,
  },
  stickerBadgePill: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  stickerBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  polaroidFrame: {
    backgroundColor: COLORS.surface,
    padding: 7,
    paddingBottom: 9,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...SHADOWS.polaroid,
    position: 'relative',
    marginTop: 4,
  },
  imageContainer: {
    width: '100%',
    height: 235,
    borderRadius: 10,
    backgroundColor: '#111827',
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  polaroidImage: {
    width: '100%',
    height: '100%',
  },
  fitToggleBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  fitToggleText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F9FAFB',
    letterSpacing: 0.3,
  },
  rarityBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  rarityBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.8,
  },
  headerSection: {
    marginTop: 12,
    alignItems: 'flex-start',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    marginBottom: 6,
  },
  categoryBadge: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 3.5,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  breedBadge: {
    backgroundColor: '#EEF2FF',
    paddingVertical: 3.5,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  breedBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4338CA',
  },
  commonName: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: -0.4,
  },
  scientificName: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  italic: {
    fontStyle: 'italic',
  },
  catalogTag: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  loreBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  loreTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  loreText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  gridCell: {
    width: (width > 420 ? 420 : width - 52) / 2 - 4,
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  cellLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginBottom: 3,
    letterSpacing: 0.4,
  },
  cellValue: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textPrimary,
    lineHeight: 15,
  },
  pipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
    marginTop: 3,
  },
  pip: {
    width: 8.5,
    height: 8.5,
    borderRadius: 4.25,
  },
  pipRatingText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginLeft: 5,
  },
  buttonStack: {
    marginTop: 16,
    gap: 8,
  },
  doneButton: {
    backgroundColor: '#111111',
    paddingVertical: 13,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.soft,
  },
  doneButtonText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  releaseButton: {
    backgroundColor: 'transparent',
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  releaseButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
});

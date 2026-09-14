import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { IdentifyResponse } from '../types';
import { COLORS, getRarityColor, getTaxonomyColor } from '../theme/colors';
import { TaxonomyBadge } from './TaxonomyBadge';

interface ResultCardProps {
  visible: boolean;
  result: IdentifyResponse | null;
  imageUri: string | null;
  onClose: () => void;
  onSavedToDex?: () => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({
  visible,
  result,
  imageUri,
  onClose,
  onSavedToDex,
}) => {
  if (!result) return null;

  const [viewMode, setViewMode] = React.useState<'sticker' | 'photo'>('sticker');
  const hasSticker = Boolean(result.sticker_uri);
  const activeImageUri = viewMode === 'sticker' && result.sticker_uri ? result.sticker_uri : imageUri;

  const taxColor = getTaxonomyColor(result.taxonomy_class);
  const rarityColor = getRarityColor(result.rarity);
  const confidencePercent = Math.round(result.confidence_score * 100);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        {/* Top Header */}
        <View style={styles.headerBar}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.gotchaSparkle}>✨</Text>
            <Text style={styles.headerTitle}>GOTCHA! SPECIES DISCOVERED</Text>
            <Text style={styles.gotchaSparkle}>✨</Text>
          </View>
          <Text style={styles.headerSubtitle}>Registered to your WildDex Collection</Text>
        </View>

        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollInner}
          showsVerticalScrollIndicator={false}
        >
          {/* Main Creature Card */}
          <View style={[styles.mainCard, { borderColor: taxColor }]}>
            {/* Sticker vs Full Photo Switcher */}
            {hasSticker && (
              <View style={styles.stickerToggleBar}>
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
                    📷 Full Camera Photo
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Image Preview */}
            <View
              style={[
                styles.imageContainer,
                viewMode === 'sticker' && hasSticker && [
                  styles.stickerFrame,
                  { shadowColor: rarityColor, borderColor: '#FFFFFF' },
                ],
              ]}
            >
              {activeImageUri ? (
                <Image
                  source={{ uri: activeImageUri }}
                  style={[
                    styles.subjectImage,
                    viewMode === 'sticker' && hasSticker && styles.stickerSubjectImage,
                  ]}
                  resizeMode={viewMode === 'sticker' && hasSticker ? 'contain' : 'cover'}
                />
              ) : (
                <View style={styles.noImagePlaceholder}>
                  <Text style={styles.noImageText}>🌿 Captured Specimen</Text>
                </View>
              )}

              {/* Rarity Pill Overlay */}
              <View style={[styles.rarityPill, { backgroundColor: rarityColor }]}>
                <Text style={styles.rarityText}>{result.rarity.toUpperCase()}</Text>
              </View>

              {/* Danger Level Pill */}
              <View style={styles.dangerPill}>
                <Text style={styles.dangerText}>{result.danger_level}</Text>
              </View>

              {viewMode === 'sticker' && hasSticker && (
                <View style={styles.stickerBadgePill}>
                  <Text style={styles.stickerBadgeText}>🏷️ CLEAN STICKER</Text>
                </View>
              )}
            </View>

            {/* Species Identification Info */}
            <View style={styles.infoBody}>
              <TaxonomyBadge taxonomyClass={result.taxonomy_class as any} size="md" />

              <Text style={styles.commonName}>{result.common_name}</Text>
              <Text style={styles.scientificName}>
                Taxonomic: <Text style={styles.italicText}>{result.scientific_name}</Text>
              </Text>

              {/* Confidence Meter */}
              <View style={styles.confidenceSection}>
                <View style={styles.confidenceRow}>
                  <Text style={styles.confidenceLabel}>AI Match Confidence</Text>
                  <Text style={[styles.confidenceValue, { color: taxColor }]}>
                    {confidencePercent}%
                  </Text>
                </View>
                <View style={styles.meterTrack}>
                  <View
                    style={[
                      styles.meterFill,
                      { width: `${confidencePercent}%`, backgroundColor: taxColor },
                    ]}
                  />
                </View>
              </View>

              {/* Habitat & Fun Fact Cards */}
              <View style={styles.metadataBox}>
                <Text style={styles.metaTitle}>📍 Natural Habitat</Text>
                <Text style={styles.metaContent}>{result.habitat}</Text>
              </View>

              <View style={styles.factBox}>
                <Text style={styles.factTitle}>💡 Species Dex Fact</Text>
                <Text style={styles.factContent}>{result.fun_fact}</Text>
              </View>

              {/* Alternative Top Candidates */}
              {result.top_candidates && result.top_candidates.length > 1 && (
                <View style={styles.candidatesSection}>
                  <Text style={styles.candidatesTitle}>Other Evaluated Candidates:</Text>
                  {result.top_candidates.slice(1, 4).map((cand, idx) => (
                    <View key={idx} style={styles.candidateRow}>
                      <Text style={styles.candidateName} numberOfLines={1}>
                        • {cand.common_name} ({cand.taxonomy_class})
                      </Text>
                      <Text style={styles.candidateScore}>
                        {Math.round(cand.confidence * 100)}%
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Bottom Actions */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: taxColor }]}
            onPress={() => {
              if (onSavedToDex) onSavedToDex();
              onClose();
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.actionBtnText}>SAVE TO DEX & SCAN AGAIN</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerBar: {
    backgroundColor: COLORS.surface,
    paddingTop: 54,
    paddingBottom: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gotchaSparkle: {
    fontSize: 18,
    marginHorizontal: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 1.2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    padding: 18,
    paddingBottom: 40,
  },
  mainCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 2,
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    height: 240,
    backgroundColor: '#000',
    position: 'relative',
  },
  subjectImage: {
    width: '100%',
    height: '100%',
  },
  noImagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    color: COLORS.textMuted,
    fontSize: 15,
  },
  rarityPill: {
    position: 'absolute',
    top: 14,
    left: 14,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  rarityText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  dangerPill: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  dangerText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
  infoBody: {
    padding: 18,
  },
  commonName: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 10,
  },
  scientificName: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 3,
  },
  italicText: {
    fontStyle: 'italic',
    color: COLORS.accent,
  },
  confidenceSection: {
    marginTop: 18,
    marginBottom: 14,
  },
  confidenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  confidenceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  confidenceValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  meterTrack: {
    height: 8,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    borderRadius: 4,
  },
  metadataBox: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  metaTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  metaContent: {
    fontSize: 13,
    color: COLORS.textPrimary,
    lineHeight: 18,
  },
  factBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  factTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  factContent: {
    fontSize: 13,
    color: COLORS.textPrimary,
    lineHeight: 19,
  },
  candidatesSection: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceBorder,
  },
  candidatesTitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 6,
  },
  candidateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  candidateName: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
  },
  candidateScore: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginLeft: 8,
  },
  bottomBar: {
    backgroundColor: COLORS.surface,
    padding: 16,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceBorder,
  },
  actionBtn: {
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  actionBtnText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.0,
  },
  stickerToggleBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    margin: 12,
    marginBottom: 8,
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
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  stickerToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  stickerToggleTextActive: {
    color: COLORS.textPrimary,
  },
  stickerFrame: {
    backgroundColor: '#0B1120',
    borderWidth: 3.5,
    borderRadius: 16,
    marginHorizontal: 12,
    marginTop: 4,
    overflow: 'hidden',
    shadowOpacity: 0.75,
    shadowRadius: 14,
    elevation: 10,
  },
  stickerSubjectImage: {
    borderRadius: 12,
  },
  stickerBadgePill: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  stickerBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

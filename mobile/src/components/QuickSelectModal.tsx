import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Image,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { TaxonomicCategory } from '../types';
import { ALL_CATEGORIES } from '../utils/specimenData';
import { COLORS, SHADOWS } from '../theme/colors';

interface QuickSelectModalProps {
  visible: boolean;
  imageUri: string | null;
  detectedName: string;
  detectedCategory: TaxonomicCategory;
  confidence: number;
  onConfirm: (finalCategory: TaxonomicCategory, customName?: string) => void;
  onCancel: () => void;
}

export const QuickSelectModal: React.FC<QuickSelectModalProps> = ({
  visible,
  imageUri,
  detectedName,
  detectedCategory,
  confidence,
  onConfirm,
  onCancel,
}) => {
  const [selectedCat, setSelectedCat] = useState<TaxonomicCategory>(detectedCategory);

  // Update selection if prop changes
  React.useEffect(() => {
    setSelectedCat(detectedCategory);
  }, [detectedCategory]);

  const categories = ALL_CATEGORIES.filter((c) => c !== 'All');

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.modalCard}>
              {/* Top Drag Indicator */}
              <View style={styles.dragPill} />

              <Text style={styles.modalHeading}>SPECIMEN ENCOUNTER</Text>
              <Text style={styles.modalSubheading}>
                Select or confirm taxonomic category for cataloging
              </Text>

              {/* Specimen Thumbnail & AI Suggestion Banner */}
              <View style={styles.specimenPreviewRow}>
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={styles.thumbImage} />
                ) : (
                  <View style={styles.thumbPlaceholder}>
                    <Text style={styles.thumbEmoji}>📸</Text>
                  </View>
                )}
                <View style={styles.suggestionDetails}>
                  <Text style={styles.detectedTitle}>{detectedName}</Text>
                  <View style={styles.confidenceBadge}>
                    <Text style={styles.confidenceText}>
                      Match: {Math.round(confidence * 100)}%
                    </Text>
                  </View>
                </View>
              </View>

              {/* Interactive 3-Column Chip Grid to tag/categorize */}
              <Text style={styles.tagGridTitle}>Taxonomic Category:</Text>
              <View style={styles.chipGrid}>
                {categories.map((cat) => {
                  const isSelected = selectedCat === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.chip,
                        isSelected && styles.chipActive,
                      ]}
                      onPress={() => setSelectedCat(cat)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          isSelected && styles.chipTextActive,
                        ]}
                        numberOfLines={1}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={onCancel}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelButtonText}>DISCARD</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={() => onConfirm(selectedCat)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.confirmButtonText}>CONFIRM CATCH</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 38,
    ...SHADOWS.heavy,
  },
  dragPill: {
    width: 38,
    height: 4,
    backgroundColor: COLORS.surfaceBorderHover,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeading: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 0.8,
  },
  modalSubheading: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 3,
    marginBottom: 16,
  },
  specimenPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: 16,
    padding: 12,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  thumbImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  thumbPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbEmoji: {
    fontSize: 24,
  },
  suggestionDetails: {
    marginLeft: 14,
    flex: 1,
  },
  detectedTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  confidenceBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginTop: 5,
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accentGreen,
  },
  tagGridTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  chip: {
    width: '31%',
    paddingVertical: 10,
    paddingHorizontal: 4,
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: 12,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  chipTextActive: {
    color: COLORS.primaryInverse,
    fontWeight: '800',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  cancelButton: {
    width: '32%',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  confirmButton: {
    width: '64%',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.soft,
  },
  confirmButtonText: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.primaryInverse,
    letterSpacing: 0.8,
  },
});

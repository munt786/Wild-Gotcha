import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { UserScan, TaxonomyClass } from '../types';
import { COLORS, getRarityColor, getTaxonomyColor } from '../theme/colors';
import { TaxonomyBadge } from './TaxonomyBadge';

interface DexGridProps {
  scans: UserScan[];
  onSelectScan: (scan: UserScan) => void;
  onRefresh: () => void;
  refreshing: boolean;
}

const CATEGORIES: { label: string; filter: TaxonomyClass | 'ALL' }[] = [
  { label: 'All', filter: 'ALL' },
  { label: '🦁 Mammals', filter: 'Mammalia' },
  { label: '🦋 Insects', filter: 'Insecta' },
  { label: '🦎 Reptiles', filter: 'Reptilia' },
  { label: '🕷️ Arachnids', filter: 'Arachnida' },
];

export const DexGrid: React.FC<DexGridProps> = ({
  scans,
  onSelectScan,
  onRefresh,
  refreshing,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<TaxonomyClass | 'ALL'>('ALL');

  const filteredScans = scans.filter((scan) => {
    if (selectedFilter === 'ALL') return true;
    return scan.taxonomy_class === selectedFilter;
  });

  return (
    <View style={styles.container}>
      {/* Taxonomy Category Filter Bar */}
      <View style={styles.filterBar}>
        <FlatList
          horizontal
          data={CATEGORIES}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.filter}
          renderItem={({ item }) => {
            const isSelected = selectedFilter === item.filter;
            return (
              <TouchableOpacity
                style={[
                  styles.filterPill,
                  isSelected && styles.filterPillActive,
                ]}
                onPress={() => setSelectedFilter(item.filter)}
              >
                <Text
                  style={[
                    styles.filterText,
                    isSelected && styles.filterTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.filterList}
        />
      </View>

      {/* Scans Collection Grid */}
      <FlatList
        data={filteredScans}
        keyExtractor={(item) => item.scan_id}
        numColumns={2}
        contentContainerStyle={styles.gridContent}
        columnWrapperStyle={styles.columnWrapper}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🔍</Text>
            <Text style={styles.emptyTitle}>No Species Discovered Yet</Text>
            <Text style={styles.emptySubtitle}>
              Switch to the Scanner tab to capture and register your first mammal, insect, reptile, or arachnid!
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const taxColor = getTaxonomyColor(item.taxonomy_class);
          const rarityColor = getRarityColor(item.rarity);
          const conf = Math.round(item.confidence_score * 100);

          return (
            <TouchableOpacity
              style={[styles.creatureCard, { borderColor: taxColor }]}
              onPress={() => onSelectScan(item)}
              activeOpacity={0.8}
            >
              {/* Image Thumbnail */}
              <View style={styles.thumbBox}>
                {item.image_preview_base64 ? (
                  <Image
                    source={{ uri: item.image_preview_base64 }}
                    style={styles.thumbImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.thumbFallback}>
                    <Text style={styles.thumbFallbackEmoji}>🐾</Text>
                  </View>
                )}
                {/* Rarity Tag */}
                <View style={[styles.rarityTag, { backgroundColor: rarityColor }]}>
                  <Text style={styles.rarityTagText}>{item.rarity.toUpperCase()}</Text>
                </View>
              </View>

              {/* Card Details */}
              <View style={styles.cardInfo}>
                <TaxonomyBadge taxonomyClass={item.taxonomy_class} size="sm" />
                <Text style={styles.cardCommonName} numberOfLines={1}>
                  {item.species_common_name}
                </Text>
                <Text style={styles.cardScientificName} numberOfLines={1}>
                  {item.species_scientific_name}
                </Text>

                <View style={styles.confidenceMiniRow}>
                  <Text style={styles.confMiniLabel}>Match</Text>
                  <Text style={[styles.confMiniValue, { color: taxColor }]}>
                    {conf}%
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  filterBar: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
    backgroundColor: COLORS.surface,
  },
  filterList: {
    paddingHorizontal: 14,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: COLORS.surfaceLight,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterPillActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  filterTextActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  gridContent: {
    padding: 12,
    paddingBottom: 40,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  creatureCard: {
    width: '48%',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 14,
    overflow: 'hidden',
  },
  thumbBox: {
    width: '100%',
    height: 120,
    backgroundColor: '#000',
    position: 'relative',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
  },
  thumbFallbackEmoji: {
    fontSize: 32,
  },
  rarityTag: {
    position: 'absolute',
    top: 6,
    right: 6,
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 6,
  },
  rarityTagText: {
    color: '#000',
    fontSize: 9,
    fontWeight: '900',
  },
  cardInfo: {
    padding: 10,
  },
  cardCommonName: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 6,
  },
  cardScientificName: {
    fontSize: 11,
    fontStyle: 'italic',
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  confidenceMiniRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceBorder,
  },
  confMiniLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  confMiniValue: {
    fontSize: 11,
    fontWeight: '800',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});

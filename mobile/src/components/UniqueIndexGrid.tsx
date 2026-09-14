import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { Specimen, TaxonomicCategory } from '../types';
import { COLORS, SHADOWS } from '../theme/colors';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 48) / 3;

interface UniqueIndexGridProps {
  specimens: Specimen[];
  selectedCategory: TaxonomicCategory;
  onSelectSpecimen: (specimen: Specimen) => void;
}

export const UniqueIndexGrid: React.FC<UniqueIndexGridProps> = ({
  specimens,
  selectedCategory,
  onSelectSpecimen,
}) => {
  // Filter by selected category (or All)
  const filtered = specimens.filter((item) => {
    if (selectedCategory === 'All') return true;
    return item.category === selectedCategory;
  });

  // Calculate a slight playful polaroid tilt for each card
  const getTiltAngle = (index: number) => {
    const tilts = ['-1.6deg', '1.4deg', '-0.8deg', '1.8deg', '-1.2deg', '0.6deg'];
    return tilts[index % tilts.length];
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        numColumns={3}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.gridContent}
        columnWrapperStyle={styles.columnWrapper}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No unique discoveries in "{selectedCategory}" yet. Go scan!
            </Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const rotation = getTiltAngle(index);

          return (
            <TouchableOpacity
              style={[
                styles.polaroidCard,
                { transform: [{ rotate: rotation }] },
              ]}
              onPress={() => onSelectSpecimen(item)}
              activeOpacity={0.88}
            >
              {/* White Polaroid Inner Photo */}
              <View style={styles.photoFrame}>
                <Image
                  source={{ uri: item.image_url }}
                  style={styles.specimenImage}
                  resizeMode="cover"
                />
              </View>

              {/* Bottom Card Labels */}
              <View style={styles.cardFooter}>
                <Text style={styles.catalogId}>{item.catalog_id}</Text>
                <Text style={styles.commonName} numberOfLines={1}>
                  {item.common_name}
                </Text>
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
  gridContent: {
    paddingTop: 106, // Space below floating header
    paddingBottom: 110, // Space above floating bottom nav
    paddingHorizontal: 16,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  polaroidCard: {
    width: COLUMN_WIDTH,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 6,
    paddingBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    ...SHADOWS.polaroid,
  },
  photoFrame: {
    width: '100%',
    height: COLUMN_WIDTH - 12,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: COLORS.surfaceSubtle,
  },
  specimenImage: {
    width: '100%',
    height: '100%',
  },
  cardFooter: {
    marginTop: 6,
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  catalogId: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  commonName: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginTop: 1,
  },
  emptyContainer: {
    paddingTop: 180,
    paddingHorizontal: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
  },
});

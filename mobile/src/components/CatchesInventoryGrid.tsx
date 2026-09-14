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
import { CatchRecord, Specimen } from '../types';
import { COLORS, SHADOWS } from '../theme/colors';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 48) / 3;

interface CatchesInventoryGridProps {
  catches: CatchRecord[];
  onSelectCatch: (catchRecord: CatchRecord) => void;
}

export const CatchesInventoryGrid: React.FC<CatchesInventoryGridProps> = ({
  catches,
  onSelectCatch,
}) => {
  return (
    <View style={styles.container}>
      <FlatList
        data={catches}
        keyExtractor={(item) => item.catch_id}
        numColumns={3}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.gridContent}
        columnWrapperStyle={styles.columnWrapper}
        ListHeaderComponent={
          catches.length > 0 ? (
            <View style={styles.listHeader}>
              <Text style={styles.inventoryCount}>
                {catches.length} Total Catches Logged
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              Inventory is empty. Go capture something!
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.catchCard}
            onPress={() => onSelectCatch(item)}
            activeOpacity={0.85}
          >
            {/* Specimen Photo */}
            <View style={styles.imageFrame}>
              <Image
                source={{ uri: item.sticker_url || item.image_url }}
                style={styles.catchImage}
                resizeMode={item.sticker_url ? 'contain' : 'cover'}
              />
            </View>

            {/* Specimen Info */}
            <View style={styles.catchFooter}>
              <Text style={styles.catalogId}>{item.catalog_id}</Text>
              <Text style={styles.catchName} numberOfLines={1}>
                {item.common_name}
              </Text>
              <Text style={styles.catchDate} numberOfLines={1}>
                {item.caught_at.split('•')[0].trim()}
              </Text>
            </View>
          </TouchableOpacity>
        )}
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
    paddingTop: 104, // Space below floating header
    paddingBottom: 110, // Space above floating bottom nav
    paddingHorizontal: 16,
  },
  listHeader: {
    marginBottom: 14,
    alignItems: 'center',
  },
  inventoryCount: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.2,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  catchCard: {
    width: COLUMN_WIDTH,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 6,
    paddingBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    ...SHADOWS.soft,
  },
  imageFrame: {
    width: '100%',
    height: COLUMN_WIDTH - 12,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: COLORS.surfaceSubtle,
  },
  catchImage: {
    width: '100%',
    height: '100%',
  },
  catchFooter: {
    marginTop: 6,
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  catalogId: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.textMuted,
  },
  catchName: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 1,
  },
  catchDate: {
    fontSize: 9,
    color: COLORS.textLight,
    marginTop: 2,
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

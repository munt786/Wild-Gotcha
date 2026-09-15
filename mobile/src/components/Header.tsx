import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Dimensions,
} from 'react-native';
import { ActiveTab, TaxonomicCategory, UserProfile } from '../types';
import { COLORS, SHADOWS } from '../theme/colors';

const { width } = Dimensions.get('window');

// 2-column exact list matching Screenshot 2
const COLUMN_1: TaxonomicCategory[] = [
  'All',
  'Birds',
  'Amphibians',
  'Insects',
  'Mollusks',
  'Invertebrates',
];

const COLUMN_2: TaxonomicCategory[] = [
  'Mammals',
  'Reptiles',
  'Fish',
  'Arachnids',
  'Crustaceans',
];

interface HeaderProps {
  activeTab: ActiveTab;
  selectedCategory: TaxonomicCategory;
  onSelectCategory: (category: TaxonomicCategory) => void;
  isOfflineMode?: boolean;
  onToggleOfflineMode?: () => void;
  user?: UserProfile | null;
  playerLevel?: number;
  onOpenAuth?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  selectedCategory,
  onSelectCategory,
  isOfflineMode = false,
  onToggleOfflineMode,
  user,
  playerLevel = 1,
  onOpenAuth,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Hidden on Scanner tab (Screenshot 4)
  if (activeTab === 'SCANNER') {
    return null;
  }

  return (
    <View style={styles.headerAnchor}>
      <View style={styles.headerRow}>
        {/* Left: Category Dropdown or Catches Pill */}
        <View style={styles.leftPillContainer}>
          {activeTab === 'INDEX' ? (
            // Screenshot 1: Floating Top Pill [ ⊞ All ⌵ ]
            <TouchableOpacity
              style={styles.topPill}
              onPress={() => setDropdownOpen(!dropdownOpen)}
              activeOpacity={0.85}
            >
              {/* 4-square Grid Icon */}
              <View style={styles.gridIconBox}>
                <View style={styles.gridSquare} />
                <View style={styles.gridSquare} />
                <View style={styles.gridSquare} />
                <View style={styles.gridSquare} />
              </View>

              <Text style={styles.pillText}>{selectedCategory}</Text>
              <Text style={styles.chevron}>⌵</Text>
            </TouchableOpacity>
          ) : (
            // Screenshot 3: Floating Top Pill [ ≘ Catches ]
            <View style={styles.topPillStatic}>
              <Text style={styles.layersIcon}>≘</Text>
              <Text style={styles.pillTextStatic}>Catches</Text>
            </View>
          )}
        </View>

        {/* Right Actions: User Profile / Passport + Online / Offline Mode */}
        <View style={styles.topRightActions}>
          {onOpenAuth && (
            <TouchableOpacity
              style={styles.profilePill}
              onPress={onOpenAuth}
              activeOpacity={0.85}
            >
              <Text style={styles.profileEmoji}>
                {user && !user.isGuest ? '👤' : '🐾'}
              </Text>
              <Text style={styles.profilePillText} numberOfLines={1}>
                {`Lv.${playerLevel} • ${user && !user.isGuest ? user.displayName.split(' ')[0] : 'Guest'}`}
              </Text>
            </TouchableOpacity>
          )}

          {onToggleOfflineMode && (
            <TouchableOpacity
              style={[
                styles.modePill,
                isOfflineMode ? styles.modePillOffline : styles.modePillOnline,
              ]}
              onPress={onToggleOfflineMode}
              activeOpacity={0.85}
            >
              <View
                style={[
                  styles.modeDot,
                  { backgroundColor: isOfflineMode ? '#F59E0B' : '#10B981' },
                ]}
              />
              <Text style={styles.modePillText}>
                {isOfflineMode ? 'Offline' : 'Online'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Screenshot 2: 2-Column Floating Dropdown Card */}
      <Modal
        visible={dropdownOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDropdownOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setDropdownOpen(false)}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={styles.dropdownCard}>
              {/* 2-Column layout matching Screenshot 2 */}
              <View style={styles.twoColumnContainer}>
                {/* Column 1 */}
                <View style={styles.column}>
                  {COLUMN_1.map((cat) => {
                    const isSelected = selectedCategory === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.categoryChip,
                          isSelected && styles.categoryChipActive,
                        ]}
                        onPress={() => {
                          onSelectCategory(cat);
                          setDropdownOpen(false);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.chipLabel,
                            isSelected && styles.chipLabelActive,
                          ]}
                          numberOfLines={1}
                        >
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Column 2 */}
                <View style={styles.column}>
                  {COLUMN_2.map((cat) => {
                    const isSelected = selectedCategory === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.categoryChip,
                          isSelected && styles.categoryChipActive,
                        ]}
                        onPress={() => {
                          onSelectCategory(cat);
                          setDropdownOpen(false);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.chipLabel,
                            isSelected && styles.chipLabelActive,
                          ]}
                          numberOfLines={1}
                        >
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  headerAnchor: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  leftPillContainer: {
    flexShrink: 0,
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  profilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...SHADOWS.soft,
  },
  profileEmoji: {
    fontSize: 12,
    marginRight: 4,
  },
  profilePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#111111',
    maxWidth: 65,
  },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...SHADOWS.soft,
  },
  modePillOnline: {
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  modePillOffline: {
    borderColor: 'rgba(245, 158, 11, 0.5)',
    backgroundColor: '#FFFBEB',
  },
  modeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
  },
  modePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111111',
  },
  topPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 999,
    ...SHADOWS.soft,
  },
  topPillStatic: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 999,
    ...SHADOWS.soft,
  },
  gridIconBox: {
    width: 14,
    height: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'space-between',
    marginRight: 8,
  },
  gridSquare: {
    width: 6,
    height: 6,
    backgroundColor: '#111111',
    borderRadius: 1.5,
  },
  layersIcon: {
    fontSize: 16,
    color: '#111111',
    marginRight: 8,
    fontWeight: '900',
  },
  pillText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111111',
  },
  pillTextStatic: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111111',
  },
  chevron: {
    fontSize: 13,
    color: '#111111',
    marginLeft: 7,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 106,
  },
  dropdownCard: {
    width: width * 0.88,
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 16,
    ...SHADOWS.heavy,
  },
  twoColumnContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  column: {
    width: '48%',
  },
  categoryChip: {
    backgroundColor: '#F4F4F4',
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  categoryChipActive: {
    backgroundColor: '#111111',
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111111',
  },
  chipLabelActive: {
    color: '#FFFFFF',
  },
});

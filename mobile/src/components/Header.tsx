import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Dimensions,
  Platform,
} from 'react-native';
import { LayoutGrid, User, Settings, ChevronDown } from 'lucide-react-native';
import { ActiveTab, TaxonomicCategory } from '../types';
import { COLORS, SHADOWS } from '../theme/colors';
import { FONTS } from '../theme/fonts';

const { width } = Dimensions.get('window');

// 2-column list for category filtering
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
  onSelectTab: (tab: ActiveTab) => void;
  selectedCategory: TaxonomicCategory;
  onSelectCategory: (category: TaxonomicCategory) => void;
  onOpenSettings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  selectedCategory,
  onSelectCategory,
  onOpenSettings,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Hidden on Camera Scanner
  if (activeTab === 'SCANNER') {
    return null;
  }

  // 1. On Dex (Category Grid / INDEX) tab:
  // Shows ONLY the category selector dropdown [ ⊞ All ⌵ ]
  if (activeTab === 'INDEX') {
    return (
      <View style={styles.headerAnchor}>
        <View style={styles.dexCategoryRow}>
          <TouchableOpacity
            style={styles.categorySelectorPill}
            onPress={() => setDropdownOpen(true)}
            activeOpacity={0.85}
          >
            <LayoutGrid size={15} color="#111111" />
            <Text style={styles.categoryPillText}>{selectedCategory}</Text>
            <ChevronDown size={14} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* 2-Column Category Selector Modal */}
        <Modal
          visible={dropdownOpen}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setDropdownOpen(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setDropdownOpen(false)}
          >
            <Pressable
              style={styles.dropdownModalCard}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.dropdownCardInner}>
                <View style={styles.twoColumnWrapper}>
                  {/* Column 1 */}
                  <View style={styles.categoryColumn}>
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
                  <View style={styles.categoryColumn}>
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
  }

  // 2. On Collection tab (CATCHES or PROFILE):
  // Shows the 2-segment switcher [ Catches | Profile ] centered
  // Only displays ⚙️ Settings gear on right when on Profile view!
  const isProfile = activeTab === 'PROFILE';

  return (
    <View style={styles.headerAnchor}>
      <View style={styles.collectionHeaderRow}>
        {/* Top 2-Segment Pill: Centered [ Catches | Profile ] */}
        <View style={styles.segmentedNavPill}>
          {/* Segment 1: Catches */}
          <TouchableOpacity
            style={[
              styles.navSegment,
              activeTab === 'CATCHES' ? styles.navSegmentActive : styles.navSegmentInactive,
            ]}
            onPress={() => onSelectTab('CATCHES')}
            activeOpacity={0.8}
          >
            <LayoutGrid
              size={15}
              color={activeTab === 'CATCHES' ? '#111111' : '#9CA3AF'}
            />
            {activeTab === 'CATCHES' && (
              <Text style={styles.navSegmentLabelActive}>Catches</Text>
            )}
          </TouchableOpacity>

          {/* Segment 2: Profile */}
          <TouchableOpacity
            style={[
              styles.navSegment,
              activeTab === 'PROFILE' ? styles.navSegmentActive : styles.navSegmentInactive,
            ]}
            onPress={() => onSelectTab('PROFILE')}
            activeOpacity={0.8}
          >
            <User
              size={15}
              color={activeTab === 'PROFILE' ? '#111111' : '#9CA3AF'}
            />
            {activeTab === 'PROFILE' && (
              <Text style={styles.navSegmentLabelActive}>Profile</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Right Action: Settings gear ONLY when on Profile view, positioned absolute right */}
        {isProfile && onOpenSettings && (
          <View style={styles.settingsBtnWrapper}>
            <TouchableOpacity
              style={styles.settingsCircleBtn}
              onPress={onOpenSettings}
              activeOpacity={0.8}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Settings size={18} color="#111111" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerAnchor: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 52 : 46,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingHorizontal: 20,
    pointerEvents: 'box-none',
  },

  // Dex View: Centered category pill
  dexCategoryRow: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  categorySelectorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    gap: 8,
    ...SHADOWS.soft,
  },
  categoryPillText: {
    fontSize: 14,
    color: '#111111',
    letterSpacing: -0.2,
    fontFamily: FONTS.brandBold,
  },

  // Collection View: [ Catches | Profile ] centered, Settings on right
  collectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    position: 'relative',
  },
  segmentedNavPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    padding: 3,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    ...SHADOWS.soft,
  },
  navSegment: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 999,
    gap: 6,
    minHeight: 34,
  },
  navSegmentActive: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
  },
  navSegmentInactive: {
    paddingHorizontal: 11,
  },
  navSegmentLabelActive: {
    fontSize: 13,
    color: '#111111',
    letterSpacing: -0.2,
    fontFamily: FONTS.brandBold,
  },

  // Right Actions (Settings button absolute right)
  settingsBtnWrapper: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  settingsCircleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EFEFEF',
    ...SHADOWS.soft,
  },

  // Modal Dropdown Card
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 110 : 100,
  },
  dropdownModalCard: {
    width: width > 400 ? 360 : width - 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    ...SHADOWS.soft,
    overflow: 'hidden',
  },
  dropdownCardInner: {
    padding: 16,
  },
  twoColumnWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  categoryColumn: {
    flex: 1,
    gap: 6,
  },
  categoryChip: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    alignItems: 'center',
  },
  categoryChipActive: {
    backgroundColor: '#111111',
    borderColor: '#111111',
  },
  chipLabel: {
    fontSize: 12.5,
    color: COLORS.textPrimary,
    fontFamily: FONTS.brandRegular,
  },
  chipLabelActive: {
    color: '#FFFFFF',
    fontFamily: FONTS.brandBold,
  },
});

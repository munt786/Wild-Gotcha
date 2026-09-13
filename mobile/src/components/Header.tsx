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
import { ActiveTab, TaxonomicCategory } from '../types';
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
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  selectedCategory,
  onSelectCategory,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Hidden on Scanner tab (Screenshot 4)
  if (activeTab === 'SCANNER') {
    return null;
  }

  return (
    <View style={styles.headerAnchor}>
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
    alignItems: 'center',
    justifyContent: 'center',
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

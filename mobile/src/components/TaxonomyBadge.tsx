import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TaxonomyClass } from '../types';
import { getTaxonomyColor, getTaxonomyIcon } from '../theme/colors';

interface TaxonomyBadgeProps {
  taxonomyClass: TaxonomyClass;
  size?: 'sm' | 'md' | 'lg';
}

export const TaxonomyBadge: React.FC<TaxonomyBadgeProps> = ({
  taxonomyClass,
  size = 'md',
}) => {
  const color = getTaxonomyColor(taxonomyClass);
  const icon = getTaxonomyIcon(taxonomyClass);

  const isSmall = size === 'sm';
  const isLarge = size === 'lg';

  return (
    <View
      style={[
        styles.badge,
        {
          borderColor: color,
          backgroundColor: `${color}1A`, // 10% opacity tint
          paddingVertical: isSmall ? 3 : isLarge ? 8 : 5,
          paddingHorizontal: isSmall ? 8 : isLarge ? 14 : 10,
        },
      ]}
    >
      <Text style={[styles.icon, isSmall && styles.iconSm, isLarge && styles.iconLg]}>
        {icon}
      </Text>
      <Text
        style={[
          styles.text,
          { color: color },
          isSmall && styles.textSm,
          isLarge && styles.textLg,
        ]}
      >
        {taxonomyClass.toUpperCase()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1.2,
    alignSelf: 'flex-start',
  },
  icon: {
    fontSize: 13,
    marginRight: 6,
  },
  iconSm: {
    fontSize: 11,
    marginRight: 4,
  },
  iconLg: {
    fontSize: 16,
    marginRight: 8,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  textSm: {
    fontSize: 10,
    letterSpacing: 0.5,
  },
  textLg: {
    fontSize: 14,
    letterSpacing: 1.0,
  },
});

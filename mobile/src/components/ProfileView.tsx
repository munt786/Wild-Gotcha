import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Circle } from 'react-native-svg';
import {
  Pencil,
  Camera,
  ChevronRight,
  Check,
  Trash2,
  X,
} from 'lucide-react-native';
import { CatchRecord, Specimen, UserProfile, ActiveTab } from '../types';
import { ProgressionService, LevelInfo } from '../services/progressionService';
import { SupabaseService } from '../services/supabaseService';
import { COLORS, SHADOWS } from '../theme/colors';
import { FONTS } from '../theme/fonts';

interface ProfileViewProps {
  user: UserProfile | null;
  catches: CatchRecord[];
  specimens: Specimen[];
  onSelectTab: (tab: ActiveTab) => void;
  onOpenCatchDetail: (catchRecord: CatchRecord) => void;
  onUpdateHandle?: (newHandle: string) => void;
  onUpdateAvatar?: (newAvatarUri: string) => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  Mammals: '🐾',
  Birds: '🐦',
  Reptiles: '🦎',
  Amphibians: '🐸',
  Fish: '🐟',
  Insects: '🪲',
  Arachnids: '🕷️',
  Mollusks: '🐌',
  Crustaceans: '🦀',
  Invertebrates: '🪱',
};

const GAUGE_RADIUS = 28;
const GAUGE_CIRCUMFERENCE = 2 * Math.PI * GAUGE_RADIUS;

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  catches = [],
  specimens = [],
  onSelectTab,
  onOpenCatchDetail,
  onUpdateHandle,
  onUpdateAvatar,
}) => {
  const [isEditingHandle, setIsEditingHandle] = useState(false);
  const [handleInput, setHandleInput] = useState(
    user?.handle || `@${(user?.displayName || 'collector').toLowerCase().replace(/\s+/g, '_')}`
  );
  const [handleError, setHandleError] = useState<string | null>(null);
  const [isCheckingHandle, setIsCheckingHandle] = useState(false);
  const [isAvatarModalVisible, setIsAvatarModalVisible] = useState(false);

  React.useEffect(() => {
    if (user?.handle) {
      setHandleInput(user.handle);
    }
  }, [user?.handle]);

  let progression: LevelInfo;
  try {
    progression = ProgressionService.getProgression(catches, specimens);
  } catch (err) {
    console.warn('ProfileView progression calculation note:', err);
    progression = ProgressionService.getLevelInfo(0);
  }

  // Count species caught per rarity (raw counts, no limits)
  const rarityCounts = {
    Common: 0,
    Uncommon: 0,
    Rare: 0,
    Epic: 0,
    Legendary: 0,
    Secret: 0,
  };

  specimens.forEach((s) => {
    const rawRarity = String(s.rarity || 'COMMON').toUpperCase();
    if (rawRarity === 'SECRET') rarityCounts.Secret += 1;
    else if (rawRarity === 'LEGENDARY') rarityCounts.Legendary += 1;
    else if (rawRarity === 'EPIC') rarityCounts.Epic += 1;
    else if (rawRarity === 'RARE') rarityCounts.Rare += 1;
    else if (rawRarity === 'UNCOMMON') rarityCounts.Uncommon += 1;
    else rarityCounts.Common += 1;
  });

  // Count species caught per category (raw counts, no limits)
  const categoryCounts: Record<string, number> = {};
  Object.keys(CATEGORY_ICONS).forEach((k) => {
    categoryCounts[k] = 0;
  });

  specimens.forEach((s) => {
    const cat = s.category || 'Invertebrates';
    if (categoryCounts[cat] !== undefined) {
      categoryCounts[cat] += 1;
    } else {
      categoryCounts['Invertebrates'] = (categoryCounts['Invertebrates'] || 0) + 1;
    }
  });

  // Recent 5 catches (sorted newest first)
  const recentCatches = [...catches].reverse().slice(0, 5);

  const xpRemainingToNext = progression.isMaxLevel
    ? 0
    : Math.max(0, progression.expToNextLevel - progression.currentLevelExp);

  const clampedProgress = Math.min(100, Math.max(0, progression.progressPercent));
  const strokeDashoffset = GAUGE_CIRCUMFERENCE * (1 - clampedProgress / 100);

  const handleSaveHandle = async () => {
    let clean = handleInput.trim();
    if (!clean.startsWith('@')) clean = `@${clean}`;

    const rawTag = clean.substring(1).toLowerCase();

    // 1. Minimum & maximum length
    if (rawTag.length < 3) {
      setHandleError('Username must be at least 3 characters.');
      return;
    }
    if (rawTag.length > 20) {
      setHandleError('Username cannot exceed 20 characters.');
      return;
    }

    // 2. Character set validation
    if (!/^[a-z0-9_]+$/.test(rawTag)) {
      setHandleError('Letters, numbers, and underscores only.');
      return;
    }

    // If unchanged, exit edit mode smoothly
    if (user?.handle && user.handle.toLowerCase() === `@${rawTag}`) {
      setHandleError(null);
      setIsEditingHandle(false);
      return;
    }

    setIsCheckingHandle(true);
    setHandleError(null);

    try {
      const isTaken = await SupabaseService.isHandleTaken(rawTag, user?.id);
      if (isTaken) {
        setHandleError(`@${rawTag} is already taken. Please choose another.`);
        setIsCheckingHandle(false);
        return;
      }

      setIsCheckingHandle(false);
      setIsEditingHandle(false);
      if (onUpdateHandle) {
        onUpdateHandle(`@${rawTag}`);
      }
    } catch {
      setIsCheckingHandle(false);
      setIsEditingHandle(false);
      if (onUpdateHandle) {
        onUpdateHandle(`@${rawTag}`);
      }
    }
  };

  const handleAvatarPress = () => {
    if (user?.avatarUrl) {
      setIsAvatarModalVisible(true);
    } else {
      handleChangeAvatar();
    }
  };

  const handleChangeAvatar = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (!res.canceled && res.assets && res.assets[0]) {
        const selectedUri = res.assets[0].uri;
        if (onUpdateAvatar) {
          onUpdateAvatar(selectedUri);
        }
      }
    } catch (err: any) {
      console.warn('Avatar change note:', err);
    }
  };

  const handleRemoveAvatar = () => {
    setIsAvatarModalVisible(false);
    if (onUpdateAvatar) {
      onUpdateAvatar('');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
      {/* 1. Profile Avatar & Handle Header */}
      <View style={styles.avatarSection}>
        <View style={styles.avatarOuter}>
          <TouchableOpacity
            style={styles.avatarWrapper}
            onPress={handleAvatarPress}
            activeOpacity={0.85}
          >
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {(user?.displayName || 'L').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Camera Badge: specifically for adding/changing avatar */}
          <TouchableOpacity
            style={styles.cameraIconBadge}
            onPress={handleChangeAvatar}
            activeOpacity={0.8}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Camera size={13} color="#111111" />
          </TouchableOpacity>
        </View>

        {isEditingHandle ? (
          <View style={{ alignItems: 'center' }}>
            <View style={styles.handleEditRow}>
              <TextInput
                style={styles.handleInput}
                value={handleInput}
                onChangeText={(t) => {
                  setHandleInput(t);
                  if (handleError) setHandleError(null);
                }}
                autoFocus
                onSubmitEditing={handleSaveHandle}
                returnKeyType="done"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isCheckingHandle}
              />
              <TouchableOpacity
                style={[styles.saveHandleBtn, isCheckingHandle && { opacity: 0.6 }]}
                onPress={handleSaveHandle}
                disabled={isCheckingHandle}
                activeOpacity={0.8}
              >
                <Check size={14} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelHandleBtn}
                onPress={() => {
                  setHandleInput(user?.handle || `@${(user?.displayName || 'collector').toLowerCase().replace(/\s+/g, '_')}`);
                  setHandleError(null);
                  setIsEditingHandle(false);
                }}
                activeOpacity={0.8}
              >
                <X size={14} color="#6B7280" />
              </TouchableOpacity>
            </View>
            {handleError && (
              <Text style={styles.handleErrorText}>{handleError}</Text>
            )}
          </View>
        ) : (
          <TouchableOpacity
            style={styles.handleRow}
            onPress={() => {
              setHandleError(null);
              setIsEditingHandle(true);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.handleText}>{user?.handle || handleInput}</Text>
            <Pencil size={13} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* 2. Level & EXP Progress Card with Circular Gauge */}
      <View style={styles.levelCard}>
        <View style={styles.levelCardMain}>
          {/* Circular Level EXP Meter Gauge */}
          <View style={styles.levelGaugeContainer}>
            <Svg width={68} height={68} style={styles.levelGaugeSvg}>
              {/* Background Track */}
              <Circle
                cx={34}
                cy={34}
                r={GAUGE_RADIUS}
                stroke="#E5E7EB"
                strokeWidth={4.5}
                fill="#FFFFFF"
              />
              {/* Foreground Progress Arc (Sweeps clockwise from 12 o'clock) */}
              <Circle
                cx={34}
                cy={34}
                r={GAUGE_RADIUS}
                stroke="#111111"
                strokeWidth={4.5}
                fill="none"
                strokeDasharray={GAUGE_CIRCUMFERENCE}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                rotation="-90"
                origin="34, 34"
              />
            </Svg>

            {/* Inner Content: LVL & Level Number */}
            <View style={styles.levelGaugeInner}>
              <Text style={styles.levelRingLabel}>LVL</Text>
              <Text style={styles.levelRingNum}>{progression.level}</Text>
            </View>
          </View>

          {/* Level Info & Progress Track */}
          <View style={styles.levelInfoCol}>
            <Text style={styles.levelTitle}>Level {progression.level}</Text>
            <Text style={styles.rankSubtitle}>
              {progression.rankBadgeEmoji} {progression.rankTitle}
            </Text>

            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progression.progressPercent}%` },
                ]}
              />
            </View>

            <Text style={styles.xpRemainingText}>
              {progression.isMaxLevel
                ? '⭐ Max Level Reached!'
                : `${xpRemainingToNext.toLocaleString()} XP to level ${progression.level + 1}`}
            </Text>
          </View>
        </View>
      </View>

      {/* 3. Stats Summary Grid (Raw counts, no limits) */}
      <View style={styles.statsSummaryGrid}>
        <View style={styles.statSummaryBox}>
          <Text style={styles.statSummaryValue}>{specimens.length}</Text>
          <Text style={styles.statSummaryLabel}>Species</Text>
        </View>

        <View style={styles.statSummaryBox}>
          <Text style={styles.statSummaryValue}>{catches.length}</Text>
          <Text style={styles.statSummaryLabel}>Catches</Text>
        </View>

        <View style={styles.statSummaryBox}>
          <Text style={styles.statSummaryValue}>Lv. {progression.level}</Text>
          <Text style={styles.statSummaryLabel}>Level</Text>
        </View>
      </View>

      {/* 4. BY RARITY Section (Normal weight numbers, no limits) */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>BY RARITY</Text>
      </View>
      <View style={styles.breakdownCard}>
        <View style={styles.breakdownRow}>
          <View style={styles.breakdownLeft}>
            <View style={[styles.rarityDot, { backgroundColor: COLORS.rarityCommon }]} />
            <Text style={styles.breakdownName}>Common</Text>
          </View>
          <Text style={styles.breakdownCount}>{rarityCounts.Common}</Text>
        </View>

        <View style={styles.breakdownRow}>
          <View style={styles.breakdownLeft}>
            <View style={[styles.rarityDot, { backgroundColor: COLORS.rarityUncommon }]} />
            <Text style={styles.breakdownName}>Uncommon</Text>
          </View>
          <Text style={styles.breakdownCount}>{rarityCounts.Uncommon}</Text>
        </View>

        <View style={styles.breakdownRow}>
          <View style={styles.breakdownLeft}>
            <View style={[styles.rarityDot, { backgroundColor: COLORS.rarityRare }]} />
            <Text style={styles.breakdownName}>Rare</Text>
          </View>
          <Text style={styles.breakdownCount}>{rarityCounts.Rare}</Text>
        </View>

        <View style={styles.breakdownRow}>
          <View style={styles.breakdownLeft}>
            <View style={[styles.rarityDot, { backgroundColor: COLORS.rarityEpic }]} />
            <Text style={styles.breakdownName}>Epic</Text>
          </View>
          <Text style={styles.breakdownCount}>{rarityCounts.Epic}</Text>
        </View>

        <View style={styles.breakdownRow}>
          <View style={styles.breakdownLeft}>
            <View style={[styles.rarityDot, { backgroundColor: COLORS.rarityLegendary }]} />
            <Text style={styles.breakdownName}>Legendary</Text>
          </View>
          <Text style={styles.breakdownCount}>{rarityCounts.Legendary}</Text>
        </View>

        <View style={[styles.breakdownRow, { borderBottomWidth: 0 }]}>
          <View style={styles.breakdownLeft}>
            <View style={[styles.rarityDot, { backgroundColor: COLORS.raritySecret }]} />
            <Text style={[styles.breakdownName, { color: COLORS.raritySecret }]}>
              Secret
            </Text>
          </View>
          <Text style={[styles.breakdownCount, { color: COLORS.raritySecret }]}>
            {rarityCounts.Secret}
          </Text>
        </View>
      </View>

      {/* 5. BY TYPE Section (Normal weight numbers, no limits) */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>BY TYPE</Text>
      </View>
      <View style={styles.breakdownCard}>
        {Object.entries(CATEGORY_ICONS).map(([categoryName, iconStr], index, arr) => {
          const isLast = index === arr.length - 1;
          const count = categoryCounts[categoryName] || 0;
          return (
            <View
              key={categoryName}
              style={[styles.breakdownRow, isLast && { borderBottomWidth: 0 }]}
            >
              <View style={styles.breakdownLeft}>
                <Text style={styles.categoryIconText}>{iconStr}</Text>
                <Text style={styles.breakdownName}>{categoryName}</Text>
              </View>
              <Text style={styles.breakdownCount}>{count}</Text>
            </View>
          );
        })}
      </View>

      {/* 6. RECENT CATCHES Section */}
      {recentCatches.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>RECENT CATCHES</Text>
          </View>
          <View style={styles.recentCatchesCard}>
            {recentCatches.map((c) => (
              <TouchableOpacity
                key={c.catch_id}
                style={styles.recentCatchRow}
                onPress={() => onOpenCatchDetail(c)}
                activeOpacity={0.7}
              >
                <View style={styles.recentThumbnailWrapper}>
                  {c.image_url ? (
                    <Image source={{ uri: c.image_url }} style={styles.recentThumbnailImage} />
                  ) : (
                    <Text style={styles.recentThumbnailFallback}>🐾</Text>
                  )}
                </View>

                <View style={styles.recentCatchDetails}>
                  <Text style={styles.recentCatchName} numberOfLines={1}>
                    {c.common_name}
                  </Text>
                  <Text style={styles.recentCatchSub} numberOfLines={1}>
                    {c.breed && c.breed !== 'Wild Species' ? c.breed : c.category || 'Wildlife'}
                  </Text>
                </View>

                <Text style={styles.recentCatchDate}>
                  {c.caught_at ? c.caught_at.split('•')[0].trim() : 'Recent'}
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.viewAllBtn}
              onPress={() => onSelectTab('CATCHES')}
              activeOpacity={0.75}
            >
              <Text style={styles.viewAllBtnText}>
                View all {catches.length} catches
              </Text>
              <ChevronRight size={16} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Generous bottom spacer so content is fully scrollable above bottom dock */}
      <View style={{ height: 120 }} />
    </ScrollView>

    {/* Avatar Preview & Remove Modal */}
    <Modal
      visible={isAvatarModalVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setIsAvatarModalVisible(false)}
    >
      <View style={styles.avatarModalBackdrop}>
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={() => setIsAvatarModalVisible(false)}
        />
        <View style={styles.avatarModalCard}>
          {/* Modal Header */}
          <View style={styles.avatarModalHeader}>
            <Text style={styles.avatarModalTitle}>Profile Photo</Text>
            <TouchableOpacity
              style={styles.avatarModalCloseBtn}
              onPress={() => setIsAvatarModalVisible(false)}
              activeOpacity={0.7}
            >
              <X size={18} color="#111111" />
            </TouchableOpacity>
          </View>

          {/* Square 1:1 (n:n) Preview */}
          <View style={styles.avatarModalPreviewContainer}>
            {user?.avatarUrl ? (
              <Image
                source={{ uri: user.avatarUrl }}
                style={styles.avatarModalPreviewImage}
                resizeMode="cover"
              />
            ) : null}
          </View>

          {/* Action Buttons */}
          <View style={styles.avatarModalActions}>
            <TouchableOpacity
              style={styles.avatarModalChangeBtn}
              onPress={() => {
                setIsAvatarModalVisible(false);
                setTimeout(() => handleChangeAvatar(), 250);
              }}
              activeOpacity={0.8}
            >
              <Camera size={16} color="#111111" />
              <Text style={styles.avatarModalChangeText}>Change Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.avatarModalRemoveBtn}
              onPress={handleRemoveAvatar}
              activeOpacity={0.8}
            >
              <Trash2 size={16} color="#EF4444" />
              <Text style={styles.avatarModalRemoveText}>Remove Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 120 : 112,
    paddingBottom: 24,
  },

  // 1. Avatar & Handle
  avatarSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarOuter: {
    position: 'relative',
    width: 88,
    height: 88,
  },
  avatarWrapper: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    ...SHADOWS.soft,
  },
  avatarImage: {
    width: 84,
    height: 84,
    borderRadius: 42,
  },
  avatarPlaceholder: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 34,
    fontWeight: '900',
    color: COLORS.textPrimary,
    fontFamily: FONTS.brandBold,
  },
  cameraIconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#FFFFFF',
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    ...SHADOWS.soft,
  },
  handleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  handleText: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
    fontFamily: FONTS.brandBold,
  },
  handleEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  handleInput: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  saveHandleBtn: {
    backgroundColor: COLORS.accentGreen,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelHandleBtn: {
    backgroundColor: '#F3F4F6',
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handleErrorText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#EF4444',
    marginTop: 6,
    textAlign: 'center',
  },

  // 2. Level Card & Circular Gauge
  levelCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    ...SHADOWS.soft,
  },
  levelCardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  levelGaugeContainer: {
    width: 68,
    height: 68,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelGaugeSvg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  levelGaugeInner: {
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  levelRingLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    fontFamily: FONTS.brandBold,
  },
  levelRingNum: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111111',
    lineHeight: 24,
    fontFamily: FONTS.brandBold,
  },
  levelInfoCol: {
    flex: 1,
  },
  levelTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#111111',
    letterSpacing: -0.2,
    fontFamily: FONTS.brandBold,
  },
  rankSubtitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginTop: 2,
    marginBottom: 8,
    fontFamily: FONTS.brandBold,
  },
  progressTrack: {
    height: 7,
    backgroundColor: '#F3F4F6',
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#111111',
    borderRadius: 999,
  },
  xpRemainingText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
    fontFamily: FONTS.brandRegular,
  },

  // 3. Stats Summary Grid (Species, Catches, Level)
  statsSummaryGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statSummaryBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    ...SHADOWS.soft,
  },
  statSummaryValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111111',
    letterSpacing: -0.3,
    fontFamily: FONTS.brandBold,
  },
  statSummaryLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginTop: 3,
    fontFamily: FONTS.brandBold,
  },

  // Section Headers
  sectionHeader: {
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.8,
    fontFamily: FONTS.brandBold,
  },

  // Breakdown Card (By Rarity & By Type)
  breakdownCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    marginBottom: 14,
    ...SHADOWS.soft,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rarityDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  categoryIconText: {
    fontSize: 16,
  },
  breakdownName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    fontFamily: FONTS.brandBold,
  },
  // Apollo numbers with clean styling
  breakdownCount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    fontFamily: FONTS.numbers,
  },

  // Recent Catches Card
  recentCatchesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    marginBottom: 14,
    ...SHADOWS.soft,
  },
  recentCatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  recentThumbnailWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  recentThumbnailImage: {
    width: 44,
    height: 44,
  },
  recentThumbnailFallback: {
    fontSize: 20,
  },
  recentCatchDetails: {
    flex: 1,
  },
  recentCatchName: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    fontFamily: FONTS.brandBold,
  },
  recentCatchSub: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: 2,
    fontFamily: FONTS.brandRegular,
  },
  recentCatchDate: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.textMuted,
    fontFamily: FONTS.numbers,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  viewAllBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: COLORS.textPrimary,
    fontFamily: FONTS.brandBold,
  },

  // Avatar Preview & Remove Modal
  avatarModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  avatarModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 340,
    padding: 20,
    alignItems: 'center',
    ...SHADOWS.heavy,
  },
  avatarModalHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  avatarModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    fontFamily: FONTS.brandBold,
  },
  avatarModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarModalPreviewContainer: {
    width: 200,
    height: 200,
    borderRadius: 100,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#F3F4F6',
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  avatarModalPreviewImage: {
    width: 200,
    height: 200,
  },
  avatarModalActions: {
    width: '100%',
    gap: 10,
  },
  avatarModalChangeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
  },
  avatarModalChangeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111111',
    fontFamily: FONTS.brandBold,
  },
  avatarModalRemoveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
  },
  avatarModalRemoveText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
    fontFamily: FONTS.brandBold,
  },
});

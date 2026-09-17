import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Switch,
  Pressable,
} from 'react-native';
import {
  Check,
  ChevronRight,
  Globe,
  Bell,
  LogOut,
  Trash2,
} from 'lucide-react-native';
import { UserProfile } from '../types';
import { COLORS, SHADOWS } from '../theme/colors';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  user: UserProfile | null;
  onSignOut: () => void;
  onDeleteAccount: () => void;
  onTriggerSync?: () => void;
  isCloudConfigured?: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  visible,
  onClose,
  user,
  onSignOut,
  onDeleteAccount,
  onTriggerSync,
  isCloudConfigured = false,
}) => {
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Custom In-App Confirmation Modal state (eliminates browser/system popups)
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    confirmText: string;
    isDestructive: boolean;
    onConfirm: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    confirmText: '',
    isDestructive: false,
    onConfirm: () => {},
  });

  if (!visible) return null;

  const handleLogOutPress = () => {
    setConfirmModal({
      visible: true,
      title: 'Log Out',
      message: 'Are you sure you want to log out? Your captured species and progress remain saved on this device.',
      confirmText: 'Log Out',
      isDestructive: false,
      onConfirm: () => {
        setConfirmModal((prev) => ({ ...prev, visible: false }));
        onClose();
        onSignOut();
      },
    });
  };

  const handleDeleteAccountPress = () => {
    setConfirmModal({
      visible: true,
      title: 'Delete Account',
      message: 'Are you sure you want to delete your account? All your catches, dex entries, and progress will be permanently deleted. This action cannot be undone.',
      confirmText: 'Delete',
      isDestructive: true,
      onConfirm: () => {
        setConfirmModal((prev) => ({ ...prev, visible: false }));
        onClose();
        onDeleteAccount();
      },
    });
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent={true}
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />

          <View style={styles.modalSheet}>
            {/* Top Drag Indicator & Header */}
            <View style={styles.topBar}>
              <View style={styles.dragPill} />
              <View style={styles.headerRow}>
                <Text style={styles.headerTitle}>Settings</Text>
                <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
                  <Text style={styles.doneBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView
              style={styles.scrollContainer}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* 1. ACCOUNT Section */}
              <Text style={styles.sectionTitle}>ACCOUNT</Text>
              <View style={styles.cardGroup}>
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Collector ID</Text>
                  <Text style={styles.rowValueMuted}>
                    {user?.handle || `@${(user?.displayName || 'collector').toLowerCase().replace(/\s+/g, '_')}`}
                  </Text>
                </View>

                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Email</Text>
                  <Text style={styles.rowValueMuted}>
                    {user?.email || (user?.isGuest ? 'Guest Account' : 'Offline')}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.row}
                  onPress={handleLogOutPress}
                  activeOpacity={0.7}
                >
                  <Text style={styles.rowLabel}>Log out</Text>
                  <ChevronRight size={16} color={COLORS.textMuted} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.row, { borderBottomWidth: 0 }]}
                  onPress={handleDeleteAccountPress}
                  activeOpacity={0.7}
                >
                  <Text style={styles.rowLabelDanger}>Delete account</Text>
                  <ChevronRight size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>

              {/* 2. BACKUP Section */}
              <Text style={styles.sectionTitle}>BACKUP</Text>
              <View style={styles.cardGroup}>
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Cloud backup</Text>
                  <View style={styles.badgeRow}>
                    <Text style={styles.backedUpText}>
                      {isCloudConfigured ? 'Backed up' : 'On-Device Storage'}
                    </Text>
                    {isCloudConfigured && (
                      <View style={styles.checkCircle}>
                        <Check size={12} color="#FFFFFF" strokeWidth={3} />
                      </View>
                    )}
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.row, { borderBottomWidth: 0 }]}
                  onPress={() => {
                    if (onTriggerSync) {
                      onTriggerSync();
                    }
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.rowLabel}>Back up now</Text>
                  <ChevronRight size={16} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>

              {/* 3. PREFERENCES Section */}
              <Text style={styles.sectionTitle}>PREFERENCES</Text>
              <View style={styles.cardGroup}>
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => setNotificationsEnabled(!notificationsEnabled)}
                  activeOpacity={0.7}
                >
                  <View style={styles.iconLabelRow}>
                    <Bell size={16} color={COLORS.textMuted} />
                    <Text style={styles.rowLabel}>Notifications</Text>
                  </View>
                  <View style={styles.badgeRow}>
                    <Text style={styles.rowValueMuted}>
                      {notificationsEnabled ? 'Enabled' : 'Disabled'}
                    </Text>
                    <ChevronRight size={16} color={COLORS.textMuted} />
                  </View>
                </TouchableOpacity>

                <View style={styles.row}>
                  <View style={styles.iconLabelRow}>
                    <Globe size={16} color={COLORS.textMuted} />
                    <Text style={styles.rowLabel}>Language</Text>
                  </View>
                  <View style={styles.badgeRow}>
                    <Text style={styles.rowValueMuted}>System default</Text>
                    <ChevronRight size={16} color={COLORS.textMuted} />
                  </View>
                </View>

                <View style={[styles.row, { borderBottomWidth: 0, paddingVertical: 10 }]}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={styles.rowLabel}>Haptics</Text>
                    <Text style={styles.rowSubLabel}>Vibration feedback on catches and taps.</Text>
                  </View>
                  <Switch
                    value={hapticsEnabled}
                    onValueChange={setHapticsEnabled}
                    trackColor={{ false: '#D1D5DB', true: '#111111' }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>

              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Custom In-App Confirmation Modal (Zero System / Native Alerts) */}
      <Modal
        visible={confirmModal.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setConfirmModal((prev) => ({ ...prev, visible: false }))}
      >
        <View style={styles.confirmBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setConfirmModal((prev) => ({ ...prev, visible: false }))}
          />
          <View style={styles.confirmCard}>
            <View
              style={[
                styles.confirmIconBadge,
                confirmModal.isDestructive ? styles.confirmIconBadgeDanger : styles.confirmIconBadgeNeutral,
              ]}
            >
              {confirmModal.isDestructive ? (
                <Trash2 size={24} color="#EF4444" strokeWidth={2} />
              ) : (
                <LogOut size={24} color="#111111" strokeWidth={2} />
              )}
            </View>

            <Text style={styles.confirmTitle}>{confirmModal.title}</Text>
            <Text style={styles.confirmMessage}>{confirmModal.message}</Text>

            <View style={styles.confirmActionsRow}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => setConfirmModal((prev) => ({ ...prev, visible: false }))}
                activeOpacity={0.7}
              >
                <Text style={styles.confirmCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmActionBtn,
                  confirmModal.isDestructive ? styles.confirmActionBtnDanger : styles.confirmActionBtnPrimary,
                ]}
                onPress={confirmModal.onConfirm}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmActionBtnText}>{confirmModal.confirmText}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#F9FAFB',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    paddingTop: 10,
  },
  topBar: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dragPill: {
    width: 38,
    height: 4.5,
    borderRadius: 999,
    backgroundColor: '#D1D5DB',
    marginBottom: 12,
  },
  headerRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: -0.4,
  },
  doneBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  cardGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    ...SHADOWS.soft,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  rowLabelDanger: {
    fontSize: 15,
    fontWeight: '700',
    color: '#EF4444',
  },
  rowSubLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textMuted,
    marginTop: 2,
  },
  rowValueMuted: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  iconLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backedUpText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.accentGreen,
  },
  checkCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.accentGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Confirmation Modal Styles
  confirmBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    ...SHADOWS.heavy,
  },
  confirmIconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  confirmIconBadgeNeutral: {
    backgroundColor: '#F3F4F6',
  },
  confirmIconBadgeDanger: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  confirmTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  confirmMessage: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  confirmActionsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCancelBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
  },
  confirmActionBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmActionBtnPrimary: {
    backgroundColor: '#111111',
  },
  confirmActionBtnDanger: {
    backgroundColor: '#EF4444',
  },
  confirmActionBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

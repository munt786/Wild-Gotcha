import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  Dimensions,
  Platform,
  Linking,
} from 'react-native';
import { UserProfile, CloudSyncStatus, CatchRecord } from '../types';
import { SupabaseService } from '../services/supabaseService';
import { StorageService } from '../services/storageService';
import { COLORS, SHADOWS } from '../theme/colors';

const { width } = Dimensions.get('window');

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
  user: UserProfile | null;
  onUserChange: (user: UserProfile | null) => void;
  catchesCount: number;
  uniqueCount: number;
  onTriggerSync?: () => void;
  syncStatus?: CloudSyncStatus;
  onAccountDeleted?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  visible,
  onClose,
  user,
  onUserChange,
  catchesCount,
  uniqueCount,
  onTriggerSync,
  syncStatus = 'offline_saved',
  onAccountDeleted,
}) => {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpToken, setOtpToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{ text: string; isError: boolean } | null>(null);

  // Account deletion modal state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const isConfigured = SupabaseService.isConfigured();

  const validateEmail = (emailStr: string): boolean => {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(emailStr.trim());
  };

  const validatePassword = (passStr: string): { valid: boolean; error?: string } => {
    if (passStr.length < 8) {
      return { valid: false, error: 'Password must be at least 8 characters long.' };
    }
    if (!/[a-zA-Z]/.test(passStr)) {
      return { valid: false, error: 'Password must contain at least one letter (a-z, A-Z).' };
    }
    if (!/[0-9]/.test(passStr)) {
      return { valid: false, error: 'Password must contain at least one number (0-9).' };
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`§±]/.test(passStr)) {
      return { valid: false, error: 'Password must contain at least one symbol (e.g. ! @ # $ % ^ & *).' };
    }
    return { valid: true };
  };

  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) {
      setNotice({ text: 'Please enter both email and password.', isError: true });
      return;
    }
    if (!validateEmail(email)) {
      setNotice({ text: 'Please enter a valid email address (e.g. name@gmail.com).', isError: true });
      return;
    }

    setLoading(true);
    setNotice(null);

    if (authMode === 'signup') {
      if (!displayName.trim()) {
        setLoading(false);
        setNotice({ text: 'Please enter your name.', isError: true });
        return;
      }
      const passCheck = validatePassword(password);
      if (!passCheck.valid) {
        setLoading(false);
        setNotice({ text: passCheck.error || 'Password must be at least 8 characters with letters, numbers, and symbols.', isError: true });
        return;
      }

      const res = await SupabaseService.requestSignUpOtp(
        email.trim(),
        password.trim(),
        displayName.trim()
      );
      setLoading(false);
      if (res.success) {
        if (res.user) {
          onUserChange(res.user);
          setNotice({ text: '🎉 Welcome to WildGotcha! Account created.', isError: false });
          setTimeout(() => onClose(), 1200);
          return;
        }
        if (res.autoVerified) {
          setAuthMode('signin');
          setPassword('');
          setNotice({ text: '🎉 Account created! Please sign in with your password.', isError: false });
        } else {
          setOtpToken('');
          setShowOtpModal(true);
        }
      } else {
        setNotice({ text: res.error || 'Failed to dispatch verification code.', isError: true });
      }
    } else {
      const res = await SupabaseService.signIn(email.trim(), password.trim());
      setLoading(false);
      if (res.error) {
        setNotice({ text: res.error, isError: true });
      } else if (res.user) {
        onUserChange(res.user);
        setNotice({ text: 'Welcome back! Signed in successfully.', isError: false });
        setTimeout(() => onClose(), 1200);
      }
    }
  };

  const handleVerifySignUpOtp = async () => {
    if (!otpToken.trim() || otpToken.trim().length < 6) {
      setNotice({ text: 'Please enter the 6-digit verification code.', isError: true });
      return;
    }
    setLoading(true);
    setNotice(null);
    const res = await SupabaseService.verifySignUpOtp(email.trim(), otpToken.trim());
    setLoading(false);
    if (res.success) {
      setShowOtpModal(false);
      setPassword('');
      setOtpToken('');
      setAuthMode('signin');
      setNotice({
        text: '🎉 Account verified and created! Please sign in with your password.',
        isError: false,
      });
    } else {
      setNotice({
        text: res.error || 'Invalid or expired verification code.',
        isError: true,
      });
    }
  };

  const handleGoogleSignIn = async () => {
    setNotice(null);
    setLoading(true);
    const res = await SupabaseService.signInWithGoogle();
    if (res.error) {
      setLoading(false);
      setNotice({ text: res.error, isError: true });
    } else if (res.url) {
      try {
        const testRes = await fetch(res.url);
        if (testRes.status === 400) {
          const data = await testRes.json().catch(() => ({}));
          if (data.msg && data.msg.includes('Unsupported provider')) {
            setLoading(false);
            setNotice({
              text: 'Google Sign-In is currently unavailable. Please sign in with your email and password.',
              isError: true,
            });
            return;
          }
        }
      } catch (_) {}

      setLoading(false);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.location.href = res.url;
      } else {
        await Linking.openURL(res.url);
      }
    }
  };

  const handleGuestMode = () => {
    const guest = SupabaseService.createGuestProfile();
    onUserChange(guest);
    onClose();
  };

  const handleSignOut = async () => {
    setLoading(true);
    await SupabaseService.signOut();
    onUserChange(null);
    setLoading(false);
    onClose();
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeletingAccount(true);
    try {
      await SupabaseService.deleteAccount(user.id, user.email);
    } catch (err) {
      console.warn('Delete account note:', err);
    } finally {
      setDeletingAccount(false);
      setShowDeleteConfirm(false);
      onClose();
      if (onAccountDeleted) {
        onAccountDeleted();
      } else {
        onUserChange(null);
      }
    }
  };

  return (
    <>
      <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Explorer Passport</Text>
              <Text style={styles.modalSubtitle}>Cloud Sync & User Profile</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Logged-In User Profile Card */}
            {user && !user.isGuest ? (
              <View style={styles.profileCard}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarEmoji}>🐾</Text>
                </View>
                <Text style={styles.profileName}>{user.displayName}</Text>
                <Text style={styles.profileEmail}>{user.email}</Text>

                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>
                    Level {Math.max(1, Math.floor(uniqueCount / 3) + 1)} • {user.rankTitle}
                  </Text>
                </View>

                {/* Stats Grid */}
                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <Text style={styles.statNumber}>{catchesCount}</Text>
                    <Text style={styles.statLabel}>Catches</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statNumber}>{uniqueCount}</Text>
                    <Text style={styles.statLabel}>Unique Dex</Text>
                  </View>
                </View>

                {/* Cloud Sync Status Box */}
                <View style={styles.syncCard}>
                  <View style={styles.syncCardHeader}>
                    <Text style={styles.syncIcon}>☁️</Text>
                    <View style={styles.syncCardInfo}>
                      <Text style={styles.syncStatusTitle}>
                        {isConfigured ? 'Cloud Backup Active' : 'On-Device Storage'}
                      </Text>
                      <Text style={styles.syncStatusSubtitle}>
                        {isConfigured
                          ? 'Your catches & Dex are safe in PostgreSQL cloud storage.'
                          : 'Catches are safely saved on this device (configure Supabase URL for cloud sync).'}
                      </Text>
                    </View>
                  </View>

                  {onTriggerSync && (
                    <TouchableOpacity
                      style={styles.syncActionBtn}
                      onPress={onTriggerSync}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.syncActionBtnText}>🔄 Sync Cloud Now</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.signOutBtn}
                  onPress={handleSignOut}
                  activeOpacity={0.8}
                >
                  <Text style={styles.signOutBtnText}>Sign Out</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteAccountBtn}
                  onPress={() => setShowDeleteConfirm(true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.deleteAccountBtnText}>🗑️ Delete Account & All Data</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* Not Signed In: Login / Register / OTP View */
              <View style={styles.authContainer}>
                {/* Guest info banner if currently guest */}
                {user?.isGuest && (
                  <View style={styles.guestBanner}>
                    <Text style={styles.guestBannerTitle}>Currently Playing as Guest</Text>
                    <Text style={styles.guestBannerSubtitle}>
                      Sign in or create an account to back up your {catchesCount} catch{catchesCount === 1 ? '' : 'es'} to the cloud.
                    </Text>
                    <TouchableOpacity
                      style={styles.exitGuestBtn}
                      onPress={handleSignOut}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.exitGuestBtnText}>🚪 Log Out / Back to Login Screen</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteGuestBtn}
                      onPress={() => setShowDeleteConfirm(true)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.deleteGuestBtnText}>🗑️ Delete All Local Guest Catches</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Switch between Sign In and Create Account */}
                {!showOtpModal && (
                  <View style={styles.tabCapsule}>
                    <TouchableOpacity
                      style={[styles.tabBtn, authMode === 'signin' && styles.tabBtnActive]}
                      onPress={() => {
                        setAuthMode('signin');
                        setNotice(null);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.tabBtnText,
                          authMode === 'signin' && styles.tabBtnTextActive,
                        ]}
                      >
                        Sign In
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.tabBtn, authMode === 'signup' && styles.tabBtnActive]}
                      onPress={() => {
                        setAuthMode('signup');
                        setNotice(null);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.tabBtnText,
                          authMode === 'signup' && styles.tabBtnTextActive,
                        ]}
                      >
                        Create
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {notice && (
                  <View
                    style={[
                      styles.noticeBox,
                      notice.isError ? styles.noticeBoxError : styles.noticeBoxSuccess,
                    ]}
                  >
                    <Text
                      style={[
                        styles.noticeText,
                        notice.isError ? styles.noticeTextError : styles.noticeTextSuccess,
                      ]}
                    >
                      {notice.text}
                    </Text>
                  </View>
                )}

                {showOtpModal ? (
                  /* OTP Verification Form */
                  <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#111', marginBottom: 4 }}>
                      Verify Your Email
                    </Text>
                    <Text style={{ fontSize: 12, color: '#6B7280', textAlign: 'center', marginBottom: 12 }}>
                      A 6-digit verification code was sent to:{'\n'}
                      <Text style={{ fontWeight: '700', color: '#059669' }}>{email}</Text>
                    </Text>

                    <View style={[styles.inputGroup, { width: '100%' }]}>
                      <Text style={styles.inputLabel}>6-Digit Verification Code</Text>
                      <TextInput
                        style={[styles.textInput, { letterSpacing: 6, fontWeight: '800', textAlign: 'center', fontSize: 20 }]}
                        placeholder="••••••"
                        placeholderTextColor="#999"
                        value={otpToken}
                        onChangeText={(t) => setOtpToken(t.replace(/[^0-9]/g, '').slice(0, 6))}
                        keyboardType="number-pad"
                        maxLength={6}
                        autoCapitalize="none"
                        autoFocus={true}
                        editable={!loading}
                      />
                    </View>

                    <TouchableOpacity
                      style={[styles.primaryAuthBtn, { width: '100%' }]}
                      onPress={handleVerifySignUpOtp}
                      disabled={loading}
                      activeOpacity={0.85}
                    >
                      {loading ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={styles.primaryAuthBtnText}>Verify & Create Account</Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => {
                        setShowOtpModal(false);
                        setOtpToken('');
                        setNotice(null);
                      }}
                      style={{ marginTop: 12, padding: 6 }}
                    >
                      <Text style={{ fontSize: 12, color: '#6B7280', textDecorationLine: 'underline' }}>
                        Cancel & Change Details
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  /* Password-based Form */
                  <View>
                    {authMode === 'signup' && (
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Name</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="Name"
                          placeholderTextColor="#999"
                          value={displayName}
                          onChangeText={setDisplayName}
                          autoCapitalize="words"
                        />
                      </View>
                    )}

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Email</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Email"
                        placeholderTextColor="#999"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Password</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Password"
                        placeholderTextColor="#999"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={true}
                      />
                    </View>

                    {/* Submit Email Button */}
                    <TouchableOpacity
                      style={styles.primaryAuthBtn}
                      onPress={handleEmailAuth}
                      disabled={loading}
                      activeOpacity={0.85}
                    >
                      {loading ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={styles.primaryAuthBtnText}>
                          {authMode === 'signin' ? 'Sign In with Email' : 'Create Account'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                {/* Divider */}
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>OR</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Google Sign In Button */}
                <TouchableOpacity
                  style={styles.googleBtn}
                  onPress={handleGoogleSignIn}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  <Text style={styles.googleIcon}>G</Text>
                  <Text style={styles.googleBtnText}>Continue with Google</Text>
                </TouchableOpacity>

                {/* Guest Mode */}
                {!user && (
                  <TouchableOpacity
                    style={styles.guestLinkBtn}
                    onPress={handleGuestMode}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.guestLinkText}>Continue as Offline Guest</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>

    {/* Account Deletion Confirmation Modal */}
    <Modal
      visible={showDeleteConfirm}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {
        if (!deletingAccount) setShowDeleteConfirm(false);
      }}
    >
      <View style={styles.confirmOverlay}>
        <View style={styles.confirmCard}>
          <View style={styles.confirmIconContainer}>
            <Text style={{ fontSize: 32 }}>⚠️</Text>
          </View>

          <Text style={styles.confirmTitle}>
            {user?.isGuest ? 'Delete Guest Data?' : 'Permanently Delete Account?'}
          </Text>
          <Text style={styles.confirmSubtitle}>
            {user?.isGuest
              ? 'This will permanently remove all catches and discovered species recorded in this guest session from your device.'
              : `This action CANNOT be undone. Your account (${user?.email}), all ${catchesCount} saved species catches, Dex discoveries, and profile records will be permanently erased from both this device and the cloud database.`}
          </Text>

          <TouchableOpacity
            style={[styles.confirmDeleteBtn, deletingAccount && styles.btnDisabled]}
            onPress={handleDeleteAccount}
            disabled={deletingAccount}
            activeOpacity={0.85}
          >
            {deletingAccount ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.confirmDeleteBtnText}>
                {user?.isGuest ? 'Yes, Delete Guest Data' : 'Yes, Delete Account & All Data'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.confirmCancelBtn}
            onPress={() => setShowDeleteConfirm(false)}
            disabled={deletingAccount}
            activeOpacity={0.8}
          >
            <Text style={styles.confirmCancelBtnText}>Cancel & Keep Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  </>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 24,
    paddingHorizontal: 22,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
    maxHeight: '88%',
    ...SHADOWS.heavy,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111111',
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#333333',
  },
  modalBody: {
    marginBottom: 10,
  },

  // Logged-in Profile styles
  profileCard: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#10B981',
  },
  avatarEmoji: {
    fontSize: 34,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111111',
  },
  profileEmail: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  rankBadge: {
    backgroundColor: '#ECFDF5',
    borderColor: 'rgba(16, 185, 129, 0.4)',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 8,
  },
  rankText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#047857',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginVertical: 18,
    width: '100%',
  },
  statBox: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111111',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    marginTop: 2,
  },
  syncCard: {
    width: '100%',
    backgroundColor: '#F0FDF4',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    marginBottom: 16,
  },
  syncCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  syncCardInfo: {
    flex: 1,
  },
  syncStatusTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
  },
  syncStatusSubtitle: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
    lineHeight: 15,
  },
  syncActionBtn: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  syncActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  signOutBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 999,
    backgroundColor: '#FEE2E2',
    marginTop: 8,
  },
  signOutBtnText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '800',
  },

  // Auth Form styles
  authContainer: {
    paddingVertical: 6,
  },
  guestBanner: {
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  guestBannerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B45309',
  },
  guestBannerSubtitle: {
    fontSize: 11,
    color: '#92400E',
    marginTop: 2,
  },
  exitGuestBtn: {
    marginTop: 10,
    backgroundColor: '#FEE2E2',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  exitGuestBtnText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '800',
  },
  tabCapsule: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 999,
    padding: 4,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 999,
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    ...SHADOWS.soft,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  tabBtnTextActive: {
    color: '#111111',
    fontWeight: '900',
  },
  noticeBox: {
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
  },
  noticeBoxError: {
    backgroundColor: '#FEE2E2',
  },
  noticeBoxSuccess: {
    backgroundColor: '#ECFDF5',
  },
  noticeText: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  noticeTextError: {
    color: '#DC2626',
  },
  noticeTextSuccess: {
    color: '#047857',
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#374151',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
    color: '#111111',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
        outlineWidth: 0,
        boxShadow: 'none',
      } as any,
    }),
  },
  primaryAuthBtn: {
    backgroundColor: '#111111',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryAuthBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 10,
    fontWeight: '800',
    color: '#9CA3AF',
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...SHADOWS.soft,
  },
  googleIcon: {
    fontSize: 16,
    fontWeight: '900',
    color: '#EA4335',
    marginRight: 10,
  },
  googleBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#374151',
  },
  guestLinkBtn: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  guestLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    textDecorationLine: 'underline',
  },
  deleteAccountBtn: {
    marginTop: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FFF5F5',
    width: '100%',
  },
  deleteAccountBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#DC2626',
  },
  deleteGuestBtn: {
    marginTop: 8,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FFF5F5',
    width: '100%',
  },
  deleteGuestBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    ...SHADOWS.heavy,
  },
  confirmIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  confirmSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  confirmDeleteBtn: {
    width: '100%',
    backgroundColor: '#DC2626',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
    ...SHADOWS.soft,
  },
  confirmDeleteBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  confirmCancelBtn: {
    width: '100%',
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmCancelBtnText: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});

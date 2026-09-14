import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  Modal,
  Linking,
} from 'react-native';
import { COLORS, SHADOWS } from '../theme/colors';
import { UserProfile } from '../types';
import { SupabaseService } from '../services/supabaseService';
import { StorageService } from '../services/storageService';

interface AuthScreenProps {
  onLoginSuccess: (user: UserProfile) => void;
  statusMessage?: string | null;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess, statusMessage }) => {
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(statusMessage || null);

  // OTP Verification Modal State
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otpToken, setOtpToken] = useState('');
  const [otpSubmitting, setOtpSubmitting] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const otpInputRef = useRef<TextInput>(null);

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

  const resetForm = () => {
    setErrorMsg(null);
    setInfoMsg(null);
  };

  const handleSignIn = async () => {
    resetForm();
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter your email and password.');
      return;
    }
    if (!validateEmail(email)) {
      setErrorMsg('Please enter a valid email address (e.g. name@gmail.com).');
      return;
    }

    setLoading(true);
    try {
      const res = await SupabaseService.signIn(email.trim(), password);
      if (res.user) {
        onLoginSuccess(res.user);
      } else {
        if (res.error && res.error.toLowerCase().includes('email not confirmed')) {
          setOtpError('Your account has not been verified yet. Please enter the 6-digit code sent to your email.');
          setOtpToken('');
          setOtpModalVisible(true);
          return;
        }
        setErrorMsg(res.error || 'Sign in failed. Check your email and password.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred during sign in.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    resetForm();
    if (!displayName.trim()) {
      setErrorMsg('Please enter your name.');
      return;
    }
    if (!email.trim()) {
      setErrorMsg('Please enter your email address.');
      return;
    }
    if (!validateEmail(email)) {
      setErrorMsg('Please enter a valid email address (e.g. name@gmail.com).');
      return;
    }

    const passCheck = validatePassword(password);
    if (!passCheck.valid) {
      setErrorMsg(
        passCheck.error ||
          'Password must be at least 8 characters and include a letter, a number, and a symbol.'
      );
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    try {
      const res = await SupabaseService.requestSignUpOtp(
        email.trim(),
        password,
        displayName.trim()
      );
      if (res.success) {
        if (res.user) {
          onLoginSuccess(res.user);
          return;
        }
        if (res.autoVerified) {
          // Email confirmation was disabled in Supabase, so account is ready!
          setPassword('');
          setConfirmPassword('');
          setTab('signin');
          setInfoMsg('🎉 Account created successfully! Please sign in with your password.');
        } else {
          setOtpToken('');
          setOtpError(null);
          setOtpModalVisible(true);
        }
      } else {
        setErrorMsg(res.error || 'Failed to dispatch verification code. Please try again.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred during sign up.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySignUpOtp = async () => {
    const cleanOtp = otpToken.trim();
    if (!cleanOtp || cleanOtp.length < 6) {
      setOtpError('Please enter the full 6-digit verification code sent to your email.');
      return;
    }

    setOtpSubmitting(true);
    setOtpError(null);
    try {
      const res = await SupabaseService.verifySignUpOtp(email.trim(), cleanOtp);
      if (res.success) {
        setOtpModalVisible(false);
        // Clear passwords so user can sign in freshly
        setPassword('');
        setConfirmPassword('');
        setOtpToken('');
        setTab('signin');
        setInfoMsg('🎉 Account verified and created successfully! Please sign in with your password.');
      } else {
        setOtpError(res.error || 'Invalid verification code. Please check and try again.');
      }
    } catch (err: any) {
      setOtpError(err.message || 'Verification failed. Please try again.');
    } finally {
      setOtpSubmitting(false);
    }
  };

  const handleResendSignUpOtp = async () => {
    setOtpSubmitting(true);
    setOtpError(null);
    try {
      const res = await SupabaseService.requestSignUpOtp(
        email.trim(),
        password,
        displayName.trim()
      );
      if (res.success) {
        setInfoMsg(`A new verification code was dispatched to ${email.trim()}.`);
      } else {
        setOtpError(res.error || 'Failed to resend verification code.');
      }
    } catch (err: any) {
      setOtpError(err.message || 'Could not resend verification code.');
    } finally {
      setOtpSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    resetForm();
    setLoading(true);
    try {
      const res = await SupabaseService.signInWithGoogle();
      if (res.url) {
        // Pre-check if Google Provider is enabled in Supabase to prevent navigating to a raw 400 error page
        try {
          const testRes = await fetch(res.url);
          if (testRes.status === 400) {
            const data = await testRes.json().catch(() => ({}));
            if (data.msg && data.msg.includes('Unsupported provider')) {
              setErrorMsg('Google Sign-In is currently unavailable. Please sign in with your email and password.');
              setLoading(false);
              return;
            }
          }
        } catch (_) {
          // If preflight fails due to CORS, proceed with standard navigation
        }

        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.location.href = res.url;
        } else {
          await Linking.openURL(res.url);
        }
      } else {
        setErrorMsg(
          res.error ||
            'Real Google OAuth connects through your Supabase project. Add your Supabase keys to mobile/.env.local.'
        );
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Google sign in error.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = () => {
    const guestUser = SupabaseService.createGuestProfile();
    onLoginSuccess(guestUser);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Brand Section */}
          <View style={styles.brandSection}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../../assets/icon.png')}
                style={styles.logoImage}
                resizeMode="cover"
              />
            </View>
            <Text style={styles.brandTitle}>WILDGOTCHA</Text>
            <Text style={styles.brandTagline}>Field Naturalist Dex & AI Species Scanner</Text>
            <View style={styles.isolatedBadge}>
              <Text style={styles.isolatedBadgeText}>🔒 Individual Explorer Accounts</Text>
            </View>
          </View>

          {/* Segmented Tab: Sign In vs Create Account */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabButton, tab === 'signin' && styles.tabButtonActive]}
              onPress={() => {
                setTab('signin');
                resetForm();
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, tab === 'signin' && styles.tabTextActive]}>
                Sign In
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, tab === 'signup' && styles.tabButtonActive]}
              onPress={() => {
                setTab('signup');
                resetForm();
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, tab === 'signup' && styles.tabTextActive]}>
                Create Account
              </Text>
            </TouchableOpacity>
          </View>

          {/* Feedback Alert Notice */}
          {errorMsg && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorBannerText}>{errorMsg}</Text>
            </View>
          )}

          {infoMsg && (
            <View style={styles.infoBanner}>
              <Text style={styles.infoIcon}>ℹ️</Text>
              <Text style={styles.infoBannerText}>{infoMsg}</Text>
            </View>
          )}

          {/* Form Fields Card */}
          <View style={styles.formCard}>
            {tab === 'signup' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>NAME</Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputIcon}>👤</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Name"
                    placeholderTextColor="#A0A0A0"
                    value={displayName}
                    onChangeText={setDisplayName}
                    autoCapitalize="words"
                    editable={!loading}
                  />
                </View>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>✉️</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="#A0A0A0"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PASSWORD</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#A0A0A0"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  editable={!loading}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.eyeText}>{showPassword ? '👁️' : '🙈'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {tab === 'signup' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>CONFIRM PASSWORD</Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputIcon}>🔒</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm Password"
                    placeholderTextColor="#A0A0A0"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    editable={!loading}
                  />
                </View>
              </View>
            )}

            {/* Primary Action Button */}
            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={tab === 'signin' ? handleSignIn : handleSignUp}
              disabled={loading}
              activeOpacity={0.88}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {tab === 'signin' ? 'Sign In to Field Dex' : 'Create Naturalist Account'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google OAuth Button */}
            <TouchableOpacity
              style={[styles.googleButton, loading && styles.buttonDisabled]}
              onPress={handleGoogleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={styles.googleIconText}>🌐</Text>
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>
          </View>

          {/* Guest / Offline Mode Option */}
          <View style={styles.guestCard}>
            <View style={styles.guestHeader}>
              <Text style={styles.guestBadge}>🐾 OFFLINE FIELD EXPLORER</Text>
            </View>
            <Text style={styles.guestDescription}>
              Explore without an account. Your catches and Dex discoveries will be stored locally
              on this phone with offline wildlife recognition.
            </Text>
            <TouchableOpacity
              style={styles.guestButton}
              onPress={handleGuestLogin}
              activeOpacity={0.85}
              disabled={loading}
            >
              <Text style={styles.guestButtonText}>Continue as Guest</Text>
            </TouchableOpacity>
          </View>

          {/* Privacy & Account Separation Note */}
          <View style={styles.footerNote}>
            <Text style={styles.footerNoteText}>
              Every explorer has their own independent Dex collection. Switching accounts preserves
              and isolates data so collections are never mixed.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* OTP Verification Modal */}
      <Modal
        visible={otpModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setOtpModalVisible(false)}
        onShow={() => {
          setTimeout(() => otpInputRef.current?.focus(), 120);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.otpModalCard}>
            <View style={styles.otpHeaderIcon}>
              <Text style={{ fontSize: 28 }}>📬</Text>
            </View>

            <Text style={styles.otpModalTitle}>Enter Verification Code</Text>
            <Text style={styles.otpModalSubtitle}>
              We sent a 6-digit verification code to:
            </Text>
            <Text style={styles.otpEmailHighlight}>{email}</Text>

            {otpError && (
              <View style={styles.otpErrorBox}>
                <Text style={styles.otpErrorText}>⚠️ {otpError}</Text>
              </View>
            )}

            {/* 6 Individual Digit Segmented Boxes */}
            <TouchableOpacity
              activeOpacity={1}
              style={styles.otpBoxesWrapper}
              onPress={() => otpInputRef.current?.focus()}
            >
              {[0, 1, 2, 3, 4, 5].map((idx) => {
                const char = otpToken[idx] || '';
                const isCurrent = otpToken.length === idx;
                const isFilled = Boolean(char);
                return (
                  <View
                    key={idx}
                    style={[
                      styles.otpBox,
                      isFilled && styles.otpBoxFilled,
                      isCurrent && styles.otpBoxActive,
                    ]}
                  >
                    <Text style={styles.otpBoxText}>{char}</Text>
                  </View>
                );
              })}

              {/* Transparent Overlay Input for Native Keyboard & Web Keystrokes */}
              <TextInput
                ref={otpInputRef}
                style={styles.otpHiddenInput}
                value={otpToken}
                onChangeText={(t) => {
                  const cleaned = t.replace(/[^0-9]/g, '').slice(0, 6);
                  setOtpToken(cleaned);
                  if (cleaned.length > 0) {
                    setOtpError(null);
                  }
                }}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus={true}
                caretHidden={true}
                editable={!otpSubmitting}
              />
            </TouchableOpacity>

            {/* Full-width High-Contrast Verify Button */}
            <TouchableOpacity
              style={[
                styles.otpVerifyButton,
                (otpToken.length < 6 || otpSubmitting) && styles.otpVerifyButtonDisabled,
              ]}
              onPress={handleVerifySignUpOtp}
              disabled={otpSubmitting || otpToken.length < 6}
              activeOpacity={0.88}
            >
              {otpSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.otpVerifyButtonText}>Verify & Create Account</Text>
              )}
            </TouchableOpacity>

            <View style={styles.otpFooterActions}>
              <TouchableOpacity
                onPress={handleResendSignUpOtp}
                disabled={otpSubmitting}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.resendText}>🔄 Resend Code</Text>
              </TouchableOpacity>
              <Text style={styles.footerSeparator}>•</Text>
              <TouchableOpacity
                onPress={() => {
                  setOtpModalVisible(false);
                  setOtpToken('');
                  setOtpError(null);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FCFCFC',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: Platform.OS === 'ios' ? 12 : 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoContainer: {
    width: 88,
    height: 88,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 14,
    backgroundColor: '#091217',
    borderWidth: 2,
    borderColor: '#10B981',
    ...SHADOWS.heavy,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#111111',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  brandTagline: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666666',
    textAlign: 'center',
    marginBottom: 8,
  },
  isolatedBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  isolatedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  tabContainer: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    padding: 4,
    marginBottom: 18,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    ...SHADOWS.soft,
  },
  tabText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#111111',
    fontWeight: '800',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  errorIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '600',
    color: '#DC2626',
    lineHeight: 17,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#93C5FD',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  infoIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '600',
    color: '#2563EB',
  },
  formCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    ...SHADOWS.soft,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4B5563',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    height: 48,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
        outlineWidth: 0,
      } as any,
    }),
  },
  inputIcon: {
    fontSize: 15,
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#111111',
    fontWeight: '600',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
        outlineWidth: 0,
        boxShadow: 'none',
      } as any,
    }),
  },
  eyeButton: {
    padding: 6,
  },
  eyeText: {
    fontSize: 16,
  },
  primaryButton: {
    backgroundColor: '#111111',
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    ...SHADOWS.soft,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 10.5,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.8,
  },
  googleButton: {
    flexDirection: 'row',
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  googleIconText: {
    fontSize: 16,
    marginRight: 10,
  },
  googleButtonText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1F2937',
  },
  guestCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    ...SHADOWS.soft,
    marginBottom: 16,
  },
  guestHeader: {
    marginBottom: 6,
  },
  guestBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.5,
  },
  guestDescription: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 17,
    marginBottom: 12,
  },
  guestButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 10,
    borderRadius: 11,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  guestButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  footerNote: {
    paddingHorizontal: 14,
  },
  footerNoteText: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  otpModalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    ...SHADOWS.heavy,
  },
  otpHeaderIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
  },
  otpModalTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 4,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  otpModalSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
  otpEmailHighlight: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#059669',
    textAlign: 'center',
    marginTop: 3,
    marginBottom: 16,
  },
  otpErrorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 14,
    width: '100%',
  },
  otpErrorText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 16,
  },
  otpBoxesWrapper: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 12,
    position: 'relative',
    paddingHorizontal: 2,
  },
  otpBox: {
    width: 44,
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxActive: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
    borderWidth: 2,
    ...SHADOWS.soft,
  },
  otpBoxFilled: {
    borderColor: '#059669',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
  },
  otpBoxText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
    textAlign: 'center',
  },
  otpHiddenInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.01,
    color: 'transparent',
    ...Platform.select({
      web: {
        cursor: 'text',
        outlineStyle: 'none',
      } as any,
    }),
  },
  otpVerifyButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#059669',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    ...SHADOWS.soft,
  },
  otpVerifyButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.65,
  },
  otpVerifyButtonText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  otpFooterActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  resendText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#059669',
  },
  footerSeparator: {
    marginHorizontal: 10,
    color: '#D1D5DB',
    fontWeight: 'bold',
  },
  cancelText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#6B7280',
  },
});

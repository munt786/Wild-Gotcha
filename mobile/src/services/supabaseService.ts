import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CatchRecord, UserProfile } from '../types';
import { StorageService } from './storageService';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

let supabaseClient: SupabaseClient | null = null;

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  try {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: typeof window !== 'undefined',
      },
    });
  } catch (e) {
    console.warn('Supabase client initialization note:', e);
  }
}

/**
 * Maps a Supabase user object and metadata into the canonical UserProfile format.
 * Centralizing this follows DRY and KISS principles so user data is handled identically everywhere.
 */
function mapSupabaseUserToProfile(u: any, fallbackEmail?: string, fallbackDisplayName?: string): UserProfile {
  const email = u?.email || fallbackEmail || '';
  const displayName =
    u?.user_metadata?.full_name ||
    u?.user_metadata?.display_name ||
    u?.user_metadata?.name ||
    fallbackDisplayName ||
    (email ? email.split('@')[0] : 'Explorer');

  return {
    id: u?.id || 'user_' + Date.now(),
    email,
    displayName,
    handle: u?.user_metadata?.handle || `@${displayName.toLowerCase().replace(/\s+/g, '_')}`,
    avatarUrl: (u?.user_metadata?.avatar_url !== undefined && u?.user_metadata?.avatar_url !== null)
      ? u.user_metadata.avatar_url
      : (u?.user_metadata?.picture || ''),
    isGuest: false,
    level: 1,
    rankTitle: 'Rookie Naturalist',
    createdAt: u?.created_at || new Date().toISOString(),
  };
}

/**
 * Safely converts any local date string into valid ISO 8601 for PostgreSQL timestamptz
 */
function toIsoTimestamp(dateStr?: string): string {
  if (!dateStr) return new Date().toISOString();
  if (/^\d{4}-\d{2}-\d{2}T/.test(dateStr)) {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  const clean = dateStr.replace(/[•·]/g, ' ').replace(/\s+/g, ' ').trim();
  const d = new Date(clean);
  if (!isNaN(d.getTime())) {
    return d.toISOString();
  }
  return new Date().toISOString();
}

/**
 * Formats an ISO string from Supabase into the application's clean display string
 */
function formatTimestampForDisplay(isoOrStr?: string): string {
  if (!isoOrStr) return '';
  if (isoOrStr.includes('•')) return isoOrStr;
  const d = new Date(isoOrStr);
  if (isNaN(d.getTime())) return isoOrStr;
  const dateOnly = d.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
  const timeOnly = d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${dateOnly} • ${timeOnly}`;
}

export class SupabaseService {
  /**
   * Returns true if Supabase project credentials are set up
   */
  static isConfigured(): boolean {
    return Boolean(supabaseClient && SUPABASE_URL && SUPABASE_ANON_KEY);
  }

  /**
   * Detects and returns current authenticated session user (e.g. after Google OAuth redirect)
   */
  static async getCurrentSessionUser(): Promise<UserProfile | null> {
    if (!supabaseClient) return null;
    try {
      const { data } = await supabaseClient.auth.getSession();
      if (data.session?.user) {
        return mapSupabaseUserToProfile(data.session.user);
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Listen for OAuth / session state changes
   */
  static onAuthStateChange(callback: (user: UserProfile | null) => void) {
    if (!supabaseClient) return { unsubscribe: () => {} };
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user) {
        callback(mapSupabaseUserToProfile(session.user));
      } else if (event === 'SIGNED_OUT') {
        callback(null);
      }
    });

    return subscription;
  }

  /**
   * Handles deep link authentication redirects
   */
  static async handleAuthRedirectUrl(url: string): Promise<UserProfile | null> {
    if (!supabaseClient || !url) return null;
    try {
      let accessToken: string | null = null;
      let refreshToken: string | null = null;
      let code: string | null = null;

      if (url.includes('#')) {
        const hash = url.substring(url.indexOf('#') + 1);
        const hashParams = new URLSearchParams(hash);
        accessToken = hashParams.get('access_token');
        refreshToken = hashParams.get('refresh_token');
      }

      if (url.includes('?')) {
        const query = url.substring(url.indexOf('?'));
        const queryClean = query.includes('#') ? query.substring(0, query.indexOf('#')) : query;
        const queryParams = new URLSearchParams(queryClean);
        if (!accessToken) accessToken = queryParams.get('access_token');
        if (!refreshToken) refreshToken = queryParams.get('refresh_token');
        code = queryParams.get('code');
      }

      if (accessToken && refreshToken) {
        const { data, error } = await supabaseClient.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (!error && data.session?.user) {
          return await this.getCurrentSessionUser();
        }
      } else if (code) {
        const { data, error } = await supabaseClient.auth.exchangeCodeForSession(code);
        if (!error && data.session?.user) {
          return await this.getCurrentSessionUser();
        }
      }

      return await this.getCurrentSessionUser();
    } catch (err) {
      console.warn('handleAuthRedirectUrl note:', err);
      return null;
    }
  }

  /**
   * Sign up with Email and Password
   */
  static async signUp(
    email: string,
    pass: string,
    displayName: string
  ): Promise<{ user: UserProfile | null; error?: string }> {
    if (!supabaseClient) {
      return StorageService.registerLocalAccount(email, pass, displayName);
    }

    try {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password: pass,
        options: {
          data: {
            display_name: displayName,
          },
        },
      });

      if (error) return { user: null, error: error.message };

      const u = data.user;

      if (u && Array.isArray(u.identities) && u.identities.length === 0) {
        return {
          user: null,
          error: 'An account with this email is already registered. Please sign in with your password.',
        };
      }

      if (u && !data.session && !(u as any).email_confirmed_at) {
        return {
          user: null,
          error: `Verification email sent to ${email}! Please click the confirmation link sent to your inbox to activate your account.`,
        };
      }

      const profile = mapSupabaseUserToProfile(u, email, displayName);
      return { user: profile };
    } catch (err: any) {
      return { user: null, error: err.message || 'Failed to sign up' };
    }
  }

  /**
   * Sign in with Email and Password
   */
  static async signIn(
    email: string,
    pass: string
  ): Promise<{ user: UserProfile | null; error?: string }> {
    if (!supabaseClient) {
      return StorageService.authenticateLocalAccount(email, pass);
    }

    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password: pass,
      });

      if (error) return { user: null, error: error.message };

      return { user: mapSupabaseUserToProfile(data.user, email) };
    } catch (err: any) {
      return { user: null, error: err.message || 'Failed to sign in' };
    }
  }

  /**
   * Sign in via Real Google OAuth
   */
  static async signInWithGoogle(): Promise<{ url?: string; error?: string }> {
    if (!supabaseClient) {
      return {
        error: 'Real Google OAuth connects through your Supabase project. Please configure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.',
      };
    }

    try {
      const { data, error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          queryParams: {
            prompt: 'select_account',
            access_type: 'offline',
          },
          redirectTo:
            typeof window !== 'undefined' && window.location
              ? window.location.origin
              : 'wildgotcha://auth-callback',
        },
      });

      if (error) return { error: error.message };
      return { url: data.url };
    } catch (err: any) {
      return { error: err.message || 'Failed to initialize Google login.' };
    }
  }

  private static pendingSignUps: Map<
    string,
    { pass: string; displayName: string; localOtp?: string }
  > = new Map();

  /**
   * Step 1 of Sign Up: Validates and dispatches a 6-digit OTP to the email address
   */
  static async requestSignUpOtp(
    email: string,
    pass: string,
    displayName: string
  ): Promise<{ success: boolean; error?: string; autoVerified?: boolean; localOtp?: string; user?: UserProfile }> {
    const cleanEmail = email.trim().toLowerCase();

    if (!supabaseClient) {
      const accountsRaw = await AsyncStorage.getItem('@wildgotcha_accounts_registry_v1');
      const accounts: Array<{ email: string }> = accountsRaw ? JSON.parse(accountsRaw) : [];
      if (accounts.some((a) => a.email === cleanEmail)) {
        return {
          success: false,
          error: 'An account with this email already exists. Please sign in.',
        };
      }

      const localOtp = Math.floor(100000 + Math.random() * 900000).toString();
      this.pendingSignUps.set(cleanEmail, { pass, displayName, localOtp });
      return { success: true, localOtp };
    }

    try {
      this.pendingSignUps.set(cleanEmail, { pass, displayName });

      const { data, error } = await supabaseClient.auth.signUp({
        email: cleanEmail,
        password: pass,
        options: {
          data: {
            display_name: displayName,
          },
        },
      });

      if (error) {
        if (
          error.message?.toLowerCase().includes('rate limit') ||
          (error as any).code === 'over_email_send_rate_limit'
        ) {
          return {
            success: false,
            error: 'Supabase email rate limit reached. Please wait a few minutes before trying again.',
          };
        }
        return { success: false, error: error.message };
      }

      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        return {
          success: false,
          error: 'An account with this email is already registered. Please sign in with your password.',
        };
      }

      if (data.user && data.session) {
        const profile = mapSupabaseUserToProfile(data.user, cleanEmail, displayName);
        this.pendingSignUps.delete(cleanEmail);
        return { success: true, autoVerified: true, user: profile };
      }

      return { success: true, autoVerified: false };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Failed to dispatch verification email.',
      };
    }
  }

  /**
   * Step 2 of Sign Up: Verifies OTP code, registers the account
   */
  static async verifySignUpOtp(
    email: string,
    token: string
  ): Promise<{ success: boolean; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanToken = token.trim();
    const pending = this.pendingSignUps.get(cleanEmail);

    if (!cleanToken || cleanToken.length < 6) {
      return {
        success: false,
        error: 'Please enter the complete 6-digit verification code.',
      };
    }

    if (!supabaseClient) {
      if (!pending) {
        return {
          success: false,
          error: 'Verification session expired. Please enter your details again.',
        };
      }

      if (pending.localOtp && pending.localOtp !== cleanToken) {
        return {
          success: false,
          error: 'Invalid verification code. Please check and try again.',
        };
      }

      const res = await StorageService.registerLocalAccount(
        cleanEmail,
        pending.pass,
        pending.displayName
      );

      if (res.error) {
        return { success: false, error: res.error };
      }

      this.pendingSignUps.delete(cleanEmail);
      return { success: true };
    }

    try {
      let verifyRes = await supabaseClient.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: 'signup',
      });

      if (verifyRes.error) {
        verifyRes = await supabaseClient.auth.verifyOtp({
          email: cleanEmail,
          token: cleanToken,
          type: 'email',
        });
      }

      if (verifyRes.error) {
        return {
          success: false,
          error:
            verifyRes.error.message ||
            'Invalid verification code. Please check the code in your email and try again.',
        };
      }

      await supabaseClient.auth.signOut();
      this.pendingSignUps.delete(cleanEmail);
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Verification failed. Please try again.',
      };
    }
  }

  /**
   * Create Guest User Profile
   */
  static createGuestProfile(): UserProfile {
    return {
      id: 'guest_' + Math.random().toString(36).substring(2, 8),
      displayName: 'Wild Explorer',
      isGuest: true,
      level: 1,
      rankTitle: 'Rookie Naturalist',
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Sign Out
   */
  static async signOut(): Promise<void> {
    if (supabaseClient) {
      try {
        await supabaseClient.auth.signOut();
      } catch (e) {
        console.warn('Sign out note:', e);
      }
    }
  }

  /**
   * Permanently deletes user account and all cloud catches
   */
  static async deleteAccount(
    userId: string,
    email?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (supabaseClient) {
        try {
          await supabaseClient.rpc('delete_self');
        } catch (rErr) {}

        try {
          await supabaseClient
            .from('catches')
            .delete()
            .eq('user_id', userId);
        } catch (cErr) {}

        try {
          await supabaseClient.auth.signOut({ scope: 'local' });
        } catch (sErr) {}
      }

      await StorageService.deleteLocalAccount(userId, email);
      return { success: true };
    } catch (err: any) {
      console.error('Delete account error:', err);
      return { success: false, error: err.message || 'Failed to delete account' };
    }
  }

  /**
   * Uploads and syncs catches to cloud database with payload optimization using direct fetch
   */
  static async syncCatchesToCloud(
    userId: string,
    catches: CatchRecord[]
  ): Promise<{ success: boolean; syncedCount: number; error?: string }> {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || catches.length === 0) {
      return { success: true, syncedCount: 0 };
    }

    try {
      const records = catches.map((c) => ({
        user_id: userId,
        catch_id: c.catch_id,
        specimen_id: c.specimen_id,
        catalog_id: c.catalog_id,
        common_name: c.common_name,
        scientific_name: c.scientific_name,
        category: c.category,
        breed: c.breed || 'Wild Species',
        rarity: c.rarity,
        image_url: c.image_url,
        // Save bandwidth: if sticker is identical to image or empty, store null. Reading falls back to image_url.
        sticker_url: (c.sticker_url && c.sticker_url !== c.image_url) ? c.sticker_url : null,
        box_2d: c.box_2d || null,
        biome: c.biome,
        region: c.region,
        danger_level: c.danger_level,
        caught_at: toIsoTimestamp(c.caught_at),
        lore: c.lore,
      }));

      const url = `${SUPABASE_URL}/rest/v1/catches?on_conflict=catch_id`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify(records),
      });

      if (!res.ok) {
        const errorText = await res.text();
        return { success: false, syncedCount: 0, error: errorText || `HTTP ${res.status}` };
      }

      return { success: true, syncedCount: records.length };
    } catch (err: any) {
      return { success: false, syncedCount: 0, error: err?.message || 'Sync failed' };
    }
  }

  /**
   * Fetches lightweight catch metadata (ID and timestamp) to check sync status
   * Transfers only ~150 bytes using direct native fetch
   */
  static async fetchCloudCatchSummary(
    userId: string
  ): Promise<{ data: Array<{ catch_id: string; caught_at: string }> | null; error?: string }> {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !userId) {
      return { data: null, error: 'Unavailable' };
    }

    try {
      const url = `${SUPABASE_URL}/rest/v1/catches?select=catch_id,caught_at&user_id=eq.${encodeURIComponent(userId)}`;
      const res = await fetch(url, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      });

      if (!res.ok) {
        return { data: null, error: `HTTP ${res.status}` };
      }

      const data = await res.json();
      return { data: Array.isArray(data) ? data : [], error: undefined };
    } catch (err: any) {
      return { data: null, error: err?.message || 'Failed to fetch catch summary' };
    }
  }

  /**
   * Fetches user's saved catches from cloud database using direct native fetch
   * Can fetch all catches or only specific catch IDs (e.g. catches missing from local device)
   */
  static async fetchCloudCatches(userId: string, catchIds?: string[]): Promise<CatchRecord[]> {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !userId) return [];
    if (catchIds && catchIds.length === 0) return [];

    try {
      let url = `${SUPABASE_URL}/rest/v1/catches?select=*&user_id=eq.${encodeURIComponent(userId)}&order=caught_at.desc`;
      if (catchIds && catchIds.length > 0) {
        const idList = catchIds.map((id) => `"${id}"`).join(',');
        url += `&catch_id=in.(${encodeURIComponent(idList)})`;
      }

      const res = await fetch(url, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      });

      if (!res.ok) return [];

      const data = await res.json();
      if (!Array.isArray(data)) return [];

      return data.map((d: any) => ({
        catch_id: d.catch_id,
        specimen_id: d.specimen_id,
        catalog_id: d.catalog_id,
        common_name: d.common_name,
        scientific_name: d.scientific_name,
        category: d.category,
        breed: d.breed,
        rarity: d.rarity,
        image_url: d.image_url,
        sticker_url: d.sticker_url || d.image_url,
        box_2d: d.box_2d,
        biome: d.biome,
        region: d.region,
        danger_level: d.danger_level,
        caught_at: formatTimestampForDisplay(d.caught_at),
        lore: d.lore,
      }));
    } catch (err: any) {
      return [];
    }
  }

  /**
   * Updates user metadata (handle, avatarUrl, displayName)
   * Local storage (AsyncStorage) is the primary authoritative source for handles and base64 avatars.
   * If displayName or handle is updated, also syncs to Supabase 'profiles' table via REST.
   */
  static async updateUserProfile(updates: { avatarUrl?: string; handle?: string; displayName?: string }): Promise<void> {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;
    try {
      // If displayName or handle is provided, sync to Supabase 'profiles' table
      const nameToSync = updates.displayName || updates.handle;
      if (nameToSync) {
        try {
          const sessionUser = await this.getCurrentSessionUser();
          if (sessionUser?.id) {
            await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(sessionUser.id)}`, {
              method: 'PATCH',
              headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                Prefer: 'return=minimal',
              },
              body: JSON.stringify({
                display_name: updates.displayName || updates.handle?.replace(/^@/, ''),
                updated_at: new Date().toISOString(),
              }),
            });
          }
        } catch (profileErr) {
          // Quietly ignore network glitch
        }
      }
    } catch (e) {
      // Quietly ignore
    }
  }
}

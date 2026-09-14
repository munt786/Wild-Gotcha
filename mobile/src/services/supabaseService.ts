import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CatchRecord, Specimen, UserProfile, CloudSyncStatus } from '../types';
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
        const u = data.session.user;
        const profile: UserProfile = {
          id: u.id,
          email: u.email || '',
          displayName:
            u.user_metadata?.full_name ||
            u.user_metadata?.display_name ||
            u.user_metadata?.name ||
            (u.email ? u.email.split('@')[0] : 'Explorer'),
          isGuest: false,
          level: 1,
          rankTitle: 'Rookie Naturalist',
          createdAt: u.created_at || new Date().toISOString(),
        };

        try {
          await supabaseClient.from('profiles').upsert({
            id: profile.id,
            email: profile.email,
            display_name: profile.displayName,
            level: 1,
            rank_title: profile.rankTitle,
            updated_at: new Date().toISOString(),
          });
        } catch (tableErr) {}

        return profile;
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
        const u = session.user;
        const profile: UserProfile = {
          id: u.id,
          email: u.email || '',
          displayName:
            u.user_metadata?.full_name ||
            u.user_metadata?.display_name ||
            u.user_metadata?.name ||
            (u.email ? u.email.split('@')[0] : 'Explorer'),
          isGuest: false,
          level: 1,
          rankTitle: 'Rookie Naturalist',
          createdAt: u.created_at || new Date().toISOString(),
        };

        try {
          await supabaseClient.from('profiles').upsert({
            id: profile.id,
            email: profile.email,
            display_name: profile.displayName,
            level: 1,
            rank_title: profile.rankTitle,
            updated_at: new Date().toISOString(),
          });
        } catch (e) {}

        callback(profile);
      } else if (event === 'SIGNED_OUT') {
        callback(null);
      }
    });

    return subscription;
  }

  /**
   * Handles deep link authentication redirects (e.g. wildgotcha://auth-callback#access_token=... or ?code=...)
   * on native mobile platforms (Android/iOS).
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
      // If email confirmation is enabled in Supabase, session is null until user clicks link in inbox
      if (u && !data.session && !(u as any).email_confirmed_at) {
        return {
          user: null,
          error: `Verification email sent to ${email}! Please click the confirmation link sent to your inbox to activate your account.`,
        };
      }

      const profile: UserProfile = {
        id: u?.id || 'user_' + Date.now(),
        email: u?.email || email,
        displayName: displayName || email.split('@')[0],
        isGuest: false,
        level: 1,
        rankTitle: 'Rookie Naturalist',
        createdAt: new Date().toISOString(),
      };

      // Upsert profile in Supabase table if possible
      try {
        await supabaseClient.from('profiles').upsert({
          id: profile.id,
          email: profile.email,
          display_name: profile.displayName,
          level: 1,
          rank_title: profile.rankTitle,
          updated_at: new Date().toISOString(),
        });
      } catch (tableErr) {
        console.warn('Profiles table sync note:', tableErr);
      }

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

      const u = data.user;
      const profile: UserProfile = {
        id: u?.id || 'user_' + Date.now(),
        email: u?.email || email,
        displayName: u?.user_metadata?.display_name || email.split('@')[0],
        isGuest: false,
        level: 1,
        rankTitle: 'Rookie Naturalist',
        createdAt: new Date().toISOString(),
      };

      return { user: profile };
    } catch (err: any) {
      return { user: null, error: err.message || 'Failed to sign in' };
    }
  }

  /**
   * Sign in via Real Google OAuth (Google Cloud Console + Supabase)
   */
  static async signInWithGoogle(): Promise<{ url?: string; error?: string }> {
    if (!supabaseClient) {
      return {
        error:
          'Real Google OAuth connects through your Supabase project. Please create your project on Supabase and add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to mobile/.env.local.',
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

  // In-memory cache of pending signups awaiting OTP verification
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

    // Local / Standalone mode
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

    // Cloud mode with Supabase
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
            error:
              'Supabase email rate limit reached (free tier allows 2-3 emails/hour). Please wait a few minutes before trying again, or delete the old test user in Supabase.',
          };
        }
        if (error.message?.toLowerCase().includes('error sending confirmation email')) {
          return {
            success: false,
            error:
              'Unable to send verification code to this email at this time. Please try again later or continue with Google.',
          };
        }
        return { success: false, error: error.message };
      }

      // Detect duplicate user in Supabase: Supabase returns identities: [] and sends no email
      if (
        data.user &&
        Array.isArray(data.user.identities) &&
        data.user.identities.length === 0
      ) {
        return {
          success: false,
          error:
            'An account with this email is already registered. Please switch to "Sign In" with your password, or delete the old user in Supabase Users list.',
        };
      }

      // If "Confirm email" is disabled in Supabase, data.session exists immediately!
      if (data.user && data.session) {
        const profile: UserProfile = {
          id: data.user.id,
          email: cleanEmail,
          displayName: displayName || cleanEmail.split('@')[0],
          isGuest: false,
          level: 1,
          rankTitle: 'Rookie Naturalist',
          createdAt: data.user.created_at || new Date().toISOString(),
        };

        try {
          await supabaseClient.from('profiles').upsert({
            id: profile.id,
            email: profile.email,
            display_name: profile.displayName,
            level: 1,
            rank_title: profile.rankTitle,
            updated_at: new Date().toISOString(),
          });
        } catch (tableErr) {
          console.warn('Profiles table sync note:', tableErr);
        }
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
   * Step 2 of Sign Up: Verifies OTP code, registers the account, and returns success to land on login page
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

    // Local Mode
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

    // Cloud Supabase Mode
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

      if (pending && verifyRes.data?.user) {
        try {
          await supabaseClient.from('profiles').upsert({
            id: verifyRes.data.user.id,
            email: cleanEmail,
            display_name: pending.displayName,
            level: 1,
            rank_title: 'Rookie Naturalist',
            updated_at: new Date().toISOString(),
          });
        } catch (tableErr) {
          console.warn('Profiles table sync note:', tableErr);
        }
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
   * Create Guest User Profile for instant offline/online gameplay
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
   * Permanently deletes user from Supabase database (catches and profiles) and signs out
   */
  static async deleteAccount(
    userId: string,
    email?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (supabaseClient) {
        // 1. Permanently delete user from auth.users via database RPC function
        try {
          const { error: rpcErr } = await supabaseClient.rpc('delete_self');
          if (rpcErr) {
            console.warn('RPC delete_self note:', rpcErr.message);
          }
        } catch (rErr) {
          console.warn('RPC delete_self exception:', rErr);
        }

        // 2. Delete user's catches from Supabase 'catches' table
        try {
          const { error: catchesErr } = await supabaseClient
            .from('catches')
            .delete()
            .eq('user_id', userId);
          if (catchesErr) {
            console.warn('Delete cloud catches note:', catchesErr.message);
          }
        } catch (cErr) {
          console.warn('Catches table delete note:', cErr);
        }

        // 3. Delete user's profile from Supabase 'profiles' table
        try {
          const { error: profileErr } = await supabaseClient
            .from('profiles')
            .delete()
            .eq('id', userId);
          if (profileErr) {
            console.warn('Delete cloud profile note:', profileErr.message);
          }
        } catch (pErr) {
          console.warn('Profile table delete note:', pErr);
        }

        // 4. Clear local session tokens (user was already deleted from auth.users)
        try {
          await supabaseClient.auth.signOut({ scope: 'local' });
        } catch (sErr) {}
      }

      // 5. Wipe all local device data for this user
      await StorageService.deleteLocalAccount(userId, email);

      return { success: true };
    } catch (err: any) {
      console.error('Delete account error:', err);
      return { success: false, error: err.message || 'Failed to delete account' };
    }
  }

  /**
   * Uploads and syncs catches to cloud database
   */
  static async syncCatchesToCloud(
    userId: string,
    catches: CatchRecord[]
  ): Promise<{ success: boolean; syncedCount: number; error?: string }> {
    if (!supabaseClient || catches.length === 0) {
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
        sticker_url: c.sticker_url || c.image_url,
        box_2d: c.box_2d,
        biome: c.biome,
        region: c.region,
        danger_level: c.danger_level,
        caught_at: c.caught_at,
        lore: c.lore,
      }));

      const { error } = await supabaseClient.from('catches').upsert(records, {
        onConflict: 'catch_id',
      });

      if (error) {
        console.warn('Cloud sync note:', error.message);
        return { success: false, syncedCount: 0, error: error.message };
      }

      return { success: true, syncedCount: records.length };
    } catch (err: any) {
      console.warn('Catches cloud sync error:', err);
      return { success: false, syncedCount: 0, error: err.message };
    }
  }

  /**
   * Fetches user's saved catches from cloud database
   */
  static async fetchCloudCatches(userId: string): Promise<CatchRecord[]> {
    if (!supabaseClient || !userId) return [];

    try {
      const { data, error } = await supabaseClient
        .from('catches')
        .select('*')
        .eq('user_id', userId)
        .order('caught_at', { ascending: false });

      if (error || !data) return [];

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
        sticker_url: d.sticker_url,
        box_2d: d.box_2d,
        biome: d.biome,
        region: d.region,
        danger_level: d.danger_level,
        caught_at: d.caught_at,
        lore: d.lore,
      }));
    } catch (err) {
      console.warn('Fetch cloud catches error:', err);
      return [];
    }
  }
}

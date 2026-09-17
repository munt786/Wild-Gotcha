import AsyncStorage from '@react-native-async-storage/async-storage';
import { CatchRecord, Specimen, UserProfile } from '../types';

const KEYS = {
  ACTIVE_PROFILE: '@wildgotcha_active_user_v2',
  LEGACY_CATCHES_V1: '@wildgotcha_catches_v1',
  LEGACY_SPECIMENS_V1: '@wildgotcha_specimens_v1',
  catchesPrefix: '@wildgotcha_user_catches_',
  specimensPrefix: '@wildgotcha_user_specimens_',
  ACCOUNTS_REGISTRY: '@wildgotcha_accounts_registry_v1',
};

export class StorageService {
  /**
   * Helper to compute per-user unique storage key so accounts NEVER mix
   */
  private static getUserKey(prefix: string, userId?: string): string {
    const safeId = (userId || 'guest').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    return `${prefix}${safeId}`;
  }

  /**
   * Persists the catches collection for a specific user ID
   */
  static async saveCatches(userId: string, catches: CatchRecord[]): Promise<void> {
    try {
      const key = this.getUserKey(KEYS.catchesPrefix, userId);
      await AsyncStorage.setItem(key, JSON.stringify(catches));
    } catch (e) {
      console.warn('Failed to save catches locally:', e);
    }
  }

  /**
   * Loads the saved catches strictly for the specified user ID
   */
  static async loadCatches(userId: string): Promise<CatchRecord[]> {
    try {
      const key = this.getUserKey(KEYS.catchesPrefix, userId);
      const data = await AsyncStorage.getItem(key);
      if (data) {
        return JSON.parse(data);
      }

      // If guest or first login, check legacy storage migration once
      if (!userId || userId === 'guest' || userId.startsWith('guest_')) {
        const legacyData = await AsyncStorage.getItem(KEYS.LEGACY_CATCHES_V1);
        if (legacyData) {
          const parsed = JSON.parse(legacyData);
          await this.saveCatches(userId, parsed);
          return parsed;
        }
      }
      return [];
    } catch (e) {
      console.warn('Failed to load catches locally:', e);
      return [];
    }
  }

  /**
   * Persists unlocked Dex specimens strictly for a specific user ID
   */
  static async saveSpecimens(userId: string, specimens: Specimen[]): Promise<void> {
    try {
      const key = this.getUserKey(KEYS.specimensPrefix, userId);
      await AsyncStorage.setItem(key, JSON.stringify(specimens));
    } catch (e) {
      console.warn('Failed to save specimens locally:', e);
    }
  }

  /**
   * Loads unlocked Dex specimens strictly for the specified user ID
   */
  static async loadSpecimens(userId: string): Promise<Specimen[]> {
    try {
      const key = this.getUserKey(KEYS.specimensPrefix, userId);
      const data = await AsyncStorage.getItem(key);
      if (data) {
        return JSON.parse(data);
      }

      // Check legacy migration for guest
      if (!userId || userId === 'guest' || userId.startsWith('guest_')) {
        const legacyData = await AsyncStorage.getItem(KEYS.LEGACY_SPECIMENS_V1);
        if (legacyData) {
          const parsed = JSON.parse(legacyData);
          await this.saveSpecimens(userId, parsed);
          return parsed;
        }
      }
      return [];
    } catch (e) {
      console.warn('Failed to load specimens locally:', e);
      return [];
    }
  }

  /**
   * Persists currently authenticated or guest user profile
   */
  static async saveUserProfile(profile: UserProfile | null): Promise<void> {
    try {
      if (profile) {
        await AsyncStorage.setItem(KEYS.ACTIVE_PROFILE, JSON.stringify(profile));
      } else {
        await AsyncStorage.removeItem(KEYS.ACTIVE_PROFILE);
      }
    } catch (e) {
      console.warn('Failed to save user profile:', e);
    }
  }

  /**
   * Loads currently active user profile from storage
   */
  static async loadUserProfile(): Promise<UserProfile | null> {
    try {
      const data = await AsyncStorage.getItem(KEYS.ACTIVE_PROFILE);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.warn('Failed to load user profile:', e);
      return null;
    }
  }

  /**
   * Clears storage for a specific user when deleted
   */
  static async clearUserData(userId: string): Promise<void> {
    try {
      const catchesKey = this.getUserKey(KEYS.catchesPrefix, userId);
      const specimensKey = this.getUserKey(KEYS.specimensPrefix, userId);
      await AsyncStorage.multiRemove([catchesKey, specimensKey]);
    } catch (e) {
      console.warn('Failed to clear user data:', e);
    }
  }

  /**
   * Completely purges user catches, specimens, registry account, and active session
   */
  static async deleteLocalAccount(userId: string, email?: string): Promise<void> {
    try {
      // 1. Purge catches and unlocked specimens
      await this.clearUserData(userId);

      // 2. Purge from local registry
      const accountsRaw = await AsyncStorage.getItem(KEYS.ACCOUNTS_REGISTRY);
      if (accountsRaw) {
        const accounts: Array<{ id: string; email: string }> = JSON.parse(accountsRaw);
        const cleanEmail = (email || '').trim().toLowerCase();
        const remaining = accounts.filter(
          (a) => a.id !== userId && a.email.toLowerCase() !== cleanEmail
        );
        await AsyncStorage.setItem(KEYS.ACCOUNTS_REGISTRY, JSON.stringify(remaining));
      }

      // 3. Clear active profile session if it matches
      const current = await this.loadUserProfile();
      if (current && (current.id === userId || (email && current.email === email))) {
        await this.saveUserProfile(null);
      }
    } catch (e) {
      console.warn('Failed to delete local account:', e);
    }
  }

  /**
   * Registers a new verified local user account (for offline / standalone app usage)
   */
  static async registerLocalAccount(
    email: string,
    pass: string,
    displayName: string
  ): Promise<{ user: UserProfile | null; error?: string }> {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const accountsRaw = await AsyncStorage.getItem(KEYS.ACCOUNTS_REGISTRY);
      const accounts: Array<{
        id: string;
        email: string;
        passwordHash: string;
        displayName: string;
        handle?: string;
        avatarUrl?: string;
        createdAt: string;
      }> = accountsRaw ? JSON.parse(accountsRaw) : [];

      if (accounts.some((a) => a.email === cleanEmail)) {
        return { user: null, error: 'An account with this email already exists. Please sign in.' };
      }

      const newId = 'usr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
      // Generate guaranteed unique initial handle
      const baseHandle = `@${(displayName || cleanEmail.split('@')[0]).toLowerCase().replace(/[^a-z0-9_]/g, '_')}`;
      let candidateHandle = baseHandle;
      let counter = 1;
      while (accounts.some((a) => (a.handle || '').toLowerCase() === candidateHandle.toLowerCase())) {
        counter++;
        candidateHandle = `${baseHandle}_${counter}`;
      }

      const newAccount = {
        id: newId,
        email: cleanEmail,
        passwordHash: pass,
        displayName: displayName || cleanEmail.split('@')[0],
        handle: candidateHandle,
        createdAt: new Date().toISOString(),
      };

      accounts.push(newAccount);
      await AsyncStorage.setItem(KEYS.ACCOUNTS_REGISTRY, JSON.stringify(accounts));

      const profile: UserProfile = {
        id: newAccount.id,
        email: newAccount.email,
        displayName: newAccount.displayName,
        handle: candidateHandle,
        isGuest: false,
        level: 1,
        rankTitle: 'Rookie Naturalist',
        createdAt: newAccount.createdAt,
      };

      return { user: profile };
    } catch (e: any) {
      return { user: null, error: e.message || 'Failed to register account.' };
    }
  }

  /**
   * Authenticates against the verified local user registry
   */
  static async authenticateLocalAccount(
    email: string,
    pass: string
  ): Promise<{ user: UserProfile | null; error?: string }> {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const accountsRaw = await AsyncStorage.getItem(KEYS.ACCOUNTS_REGISTRY);
      const accounts: Array<{
        id: string;
        email: string;
        passwordHash: string;
        displayName: string;
        createdAt: string;
      }> = accountsRaw ? JSON.parse(accountsRaw) : [];

      const account = accounts.find((a) => a.email === cleanEmail);
      if (!account) {
        return { user: null, error: 'No account found with this email. Please create an account first.' };
      }

      if (account.passwordHash !== pass) {
        return { user: null, error: 'Incorrect password. Please verify and try again.' };
      }

      const profile: UserProfile = {
        id: account.id,
        email: account.email,
        displayName: account.displayName,
        handle: (account as any).handle,
        avatarUrl: (account as any).avatarUrl,
        isGuest: false,
        level: 1,
        rankTitle: 'Rookie Naturalist',
        createdAt: account.createdAt,
      };

      return { user: profile };
    } catch (e: any) {
      return { user: null, error: e.message || 'Authentication failed.' };
    }
  }

  /**
   * Updates metadata (displayName, handle, avatarUrl) in the registered accounts list
   */
  static async updateAccountMetadata(
    userId: string,
    updates: { avatarUrl?: string; handle?: string; displayName?: string }
  ): Promise<void> {
    try {
      const accountsRaw = await AsyncStorage.getItem(KEYS.ACCOUNTS_REGISTRY);
      if (!accountsRaw) return;
      const accounts: Array<any> = JSON.parse(accountsRaw);
      const idx = accounts.findIndex((a) => a.id === userId);
      if (idx >= 0) {
        if (updates.avatarUrl !== undefined) accounts[idx].avatarUrl = updates.avatarUrl;
        if (updates.handle !== undefined) accounts[idx].handle = updates.handle;
        if (updates.displayName !== undefined) accounts[idx].displayName = updates.displayName;
        await AsyncStorage.setItem(KEYS.ACCOUNTS_REGISTRY, JSON.stringify(accounts));
      }
    } catch (e) {
      console.warn('Failed to update account metadata:', e);
    }
  }

  /**
   * Checks if a handle is already taken by another account in the local registry
   */
  static async isHandleTaken(handle: string, currentUserId?: string): Promise<boolean> {
    try {
      const clean = handle.trim().toLowerCase().replace(/^@/, '');
      if (!clean) return false;
      const accountsRaw = await AsyncStorage.getItem(KEYS.ACCOUNTS_REGISTRY);
      if (!accountsRaw) return false;
      const accounts: Array<any> = JSON.parse(accountsRaw);
      return accounts.some((a) => {
        if (currentUserId && a.id === currentUserId) return false;
        const aHandle = (a.handle || '').trim().toLowerCase().replace(/^@/, '');
        const aName = (a.displayName || '').trim().toLowerCase().replace(/\s+/g, '_');
        return aHandle === clean || aName === clean;
      });
    } catch {
      return false;
    }
  }

  /**
   * Registers or updates a Google account locally
   */
  static async registerOrUpdateGoogleAccount(profile: UserProfile): Promise<void> {
    try {
      const cleanEmail = (profile.email || '').trim().toLowerCase();
      if (!cleanEmail) return;

      const accountsRaw = await AsyncStorage.getItem(KEYS.ACCOUNTS_REGISTRY);
      const accounts: Array<{
        id: string;
        email: string;
        passwordHash: string;
        displayName: string;
        handle?: string;
        avatarUrl?: string;
        createdAt: string;
        isGoogle?: boolean;
      }> = accountsRaw ? JSON.parse(accountsRaw) : [];

      const existingIdx = accounts.findIndex((a) => a.email === cleanEmail);
      if (existingIdx >= 0) {
        accounts[existingIdx].displayName = profile.displayName;
        if (profile.avatarUrl) accounts[existingIdx].avatarUrl = profile.avatarUrl;
        if (profile.handle) accounts[existingIdx].handle = profile.handle;
        accounts[existingIdx].isGoogle = true;
      } else {
        accounts.push({
          id: profile.id,
          email: cleanEmail,
          passwordHash: 'google_oauth_verified',
          displayName: profile.displayName,
          handle: profile.handle,
          avatarUrl: profile.avatarUrl,
          createdAt: profile.createdAt,
          isGoogle: true,
        });
      }
      await AsyncStorage.setItem(KEYS.ACCOUNTS_REGISTRY, JSON.stringify(accounts));
    } catch (e) {
      console.warn('Failed to save Google account locally:', e);
    }
  }

  /**
   * Retrieves previously logged in Google accounts on this device
   */
  static async getSavedGoogleAccounts(): Promise<Array<{ id: string; email: string; displayName: string }>> {
    try {
      const accountsRaw = await AsyncStorage.getItem(KEYS.ACCOUNTS_REGISTRY);
      if (!accountsRaw) return [];
      const accounts: Array<any> = JSON.parse(accountsRaw);
      return accounts
        .filter((a) => a.isGoogle || a.passwordHash === 'google_oauth_verified')
        .map((a) => ({ id: a.id, email: a.email, displayName: a.displayName }));
    } catch (e) {
      return [];
    }
  }
}


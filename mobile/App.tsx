import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
} from 'lucide-react-native';
import { ActiveTab, TaxonomicCategory, Specimen, CatchRecord, RarityLevel, UserProfile, CloudSyncStatus } from './src/types';
import { COLORS, SHADOWS } from './src/theme/colors';
import { Header } from './src/components/Header';
import { BottomNavBar } from './src/components/BottomNavBar';
import { UniqueIndexGrid } from './src/components/UniqueIndexGrid';
import { ScannerView, ScannerViewHandle } from './src/components/ScannerView';
import { CatchesInventoryGrid } from './src/components/CatchesInventoryGrid';
import { SpecimenDetailModal } from './src/components/SpecimenDetailModal';
import { AuthModal } from './src/components/AuthModal';
import { AuthScreen } from './src/components/AuthScreen';
import { ProfileView } from './src/components/ProfileView';
import { SettingsModal } from './src/components/SettingsModal';
import { ApiService } from './src/services/api';
import { StorageService } from './src/services/storageService';
import { SupabaseService } from './src/services/supabaseService';
import { ProgressionService } from './src/services/progressionService';

/**
 * Reconstructs unique Specimen Dex entries from all caught records
 */
function deriveSpecimensFromCatches(
  catchesList: CatchRecord[],
  baseSpecimens: Specimen[] = []
): Specimen[] {
  const specimenMap = new Map<string, Specimen>();
  baseSpecimens.forEach((s) => specimenMap.set(s.common_name.toLowerCase(), { ...s }));

  catchesList.forEach((c) => {
    const key = c.common_name.toLowerCase();
    const existing = specimenMap.get(key);
    if (!existing) {
      specimenMap.set(key, {
        id: c.specimen_id,
        catalog_id: c.catalog_id,
        common_name: c.common_name,
        scientific_name: c.scientific_name,
        category: c.category,
        rarity: c.rarity,
        image_url: c.image_url,
        lore: c.lore,
        biome: c.biome,
        region: c.region,
        date_spotted: (c.caught_at || '').split('•')[0].trim() || 'Discovered',
        danger_level: c.danger_level,
        captured_count: 1,
        first_caught_at: c.caught_at,
      });
    } else {
      existing.captured_count = Math.max(existing.captured_count || 1, 1);
    }
  });

  return Array.from(specimenMap.values());
}

export default function App() {
  // Navigation & Category State
  const [activeTab, setActiveTab] = useState<ActiveTab>('INDEX');
  const [selectedCategory, setSelectedCategory] = useState<TaxonomicCategory>('All');

  // Specimen & Catches Collection State (persisted strictly per user)
  const [specimens, setSpecimens] = useState<Specimen[]>([]);
  const [catches, setCatches] = useState<CatchRecord[]>([]);

  // User Authentication & Cloud Sync State
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authChecked, setAuthChecked] = useState<boolean>(false);
  const [authModalVisible, setAuthModalVisible] = useState<boolean>(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<CloudSyncStatus>('offline_saved');
  const [deleteNotice, setDeleteNotice] = useState<string | null>(null);

  // Online (Gemini Cloud AI) vs Offline (On-Device Local Wildlife Engine) Mode
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);

  // Scanner & Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const scannerRef = useRef<ScannerViewHandle>(null);

  // Encyclopedia Specimen Detail Modal
  const [detailModalVisible, setDetailModalVisible] = useState<boolean>(false);
  const [selectedDetailSpecimen, setSelectedDetailSpecimen] = useState<Specimen | null>(null);

  // In-App Notification Toast for visible scan feedback
  const [scanNotice, setScanNotice] = useState<{
    title: string;
    message: string;
    type: 'warning' | 'info' | 'error' | 'success';
  } | null>(null);

  const activeSyncUserRef = useRef<string | null>(null);
  const userRef = useRef<UserProfile | null>(null);

  React.useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Canonical loader & cloud synchronizer (Follows DRY & prevents race conditions)
  const loadAndSyncUserData = async (targetProfile: UserProfile) => {
    if (activeSyncUserRef.current === targetProfile.id) {
      return;
    }
    activeSyncUserRef.current = targetProfile.id;

    try {
      setDeleteNotice(null);
      const existingLocal = await StorageService.loadUserProfile();
      const mergedProfile: UserProfile = {
        ...targetProfile,
        handle:
          existingLocal && existingLocal.id === targetProfile.id && existingLocal.handle
            ? existingLocal.handle
            : targetProfile.handle,
        avatarUrl:
          existingLocal && existingLocal.id === targetProfile.id && existingLocal.avatarUrl
            ? existingLocal.avatarUrl
            : targetProfile.avatarUrl,
      };
      setUser(mergedProfile);
      await StorageService.saveUserProfile(mergedProfile);

      // 1. Instantly load local data from on-device storage
      const [localCatches, localSpecimens] = await Promise.all([
        StorageService.loadCatches(targetProfile.id),
        StorageService.loadSpecimens(targetProfile.id),
      ]);
      setCatches(localCatches);
      setSpecimens(localSpecimens);

      // 2. High-efficiency lightweight cloud synchronization
      if (!targetProfile.isGuest && SupabaseService.isConfigured()) {
        setSyncStatus('syncing');

        // Fetch ~150-byte metadata summary to check for new/missing catches without downloading full base64 images
        const { data: cloudSummary, error: summaryError } =
          await SupabaseService.fetchCloudCatchSummary(targetProfile.id);

        if (!summaryError && cloudSummary) {
          const cloudCatchIdSet = new Set(cloudSummary.map((c) => c.catch_id));
          const localCatchIdSet = new Set(localCatches.map((c) => c.catch_id));

          // Catches that exist in cloud but missing locally (from other devices)
          const missingFromLocalIds = cloudSummary
            .filter((c) => !localCatchIdSet.has(c.catch_id))
            .map((c) => c.catch_id);

          let updatedCatches = localCatches;
          if (missingFromLocalIds.length > 0) {
            const newCloudCatches = await SupabaseService.fetchCloudCatches(
              targetProfile.id,
              missingFromLocalIds
            );
            if (newCloudCatches.length > 0) {
              const catchMap = new Map<string, CatchRecord>();
              [...localCatches, ...newCloudCatches].forEach((c) => catchMap.set(c.catch_id, c));
              updatedCatches = Array.from(catchMap.values());
              setCatches(updatedCatches);
              await StorageService.saveCatches(targetProfile.id, updatedCatches);

              const mergedSpecimens = deriveSpecimensFromCatches(updatedCatches, localSpecimens);
              setSpecimens(mergedSpecimens);
              await StorageService.saveSpecimens(targetProfile.id, mergedSpecimens);
            }
          }

          // Catches that exist locally but not yet backed up to cloud
          const unsyncedToCloud = localCatches.filter((c) => !cloudCatchIdSet.has(c.catch_id));
          if (unsyncedToCloud.length > 0) {
            await SupabaseService.syncCatchesToCloud(targetProfile.id, unsyncedToCloud);
          }

          setSyncStatus('synced');
        } else {
          setSyncStatus('offline_saved');
        }
      } else {
        setSyncStatus('offline_saved');
      }
    } catch (err) {
      console.warn('Load and sync note:', err);
    } finally {
      activeSyncUserRef.current = null;
    }
  };

  // On App Mount: Restore saved user session or detect OAuth redirect
  React.useEffect(() => {
    let syncTimer: any = null;

    const initApp = async () => {
      try {
        let savedProfile = await StorageService.loadUserProfile();

        if (!savedProfile && SupabaseService.isConfigured()) {
          const oauthUser = await SupabaseService.getCurrentSessionUser();
          if (oauthUser) {
            savedProfile = oauthUser;
          }
        }

        if (savedProfile) {
          setUser(savedProfile);
          const [localCatches, localSpecimens] = await Promise.all([
            StorageService.loadCatches(savedProfile.id),
            StorageService.loadSpecimens(savedProfile.id),
          ]);
          setCatches(localCatches);
          setSpecimens(localSpecimens);

          // Debounce background cloud sync to avoid in-flight connection aborts during rapid browser reloads
          syncTimer = setTimeout(() => {
            loadAndSyncUserData(savedProfile!);
          }, 800);
        }
      } catch (err) {
        console.warn('Initial storage load note:', err);
      } finally {
        setAuthChecked(true);
      }
    };

    initApp();

    // Listen for OAuth session changes (e.g. Google redirect)
    const authSubscription = SupabaseService.onAuthStateChange(async (oauthUser) => {
      if (oauthUser) {
        if (!userRef.current || userRef.current.id !== oauthUser.id) {
          await loadAndSyncUserData(oauthUser);
        }
      }
    });

    // Deep linking handler for native OAuth redirects (e.g. wildgotcha://auth-callback)
    const handleDeepLink = async (event: { url: string }) => {
      if (event.url && (event.url.includes('auth-callback') || event.url.includes('access_token') || event.url.includes('code='))) {
        const oauthUser = await SupabaseService.handleAuthRedirectUrl(event.url);
        if (oauthUser) {
          await loadAndSyncUserData(oauthUser);
        }
      }
    };

    const linkSub = Linking.addEventListener('url', handleDeepLink);
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    return () => {
      if (syncTimer) clearTimeout(syncTimer);
      authSubscription.unsubscribe();
      linkSub.remove();
    };
  }, []);

  React.useEffect(() => {
    if (scanNotice) {
      const timer = setTimeout(() => setScanNotice(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [scanNotice]);

  // Handle User Auth change (login, register, guest, logout)
  const handleUserChange = async (newProfile: UserProfile | null) => {
    if (newProfile) {
      await loadAndSyncUserData(newProfile);
    } else {
      setUser(null);
      setCatches([]);
      setSpecimens([]);
      await StorageService.saveUserProfile(null);
      setSyncStatus('offline_saved');
    }
  };

  // Handle Account Deletion: purges session and displays notice on login screen
  const handleAccountDeleted = () => {
    setDeleteNotice('Your account and all associated cloud data have been permanently deleted.');
    handleUserChange(null);
  };

  // Trigger manual cloud sync
  const handleTriggerSync = async () => {
    if (!user || user.isGuest) {
      setAuthModalVisible(true);
      return;
    }
    setSyncStatus('syncing');
    setScanNotice({
      title: 'Backing Up...',
      message: 'Syncing catches with cloud storage',
      type: 'info',
    });

    try {
      // 1. Fetch cloud metadata summary first to check what actually needs uploading/downloading
      const { data: cloudSummary, error: summaryError } =
        await SupabaseService.fetchCloudCatchSummary(user.id);

      let unsyncedCatches = catches;
      let missingFromLocalIds: string[] = [];

      if (!summaryError && cloudSummary) {
        const cloudCatchIdSet = new Set(cloudSummary.map((c) => c.catch_id));
        const localCatchIdSet = new Set(catches.map((c) => c.catch_id));

        // Catches not yet in cloud
        unsyncedCatches = catches.filter((c) => !cloudCatchIdSet.has(c.catch_id));

        // Catches in cloud not yet on this device
        missingFromLocalIds = cloudSummary
          .filter((c) => !localCatchIdSet.has(c.catch_id))
          .map((c) => c.catch_id);
      }

      // 2. Upload any catches not yet in cloud
      let uploadSuccess = true;
      let uploadError = '';
      if (unsyncedCatches.length > 0) {
        const res = await SupabaseService.syncCatchesToCloud(user.id, unsyncedCatches);
        uploadSuccess = res.success;
        uploadError = res.error || '';
      }

      // 3. Download any catches from cloud missing on this device (multi-device sync!)
      let updatedCatches = catches;
      if (missingFromLocalIds.length > 0) {
        const newCloudCatches = await SupabaseService.fetchCloudCatches(
          user.id,
          missingFromLocalIds
        );
        if (newCloudCatches.length > 0) {
          const catchMap = new Map<string, CatchRecord>();
          [...catches, ...newCloudCatches].forEach((c) => catchMap.set(c.catch_id, c));
          updatedCatches = Array.from(catchMap.values());
          setCatches(updatedCatches);
          await StorageService.saveCatches(user.id, updatedCatches);

          const mergedSpecimens = deriveSpecimensFromCatches(updatedCatches, specimens);
          setSpecimens(mergedSpecimens);
          await StorageService.saveSpecimens(user.id, mergedSpecimens);
        }
      }

      if (uploadSuccess) {
        setSyncStatus('synced');
        setScanNotice({
          title: 'Backup Successful',
          message: updatedCatches.length > 0
            ? `${updatedCatches.length} catches backed up and synced with cloud.`
            : 'Your collection is backed up and in sync with cloud.',
          type: 'success',
        });
      } else {
        setSyncStatus('error');
        setScanNotice({
          title: 'Backup Notice',
          message: uploadError || 'Could not sync. Catches remain saved safely on device.',
          type: 'warning',
        });
      }
    } catch (syncErr: any) {
      setSyncStatus('error');
      setScanNotice({
        title: 'Backup Notice',
        message: syncErr?.message || 'Could not complete backup. Catches are safely preserved on device.',
        type: 'warning',
      });
    }
  };

  // Toggle Online vs Offline Mode
  const handleToggleOfflineMode = () => {
    setIsOfflineMode((prev) => {
      const next = !prev;
      setScanNotice({
        title: next ? '🟠 Offline Mode Active' : '🟢 Online Mode Active',
        message: next
          ? 'On-device Wildlife Dex active. Creatures will be identified locally using the built-in 521+ species database with zero internet.'
          : 'Live Gemini Cloud AI restored. Universal species identification and real-time field scanner active.',
        type: 'info',
      });
      return next;
    });
  };

  // Handle Photo Capture from Scanner: 100% AUTOMATED
  const handlePhotoCaptured = async (imageUri: string, isFrontCamera: boolean = false) => {
    setIsAnalyzing(true);
    setScanNotice(null);

    try {
      // 1. Identify species (On-Device local engine if offline, Gemini Cloud AI if online)
      const res = await ApiService.identifySpecies(imageUri, {
        forceOffline: isOfflineMode,
        isFrontCamera,
      });

      // 2. Reject non-wildlife captures, rate limit, selfies, or invalid captures
      if (res.is_wildlife === false || !res.success) {
        const title =
          res.common_name?.includes('Selfie') || res.common_name?.includes('Human')
            ? 'Selfie Detected 👤'
            : res.common_name === 'Connection Required' || res.common_name === 'No Network Connection'
            ? 'Connection Required'
            : res.common_name === 'Rate Limit Reached'
            ? 'Rate Limit'
            : 'No Wildlife Detected';

        setScanNotice({
          title,
          message: res.message || 'Please center a wild animal, bird, insect, or reptile in the viewfinder.',
          type: 'warning',
        });
        return;
      }

      // 3. Automated Category Mapping to Gotcha taxonomy
      let mappedCat: TaxonomicCategory = 'Insects';
      const rawClass = String(res.taxonomy_class || '').toLowerCase();
      const rawName = String(res.common_name || '').toLowerCase();

      if (
        rawClass.includes('mammal') ||
        rawName.includes('dog') ||
        rawName.includes('cat') ||
        rawName.includes('bear') ||
        rawName.includes('wolf') ||
        rawName.includes('deer') ||
        rawName.includes('rabbit') ||
        rawName.includes('squirrel') ||
        rawName.includes('monkey') ||
        rawName.includes('elephant') ||
        rawName.includes('panda') ||
        rawName.includes('lion') ||
        rawName.includes('tiger') ||
        rawName.includes('cheetah')
      ) {
        mappedCat = 'Mammals';
      } else if (
        rawClass.includes('reptil') ||
        rawName.includes('snake') ||
        rawName.includes('lizard') ||
        rawName.includes('turtle') ||
        rawName.includes('gecko') ||
        rawName.includes('iguana') ||
        rawName.includes('chameleon') ||
        rawName.includes('crocodile') ||
        rawName.includes('alligator')
      ) {
        mappedCat = 'Reptiles';
      } else if (
        rawClass.includes('arachnid') ||
        rawName.includes('spider') ||
        rawName.includes('tarantula') ||
        rawName.includes('scorpion') ||
        rawName.includes('tick')
      ) {
        mappedCat = 'Arachnids';
      } else if (
        rawClass.includes('bird') ||
        rawName.includes('hen') ||
        rawName.includes('chicken') ||
        rawName.includes('rooster') ||
        rawName.includes('cock') ||
        rawName.includes('eagle') ||
        rawName.includes('owl') ||
        rawName.includes('hawk') ||
        rawName.includes('parrot') ||
        rawName.includes('macaw') ||
        rawName.includes('finch') ||
        rawName.includes('sparrow') ||
        rawName.includes('swan') ||
        rawName.includes('goose') ||
        rawName.includes('duck') ||
        rawName.includes('penguin') ||
        rawName.includes('flamingo')
      ) {
        mappedCat = 'Birds';
      } else if (
        rawClass.includes('amphib') ||
        rawName.includes('frog') ||
        rawName.includes('toad') ||
        rawName.includes('salamander') ||
        rawName.includes('newt')
      ) {
        mappedCat = 'Amphibians';
      } else if (
        rawClass.includes('fish') ||
        rawName.includes('shark') ||
        rawName.includes('trout') ||
        rawName.includes('salmon') ||
        rawName.includes('goldfish')
      ) {
        mappedCat = 'Fish';
      } else if (
        rawName.includes('crab') ||
        rawName.includes('lobster') ||
        rawName.includes('shrimp') ||
        rawName.includes('crayfish')
      ) {
        mappedCat = 'Crustaceans';
      } else if (
        rawName.includes('snail') ||
        rawName.includes('slug') ||
        rawName.includes('clam') ||
        rawName.includes('octopus') ||
        rawName.includes('squid')
      ) {
        mappedCat = 'Mollusks';
      } else if (
        rawClass.includes('insect') ||
        rawName.includes('butterfly') ||
        rawName.includes('moth') ||
        rawName.includes('beetle') ||
        rawName.includes('ladybug') ||
        rawName.includes('bee') ||
        rawName.includes('wasp') ||
        rawName.includes('ant') ||
        rawName.includes('mantis') ||
        rawName.includes('dragonfly') ||
        rawName.includes('grasshopper')
      ) {
        mappedCat = 'Insects';
      }

      // 4. Automated Danger Meter (1 to 5 pips: Green to Red)
      let mappedDanger = 1;
      const dl = String(res.danger_level || '').toLowerCase();
      if (dl.includes('venom') || dl.includes('danger')) mappedDanger = 5;
      else if (dl.includes('predator')) mappedDanger = 4;
      else if (dl.includes('mild')) mappedDanger = 2;
      else mappedDanger = 1; // Harmless = 1 pip (Green)

      // 5. Automated Rarity Level (Based strictly on authentic biological rarity)
      let mappedRarity: RarityLevel = 'COMMON';
      const cleanRarity = String(res.rarity || '').toUpperCase();
      if (cleanRarity.includes('LEGENDARY')) mappedRarity = 'LEGENDARY';
      else if (cleanRarity.includes('EPIC')) mappedRarity = 'EPIC';
      else if (cleanRarity.includes('RARE')) mappedRarity = 'RARE';
      else if (cleanRarity.includes('UNCOMMON')) mappedRarity = 'UNCOMMON';
      else mappedRarity = 'COMMON';

      const now = new Date();
      const dateOnly = now.toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
      });
      const timeOnly = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const fullTimestamp = `${dateOnly} • ${timeOnly}`;

      const specimenId = res.common_name.toLowerCase().replace(/\s+/g, '_');
      const catalogId = '#' + String(specimens.length + 1).padStart(3, '0');

      // 6. Automatically Record to Catches Inventory
      const authenticRegion = res.region || res.habitat || 'Global Distribution';
      const finalCategory: TaxonomicCategory = (res.category as TaxonomicCategory) || mappedCat;
      const finalBreed = res.breed || 'Wild Species';

      const newCatch: CatchRecord = {
        catch_id: 'catch_' + Date.now(),
        specimen_id: specimenId,
        catalog_id: catalogId,
        common_name: res.common_name,
        scientific_name: res.scientific_name,
        category: finalCategory,
        breed: finalBreed,
        rarity: mappedRarity,
        image_url: imageUri,
        box_2d: res.box_2d,
        biome: res.habitat || 'Temperate Wilderness',
        region: authenticRegion,
        danger_level: mappedDanger,
        caught_at: fullTimestamp,
        lore: res.fun_fact || 'Remarkable wildlife creature cataloged in Gotcha! Lens.',
      };

      const userId = user?.id || 'guest';
      const updatedCatches = [newCatch, ...catches];
      setCatches(updatedCatches);
      await StorageService.saveCatches(userId, updatedCatches);

      // 7. Automatically Record to Unique Index (Pokédex)
      const existingIdx = specimens.findIndex(
        (s) => s.common_name.toLowerCase() === res.common_name.toLowerCase()
      );

      let targetSpecimen: Specimen;
      let updatedSpecimens: Specimen[];

      if (existingIdx >= 0) {
        const existing = specimens[existingIdx];
        targetSpecimen = {
          ...existing,
          captured_count: existing.captured_count + 1,
          image_url: imageUri, // update with newest capture photo
          box_2d: res.box_2d || existing.box_2d,
          region: authenticRegion,
          breed: finalBreed,
          category: finalCategory,
        };
        updatedSpecimens = [...specimens];
        updatedSpecimens[existingIdx] = targetSpecimen;
        setSpecimens(updatedSpecimens);
      } else {
        targetSpecimen = {
          id: specimenId,
          catalog_id: catalogId,
          common_name: res.common_name,
          scientific_name: res.scientific_name,
          category: finalCategory,
          breed: finalBreed,
          rarity: mappedRarity,
          image_url: imageUri,
          box_2d: res.box_2d,
          lore: res.fun_fact || 'Remarkable wildlife creature cataloged in Gotcha! Lens.',
          biome: res.habitat || 'Temperate Wilderness',
          region: authenticRegion,
          date_spotted: dateOnly,
          danger_level: mappedDanger,
          captured_count: 1,
          first_caught_at: now.toISOString(),
        };
        updatedSpecimens = [targetSpecimen, ...specimens];
        setSpecimens(updatedSpecimens);
      }
      await StorageService.saveSpecimens(userId, updatedSpecimens);

      // Cloud auto-sync if authenticated (upload only the newly captured catch)
      if (user && !user.isGuest && SupabaseService.isConfigured()) {
        SupabaseService.syncCatchesToCloud(user.id, [newCatch]).then((syncRes) => {
          if (syncRes.success) setSyncStatus('synced');
        }).catch(() => {
          // Keep offline state safe
        });
      }

      // 8. Calculate EXP reward & check for Level Up
      const prevProgression = ProgressionService.getProgression(catches, specimens);
      const isNewSpecies = existingIdx < 0;
      const isAlreadyCaughtSameBreed = catches.some(
        (c) =>
          c.common_name.toLowerCase() === res.common_name.toLowerCase() &&
          (c.breed || '').toLowerCase() === finalBreed.toLowerCase()
      );
      const isNewBreed = !isAlreadyCaughtSameBreed;
      const reward = ProgressionService.calculateCatchReward(mappedRarity, isNewSpecies, isNewBreed);
      const nextProgression = ProgressionService.getProgression(updatedCatches, updatedSpecimens);

      if (nextProgression.level > prevProgression.level) {
        setScanNotice({
          title: `🎉 LEVEL UP! Level ${nextProgression.level}`,
          message: nextProgression.rankNumber > prevProgression.rankNumber
            ? `${nextProgression.rankBadgeEmoji} ${nextProgression.rankTitle} Achieved!`
            : nextProgression.isMaxLevel
              ? 'Reached Maximum Level 100!'
              : `Progress: ${nextProgression.currentLevelExp}/${nextProgression.expToNextLevel} EXP`,
          type: 'info',
        });
      } else if (reward.isRepeat) {
        setScanNotice({
          title: '🔄 Repeat Capture (0 EXP)',
          message: `Already cataloged ${res.common_name}${finalBreed && finalBreed !== 'Wild Species' ? ` (${finalBreed})` : ''}. Only new species or different breeds grant EXP!`,
          type: 'info',
        });
      } else {
        setScanNotice({
          title: isNewSpecies
            ? `✨ New Dex Entry! +${reward.totalExpEarned} EXP`
            : `🐾 New Breed Variant! +${reward.totalExpEarned} EXP`,
          message: isNewSpecies
            ? `Discovered ${res.common_name} (${mappedRarity})! Progress: ${nextProgression.currentLevelExp}/${nextProgression.expToNextLevel} EXP.`
            : `Cataloged new ${res.common_name} variant (${finalBreed}). Progress: ${nextProgression.currentLevelExp}/${nextProgression.expToNextLevel} EXP.`,
          type: 'info',
        });
      }

      // 9. Directly open Encyclopedia Specimen Details Modal!
      setSelectedDetailSpecimen(targetSpecimen);
      setDetailModalVisible(true);

    } catch (err: any) {
      setScanNotice({
        title: 'Classification Issue',
        message: err.message || 'Could not classify creature. Check server connection.',
        type: 'error',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Center button on Floating Bottom Bar:
  // Acts as Camera Shutter on Scanner tab, or navigates to Scanner from other tabs
  const handleCenterAction = () => {
    if (activeTab === 'SCANNER') {
      if (scannerRef.current) {
        scannerRef.current.takePicture();
      }
    } else {
      setActiveTab('SCANNER');
    }
  };

  // Open Encyclopedia Specimen Detail from Index Card
  const handleOpenSpecimenDetail = (specimen: Specimen) => {
    setSelectedDetailSpecimen(specimen);
    setDetailModalVisible(true);
  };

  // Open Encyclopedia Specimen Detail from Catch Record
  const handleOpenCatchDetail = (catchRecord: CatchRecord) => {
    const existing = specimens.find(
      (s) => s.common_name.toLowerCase() === catchRecord.common_name.toLowerCase()
    );
    if (existing) {
      setSelectedDetailSpecimen(existing);
    } else {
      setSelectedDetailSpecimen({
        id: catchRecord.specimen_id,
        catalog_id: catchRecord.catalog_id,
        common_name: catchRecord.common_name,
        scientific_name: catchRecord.scientific_name,
        category: catchRecord.category,
        rarity: catchRecord.rarity,
        image_url: catchRecord.image_url,
        lore: catchRecord.lore,
        biome: catchRecord.biome,
        region: catchRecord.region,
        date_spotted: catchRecord.caught_at.split('•')[0].trim(),
        danger_level: catchRecord.danger_level,
        captured_count: 1,
      });
    }
    setDetailModalVisible(true);
  };

  // Release Specimen action
  const handleReleaseSpecimen = (specimenId: string) => {
    const userId = user?.id || 'guest';
    const nextSpecimens = specimens.filter((s) => s.id !== specimenId);
    const nextCatches = catches.filter((c) => c.specimen_id !== specimenId);
    setSpecimens(nextSpecimens);
    setCatches(nextCatches);
    StorageService.saveSpecimens(userId, nextSpecimens);
    StorageService.saveCatches(userId, nextCatches);
    if (user && !user.isGuest && SupabaseService.isConfigured()) {
      SupabaseService.syncCatchesToCloud(user.id, nextCatches).catch(() => {});
    }
  };

  // 1. Splash / Session Restoration Screen
  if (!authChecked) {
    return (
      <SafeAreaView style={[styles.appShell, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#10B981" />
      </SafeAreaView>
    );
  }

  // 2. Dedicated Full-Page Login & Sign Up Screen (if no session active)
  if (!user) {
    return <AuthScreen onLoginSuccess={handleUserChange} statusMessage={deleteNotice} />;
  }

  return (
    <SafeAreaView style={styles.appShell}>
      <StatusBar
        barStyle={activeTab === 'SCANNER' ? 'light-content' : 'dark-content'}
        backgroundColor={activeTab === 'SCANNER' ? '#000000' : COLORS.background}
      />

      {/* Dynamic In-App Scanner Notification Banner */}
      {scanNotice && (
        <View style={styles.noticeBanner}>
          <View style={styles.noticeIconWrapper}>
            {scanNotice.type === 'success' ? (
              <CheckCircle2 size={19} color="#10B981" />
            ) : scanNotice.type === 'warning' ? (
              <AlertCircle size={19} color="#F59E0B" />
            ) : scanNotice.type === 'error' ? (
              <AlertTriangle size={19} color="#EF4444" />
            ) : (
              <Info size={19} color="#3B82F6" />
            )}
          </View>
          <View style={styles.noticeTextContainer}>
            <Text style={styles.noticeTitle}>{scanNotice.title}</Text>
            {scanNotice.message ? (
              <Text style={styles.noticeMessage}>{scanNotice.message}</Text>
            ) : null}
          </View>
          <TouchableOpacity
            style={styles.noticeDismissBtn}
            onPress={() => setScanNotice(null)}
            activeOpacity={0.7}
          >
            <X size={15} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      )}

      {/* 2. Header Component (Dynamic Top Bar: Segmented Switcher & Category Dropdown) */}
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        onOpenSettings={() => setSettingsModalVisible(true)}
      />

      {/* 3. Main Content Views (Four Tabs: Catches, Dex, Scanner, Profile) */}
      <View style={styles.contentBody}>
        {activeTab === 'INDEX' && (
          // Tab 1: Unique Index (Pokedex Grid View)
          <UniqueIndexGrid
            specimens={specimens}
            selectedCategory={selectedCategory}
            onSelectSpecimen={handleOpenSpecimenDetail}
          />
        )}

        {activeTab === 'SCANNER' && (
          // Tab 2: Scanner / Camera View
          <ScannerView
            ref={scannerRef}
            onCapture={handlePhotoCaptured}
            isAnalyzing={isAnalyzing}
            isOfflineMode={isOfflineMode}
            onToggleOfflineMode={handleToggleOfflineMode}
            onClose={() => setActiveTab('INDEX')}
          />
        )}

        {activeTab === 'CATCHES' && (
          // Tab 3: Catches Inventory View
          <CatchesInventoryGrid
            catches={catches}
            onSelectCatch={handleOpenCatchDetail}
          />
        )}

        {activeTab === 'PROFILE' && (
          // Tab 4: Profile & Stats Dashboard (Screenshots 1, 2, 3)
          <ProfileView
            user={user}
            catches={catches}
            specimens={specimens}
            onSelectTab={setActiveTab}
            onOpenCatchDetail={handleOpenCatchDetail}
            onUpdateHandle={async (newHandle) => {
              if (user) {
                const updated = { ...user, handle: newHandle };
                setUser(updated);
                await StorageService.saveUserProfile(updated);
                await StorageService.updateAccountMetadata(user.id, { handle: newHandle });
                if (!user.isGuest && SupabaseService.isConfigured()) {
                  SupabaseService.updateUserProfile({ handle: newHandle }).catch(() => {});
                }
                setScanNotice({
                  title: 'Handle Updated',
                  message: `Your handle has been updated to ${newHandle}`,
                  type: 'success',
                });
              }
            }}
            onUpdateAvatar={async (newAvatarUri) => {
              if (user) {
                const cleanUri = newAvatarUri && newAvatarUri.trim() ? newAvatarUri : undefined;
                const updated = { ...user, avatarUrl: cleanUri };
                setUser(updated);
                await StorageService.saveUserProfile(updated);
                await StorageService.updateAccountMetadata(user.id, { avatarUrl: cleanUri || '' });
                if (!user.isGuest && SupabaseService.isConfigured()) {
                  SupabaseService.updateUserProfile({ avatarUrl: cleanUri || '' }).catch(() => {});
                }
                setScanNotice({
                  title: cleanUri ? 'Profile Photo Updated' : 'Profile Photo Removed',
                  message: cleanUri ? 'Your profile photo has been updated.' : 'Your profile photo was successfully removed.',
                  type: 'success',
                });
              }
            }}
          />
        )}
      </View>

      {/* 4. Navigation Component (Floating Bottom Bar) */}
      <BottomNavBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onCenterPress={handleCenterAction}
        isAnalyzing={isAnalyzing}
      />

      {/* 5. Encyclopedia Specimen Details Modal */}
      <SpecimenDetailModal
        visible={detailModalVisible}
        specimen={selectedDetailSpecimen}
        onClose={() => setDetailModalVisible(false)}
        onRelease={handleReleaseSpecimen}
      />

      {/* 6. Settings Modal Sheet (Screenshots 4 & 5) */}
      <SettingsModal
        visible={settingsModalVisible}
        onClose={() => setSettingsModalVisible(false)}
        user={user}
        onSignOut={() => {
          setSettingsModalVisible(false);
          handleUserChange(null);
        }}
        onDeleteAccount={async () => {
          setSettingsModalVisible(false);
          if (user) {
            await StorageService.deleteLocalAccount(user.id, user.email);
          }
          setUser(null);
          setCatches([]);
          setSpecimens([]);
          await StorageService.saveUserProfile(null);
          setDeleteNotice('Your account and all associated data have been permanently deleted.');
        }}
        onTriggerSync={handleTriggerSync}
        isCloudConfigured={SupabaseService.isConfigured()}
      />

      {/* 7. User Passport & Cloud Storage Modal */}
      <AuthModal
        visible={authModalVisible}
        onClose={() => setAuthModalVisible(false)}
        user={user}
        onUserChange={handleUserChange}
        onAccountDeleted={handleAccountDeleted}
        catchesCount={catches.length}
        uniqueCount={specimens.length}
        catches={catches}
        specimens={specimens}
        onTriggerSync={handleTriggerSync}
        syncStatus={syncStatus}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  appShell: {
    flex: 1,
    backgroundColor: COLORS.background,
    overflow: 'hidden',
  },
  contentBody: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  noticeBanner: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 48,
    left: 18,
    right: 18,
    backgroundColor: 'rgba(20, 20, 20, 0.94)',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 9999,
    ...SHADOWS.soft,
  },
  noticeIconWrapper: {
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeTextContainer: {
    flex: 1,
  },
  noticeTitle: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
    marginBottom: 2,
  },
  noticeMessage: {
    color: '#D4D4D4',
    fontSize: 12,
    lineHeight: 16,
  },
  noticeDismissBtn: {
    padding: 6,
    marginLeft: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

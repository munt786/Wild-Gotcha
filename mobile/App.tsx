import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { ActiveTab, TaxonomicCategory, Specimen, CatchRecord, RarityLevel } from './src/types';
import { COLORS } from './src/theme/colors';
import { Header } from './src/components/Header';
import { BottomNavBar } from './src/components/BottomNavBar';
import { UniqueIndexGrid } from './src/components/UniqueIndexGrid';
import { ScannerView, ScannerViewHandle } from './src/components/ScannerView';
import { CatchesInventoryGrid } from './src/components/CatchesInventoryGrid';
import { SpecimenDetailModal } from './src/components/SpecimenDetailModal';
import { ApiService } from './src/services/api';

export default function App() {
  // Navigation & Category State
  const [activeTab, setActiveTab] = useState<ActiveTab>('INDEX');
  const [selectedCategory, setSelectedCategory] = useState<TaxonomicCategory>('All');

  // Specimen & Catches Collection State (starts empty matching user mockup)
  const [specimens, setSpecimens] = useState<Specimen[]>([]);
  const [catches, setCatches] = useState<CatchRecord[]>([]);

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
    type: 'warning' | 'info' | 'error';
  } | null>(null);

  React.useEffect(() => {
    if (scanNotice) {
      const timer = setTimeout(() => setScanNotice(null), 7000);
      return () => clearTimeout(timer);
    }
  }, [scanNotice]);

  // Handle Photo Capture from Scanner: 100% AUTOMATED
  const handlePhotoCaptured = async (imageUri: string) => {
    setIsAnalyzing(true);
    setScanNotice(null);

    try {
      // 1. Send captured frame to FastAPI / ONNX MobileNetV2 backend
      const res = await ApiService.identifySpecies(imageUri);

      // 2. Reject non-wildlife captures (e.g. human face, selfie, clothes, room, objects)
      if (res.is_wildlife === false || !res.success) {
        setScanNotice({
          title: 'No Wildlife Detected',
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
      const dl = String(res.danger_level || '');
      if (dl.includes('Venomous') || dl.includes('Dangerous')) mappedDanger = 5;
      else if (dl.includes('Predatory')) mappedDanger = 4;
      else if (dl.includes('Mild')) mappedDanger = 2;

      // 5. Automated Rarity Level
      let mappedRarity: RarityLevel = 'COMMON';
      const cleanRarity = String(res.rarity || '').toUpperCase();
      if (cleanRarity === 'LEGENDARY') mappedRarity = 'LEGENDARY';
      else if (cleanRarity === 'EPIC') mappedRarity = 'EPIC';
      else if (cleanRarity === 'RARE' || res.confidence_score >= 0.94) mappedRarity = 'RARE';
      else if (cleanRarity === 'UNCOMMON' || res.confidence_score >= 0.88) mappedRarity = 'UNCOMMON';

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
        biome: res.habitat || 'Temperate Wilderness',
        region: authenticRegion,
        danger_level: mappedDanger,
        caught_at: fullTimestamp,
        lore: res.fun_fact || 'Remarkable wildlife creature cataloged in Gotcha! Lens.',
      };

      setCatches((prev) => [newCatch, ...prev]);

      // 7. Automatically Record to Unique Index (Pokédex)
      const existingIdx = specimens.findIndex(
        (s) => s.common_name.toLowerCase() === res.common_name.toLowerCase()
      );

      let targetSpecimen: Specimen;

      if (existingIdx >= 0) {
        const existing = specimens[existingIdx];
        targetSpecimen = {
          ...existing,
          captured_count: existing.captured_count + 1,
          image_url: imageUri, // update with newest capture photo
          region: authenticRegion,
          breed: finalBreed,
          category: finalCategory,
        };
        setSpecimens((prev) => {
          const next = [...prev];
          next[existingIdx] = targetSpecimen;
          return next;
        });
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
          lore: res.fun_fact || 'Remarkable wildlife creature cataloged in Gotcha! Lens.',
          biome: res.habitat || 'Temperate Wilderness',
          region: authenticRegion,
          date_spotted: dateOnly,
          danger_level: mappedDanger,
          captured_count: 1,
          first_caught_at: now.toISOString(),
        };
        setSpecimens((prev) => [targetSpecimen, ...prev]);
      }

      // 8. Directly open Encyclopedia Specimen Details Modal!
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
    setSpecimens((prev) => prev.filter((s) => s.id !== specimenId));
    setCatches((prev) => prev.filter((c) => c.specimen_id !== specimenId));
  };

  return (
    <SafeAreaView style={styles.appShell}>
      <StatusBar
        barStyle={activeTab === 'SCANNER' ? 'light-content' : 'dark-content'}
        backgroundColor={activeTab === 'SCANNER' ? '#000000' : COLORS.background}
      />

      {/* Dynamic In-App Scanner Notification Banner */}
      {scanNotice && (
        <View style={styles.noticeBanner}>
          <Text style={styles.noticeIcon}>
            {scanNotice.type === 'warning' ? '🔍' : scanNotice.type === 'error' ? '⚠️' : 'ℹ️'}
          </Text>
          <View style={styles.noticeTextContainer}>
            <Text style={styles.noticeTitle}>{scanNotice.title}</Text>
            <Text style={styles.noticeMessage}>{scanNotice.message}</Text>
          </View>
          <TouchableOpacity
            style={styles.noticeDismissBtn}
            onPress={() => setScanNotice(null)}
            activeOpacity={0.7}
          >
            <Text style={styles.noticeDismissText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 2. Header Component (Dynamic Top Bar: State 1, 2, or Hidden) */}
      <Header
        activeTab={activeTab}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* 3. Main Content Views (Three Tabs) */}
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
          />
        )}

        {activeTab === 'CATCHES' && (
          // Tab 3: Catches Inventory View
          <CatchesInventoryGrid
            catches={catches}
            onSelectCatch={handleOpenCatchDetail}
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
    top: 56,
    left: 18,
    right: 18,
    backgroundColor: 'rgba(20, 20, 20, 0.94)',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 999,
    boxShadow: '0px 6px 20px rgba(0, 0, 0, 0.28)',
  },
  noticeIcon: {
    fontSize: 22,
    marginRight: 12,
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
    padding: 8,
    marginLeft: 6,
  },
  noticeDismissText: {
    color: '#A0A0A0',
    fontSize: 16,
    fontWeight: '700',
  },
});

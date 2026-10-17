import { StatusBar } from 'expo-status-bar';
import * as MediaLibrary from 'expo-media-library/legacy';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  FlatList,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  calculateEstimatedBytes,
  estimateAssetBytes,
  formatBytes,
  getCategoryMatches,
} from './src/utils/media';
const PAGE_SIZE = 100;
const MINIMUM_SCAN_DURATION_MS = 3500;

const CATEGORY_CONFIG = {
  screenshots: { title: 'Ekran görüntüleri', description: 'Genellikle bir kez kullanılan görseller', icon: '▦' },
  largePhotos: { title: 'Yüksek çözünürlük', description: '12 MP ve üzerindeki fotoğraflar', icon: '◎' },
  largeVideos: { title: 'Uzun videolar', description: '60 saniye ve üzerindeki videolar', icon: '▷' },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const [permission, requestPermission] = MediaLibrary.usePermissions();
  const [assetsByCategory, setAssetsByCategory] = useState({
    screenshots: [],
    largePhotos: [],
    largeVideos: [],
  });
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState('Galerinizi taramaya hazırız.');
  const [activeCategory, setActiveCategory] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [cleanupResult, setCleanupResult] = useState(null);

  const visibleAssets = useMemo(
    () => (activeCategory ? assetsByCategory[activeCategory] : []),
    [activeCategory, assetsByCategory]
  );
  const selectedAssets = useMemo(
    () => visibleAssets.filter((asset) => selectedIds.has(asset.id)),
    [selectedIds, visibleAssets]
  );
  const selectedBytes = useMemo(
    () => calculateEstimatedBytes(selectedAssets),
    [selectedAssets]
  );

  const scanLibrary = useCallback(async () => {
    if (!permission?.granted) return;

    const startedAt = Date.now();
    setIsScanning(true);
    setScanMessage('Fotoğraf ve videolar inceleniyor…');
    setSelectedIds(new Set());
    try {
      const next = { screenshots: [], largePhotos: [], largeVideos: [] };
      let after;
      let hasNextPage = true;

      while (hasNextPage) {
        const page = await MediaLibrary.getAssetsAsync({
          after,
          first: PAGE_SIZE,
          mediaType: [MediaLibrary.MediaType.photo, MediaLibrary.MediaType.video],
          sortBy: [MediaLibrary.SortBy.creationTime],
        });

        page.assets.forEach((asset) => {
          const categories = getCategoryMatches(asset);
          Object.entries(categories).forEach(([category, matches]) => {
            if (matches) next[category].push(asset);
          });
        });

        after = page.endCursor;
        hasNextPage = page.hasNextPage;
      }

      setAssetsByCategory(next);
      setScanMessage('Tarama tamamlandı. Bir kategori seçerek inceleyin.');
    } catch {
      setScanMessage('Tarama tamamlanamadı. Lütfen tekrar deneyin.');
    } finally {
      const remainingDuration = MINIMUM_SCAN_DURATION_MS - (Date.now() - startedAt);
      if (remainingDuration > 0) {
        await new Promise((resolve) => setTimeout(resolve, remainingDuration));
      }
      setIsScanning(false);
    }
  }, [permission?.granted]);

  const openCategory = useCallback((category) => {
    setSelectedIds(new Set());
    setActiveCategory(category);
  }, []);

  const toggleAsset = useCallback((id) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(visibleAssets.map((asset) => asset.id)));
  }, [visibleAssets]);

  const deleteSelected = useCallback(async () => {
    if (!selectedAssets.length) return;

    Alert.alert(
      'Seçilenleri sil?',
      `${selectedAssets.length} öğe için iOS silme onayı gösterecek. Tahmini alan: ${formatBytes(selectedBytes)}.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Devam et',
          style: 'destructive',
          onPress: async () => {
            try {
              const deleted = await MediaLibrary.deleteAssetsAsync(selectedAssets.map((asset) => asset.id));
              if (!deleted) return;
              const removed = new Set(selectedAssets.map((asset) => asset.id));
              setAssetsByCategory((current) =>
                Object.fromEntries(
                  Object.entries(current).map(([category, assets]) => [
                    category,
                    assets.filter((asset) => !removed.has(asset.id)),
                  ])
                )
              );
              setSelectedIds(new Set());
              setActiveCategory(null);
              setCleanupResult({ count: selectedAssets.length, bytes: selectedBytes });
            } catch {
              Alert.alert('Silme tamamlanamadı', 'iOS isteği tamamlayamadı. Lütfen tekrar deneyin.');
            }
          },
        },
      ]
    );
  }, [selectedAssets, selectedBytes]);

  if (!permission) {
    return <LoadingScreen label="Fotoğraflar izni kontrol ediliyor…" />;
  }

  if (!permission.granted) {
    const permissionAction = permission.canAskAgain
      ? { label: 'Fotoğraflara erişim ver', onPress: requestPermission }
      : { label: 'Ayarları aç', onPress: () => Linking.openSettings() };
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.permissionContainer}>
          <AppMark />
          <Text style={styles.eyebrow}>PHONE CLEANER</Text>
          <Text style={styles.title}>Galerinizde yer açın.</Text>
          <Text style={styles.body}>
            {permission.canAskAgain
              ? 'Fotoğraf ve videolar yalnızca cihazınızda taranır. Hiçbir içerik sunucuya yüklenmez.'
              : 'Fotoğraflar erişimi Ayarlar’dan kapatılmış. Taramayı başlatmak için erişime izin verin.'}
          </Text>
          <Pressable style={styles.primaryButton} onPress={permissionAction.onPress} accessibilityRole="button">
            <Text style={styles.primaryButtonText}>{permissionAction.label}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (cleanupResult) {
    return (
      <CleanupSuccessScreen
        result={cleanupResult}
        onComplete={() => {
          setCleanupResult(null);
          setScanMessage('Temizlik tamamlandı. İsterseniz galeriyi yeniden tarayabilirsiniz.');
        }}
      />
    );
  }

  if (isScanning) {
    return <ScanningScreen />;
  }

  if (activeCategory) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.screen}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => setActiveCategory(null)} accessibilityRole="button">
              <Text style={styles.backButton}>‹ Özet</Text>
            </Pressable>
            <Pressable onPress={selectAll} accessibilityRole="button">
              <Text style={styles.textButton}>Tümünü seç</Text>
            </Pressable>
          </View>
          <Text style={styles.sectionTitle}>{CATEGORY_CONFIG[activeCategory].title}</Text>
          <Text style={styles.body}>{CATEGORY_CONFIG[activeCategory].description}</Text>
          <FlatList
            data={visibleAssets}
            keyExtractor={(asset) => asset.id}
            numColumns={3}
            contentContainerStyle={styles.grid}
            ListEmptyComponent={<Text style={styles.emptyText}>Bu kategoride öğe bulunamadı.</Text>}
            renderItem={({ item }) => {
              const selected = selectedIds.has(item.id);
              return (
                <Pressable
                  style={[styles.asset, selected && styles.assetSelected]}
                  onPress={() => toggleAsset(item.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={`Tahmini ${formatBytes(estimateAssetBytes(item))} boyutunda medya`}
                >
                  <AssetThumbnail asset={item} key={item.id} />
                  <View style={styles.assetLabel}>
                    <Text style={styles.assetLabelText}>
                      {selected ? 'Seçildi' : `~${formatBytes(estimateAssetBytes(item))}`}
                    </Text>
                  </View>
                </Pressable>
              );
            }}
          />
          <Pressable
            style={[styles.deleteButton, !selectedAssets.length && styles.disabledButton]}
            disabled={!selectedAssets.length}
            onPress={deleteSelected}
            accessibilityRole="button"
          >
            <Text style={styles.deleteButtonText}>
              {selectedAssets.length
                ? `${selectedAssets.length} öğeyi sil · ${formatBytes(selectedBytes)}`
                : 'Silmek için öğe seçin'}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.screen}>
        <View style={styles.topBar}>
          <View style={styles.brandLockup}>
            <AppMark compact />
            <Text style={styles.eyebrow}>PHONE CLEANER</Text>
          </View>
          <Text style={styles.localBadge}>Cihazında</Text>
        </View>
        <View style={styles.heroCard}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroKicker}>AKILLI TARAMA</Text>
            <Text style={styles.heroTitle}>Yer açmaya{`\n`}hazır mısın?</Text>
            <Text style={styles.heroBody}>{scanMessage}</Text>
          </View>
          <Pressable
            style={[styles.scanButton, isScanning && styles.disabledButton]}
            onPress={scanLibrary}
            disabled={isScanning}
            accessibilityRole="button"
            accessibilityLabel="Galeriyi tara"
          >
            <Text style={styles.scanButtonIcon}>→</Text>
            <Text style={styles.scanButtonText}>Tara</Text>
          </Pressable>
        </View>
        {permission.accessPrivileges === 'limited' ? (
          <View style={styles.limitedBanner}>
            <Text style={styles.limitedBannerText}>
              Sınırlı Fotoğraflar erişimi: yalnızca izin verdiğiniz öğeler taranıyor.
            </Text>
            <Pressable
              onPress={() => MediaLibrary.presentPermissionsPickerAsync()}
              accessibilityRole="button"
            >
              <Text style={styles.limitedBannerAction}>Seçimi düzenle</Text>
            </Pressable>
          </View>
        ) : null}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>İncelenecekler</Text>
          <Text style={styles.sectionMeta}>3 kategori</Text>
        </View>
        <View style={styles.cards}>
          {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
            const assets = assetsByCategory[key];
              const bytes = calculateEstimatedBytes(assets);
              return (
                <Pressable key={key} style={styles.card} onPress={() => openCategory(key)} accessibilityRole="button">
                  <View style={styles.categoryIcon}>
                    <Text style={styles.categoryIconText}>{config.icon}</Text>
                  </View>
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle}>{config.title}</Text>
                    <Text style={styles.cardDescription}>{config.description}</Text>
                  </View>
                  <View style={styles.cardStats}>
                    <Text style={styles.cardCount}>{assets.length}</Text>
                    <Text style={styles.cardSize}>{formatBytes(bytes)}</Text>
                  </View>
                  <Text style={styles.cardChevron}>›</Text>
                </Pressable>
            );
          })}
        </View>
        <Text style={styles.footnote}>Alan hesapları iCloud ve iOS kütüphane durumuna göre tahminidir.</Text>
      </View>
    </SafeAreaView>
  );
}

function AppMark({ compact = false }) {
  return (
    <Image
      source={require('./assets/icon.png')}
      style={[styles.appMark, compact && styles.appMarkCompact]}
      accessibilityLabel="Phone Cleaner uygulama simgesi"
    />
  );
}

function LoadingScreen({ label }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.permissionContainer}>
        <ActivityIndicator size="large" color="#347C4B" />
        <Text style={styles.body}>{label}</Text>
      </View>
    </SafeAreaView>
  );
}

function ScanningScreen() {
  const [pulse] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 950,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 950,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  const outerScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.16] });
  const outerOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0.12] });

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.scanningContainer}>
        <Text style={styles.eyebrow}>PHONE CLEANER</Text>
        <View style={styles.scanningAnimation} accessibilityLabel="Galeri taranıyor">
          <Animated.View
            style={[styles.scanningPulse, { opacity: outerOpacity, transform: [{ scale: outerScale }] }]}
          />
          <View style={styles.scanningCore}>
            <ActivityIndicator size="large" color="#17301F" />
          </View>
        </View>
        <Text style={styles.scanningTitle}>Galeriniz taranıyor</Text>
        <Text style={styles.body}>Fotoğraf ve videolar yalnızca cihazınızda inceleniyor.</Text>
        <Text style={styles.scanningHint}>Bu işlem kütüphanenizin boyutuna göre biraz sürebilir.</Text>
      </View>
    </SafeAreaView>
  );
}

function AssetThumbnail({ asset }) {
  const [previewUri, setPreviewUri] = useState(
    asset.uri?.startsWith('file://') ? asset.uri : null
  );

  useEffect(() => {
    let cancelled = false;

    async function loadPreview() {
      try {
        const info = await MediaLibrary.getAssetInfoAsync(asset, {
          shouldDownloadFromNetwork: false,
        });
        if (!cancelled && info.localUri?.startsWith('file://')) {
          setPreviewUri(info.localUri);
        }
      } catch {
        // Kütüphanedeki iCloud/izinli olmayan varlıklar için güvenli yer tutucu gösterilir.
      }
    }

    loadPreview();
    return () => {
      cancelled = true;
    };
  }, [asset]);

  if (previewUri) {
    return <Image source={{ uri: previewUri }} style={styles.thumbnail} />;
  }

  return (
    <View style={styles.thumbnailPlaceholder}>
      <Text style={styles.thumbnailPlaceholderText}>Önizleme{`\n`}hazırlanıyor</Text>
    </View>
  );
}

function CleanupSuccessScreen({ result, onComplete }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.successContainer}>
        <View style={styles.successIcon}>
          <Text style={styles.successIconText}>✓</Text>
        </View>
        <Text style={styles.eyebrow}>TEMİZLİK TAMAMLANDI</Text>
        <Text style={styles.successTitle}>{result.count} öğe silinmek üzere taşındı</Text>
        <Text style={styles.successEstimate}>Tahmini alan: {formatBytes(result.bytes)}</Text>
        <View style={styles.recentlyDeletedCard}>
          <Text style={styles.recentlyDeletedTitle}>Alan neden hemen açılmayabilir?</Text>
          <Text style={styles.recentlyDeletedText}>
            iOS, silinen öğeleri önce Fotoğraflar uygulamasındaki Son Silinenler albümüne taşır.
          </Text>
          <Text style={styles.recentlyDeletedText}>
            Alanı hemen açmak için Fotoğraflar → Albümler → Son Silinenler bölümünden öğeleri kalıcı
            olarak silebilirsiniz.
          </Text>
        </View>
        <Pressable style={styles.primaryButton} onPress={onComplete} accessibilityRole="button">
          <Text style={styles.primaryButtonText}>Tamam</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7FAF5' },
  screen: { flex: 1, padding: 20 },
  permissionContainer: { flex: 1, justifyContent: 'center', padding: 28, gap: 18 },
  appMark: { borderRadius: 24, height: 96, width: 96 },
  appMarkCompact: { borderRadius: 15, height: 48, width: 48 },
  eyebrow: { color: '#347C4B', fontSize: 12, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: '#17301F', fontSize: 34, fontWeight: '800', letterSpacing: -0.8, marginTop: 8 },
  sectionTitle: { color: '#17301F', fontSize: 28, fontWeight: '800', letterSpacing: -0.5, marginTop: 24 },
  body: { color: '#526158', fontSize: 16, lineHeight: 23 },
  primaryButton: { alignItems: 'center', backgroundColor: '#D9F45D', borderRadius: 24, marginTop: 24, padding: 17 },
  primaryButtonText: { color: '#17301F', fontSize: 16, fontWeight: '800' },
  scanningContainer: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 28 },
  scanningAnimation: { alignItems: 'center', height: 174, justifyContent: 'center', marginVertical: 36, width: 174 },
  scanningPulse: { backgroundColor: '#D9F45D', borderRadius: 87, height: 148, position: 'absolute', width: 148 },
  scanningCore: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 55, height: 110, justifyContent: 'center', width: 110 },
  scanningTitle: { color: '#17301F', fontSize: 29, fontWeight: '800', letterSpacing: -0.5, marginBottom: 10, textAlign: 'center' },
  scanningHint: { color: '#718078', fontSize: 13, lineHeight: 19, marginTop: 26, textAlign: 'center' },
  successContainer: { flex: 1, justifyContent: 'center', padding: 28 },
  successIcon: { alignItems: 'center', backgroundColor: '#D9F45D', borderRadius: 36, height: 72, justifyContent: 'center', marginBottom: 26, width: 72 },
  successIconText: { color: '#17301F', fontSize: 36, fontWeight: '800' },
  successTitle: { color: '#17301F', fontSize: 30, fontWeight: '800', letterSpacing: -0.6, lineHeight: 36, marginTop: 10 },
  successEstimate: { color: '#347C4B', fontSize: 18, fontWeight: '800', marginTop: 12 },
  recentlyDeletedCard: { backgroundColor: '#FFFFFF', borderRadius: 18, marginTop: 30, padding: 20 },
  recentlyDeletedTitle: { color: '#17301F', fontSize: 16, fontWeight: '800', marginBottom: 10 },
  recentlyDeletedText: { color: '#526158', fontSize: 14, lineHeight: 21, marginTop: 8 },
  topBar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  brandLockup: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  localBadge: { backgroundColor: '#E9F0E7', borderRadius: 14, color: '#52705B', fontSize: 12, fontWeight: '700', overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 6 },
  heroCard: { backgroundColor: '#17301F', borderRadius: 30, minHeight: 244, overflow: 'hidden', padding: 24, position: 'relative' },
  heroCopy: { paddingRight: 90 },
  heroKicker: { color: '#CDE6B0', fontSize: 11, fontWeight: '800', letterSpacing: 1.1 },
  heroTitle: { color: '#FFFFFF', fontSize: 31, fontWeight: '800', letterSpacing: -0.8, lineHeight: 36, marginTop: 10 },
  heroBody: { color: '#C7D3C9', fontSize: 13, lineHeight: 19, marginTop: 10 },
  scanButton: { alignItems: 'center', backgroundColor: '#D9F45D', borderRadius: 40, bottom: 22, height: 80, justifyContent: 'center', position: 'absolute', right: 22, width: 80 },
  scanButtonIcon: { color: '#17301F', fontSize: 24, fontWeight: '500', lineHeight: 25 },
  scanButtonText: { color: '#17301F', fontSize: 12, fontWeight: '800' },
  sectionHeader: { alignItems: 'baseline', flexDirection: 'row', justifyContent: 'space-between', marginTop: 27 },
  sectionLabel: { color: '#17301F', fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  sectionMeta: { color: '#718078', fontSize: 12, fontWeight: '700' },
  limitedBanner: {
    backgroundColor: '#EAF4D5',
    borderRadius: 14,
    marginTop: 16,
    padding: 14,
  },
  limitedBannerText: { color: '#36513B', fontSize: 13, lineHeight: 18 },
  limitedBannerAction: { color: '#347C4B', fontSize: 13, fontWeight: '800', marginTop: 8 },
  disabledButton: { opacity: 0.45 },
  cards: { gap: 10, marginTop: 13 },
  card: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 22, flexDirection: 'row', minHeight: 94, padding: 14, position: 'relative' },
  categoryIcon: { alignItems: 'center', backgroundColor: '#EAF4D5', borderRadius: 18, height: 48, justifyContent: 'center', marginRight: 13, width: 48 },
  categoryIconText: { color: '#347C4B', fontSize: 25, fontWeight: '700', lineHeight: 28 },
  cardContent: { flex: 1, paddingRight: 8 },
  cardTitle: { color: '#17301F', flexShrink: 1, fontSize: 17, fontWeight: '800', lineHeight: 22 },
  cardDescription: { color: '#718078', flexShrink: 1, fontSize: 13, lineHeight: 18, marginTop: 4 },
  cardStats: { alignItems: 'flex-end', marginRight: 11, width: 62 },
  cardCount: { color: '#17301F', fontSize: 19, fontWeight: '800' },
  cardSize: { color: '#347C4B', fontSize: 13, fontWeight: '700', marginTop: 2 },
  cardChevron: { color: '#A9B8AC', fontSize: 28, fontWeight: '400', marginTop: -3 },
  footnote: { color: '#718078', fontSize: 12, lineHeight: 17, marginTop: 'auto', paddingVertical: 10 },
  headerRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  backButton: { color: '#347C4B', fontSize: 16, fontWeight: '800' },
  textButton: { color: '#347C4B', fontSize: 14, fontWeight: '800' },
  grid: { gap: 6, paddingTop: 18, paddingBottom: 88 },
  asset: { aspectRatio: 1, borderRadius: 10, margin: 2, overflow: 'hidden', width: '31.9%' },
  assetSelected: { borderColor: '#347C4B', borderWidth: 3 },
  thumbnail: { height: '100%', width: '100%' },
  thumbnailPlaceholder: { alignItems: 'center', backgroundColor: '#DCE7DE', flex: 1, justifyContent: 'center' },
  thumbnailPlaceholderText: { color: '#526158', fontSize: 10, fontWeight: '700', lineHeight: 14, textAlign: 'center' },
  assetLabel: { backgroundColor: 'rgba(23,48,31,0.72)', bottom: 0, left: 0, padding: 4, position: 'absolute', right: 0 },
  assetLabelText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700', textAlign: 'center' },
  emptyText: { color: '#718078', fontSize: 16, paddingTop: 40, textAlign: 'center' },
  deleteButton: { alignItems: 'center', backgroundColor: '#C7473A', borderRadius: 16, bottom: 18, left: 20, padding: 17, position: 'absolute', right: 20 },
  deleteButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});

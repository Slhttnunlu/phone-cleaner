import { StatusBar } from 'expo-status-bar';
import * as MediaLibrary from 'expo-media-library/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  AccessibilityInfo,
  Alert,
  Animated,
  AppState,
  Easing,
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import {
  calculateEstimatedBytes,
  estimateAssetBytes,
  formatBytes,
  getCategoryMatches,
} from './src/utils/media';
import {
  getLocalAssetInfo,
  getPhotoPreviewUri,
  getThumbnailUri,
  peekPhotoPreviewUri,
} from './src/utils/mediaPreview';
import { categoryConfig, COPY, detectLanguage } from './src/copy';
const PAGE_SIZE = 100;
const MINIMUM_SCAN_DURATION_MS = process.env.NODE_ENV === 'test' ? 0 : 3500;
const LANGUAGE_STORAGE_KEY = 'phone-cleaner.language';
const THEME_STORAGE_KEY = 'phone-cleaner.dark-mode';
const LAUNCH_DURATION_MS = 3400;
const SUPPORTED_LANGUAGES = [
  { key: 'tr', nativeLabel: 'Türkçe' },
  { key: 'en', nativeLabel: 'English' },
];

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const [showLaunch, setShowLaunch] = useState(process.env.NODE_ENV !== 'test');
  const [permission, requestPermission, refreshPermission] = MediaLibrary.usePermissions();
  const [language, setLanguage] = useState(detectLanguage);
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const copy = COPY[language];
  const categories = useMemo(() => categoryConfig(copy), [copy]);
  const [assetsByCategory, setAssetsByCategory] = useState({
    screenshots: [],
    largePhotos: [],
    largeVideos: [],
  });
  const [isScanning, setIsScanning] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [scanMessageKey, setScanMessageKey] = useState('ready');
  const [activeCategory, setActiveCategory] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [cleanupResult, setCleanupResult] = useState(null);
  const [previewAsset, setPreviewAsset] = useState(null);
  const scanRun = useRef(0);

  useEffect(() => {
    if (!showLaunch) return undefined;
    const timer = setTimeout(() => setShowLaunch(false), LAUNCH_DURATION_MS);
    return () => clearTimeout(timer);
  }, [showLaunch]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') refreshPermission?.();
    });
    return () => subscription.remove();
  }, [refreshPermission]);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)
      .then((storedLanguage) => {
        if (mounted && (storedLanguage === 'tr' || storedLanguage === 'en')) {
          setLanguage(storedLanguage);
        }
      })
      .catch(() => {});
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((storedTheme) => {
        if (mounted && (storedTheme === 'true' || storedTheme === 'false')) {
          setDarkMode(storedTheme === 'true');
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const changeLanguage = useCallback((nextLanguage) => {
    setLanguage(nextLanguage);
    AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage).catch(() => {});
  }, []);

  const changeDarkMode = useCallback((enabled) => {
    setDarkMode(enabled);
    AsyncStorage.setItem(THEME_STORAGE_KEY, String(enabled)).catch(() => {});
  }, []);

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
  const scanSummary = useMemo(() => {
    const uniqueAssets = new Map();
    Object.values(assetsByCategory).flat().forEach((asset) => uniqueAssets.set(asset.id, asset));
    const assets = [...uniqueAssets.values()];
    return { count: assets.length, bytes: calculateEstimatedBytes(assets) };
  }, [assetsByCategory]);

  useEffect(() => {
    if (
      !permission?.granted ||
      !hasScanned ||
      isScanning ||
      typeof MediaLibrary.addListener !== 'function'
    ) {
      return undefined;
    }
    const subscription = MediaLibrary.addListener(() => setScanMessageKey('libraryChanged'));
    return () => subscription?.remove?.();
  }, [hasScanned, isScanning, permission?.granted]);

  const scanLibrary = useCallback(async () => {
    if (!permission?.granted) return;

    const run = scanRun.current + 1;
    scanRun.current = run;
    const startedAt = Date.now();
    setIsScanning(true);
    setScanMessageKey('scanning');
    setSelectedIds(new Set());
    try {
      const next = { screenshots: [], largePhotos: [], largeVideos: [] };
      let after;
      let hasNextPage = true;

      while (hasNextPage) {
        if (scanRun.current !== run) return;
        const page = await MediaLibrary.getAssetsAsync({
          after,
          first: PAGE_SIZE,
          mediaType: [MediaLibrary.MediaType.photo, MediaLibrary.MediaType.video],
          sortBy: [MediaLibrary.SortBy.creationTime],
        });

        if (scanRun.current !== run) return;
        page.assets.forEach((asset) => {
          const categories = getCategoryMatches(asset);
          Object.entries(categories).forEach(([category, matches]) => {
            if (matches) next[category].push(asset);
          });
        });

        after = page.endCursor;
        hasNextPage = page.hasNextPage;
      }

      if (scanRun.current === run) {
        setAssetsByCategory(next);
        setHasScanned(true);
        const uniqueMatches = new Set(Object.values(next).flat().map((asset) => asset.id));
        setScanMessageKey(uniqueMatches.size ? 'scanComplete' : 'scanEmpty');
      }
    } catch {
      if (scanRun.current === run) setScanMessageKey('scanFailed');
    } finally {
      if (scanRun.current === run) {
        const remainingDuration = MINIMUM_SCAN_DURATION_MS - (Date.now() - startedAt);
        if (remainingDuration > 0) {
          await new Promise((resolve) => setTimeout(resolve, remainingDuration));
        }
        if (scanRun.current === run) setIsScanning(false);
      }
    }
  }, [permission?.granted]);

  const cancelScan = useCallback(() => {
    scanRun.current += 1;
    setIsScanning(false);
    setScanMessageKey('scanCancelled');
  }, []);

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

  const navigatePreview = useCallback((direction) => {
    setPreviewAsset((current) => {
      if (!current || !visibleAssets.length) return current;
      const currentIndex = visibleAssets.findIndex((asset) => asset.id === current.id);
      const nextIndex = (currentIndex + direction + visibleAssets.length) % visibleAssets.length;
      return visibleAssets[nextIndex];
    });
  }, [visibleAssets]);

  useEffect(() => {
    if (!previewAsset || visibleAssets.length < 2) return;
    const currentIndex = visibleAssets.findIndex((asset) => asset.id === previewAsset.id);
    const neighbors = [-1, 1].map(
      (offset) => visibleAssets[(currentIndex + offset + visibleAssets.length) % visibleAssets.length]
    );
    neighbors.forEach((asset) => {
      if (asset?.mediaType === 'photo') {
        getLocalAssetInfo(asset)
          .then((info) => info.localUri && Image.prefetch(info.localUri))
          .catch(() => {});
      }
    });
  }, [previewAsset, visibleAssets]);

  const selectAll = useCallback(() => {
    setSelectedIds((current) =>
      current.size === visibleAssets.length && visibleAssets.length
        ? new Set()
        : new Set(visibleAssets.map((asset) => asset.id))
    );
  }, [visibleAssets]);

  const deleteSelected = useCallback(async () => {
    if (!selectedAssets.length) return;

    Alert.alert(
      copy.confirmDeleteTitle,
      copy.confirmDeleteBody(selectedAssets.length, formatBytes(selectedBytes, copy.noSize)),
      [
        { text: copy.cancel, style: 'cancel' },
        {
          text: copy.continue,
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
              Alert.alert(copy.deleteFailedTitle, copy.deleteFailedBody);
            }
          },
        },
      ]
    );
  }, [copy, selectedAssets, selectedBytes]);

  if (showLaunch) {
    return <LaunchScreen copy={copy} />;
  }

  if (!permission) {
    return <LoadingScreen label={copy.permissionChecking} darkMode={darkMode} />;
  }

  if (activeTab === 'settings') {
    return (
      <BaseTabScreen
        activeTab={activeTab}
        copy={copy}
        darkMode={darkMode}
        onChangeTab={setActiveTab}
      >
        <SettingsScreen
          copy={copy}
          language={language}
          onChangeLanguage={changeLanguage}
          darkMode={darkMode}
          onChangeDarkMode={changeDarkMode}
          permission={permission}
        />
      </BaseTabScreen>
    );
  }

  if (!permission.granted) {
    const permissionAction = permission.canAskAgain
      ? { label: copy.grantPermission, onPress: requestPermission }
      : { label: copy.openSettings, onPress: () => Linking.openSettings() };
    return (
      <SafeAreaView style={[styles.safeArea, darkMode && styles.darkSafeArea]} edges={['top', 'left', 'right']}>
        <StatusBar style={darkMode ? 'light' : 'dark'} />
        <View style={styles.tabPage}>
          <View style={styles.permissionContainer}>
          <AppMark copy={copy} />
          <Text style={[styles.eyebrow, darkMode && styles.darkAccentText]}>{copy.appName}</Text>
          <Text style={[styles.title, darkMode && styles.darkPrimaryText]}>{copy.permissionTitle}</Text>
          <Text style={[styles.body, darkMode && styles.darkSecondaryText]}>
            {permission.canAskAgain
              ? copy.permissionBody
              : copy.permissionDenied}
          </Text>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, darkMode && styles.darkPrimaryButton, pressed && styles.primaryButtonPressed]}
            onPress={permissionAction.onPress}
            accessibilityRole="button"
          >
            <Text style={[styles.primaryButtonText, darkMode && styles.darkButtonText]}>{permissionAction.label}</Text>
          </Pressable>
          </View>
          <BottomTabs activeTab={activeTab} copy={copy} onChange={setActiveTab} darkMode={darkMode} />
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
          setScanMessageKey('cleanupComplete');
        }}
        copy={copy}
        darkMode={darkMode}
      />
    );
  }

  if (isScanning) {
    return <ScanningScreen copy={copy} onCancel={cancelScan} darkMode={darkMode} />;
  }

  if (activeCategory) {
    const categoryBytes = calculateEstimatedBytes(visibleAssets);
    return (
      <SafeAreaView style={[styles.safeArea, darkMode && styles.darkSafeArea]}>
        <StatusBar style={darkMode ? 'light' : 'dark'} />
        <View style={styles.screen}>
          <View style={styles.headerRow}>
            <Pressable
              style={({ pressed }) => [styles.headerAction, darkMode && styles.darkIconSurface, pressed && styles.headerActionPressed]}
              onPress={() => setActiveCategory(null)}
              accessibilityRole="button"
            >
              <Text style={[styles.backButton, darkMode && styles.darkAccentText]}>{copy.summary}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.headerAction, styles.selectAllAction, darkMode && styles.darkPrimaryButton, pressed && styles.headerActionPressed]}
              onPress={selectAll}
              accessibilityRole="button"
            >
              <Text style={[styles.textButton, styles.selectAllActionText, darkMode && styles.darkButtonText]}>
                {selectedIds.size === visibleAssets.length && visibleAssets.length
                  ? copy.deselectAll
                  : copy.selectAll}
              </Text>
            </Pressable>
          </View>
          <View style={styles.categoryHeadingRow}>
            <View style={styles.categoryHeadingCopy}>
              <Text style={[styles.sectionTitle, darkMode && styles.darkPrimaryText]}>{categories[activeCategory].title}</Text>
              <Text style={[styles.body, darkMode && styles.darkSecondaryText]}>{categories[activeCategory].description}</Text>
            </View>
            <View style={[styles.categorySummaryBadge, darkMode && styles.darkMetricBadge]}>
              <Text style={[styles.categorySummaryText, darkMode && styles.darkMetricText]}>
                {copy.categorySummary(visibleAssets.length, formatBytes(categoryBytes, copy.noSize))}
              </Text>
            </View>
          </View>
          {activeCategory !== 'largeVideos' ? (
            <Text style={[styles.previewHint, darkMode && styles.darkSecondaryText]}>{copy.previewHint}</Text>
          ) : null}
          <FlatList
            data={visibleAssets}
            keyExtractor={(asset) => asset.id}
            numColumns={3}
            contentContainerStyle={styles.grid}
            ListEmptyComponent={<Text style={[styles.emptyText, darkMode && styles.darkSecondaryText]}>{copy.emptyCategory}</Text>}
            renderItem={({ item }) => {
              const selected = selectedIds.has(item.id);
              return (
                <Pressable
                  style={({ pressed }) => [styles.asset, selected && styles.assetSelected, pressed && styles.assetPressed]}
                  onPress={() => toggleAsset(item.id)}
                  onLongPress={
                    activeCategory !== 'largeVideos' ? () => setPreviewAsset(item) : undefined
                  }
                  delayLongPress={350}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={copy.estimatedMedia(formatBytes(estimateAssetBytes(item), copy.noSize))}
                >
                  <AssetThumbnail asset={item} copy={copy} key={item.id} />
                  <View style={styles.assetTopRow} pointerEvents="none">
                    {activeCategory !== 'largeVideos' ? (
                      <View style={styles.previewGlyph}><Text style={styles.previewGlyphText}>↗</Text></View>
                    ) : <View />}
                    <View style={[styles.selectionMark, selected && styles.selectionMarkSelected]}>
                      <Text style={styles.selectionMarkText}>{selected ? '✓' : ''}</Text>
                    </View>
                  </View>
                  <View style={styles.assetLabel}>
                    <Text style={styles.assetLabelText}>
                      {selected ? copy.selected : `~${formatBytes(estimateAssetBytes(item), copy.noSize)}`}
                    </Text>
                  </View>
                </Pressable>
              );
            }}
          />
          <Pressable
            style={({ pressed }) => [styles.deleteButton, !selectedAssets.length && styles.disabledButton, pressed && selectedAssets.length && styles.deleteButtonPressed]}
            disabled={!selectedAssets.length}
            onPress={deleteSelected}
            accessibilityRole="button"
          >
            <Text style={styles.deleteButtonText}>
              {selectedAssets.length
                ? copy.deleteItems(selectedAssets.length, formatBytes(selectedBytes, copy.noSize))
                : copy.selectToDelete}
            </Text>
          </Pressable>
          <PhotoPreviewModal
            asset={previewAsset}
            selected={previewAsset ? selectedIds.has(previewAsset.id) : false}
            onClose={() => setPreviewAsset(null)}
            onToggle={() => previewAsset && toggleAsset(previewAsset.id)}
            onPrevious={() => navigatePreview(-1)}
            onNext={() => navigatePreview(1)}
            position={previewAsset ? visibleAssets.findIndex((asset) => asset.id === previewAsset.id) + 1 : 0}
            total={visibleAssets.length}
            copy={copy}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, darkMode && styles.darkSafeArea]} edges={['top', 'left', 'right']}>
      <StatusBar style={darkMode ? 'light' : 'dark'} />
      <View style={styles.tabPage}>
      <ScrollView
        style={styles.screenScroll}
        contentContainerStyle={styles.screenContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <View style={styles.brandLockup}>
            <AppMark compact copy={copy} />
            <Text style={[styles.eyebrow, darkMode && styles.darkAccentText]}>{copy.appName}</Text>
          </View>
          <Text style={[styles.localBadge, darkMode && styles.darkLocalBadge]}>{copy.localBadge}</Text>
        </View>
        <View style={[styles.heroCard, hasScanned ? styles.heroResultCard : styles.heroIntroCard, darkMode && styles.darkSurface]}>
          {hasScanned ? (
            <View style={styles.resultHeroContent}>
              <Text style={[styles.heroKicker, darkMode && styles.darkAccentText]}>{copy.resultKicker}</Text>
              <View style={styles.resultDashboard}>
                <StorageOrbit bytes={scanSummary.bytes} copy={copy} darkMode={darkMode} />
                <View style={styles.resultMetaColumn}>
                  <Text style={[styles.resultItemCountLabel, darkMode && styles.darkPrimaryText]}>
                    <Text style={[styles.resultItemCountNumber, darkMode && styles.darkMetricText]}>{scanSummary.count}</Text>
                    {` ${copy.foundItemsLabel}`}
                  </Text>
                  <View style={styles.resultReadyPill}>
                    <View style={styles.resultReadyDot} />
                    <Text style={styles.resultReadyText}>{copy.readyToReview}</Text>
                  </View>
                </View>
              </View>
              <View style={[styles.resultMetaRow, darkMode && styles.darkDivider]}>
                {scanMessageKey !== 'scanComplete' ? (
                  <Text style={[styles.resultStatus, darkMode && styles.darkSecondaryText]}>{copy[scanMessageKey]}</Text>
                ) : null}
              </View>
            </View>
          ) : (
            <View>
              <Text style={[styles.heroKicker, darkMode && styles.darkAccentText]}>{copy.smartScan}</Text>
              <Text style={[styles.heroTitle, darkMode && styles.darkPrimaryText]}>{copy.heroTitle}</Text>
              <Text style={[styles.heroBody, darkMode && styles.darkSecondaryText]}>
                {scanMessageKey === 'ready' ? copy.scanCallout : copy[scanMessageKey]}
              </Text>
              <Pressable
                style={({ pressed }) => [styles.scanButton, darkMode && styles.darkScanButton, pressed && styles.scanButtonPressed]}
                onPress={scanLibrary}
                accessibilityRole="button"
                accessibilityLabel={copy.scan}
              >
                <Text style={styles.scanButtonText}>{copy.scan}</Text>
                <View style={styles.scanButtonIconBadge}>
                  <Text style={styles.scanButtonIcon}>✦</Text>
                </View>
              </Pressable>
            </View>
          )}
        </View>
        {permission.accessPrivileges === 'limited' ? (
          <View style={[styles.limitedBanner, darkMode && styles.darkAmberSurface]}>
            <Text style={[styles.limitedBannerText, darkMode && styles.darkAmberText]}>
              {copy.limitedAccess}
            </Text>
            <Pressable
              onPress={() => MediaLibrary.presentPermissionsPickerAsync()}
              accessibilityRole="button"
            >
              <Text style={[styles.limitedBannerAction, darkMode && styles.darkAmberText]}>{copy.editSelection}</Text>
            </Pressable>
          </View>
        ) : null}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionLabel, darkMode && styles.darkPrimaryText]}>{copy.review}</Text>
          {hasScanned ? (
            <Pressable onPress={scanLibrary} accessibilityRole="button">
              <Text style={[styles.rescanButton, darkMode && styles.darkAccentText]}>{copy.rescan}</Text>
            </Pressable>
          ) : (
            <Text style={[styles.sectionMeta, darkMode && styles.darkSecondaryText]}>{copy.categories}</Text>
          )}
        </View>
        <View style={styles.cards}>
          {Object.entries(categories).map(([key, config]) => {
            const assets = assetsByCategory[key];
            return (
              <CategoryCard
                key={key}
                categoryKey={key}
                config={config}
                assets={assets}
                copy={copy}
                hasScanned={hasScanned}
                darkMode={darkMode}
                onPress={openCategory}
              />
            );
          })}
          <View style={[styles.card, styles.cardComingSoon, darkMode && styles.darkSurface]} accessibilityLabel={`${copy.similarPhotosTitle}. ${copy.inDevelopment}`}>
            <View style={[styles.categoryIcon, styles.categoryIconComingSoon, darkMode && styles.darkAmberSurface]}>
              <LineIcon name="similar" color={darkMode ? '#F2C96D' : '#B1790F'} size={23} />
            </View>
            <View style={styles.cardContent}>
              <Text style={[styles.cardTitle, darkMode && styles.darkPrimaryText]}>{copy.similarPhotosTitle}</Text>
              {!hasScanned ? (
                <Text style={[styles.cardDescription, darkMode && styles.darkSecondaryText]}>{copy.similarPhotosDescription}</Text>
              ) : null}
            </View>
            <View style={[styles.developmentBadge, darkMode && styles.darkAmberSurface]}>
              <Text style={[styles.developmentBadgeText, darkMode && styles.darkAmberText]}>{copy.inDevelopment}</Text>
            </View>
          </View>
        </View>
        <Text style={[styles.footnote, darkMode && styles.darkSecondaryText]}>{copy.estimateFootnote}</Text>
      </ScrollView>
      <BottomTabs activeTab={activeTab} copy={copy} onChange={setActiveTab} darkMode={darkMode} />
      </View>
    </SafeAreaView>
  );
}

function BaseTabScreen({ activeTab, copy, darkMode, onChangeTab, children }) {
  return (
    <SafeAreaView style={[styles.safeArea, darkMode && styles.darkSafeArea]} edges={['top', 'left', 'right']}>
      <StatusBar style={darkMode ? 'light' : 'dark'} />
      <View style={styles.tabPage}>
        {children}
        <BottomTabs activeTab={activeTab} copy={copy} onChange={onChangeTab} darkMode={darkMode} />
      </View>
    </SafeAreaView>
  );
}

function BottomTabs({ activeTab, copy, darkMode, onChange }) {
  const insets = useSafeAreaInsets();
  const tabs = [
    { key: 'home', icon: 'home', label: copy.homeTab, accessibilityLabel: copy.homeTabLabel },
    { key: 'settings', icon: 'sliders', label: copy.settingsTab, accessibilityLabel: copy.settingsTabLabel },
  ];

  return (
    <View
      style={[styles.bottomTabs, darkMode && styles.darkBottomTabs, { paddingBottom: Math.max(insets.bottom, 5) }]}
      accessibilityRole="tablist"
    >
      {tabs.map((tab) => {
        const selected = activeTab === tab.key;
        return (
          <Pressable
            key={tab.key}
            style={[styles.bottomTab, selected && styles.bottomTabActive]}
            onPress={() => onChange(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={tab.accessibilityLabel}
          >
            <LineIcon name={tab.icon} color={selected ? (darkMode ? '#8FD6A5' : '#267A4A') : '#8A948D'} size={25} />
            <Text style={[styles.bottomTabText, darkMode && styles.darkMutedText, selected && styles.bottomTabTextActive, selected && darkMode && styles.darkAccentText]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled?.().then(setReducedMotion).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setReducedMotion);
    return () => subscription?.remove?.();
  }, []);

  return reducedMotion;
}

function LineIcon({ name, color = '#347C4B', size = 24, surfaceColor = '#EDF6F0' }) {
  const unit = size / 24;
  const stroke = Math.max(1.7, 2 * unit);
  const base = { borderColor: color };

  if (name === 'grid') {
    return (
      <View style={[styles.lineIconCanvas, { height: size, width: size }]}>
        {[0, 1, 2].flatMap((row) => [0, 1, 2].map((column) => (
          <View
            key={`${row}-${column}`}
            style={[styles.gridIconCell, { backgroundColor: color, height: 4 * unit, left: (3 + column * 7) * unit, top: (3 + row * 7) * unit, width: 4 * unit }]}
          />
        )))}
      </View>
    );
  }

  if (name === 'photo') {
    return (
      <View style={[styles.lineIconCanvas, base, styles.photoIconFrame, { borderRadius: 5 * unit, borderWidth: stroke, height: size, width: size }]}>
        <View style={[styles.photoIconSun, { backgroundColor: color, height: 4 * unit, right: 4 * unit, top: 4 * unit, width: 4 * unit }]} />
        <View style={[styles.photoIconMountain, { borderBottomWidth: stroke, borderColor: color, borderLeftWidth: stroke, height: 9 * unit, left: 4 * unit, top: 9 * unit, width: 10 * unit }]} />
        <View style={[styles.photoIconMountain, { borderBottomWidth: stroke, borderColor: color, borderLeftWidth: stroke, height: 7 * unit, left: 11 * unit, top: 11 * unit, width: 8 * unit }]} />
      </View>
    );
  }

  if (name === 'video') {
    return (
      <View style={[styles.lineIconCanvas, base, styles.videoIconFrame, { borderRadius: 5 * unit, borderWidth: stroke, height: size, width: size }]}>
        <View style={[styles.videoIconPlay, { borderBottomWidth: 5 * unit, borderLeftWidth: 8 * unit, borderLeftColor: color, borderTopWidth: 5 * unit }]} />
      </View>
    );
  }

  if (name === 'similar') {
    return (
      <View style={[styles.lineIconCanvas, { height: size, width: size }]}>
        <View style={[styles.similarIconBack, base, { borderRadius: 4 * unit, borderWidth: stroke, height: 15 * unit, width: 15 * unit }]} />
        <View style={[styles.similarIconFront, base, { borderRadius: 4 * unit, borderWidth: stroke, height: 15 * unit, width: 15 * unit }]} />
      </View>
    );
  }

  if (name === 'home') {
    return (
      <View style={[styles.lineIconCanvas, { height: size, width: size }]}>
        <View style={[styles.homeIconBody, base, { borderBottomWidth: stroke, borderLeftWidth: stroke, borderRightWidth: stroke, height: 11 * unit, left: 5 * unit, top: 10 * unit, width: 14 * unit }]} />
        <View style={[styles.homeIconRoof, { borderColor: color, borderLeftWidth: stroke, borderTopWidth: stroke, height: 13 * unit, left: 6 * unit, top: 3 * unit, width: 13 * unit }]} />
      </View>
    );
  }

  if (name === 'sliders') {
    return (
      <View style={[styles.lineIconCanvas, { height: size, width: size }]}>
        {[6, 12, 18].map((top, index) => (
          <View key={top} style={[styles.sliderIconLine, { backgroundColor: color, height: stroke, left: 2 * unit, top: top * unit, width: 20 * unit }]}>
            <View style={[styles.sliderIconKnob, { backgroundColor: color, height: 6 * unit, left: (index === 1 ? 5 : index === 2 ? 13 : 10) * unit, top: -2 * unit, width: 6 * unit }]} />
          </View>
        ))}
      </View>
    );
  }

  if (name === 'moon') {
    return <View style={[styles.moonIcon, { borderColor: color, borderWidth: stroke, height: size, width: size }]}><View style={[styles.moonIconCutout, { backgroundColor: surfaceColor, height: 18 * unit, right: -1 * unit, top: -2 * unit, width: 18 * unit }]} /></View>;
  }

  if (name === 'shield') {
    return <View style={[styles.shieldIcon, base, { borderWidth: stroke, height: 21 * unit, width: 18 * unit }]}><View style={[styles.shieldCheckA, { backgroundColor: color, height: stroke, width: 6 * unit }]} /><View style={[styles.shieldCheckB, { backgroundColor: color, height: stroke, width: 10 * unit }]} /></View>;
  }

  if (name === 'language') {
    return <View style={[styles.languageIcon, base, { borderWidth: stroke, height: size, width: size }]}><View style={[styles.languageIconLine, { backgroundColor: color, height: stroke, width: 13 * unit }]} /><View style={[styles.languageIconLine, { backgroundColor: color, height: stroke, marginTop: 5 * unit, width: 9 * unit }]} /></View>;
  }

  return <View style={[styles.infoIcon, base, { borderRadius: size / 2, borderWidth: stroke, height: size, width: size }]}><Text style={[styles.infoIconText, { color, fontSize: 15 * unit }]}>i</Text></View>;
}

function StorageOrbit({ bytes, copy, darkMode }) {
  const reducedMotion = useReducedMotion();
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reducedMotion) {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    Animated.spring(progress, {
      toValue: 1,
      damping: 15,
      stiffness: 95,
      mass: 0.8,
      useNativeDriver: true,
    }).start();
  }, [bytes, progress, reducedMotion]);

  return (
    <Animated.View
      style={[
        styles.storageOrbit,
        darkMode && styles.darkStorageOrbit,
        { opacity: progress, transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }) }] },
      ]}
      accessibilityLabel={`${copy.estimatedReclaimable}: ${formatBytes(bytes, copy.noSize)}`}
    >
      <View style={[styles.storageOrbitArc, darkMode && styles.darkStorageOrbitArc]} />
      <View style={styles.storageOrbitDot} />
      <Text style={[styles.storageOrbitValue, darkMode && styles.darkMetricText]}>
        ~{formatBytes(bytes, copy.noSize)}
      </Text>
      <Text style={[styles.storageOrbitLabel, darkMode && styles.darkSecondaryText]}>{copy.estimatedReclaimable}</Text>
    </Animated.View>
  );
}

function CategoryCard({ categoryKey, config, assets, copy, hasScanned, darkMode, onPress }) {
  const bytes = calculateEstimatedBytes(assets);
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        darkMode && styles.darkSurface,
        pressed && styles.cardPressed,
        pressed && darkMode && styles.darkSurfacePressed,
      ]}
      onPress={() => onPress(categoryKey)}
      accessibilityRole="button"
      accessibilityLabel={`${config.title}${hasScanned ? `, ${copy.categoryItemCount(assets.length)}, ${formatBytes(bytes, copy.noSize)}` : ''}`}
    >
      <View style={styles.cardTopRow}>
        <View style={[styles.categoryIcon, darkMode && styles.darkIconSurface]}>
          <LineIcon name={config.icon} color={darkMode ? '#8FD6A5' : '#347C4B'} size={23} />
        </View>
        <Text style={styles.cardChevron}>›</Text>
      </View>
      <View style={styles.cardContent}>
        <Text style={[styles.cardTitle, darkMode && styles.darkPrimaryText]}>{config.title}</Text>
        {!hasScanned ? (
          <Text style={[styles.cardDescription, darkMode && styles.darkSecondaryText]}>{config.description}</Text>
        ) : null}
      </View>
      {hasScanned ? (
        <View style={styles.cardStats}>
          <Text style={[styles.cardCount, darkMode && styles.darkMetricText]}>{copy.categoryItemCount(assets.length)}</Text>
          <Text style={[styles.cardSize, darkMode && styles.darkMetricBadge]}>{formatBytes(bytes, copy.noSize)}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function SettingsScreen({ copy, language, onChangeLanguage, permission, darkMode, onChangeDarkMode }) {
  const [languagePickerVisible, setLanguagePickerVisible] = useState(false);
  const accessLabel = permission.granted
    ? permission.accessPrivileges === 'limited'
      ? copy.photosAccessLimited
      : copy.photosAccessFull
    : copy.photosAccessDenied;
  const accessStatusStyle = permission.granted
    ? permission.accessPrivileges === 'limited'
      ? darkMode ? styles.darkStatusLimited : styles.settingsStatusLimited
      : darkMode ? styles.darkStatusFull : styles.settingsStatusFull
    : darkMode ? styles.darkStatusDenied : styles.settingsStatusDenied;

  const manageAccess = () => {
    if (permission.accessPrivileges === 'limited') {
      MediaLibrary.presentPermissionsPickerAsync();
    } else {
      Linking.openSettings();
    }
  };

  return (
    <ScrollView
      style={styles.settingsScroll}
      contentContainerStyle={styles.settingsScreen}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.settingsHeader}>
        <AppMark compact copy={copy} />
        <View style={styles.settingsHeaderCopy}>
          <Text style={[styles.settingsTitle, darkMode && styles.darkPrimaryText]}>{copy.settingsTitle}</Text>
          <Text style={[styles.settingsSubtitle, darkMode && styles.darkSecondaryText]}>{copy.settingsSubtitle}</Text>
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [styles.settingsCard, darkMode && styles.darkSurface, pressed && (darkMode ? styles.darkSurfacePressed : styles.settingsCardPressed)]}
        onPress={() => setLanguagePickerVisible(true)}
        accessibilityRole="button"
        accessibilityLabel={copy.chooseLanguage}
      >
        <View style={styles.settingsRow}>
          <View style={[styles.settingsIcon, darkMode && styles.darkIconSurface]}><LineIcon name="language" color={darkMode ? '#8FD6A5' : '#347C4B'} size={21} /></View>
          <View style={styles.settingsRowCopy}>
            <Text style={[styles.settingsCardTitle, darkMode && styles.darkPrimaryText]}>{copy.languageTitle}</Text>
            <Text style={[styles.settingsCardBody, darkMode && styles.darkSecondaryText]}>{copy.languageDescription}</Text>
          </View>
          <View style={styles.settingsTrailing}>
            <Text style={[styles.languagePickerValue, darkMode && styles.darkAccentText]}>
              {SUPPORTED_LANGUAGES.find((option) => option.key === language)?.nativeLabel}
            </Text>
            <Text style={styles.languagePickerChevron}>›</Text>
          </View>
        </View>
      </Pressable>

      <View style={[styles.settingsCard, darkMode && styles.darkSurface]}>
        <View style={styles.settingsRow}>
          <View style={[styles.settingsIcon, darkMode && styles.darkIconSurface]}><LineIcon name="moon" color={darkMode ? '#8FD6A5' : '#347C4B'} surfaceColor={darkMode ? '#1B2B21' : '#EAF4D5'} size={21} /></View>
          <View style={styles.settingsRowCopy}>
            <Text style={[styles.settingsCardTitle, darkMode && styles.darkPrimaryText]}>{copy.darkModeTitle}</Text>
            <Text style={[styles.settingsCardBody, darkMode && styles.darkSecondaryText]}>{copy.darkModeDescription}</Text>
          </View>
          <Switch
            value={darkMode}
            onValueChange={onChangeDarkMode}
            trackColor={{ false: '#C7D1C8', true: '#3F8254' }}
            thumbColor="#FFFFFF"
            accessibilityLabel={copy.darkModeTitle}
          />
        </View>
      </View>

      <View style={[styles.settingsCard, darkMode && styles.darkSurface]}>
        <View style={styles.settingsRow}>
          <View style={[styles.settingsIcon, darkMode && styles.darkIconSurface]}><LineIcon name="photo" color={darkMode ? '#8FD6A5' : '#347C4B'} size={21} /></View>
          <View style={styles.settingsRowCopy}>
            <Text style={[styles.settingsCardTitle, darkMode && styles.darkPrimaryText]}>{copy.photosAccessTitle}</Text>
            <Text style={[styles.settingsStatus, accessStatusStyle]}>{accessLabel}</Text>
          </View>
          <Pressable onPress={manageAccess} accessibilityRole="button" style={[styles.settingsAction, darkMode && styles.darkIconSurface]}>
            <Text style={[styles.settingsActionText, darkMode && styles.darkAccentText]}>{copy.manageAccess}</Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.settingsCard, darkMode && styles.darkSurface]}>
        <View style={styles.settingsRow}>
          <View style={[styles.settingsIcon, darkMode && styles.darkIconSurface]}><LineIcon name="shield" color={darkMode ? '#8FD6A5' : '#347C4B'} size={21} /></View>
          <View style={styles.settingsRowCopy}>
            <Text style={[styles.settingsCardTitle, darkMode && styles.darkPrimaryText]}>{copy.privacyTitle}</Text>
            <Text style={[styles.settingsCardBody, darkMode && styles.darkSecondaryText]}>{copy.privacyBody}</Text>
          </View>
        </View>
      </View>

      <View style={[styles.settingsCard, darkMode && styles.darkSurface]}>
        <View style={styles.settingsRow}>
          <View style={[styles.settingsIcon, darkMode && styles.darkIconSurface]}><LineIcon name="info" color={darkMode ? '#8FD6A5' : '#347C4B'} size={21} /></View>
          <View style={styles.settingsRowCopy}>
            <Text style={[styles.settingsCardTitle, darkMode && styles.darkPrimaryText]}>{copy.versionTitle}</Text>
            <Text style={[styles.settingsCardBody, darkMode && styles.darkSecondaryText]}>{copy.releaseChannel}</Text>
          </View>
          <Text style={[styles.settingsVersionValue, darkMode && styles.darkAccentText]}>{copy.versionValue}</Text>
        </View>
      </View>

      <Modal
        visible={languagePickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLanguagePickerVisible(false)}
      >
        <Pressable style={styles.pickerBackdrop} onPress={() => setLanguagePickerVisible(false)}>
          <Pressable style={[styles.pickerSheet, darkMode && styles.darkPickerSheet]} onPress={() => {}}>
            <View style={styles.pickerHandle} />
            <Text style={[styles.pickerTitle, darkMode && styles.darkPrimaryText]}>{copy.chooseLanguage}</Text>
            {SUPPORTED_LANGUAGES.map((option) => {
              const selected = language === option.key;
              return (
                <Pressable
                  key={option.key}
                  style={[styles.pickerOption, darkMode && styles.darkSurface]}
                  onPress={() => {
                    onChangeLanguage(option.key);
                    setLanguagePickerVisible(false);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={option.nativeLabel}
                >
                  <Text style={[styles.pickerOptionText, darkMode && styles.darkSecondaryText, selected && styles.pickerOptionTextSelected, selected && darkMode && styles.darkPrimaryText]}>
                    {option.nativeLabel}
                  </Text>
                  <View style={[styles.pickerCheck, selected && styles.pickerCheckSelected]}>
                    <Text style={styles.pickerCheckText}>{selected ? '✓' : ''}</Text>
                  </View>
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

function AppMark({ copy, compact = false }) {
  return (
    <Image
      source={require('./assets/icon.png')}
      style={[styles.appMark, compact && styles.appMarkCompact]}
      accessibilityLabel={copy.appIcon}
    />
  );
}

function LoadingScreen({ label, darkMode }) {
  return (
    <SafeAreaView style={[styles.safeArea, darkMode && styles.darkSafeArea]}>
      <View style={styles.permissionContainer}>
        <ActivityIndicator size="large" color="#347C4B" />
        <Text style={[styles.body, darkMode && styles.darkSecondaryText]}>{label}</Text>
      </View>
    </SafeAreaView>
  );
}

function LaunchScreen({ copy }) {
  const [progress] = useState(() => new Animated.Value(0));
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: reducedMotion ? 0 : LAUNCH_DURATION_MS - 150,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, reducedMotion]);

  const logoScale = progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.82, 1.04, 1] });
  const contentOpacity = progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 1] });
  const contentTranslate = progress.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });

  return (
    <SafeAreaView style={styles.launchSafeArea}>
      <StatusBar style="light" />
      <Animated.View
        style={[
          styles.launchContent,
          { opacity: contentOpacity, transform: [{ translateY: contentTranslate }] },
        ]}
      >
        <Animated.View style={{ transform: [{ scale: logoScale }] }}>
          <AppMark copy={copy} />
        </Animated.View>
        <Text style={styles.launchTitle}>Phone Cleaner</Text>
        <Text style={styles.launchMessage}>{copy.launchMessage}</Text>
        <View style={styles.launchTrack}>
          <Animated.View
            style={[
              styles.launchProgress,
              { transform: [{ scaleX: progress }] },
            ]}
          />
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

function ScanningScreen({ copy, onCancel, darkMode }) {
  const [pulse] = useState(() => new Animated.Value(0));
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      pulse.setValue(0.45);
      return undefined;
    }
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
  }, [pulse, reducedMotion]);

  const outerScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.16] });
  const outerOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0.12] });

  return (
    <SafeAreaView style={[styles.safeArea, darkMode && styles.darkSafeArea]}>
      <StatusBar style={darkMode ? 'light' : 'dark'} />
      <View style={styles.scanningContainer}>
        <Text style={[styles.eyebrow, darkMode && styles.darkAccentText]}>{copy.appName}</Text>
        <View style={styles.scanningAnimation} accessibilityLabel={copy.scanScreenTitle}>
          <Animated.View
            style={[styles.scanningPulse, darkMode && styles.darkScanningPulse, { opacity: outerOpacity, transform: [{ scale: outerScale }] }]}
          />
          <View style={[styles.scanningCore, darkMode && styles.darkSurface]}>
            <ActivityIndicator size="large" color={darkMode ? '#8FD6A5' : '#DFFF55'} />
          </View>
        </View>
        <Text style={[styles.scanningTitle, darkMode && styles.darkPrimaryText]}>{copy.scanScreenTitle}</Text>
        <Text style={[styles.body, darkMode && styles.darkSecondaryText]}>{copy.scanScreenBody}</Text>
        <View style={styles.scanningSkeleton} accessibilityElementsHidden>
          {[0, 1, 2].map((item) => (
            <Animated.View
              key={item}
              style={[
                styles.scanningSkeletonRow,
                darkMode && styles.darkSkeletonRow,
                { opacity: reducedMotion ? 0.55 : outerOpacity },
              ]}
            >
              <View style={[styles.scanningSkeletonIcon, darkMode && styles.darkIconSurface]} />
              <View style={styles.scanningSkeletonCopy}>
                <View style={[styles.scanningSkeletonLine, darkMode && styles.darkSkeletonLine]} />
                <View style={[styles.scanningSkeletonLine, styles.scanningSkeletonLineShort, darkMode && styles.darkSkeletonLine]} />
              </View>
            </Animated.View>
          ))}
        </View>
        <Text style={[styles.scanningHint, darkMode && styles.darkSecondaryText]}>{copy.scanScreenHint}</Text>
        <Pressable style={[styles.cancelScanButton, darkMode && styles.darkBorder]} onPress={onCancel} accessibilityRole="button">
          <Text style={styles.cancelScanButtonText}>{copy.cancelScan}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function AssetThumbnail({ asset, copy }) {
  const [previewUri, setPreviewUri] = useState(null);
  const [isCloudAsset, setIsCloudAsset] = useState(false);
  const [thumbnailStatus, setThumbnailStatus] = useState('loading');

  useEffect(() => {
    let cancelled = false;

    async function loadPreview() {
      setThumbnailStatus('loading');
      try {
        const result = await getThumbnailUri(asset);
        if (!cancelled) {
          setPreviewUri(result.uri);
          setIsCloudAsset(result.isNetworkAsset);
          setThumbnailStatus(result.uri ? 'ready' : result.isNetworkAsset ? 'cloud' : 'unavailable');
        }
      } catch {
        if (!cancelled) setThumbnailStatus('unavailable');
      }
    }

    loadPreview();
    return () => {
      cancelled = true;
    };
  }, [asset]);

  if (previewUri) {
    return (
      <View style={styles.thumbnailContainer}>
        <Image source={{ uri: previewUri }} style={styles.thumbnail} />
        {asset.mediaType === 'video' ? (
          <View style={styles.videoBadge}><Text style={styles.videoBadgeText}>▶</Text></View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.thumbnailPlaceholder}>
      <Text style={styles.thumbnailPlaceholderText}>
        {thumbnailStatus === 'loading'
          ? copy.previewPreparing
          : isCloudAsset || thumbnailStatus === 'cloud'
            ? copy.thumbnailInCloud
            : copy.thumbnailUnavailable}
      </Text>
    </View>
  );
}

function PhotoPreviewModal({
  asset,
  selected,
  onClose,
  onToggle,
  onPrevious,
  onNext,
  position,
  total,
  copy,
}) {
  const [previewUri, setPreviewUri] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingFromCloud, setLoadingFromCloud] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadPreview() {
      if (!asset) return;
      const cachedUri = peekPhotoPreviewUri(asset.id);
      setPreviewUri(null);
      setLoading(true);
      setLoadingFromCloud(false);
      try {
        if (cachedUri) {
          const uri = await cachedUri;
          if (!cancelled) setPreviewUri(uri);
        } else {
          const localInfo = await getLocalAssetInfo(asset);
          if (!cancelled) setLoadingFromCloud(Boolean(localInfo.isNetworkAsset));
          const uri = localInfo.localUri?.startsWith('file://')
            ? localInfo.localUri
            : await getPhotoPreviewUri(asset);
          if (!cancelled && uri) setPreviewUri(uri);
        }
      } catch {
        // Önizleme alınamazsa kullanıcı güvenli hata durumunu görür.
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadPreview();
    return () => {
      cancelled = true;
    };
  }, [asset]);

  return (
    <Modal visible={Boolean(asset)} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.previewBackdrop}>
        <View style={styles.previewToolbar}>
          <View style={styles.previewPositionPill}>
            <Text style={styles.previewPosition}>{copy.previewPosition(position, total)}</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.previewClose, pressed && styles.previewControlPressed]}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={copy.closePreview}
          >
            <Text style={styles.previewCloseText}>×</Text>
          </Pressable>
        </View>
        {previewUri ? (
          <View style={styles.previewImageFrame}>
            <Image source={{ uri: previewUri }} style={styles.previewImage} resizeMode="contain" />
          </View>
        ) : (
          <View style={styles.previewLoading}>
            {loading ? <ActivityIndicator size="large" color="#D9F45D" /> : null}
            <Text style={styles.previewLoadingText}>
              {loading
                ? loadingFromCloud
                  ? copy.photoDownloading
                  : copy.photoPreparing
                : copy.previewFailed}
            </Text>
          </View>
        )}
        {total > 1 ? (
          <>
            <Pressable
              style={({ pressed }) => [styles.previewArrow, styles.previewArrowLeft, pressed && styles.previewControlPressed]}
              onPress={onPrevious}
              accessibilityRole="button"
              accessibilityLabel={copy.previousPhoto}
            >
              <Text style={styles.previewArrowText}>‹</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.previewArrow, styles.previewArrowRight, pressed && styles.previewControlPressed]}
              onPress={onNext}
              accessibilityRole="button"
              accessibilityLabel={copy.nextPhoto}
            >
              <Text style={styles.previewArrowText}>›</Text>
            </Pressable>
          </>
        ) : null}
        <Pressable
          style={({ pressed }) => [styles.previewSelectButton, selected && styles.previewSelectedButton, pressed && styles.previewSelectButtonPressed]}
          onPress={onToggle}
          accessibilityRole="button"
        >
          <Text style={styles.previewSelectButtonText}>
            {selected ? copy.removeSelection : copy.selectForDeletion}
          </Text>
        </Pressable>
      </View>
    </Modal>
  );
}

function CleanupSuccessScreen({ result, onComplete, copy, darkMode }) {
  const reducedMotion = useReducedMotion();
  const [reveal] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.spring(reveal, {
      toValue: 1,
      damping: 14,
      stiffness: 110,
      mass: 0.8,
      useNativeDriver: true,
    }).start();
  }, [reveal]);

  const revealStyle = reducedMotion
    ? undefined
    : { opacity: reveal, transform: [{ scale: reveal.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] }) }] };

  return (
    <SafeAreaView style={[styles.safeArea, darkMode && styles.darkSafeArea]}>
      <StatusBar style={darkMode ? 'light' : 'dark'} />
      <View style={styles.successContainer}>
        <Animated.View style={[styles.successIcon, darkMode && styles.darkSuccessIcon, revealStyle]}>
          <View style={styles.successIconInner}>
            <Text style={styles.successIconText}>✓</Text>
          </View>
        </Animated.View>
        <Text style={[styles.successTitle, darkMode && styles.darkPrimaryText]}>{copy.movedForDeletion(result.count)}</Text>
        <View style={[styles.successMetricCard, darkMode && styles.darkSurface]}>
          <Text style={[styles.successMetricValue, darkMode && styles.darkMetricText]}>{formatBytes(result.bytes, copy.noSize)}</Text>
          <Text style={[styles.successMetricLabel, darkMode && styles.darkSecondaryText]}>{copy.estimatedReclaimable}</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.primaryButton, styles.successButton, darkMode && styles.darkPrimaryButton, pressed && styles.primaryButtonPressed]}
          onPress={onComplete}
          accessibilityRole="button"
        >
          <Text style={[styles.primaryButtonText, darkMode && styles.darkButtonText]}>{copy.done}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FCFBF6' },
  tabPage: { flex: 1 },
  screen: { flex: 1, padding: 20 },
  screenScroll: { flex: 1 },
  screenContent: { flexGrow: 1, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 10 },
  permissionContainer: { flex: 1, justifyContent: 'center', padding: 28, gap: 18 },
  launchSafeArea: { backgroundColor: '#285139', flex: 1 },
  launchContent: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 32 },
  launchTitle: { color: '#FFFFFF', fontSize: 30, fontWeight: '800', letterSpacing: -0.6, marginTop: 20 },
  launchMessage: { color: '#C7D3C9', fontSize: 14, lineHeight: 20, marginTop: 8, textAlign: 'center' },
  launchTrack: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 2, height: 4, marginTop: 34, overflow: 'hidden', width: 150 },
  launchProgress: { backgroundColor: '#D9F45D', borderRadius: 2, height: 4, transformOrigin: 'left' },
  appMark: { borderRadius: 24, height: 96, width: 96 },
  appMarkCompact: { borderRadius: 15, height: 48, width: 48 },
  eyebrow: { color: '#347C4B', fontSize: 12, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: '#17301F', fontSize: 34, fontWeight: '800', letterSpacing: -0.8, marginTop: 8 },
  sectionTitle: { color: '#17301F', fontSize: 28, fontWeight: '800', letterSpacing: -0.5, marginTop: 24 },
  body: { color: '#526158', fontSize: 16, lineHeight: 23 },
  primaryButton: { alignItems: 'center', backgroundColor: '#DFFF55', borderRadius: 24, marginTop: 24, minHeight: 58, justifyContent: 'center', padding: 17, shadowColor: '#29401E', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 14 },
  primaryButtonPressed: { opacity: 0.88, transform: [{ scale: 0.985 }] },
  primaryButtonText: { color: '#17301F', fontSize: 16, fontWeight: '900' },
  scanningContainer: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 26 },
  scanningAnimation: { alignItems: 'center', height: 150, justifyContent: 'center', marginBottom: 22, marginTop: 24, width: 150 },
  scanningPulse: { backgroundColor: '#DFFF55', borderRadius: 75, height: 132, position: 'absolute', width: 132 },
  scanningCore: { alignItems: 'center', backgroundColor: '#0E3825', borderRadius: 48, height: 96, justifyContent: 'center', shadowColor: '#0B2C1D', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 18, width: 96 },
  scanningTitle: { color: '#17301F', fontSize: 29, fontWeight: '800', letterSpacing: -0.5, marginBottom: 10, textAlign: 'center' },
  scanningSkeleton: { gap: 8, marginTop: 24, width: '100%' },
  scanningSkeletonRow: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#E2E9E3', borderRadius: 18, borderWidth: 1, flexDirection: 'row', gap: 12, minHeight: 62, padding: 10 },
  scanningSkeletonIcon: { backgroundColor: '#EAF5EE', borderRadius: 12, height: 40, width: 40 },
  scanningSkeletonCopy: { flex: 1, gap: 7 },
  scanningSkeletonLine: { backgroundColor: '#DDE9E0', borderRadius: 4, height: 8, width: '72%' },
  scanningSkeletonLineShort: { opacity: 0.7, width: '45%' },
  scanningHint: { color: '#718078', fontSize: 12, lineHeight: 18, marginTop: 18, textAlign: 'center' },
  cancelScanButton: { alignItems: 'center', borderColor: '#B8C6BA', borderRadius: 20, borderWidth: 1, marginTop: 24, minHeight: 44, justifyContent: 'center', paddingHorizontal: 20 },
  cancelScanButtonText: { color: '#347C4B', fontSize: 14, fontWeight: '800' },
  successContainer: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 28 },
  successIcon: { alignItems: 'center', backgroundColor: '#EAF5EE', borderColor: '#DFFF55', borderRadius: 58, borderWidth: 10, height: 116, justifyContent: 'center', marginBottom: 28, shadowColor: '#17301F', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.12, shadowRadius: 20, width: 116 },
  successIconInner: { alignItems: 'center', backgroundColor: '#0E3825', borderRadius: 38, height: 76, justifyContent: 'center', width: 76 },
  successIconText: { color: '#DFFF55', fontSize: 38, fontWeight: '900' },
  successTitle: { color: '#17301F', fontSize: 29, fontWeight: '900', letterSpacing: -0.7, lineHeight: 35, maxWidth: 330, textAlign: 'center' },
  successMetricCard: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#E2E9E3', borderRadius: 22, borderWidth: 1, marginTop: 22, paddingHorizontal: 26, paddingVertical: 18, width: '100%' },
  successMetricValue: { color: '#2B7E4D', fontSize: 34, fontVariant: ['tabular-nums'], fontWeight: '900', letterSpacing: -1 },
  successMetricLabel: { color: '#64786C', fontSize: 12, fontWeight: '700', marginTop: 3 },
  successButton: { width: '100%' },
  topBar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  brandLockup: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  localBadge: { backgroundColor: '#EEF4EF', borderRadius: 16, color: '#486052', fontSize: 11, fontWeight: '800', overflow: 'hidden', paddingHorizontal: 12, paddingVertical: 8 },
  heroCard: { backgroundColor: '#0E3825', borderRadius: 30, minHeight: 224, overflow: 'hidden', padding: 22, shadowColor: '#0B2C1D', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.16, shadowRadius: 24 },
  heroIntroCard: { minHeight: 246 },
  heroResultCard: { backgroundColor: '#EAF5EE', minHeight: 238, shadowOpacity: 0.08 },
  heroKicker: { color: '#4B9B66', fontSize: 10, fontWeight: '900', letterSpacing: 1.7 },
  heroTitle: { color: '#FFFFFF', fontSize: 39, fontWeight: '900', letterSpacing: -1.6, lineHeight: 41, marginTop: 9 },
  heroBody: { color: '#C4D7CA', fontSize: 14, lineHeight: 20, marginTop: 9, maxWidth: 310 },
  scanButton: { alignItems: 'center', backgroundColor: '#DFFF55', borderRadius: 22, flexDirection: 'row', justifyContent: 'space-between', marginTop: 18, minHeight: 66, paddingHorizontal: 20, shadowColor: '#071A10', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.22, shadowRadius: 14 },
  scanButtonPressed: { opacity: 0.9, transform: [{ scale: 0.985 }] },
  scanButtonIconBadge: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 19, height: 38, justifyContent: 'center', width: 38 },
  scanButtonIcon: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', lineHeight: 21 },
  scanButtonText: { color: '#10281B', fontSize: 18, fontWeight: '900', letterSpacing: -0.3 },
  resultHeroContent: { flex: 1 },
  resultDashboard: { alignItems: 'center', flexDirection: 'row', gap: 18, marginTop: 10 },
  storageOrbit: { alignItems: 'center', backgroundColor: '#F8FFF7', borderColor: '#D8F85D', borderRadius: 74, borderWidth: 10, height: 148, justifyContent: 'center', position: 'relative', width: 148 },
  storageOrbitArc: { borderColor: '#2C8250', borderRadius: 64, borderRightColor: 'transparent', borderTopColor: 'transparent', borderWidth: 4, height: 128, position: 'absolute', transform: [{ rotate: '-24deg' }], width: 128 },
  storageOrbitDot: { backgroundColor: '#F3B84B', borderColor: '#FFFFFF', borderRadius: 7, borderWidth: 3, height: 14, position: 'absolute', right: 14, top: 25, width: 14 },
  storageOrbitValue: { color: '#174A2E', fontSize: 25, fontVariant: ['tabular-nums'], fontWeight: '900', letterSpacing: -1 },
  storageOrbitLabel: { color: '#64786C', fontSize: 9, fontWeight: '800', marginTop: 3, maxWidth: 96, textAlign: 'center' },
  resultMetaColumn: { flex: 1 },
  resultItemCountNumber: { color: '#2B7E4D', fontSize: 34, fontVariant: ['tabular-nums'], fontWeight: '900', letterSpacing: -1 },
  resultItemCountLabel: { color: '#17301F', fontSize: 14, fontWeight: '800', lineHeight: 18 },
  resultReadyPill: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, flexDirection: 'row', gap: 6, marginTop: 12, paddingHorizontal: 10, paddingVertical: 8 },
  resultReadyDot: { backgroundColor: '#DFFF55', borderRadius: 4, height: 8, width: 8 },
  resultReadyText: { color: '#50665A', flex: 1, fontSize: 9, fontWeight: '700', lineHeight: 12 },
  resultMetaRow: { borderTopColor: '#D4E3D8', borderTopWidth: 1, marginTop: 12, paddingTop: 8 },
  resultStatus: { color: '#69756D', fontSize: 12, lineHeight: 17, marginTop: 5 },
  sectionHeader: { alignItems: 'baseline', flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 },
  sectionLabel: { color: '#17301F', fontSize: 21, fontWeight: '900', letterSpacing: -0.5 },
  sectionMeta: { color: '#718078', fontSize: 12, fontWeight: '700' },
  rescanButton: { color: '#347C4B', fontSize: 13, fontWeight: '800' },
  limitedBanner: {
    backgroundColor: '#FFF3D6',
    borderColor: '#EBCF8B',
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 16,
    padding: 14,
  },
  limitedBannerText: { color: '#6B4A00', fontSize: 13, lineHeight: 18 },
  limitedBannerAction: { color: '#875D00', fontSize: 13, fontWeight: '800', marginTop: 8 },
  disabledButton: { opacity: 0.45 },
  cards: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 9 },
  card: { alignItems: 'flex-start', backgroundColor: '#FFFFFF', borderColor: '#E2E9E3', borderRadius: 22, borderWidth: 1, flexDirection: 'column', minHeight: 166, padding: 14, position: 'relative', shadowColor: '#153322', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.05, shadowRadius: 12, width: '48.7%' },
  cardPressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  cardTopRow: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  categoryIcon: { alignItems: 'center', backgroundColor: '#EDF6F0', borderRadius: 14, height: 44, justifyContent: 'center', marginBottom: 10, width: 44 },
  categoryIconText: { color: '#347C4B', fontSize: 23, fontWeight: '700', lineHeight: 26 },
  cardContent: { flex: 1, paddingRight: 2 },
  cardTitle: { color: '#17251C', flexShrink: 1, fontSize: 16, fontWeight: '900', letterSpacing: -0.25, lineHeight: 20 },
  cardDescription: { color: '#718078', flexShrink: 1, fontSize: 12, lineHeight: 16, marginTop: 3 },
  cardStats: { alignItems: 'flex-start', gap: 5, marginTop: 7 },
  cardCount: { color: '#557400', fontSize: 18, fontVariant: ['tabular-nums'], fontWeight: '900', letterSpacing: -0.2, lineHeight: 22 },
  cardSize: { backgroundColor: '#EFF6D4', borderRadius: 8, color: '#496400', fontSize: 14, fontVariant: ['tabular-nums'], fontWeight: '800', lineHeight: 19, overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 3 },
  cardChevron: { color: '#98AA9D', fontSize: 25, fontWeight: '500', lineHeight: 27 },
  cardComingSoon: { opacity: 0.78 },
  categoryIconComingSoon: { backgroundColor: '#FFF3D6' },
  categoryIconTextComingSoon: { color: '#B1790F' },
  developmentBadge: { alignSelf: 'flex-start', backgroundColor: '#FFF3D6', borderRadius: 9, marginTop: 5, paddingHorizontal: 7, paddingVertical: 4 },
  developmentBadgeText: { color: '#805700', fontSize: 9, fontWeight: '800' },
  footnote: { color: '#718078', fontSize: 10, lineHeight: 13, marginTop: 'auto', paddingVertical: 3 },
  headerRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  headerAction: { alignItems: 'center', backgroundColor: '#EDF4EF', borderRadius: 18, justifyContent: 'center', minHeight: 48, paddingHorizontal: 16 },
  headerActionPressed: { opacity: 0.78, transform: [{ scale: 0.97 }] },
  selectAllAction: { backgroundColor: '#203127' },
  selectAllActionText: { color: '#FFFFFF' },
  backButton: { color: '#2F8250', fontSize: 15, fontWeight: '900' },
  textButton: { color: '#347C4B', fontSize: 14, fontWeight: '900' },
  categoryHeadingRow: { alignItems: 'flex-end', flexDirection: 'row', gap: 12, justifyContent: 'space-between', marginTop: 2 },
  categoryHeadingCopy: { flex: 1 },
  categorySummaryBadge: { alignItems: 'center', backgroundColor: '#EFF6D4', borderRadius: 12, marginBottom: 2, maxWidth: 122, paddingHorizontal: 10, paddingVertical: 8 },
  categorySummaryText: { color: '#496400', fontSize: 11, fontVariant: ['tabular-nums'], fontWeight: '900', lineHeight: 15, textAlign: 'center' },
  previewHint: { color: '#718078', fontSize: 12, fontWeight: '600', marginTop: 8 },
  grid: { gap: 6, paddingTop: 18, paddingBottom: 98 },
  asset: { aspectRatio: 1, backgroundColor: '#EAF2EC', borderRadius: 14, margin: 2, overflow: 'hidden', width: '31.9%' },
  assetPressed: { opacity: 0.82, transform: [{ scale: 0.97 }] },
  assetSelected: { borderColor: '#DFFF55', borderWidth: 4 },
  assetTopRow: { flexDirection: 'row', justifyContent: 'space-between', left: 7, position: 'absolute', right: 7, top: 7 },
  previewGlyph: { alignItems: 'center', backgroundColor: 'rgba(23,48,31,0.72)', borderRadius: 11, height: 22, justifyContent: 'center', width: 22 },
  previewGlyphText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  selectionMark: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.9)', borderColor: '#FFFFFF', borderRadius: 11, borderWidth: 2, height: 22, justifyContent: 'center', width: 22 },
  selectionMarkSelected: { backgroundColor: '#2F8250', borderColor: '#DFFF55' },
  selectionMarkText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  thumbnail: { height: '100%', width: '100%' },
  thumbnailContainer: { flex: 1 },
  videoBadge: { alignItems: 'center', backgroundColor: 'rgba(23,48,31,0.78)', borderRadius: 16, height: 32, justifyContent: 'center', left: '50%', marginLeft: -16, marginTop: -16, position: 'absolute', top: '50%', width: 32 },
  videoBadgeText: { color: '#FFFFFF', fontSize: 13, marginLeft: 2 },
  thumbnailPlaceholder: { alignItems: 'center', backgroundColor: '#DCE7DE', flex: 1, justifyContent: 'center' },
  thumbnailPlaceholderText: { color: '#526158', fontSize: 10, fontWeight: '700', lineHeight: 14, textAlign: 'center' },
  assetLabel: { backgroundColor: 'rgba(23,48,31,0.72)', bottom: 0, left: 0, padding: 4, position: 'absolute', right: 0 },
  assetLabelText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700', textAlign: 'center' },
  emptyText: { color: '#718078', fontSize: 16, paddingTop: 40, textAlign: 'center' },
  deleteButton: { alignItems: 'center', backgroundColor: '#C7473A', borderRadius: 22, bottom: 18, left: 20, minHeight: 58, justifyContent: 'center', padding: 17, position: 'absolute', right: 20, shadowColor: '#5D1510', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 14 },
  deleteButtonPressed: { opacity: 0.9, transform: [{ scale: 0.985 }] },
  deleteButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  previewBackdrop: { alignItems: 'center', backgroundColor: '#08150D', flex: 1, justifyContent: 'center' },
  previewToolbar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', left: 20, position: 'absolute', right: 20, top: 56, zIndex: 4 },
  previewPositionPill: { backgroundColor: 'rgba(255,255,255,0.11)', borderColor: 'rgba(255,255,255,0.12)', borderRadius: 18, borderWidth: 1, minWidth: 74, paddingHorizontal: 14, paddingVertical: 9 },
  previewClose: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.14)', borderColor: 'rgba(255,255,255,0.16)', borderRadius: 23, borderWidth: 1, height: 46, justifyContent: 'center', width: 46 },
  previewCloseText: { color: '#FFFFFF', fontSize: 32, fontWeight: '300', lineHeight: 34 },
  previewPosition: { color: '#FFFFFF', fontSize: 13, fontVariant: ['tabular-nums'], fontWeight: '900', textAlign: 'center' },
  previewControlPressed: { backgroundColor: 'rgba(223,255,85,0.24)', transform: [{ scale: 0.94 }] },
  previewArrow: { alignItems: 'center', backgroundColor: 'rgba(14,56,37,0.82)', borderColor: 'rgba(255,255,255,0.26)', borderRadius: 25, borderWidth: 1, height: 50, justifyContent: 'center', position: 'absolute', top: '46%', width: 50, zIndex: 3 },
  previewArrowLeft: { left: 12 },
  previewArrowRight: { right: 12 },
  previewArrowText: { color: '#FFFFFF', fontSize: 38, fontWeight: '300', lineHeight: 40, marginTop: -3 },
  previewImageFrame: { alignItems: 'center', height: '70%', justifyContent: 'center', overflow: 'hidden', width: '100%' },
  previewImage: { height: '100%', width: '100%' },
  previewLoading: { alignItems: 'center', gap: 16, padding: 32 },
  previewLoadingText: { color: '#FFFFFF', fontSize: 15, textAlign: 'center' },
  previewSelectButton: { alignItems: 'center', backgroundColor: '#DFFF55', borderRadius: 24, bottom: 38, justifyContent: 'center', left: 24, minHeight: 60, padding: 17, position: 'absolute', right: 24, shadowColor: '#DFFF55', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 18 },
  previewSelectedButton: { backgroundColor: '#FFFFFF', shadowColor: '#FFFFFF' },
  previewSelectButtonPressed: { opacity: 0.88, transform: [{ scale: 0.985 }] },
  previewSelectButtonText: { color: '#17301F', fontSize: 16, fontWeight: '900' },
  bottomTabs: { backgroundColor: 'rgba(255,255,255,0.97)', borderColor: '#DDE3DE', borderTopWidth: 1, flexDirection: 'row', gap: 8, paddingHorizontal: 8, paddingTop: 6, paddingBottom: 5 },
  bottomTab: { alignItems: 'center', flex: 1, gap: 3, justifyContent: 'center', minHeight: 58, paddingHorizontal: 12 },
  bottomTabActive: { backgroundColor: 'transparent' },
  bottomTabIcon: { color: '#8A948D', fontSize: 27, fontWeight: '700', lineHeight: 29 },
  bottomTabText: { color: '#8A948D', fontSize: 13, fontWeight: '700' },
  bottomTabTextActive: { color: '#267A4A' },
  lineIconCanvas: { position: 'relative' },
  gridIconCell: { borderRadius: 1.5, position: 'absolute' },
  photoIconFrame: { overflow: 'hidden', position: 'relative' },
  photoIconSun: { borderRadius: 99, position: 'absolute' },
  photoIconMountain: { position: 'absolute', transform: [{ rotate: '-45deg' }] },
  videoIconFrame: { alignItems: 'center', justifyContent: 'center' },
  videoIconPlay: { borderBottomColor: 'transparent', borderTopColor: 'transparent', height: 0, marginLeft: 2, width: 0 },
  similarIconBack: { left: 1, position: 'absolute', top: 1 },
  similarIconFront: { bottom: 1, position: 'absolute', right: 1 },
  homeIconBody: { position: 'absolute' },
  homeIconRoof: { position: 'absolute', transform: [{ rotate: '45deg' }] },
  sliderIconLine: { borderRadius: 99, position: 'absolute' },
  sliderIconKnob: { borderRadius: 99, position: 'absolute' },
  moonIcon: { borderRadius: 99, overflow: 'hidden', position: 'relative' },
  moonIconCutout: { backgroundColor: '#EDF6F0', borderRadius: 99, position: 'absolute' },
  shieldIcon: { alignItems: 'center', borderBottomLeftRadius: 9, borderBottomRightRadius: 9, borderTopLeftRadius: 5, borderTopRightRadius: 5, justifyContent: 'center', position: 'relative' },
  shieldCheckA: { left: 3, position: 'absolute', top: 10, transform: [{ rotate: '45deg' }] },
  shieldCheckB: { left: 6, position: 'absolute', top: 9, transform: [{ rotate: '-45deg' }] },
  languageIcon: { alignItems: 'center', borderRadius: 6, justifyContent: 'center' },
  languageIconLine: { borderRadius: 99 },
  infoIcon: { alignItems: 'center', justifyContent: 'center' },
  infoIconText: { fontWeight: '900', lineHeight: 17 },
  settingsScroll: { flex: 1 },
  settingsScreen: { flexGrow: 1, padding: 20 },
  settingsHeader: { alignItems: 'center', flexDirection: 'row', gap: 14, marginBottom: 28, marginTop: 4 },
  settingsHeaderCopy: { flex: 1 },
  settingsTitle: { color: '#17301F', fontSize: 30, fontWeight: '800', letterSpacing: -0.6 },
  settingsSubtitle: { color: '#718078', fontSize: 13, lineHeight: 18, marginTop: 3 },
  settingsCard: { backgroundColor: '#FFFFFF', borderColor: '#E8EEE6', borderRadius: 22, borderWidth: 1, marginBottom: 12, padding: 18 },
  settingsCardPressed: { backgroundColor: '#F5F8F3' },
  settingsCardTitle: { color: '#17301F', fontSize: 16, fontWeight: '800' },
  settingsCardBody: { color: '#718078', fontSize: 13, lineHeight: 19, marginTop: 5 },
  languagePickerValue: { color: '#347C4B', fontSize: 14, fontWeight: '800' },
  languagePickerChevron: { color: '#718078', fontSize: 26, fontWeight: '400', lineHeight: 28 },
  settingsTrailing: { alignItems: 'center', flexDirection: 'row', gap: 7 },
  settingsRow: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  settingsIcon: { alignItems: 'center', backgroundColor: '#EAF4D5', borderRadius: 15, height: 44, justifyContent: 'center', width: 44 },
  settingsIconText: { color: '#347C4B', fontSize: 20, fontWeight: '800' },
  settingsRowCopy: { flex: 1 },
  settingsStatus: { fontSize: 13, fontWeight: '800', marginTop: 4 },
  settingsStatusFull: { color: '#347C4B' },
  settingsStatusLimited: { color: '#875D00' },
  settingsStatusDenied: { color: '#B42318' },
  settingsAction: { backgroundColor: '#EFF3ED', borderRadius: 14, justifyContent: 'center', minHeight: 44, paddingHorizontal: 12 },
  settingsActionText: { color: '#347C4B', fontSize: 12, fontWeight: '800' },
  settingsVersionValue: { color: '#347C4B', fontSize: 14, fontWeight: '800' },
  pickerBackdrop: { backgroundColor: 'rgba(8,18,11,0.48)', flex: 1, justifyContent: 'flex-end' },
  pickerSheet: { backgroundColor: '#F7FAF5', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingBottom: 34, paddingHorizontal: 20, paddingTop: 12 },
  pickerHandle: { alignSelf: 'center', backgroundColor: '#C7D1C8', borderRadius: 2, height: 4, marginBottom: 18, width: 42 },
  pickerTitle: { color: '#17301F', fontSize: 22, fontWeight: '800', marginBottom: 12 },
  pickerOption: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 18, flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, minHeight: 58, paddingHorizontal: 16 },
  pickerOptionText: { color: '#526158', fontSize: 16, fontWeight: '700' },
  pickerOptionTextSelected: { color: '#17301F', fontWeight: '800' },
  pickerCheck: { alignItems: 'center', borderColor: '#C7D1C8', borderRadius: 11, borderWidth: 2, height: 22, justifyContent: 'center', width: 22 },
  pickerCheckSelected: { backgroundColor: '#347C4B', borderColor: '#347C4B' },
  pickerCheckText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  darkSafeArea: { backgroundColor: '#09140E' },
  darkSurface: { backgroundColor: '#141D17', borderColor: '#2A3A30', shadowColor: '#000000' },
  darkSurfacePressed: { backgroundColor: '#1B2820' },
  darkPrimaryText: { color: '#F1F5F0' },
  darkSecondaryText: { color: '#A8B5AA' },
  darkMutedText: { color: '#748078' },
  darkAccentText: { color: '#8FD6A5' },
  darkMetricText: { color: '#D9F45D' },
  darkMetricBadge: { backgroundColor: '#35451F', color: '#D9F45D' },
  darkAmberSurface: { backgroundColor: '#3B2C12', borderColor: '#6B5125' },
  darkAmberText: { color: '#F2C96D' },
  darkStatusFull: { color: '#7FD39A' },
  darkStatusLimited: { color: '#F2C96D' },
  darkStatusDenied: { color: '#FF8A80' },
  darkLocalBadge: { backgroundColor: '#1B251F', color: '#B8C5BA' },
  darkDivider: { borderTopColor: '#2A3A30' },
  darkIconSurface: { backgroundColor: '#1B2B21' },
  darkBottomTabs: { backgroundColor: '#101712', borderColor: '#2A3A30' },
  darkPickerSheet: { backgroundColor: '#0C1410' },
  darkBorder: { borderColor: '#34463A' },
  darkScanButton: { backgroundColor: '#2F6B45' },
  darkPrimaryButton: { backgroundColor: '#2F6B45' },
  darkButtonText: { color: '#FFFFFF' },
  darkInfoBanner: { backgroundColor: '#17251C' },
  darkScanningPulse: { backgroundColor: '#5D8D55' },
  darkSuccessIcon: { backgroundColor: '#17271C', borderColor: '#657B2D' },
  darkSkeletonRow: { backgroundColor: '#141D17', borderColor: '#2A3A30' },
  darkSkeletonLine: { backgroundColor: '#314238' },
  darkStorageOrbit: { backgroundColor: '#13251A', borderColor: '#657B2D' },
  darkStorageOrbitArc: { borderColor: '#71C58C', borderRightColor: 'transparent', borderTopColor: 'transparent' },
});

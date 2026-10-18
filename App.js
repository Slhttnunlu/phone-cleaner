import { StatusBar } from 'expo-status-bar';
import * as MediaLibrary from 'expo-media-library/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
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
import {
  getLocalAssetInfo,
  getPhotoPreviewUri,
  getThumbnailUri,
  peekPhotoPreviewUri,
} from './src/utils/mediaPreview';
import { categoryConfig, COPY, detectLanguage } from './src/copy';
const PAGE_SIZE = 100;
const MINIMUM_SCAN_DURATION_MS = 3500;
const LANGUAGE_STORAGE_KEY = 'phone-cleaner.language';
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
  const [permission, requestPermission] = MediaLibrary.usePermissions();
  const [language, setLanguage] = useState(detectLanguage);
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
    let mounted = true;
    AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)
      .then((storedLanguage) => {
        if (mounted && (storedLanguage === 'tr' || storedLanguage === 'en')) {
          setLanguage(storedLanguage);
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
    return <LoadingScreen label={copy.permissionChecking} />;
  }

  if (activeTab === 'settings') {
    return (
      <BaseTabScreen
        activeTab={activeTab}
        copy={copy}
        onChangeTab={setActiveTab}
      >
        <SettingsScreen
          copy={copy}
          language={language}
          onChangeLanguage={changeLanguage}
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
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar style="dark" />
        <View style={styles.tabPage}>
          <View style={styles.permissionContainer}>
          <AppMark copy={copy} />
          <Text style={styles.eyebrow}>{copy.appName}</Text>
          <Text style={styles.title}>{copy.permissionTitle}</Text>
          <Text style={styles.body}>
            {permission.canAskAgain
              ? copy.permissionBody
              : copy.permissionDenied}
          </Text>
          <Pressable style={styles.primaryButton} onPress={permissionAction.onPress} accessibilityRole="button">
            <Text style={styles.primaryButtonText}>{permissionAction.label}</Text>
          </Pressable>
          </View>
          <BottomTabs activeTab={activeTab} copy={copy} onChange={setActiveTab} />
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
      />
    );
  }

  if (isScanning) {
    return <ScanningScreen copy={copy} onCancel={cancelScan} />;
  }

  if (activeCategory) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.screen}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => setActiveCategory(null)} accessibilityRole="button">
              <Text style={styles.backButton}>{copy.summary}</Text>
            </Pressable>
            <Pressable onPress={selectAll} accessibilityRole="button">
              <Text style={styles.textButton}>
                {selectedIds.size === visibleAssets.length && visibleAssets.length
                  ? copy.deselectAll
                  : copy.selectAll}
              </Text>
            </Pressable>
          </View>
          <Text style={styles.sectionTitle}>{categories[activeCategory].title}</Text>
          <Text style={styles.body}>{categories[activeCategory].description}</Text>
          {activeCategory !== 'largeVideos' ? (
            <Text style={styles.previewHint}>{copy.previewHint}</Text>
          ) : null}
          <FlatList
            data={visibleAssets}
            keyExtractor={(asset) => asset.id}
            numColumns={3}
            contentContainerStyle={styles.grid}
            ListEmptyComponent={<Text style={styles.emptyText}>{copy.emptyCategory}</Text>}
            renderItem={({ item }) => {
              const selected = selectedIds.has(item.id);
              return (
                <Pressable
                  style={[styles.asset, selected && styles.assetSelected]}
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
            style={[styles.deleteButton, !selectedAssets.length && styles.disabledButton]}
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
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <View style={styles.tabPage}>
      <ScrollView
        style={styles.screenScroll}
        contentContainerStyle={styles.screenContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <View style={styles.brandLockup}>
            <AppMark compact copy={copy} />
            <Text style={styles.eyebrow}>{copy.appName}</Text>
          </View>
          <Text style={styles.localBadge}>{copy.localBadge}</Text>
        </View>
        <View style={[styles.heroCard, hasScanned ? styles.heroResultCard : styles.heroIntroCard]}>
          {hasScanned ? (
            <View style={styles.resultHeroContent}>
              <Text style={styles.heroKicker}>{copy.resultKicker}</Text>
              <Text style={styles.resultEstimate}>
                ~{formatBytes(scanSummary.bytes, copy.noSize)}
              </Text>
              <Text style={styles.resultEstimateLabel}>{copy.estimatedReclaimable}</Text>
              <View style={styles.resultMetaRow}>
                <Text style={styles.resultItemCount}>{copy.foundItems(scanSummary.count)}</Text>
                <Text style={styles.resultStatus}>{copy[scanMessageKey]}</Text>
              </View>
            </View>
          ) : (
            <View>
              <Text style={styles.heroKicker}>{copy.smartScan}</Text>
              <Text style={styles.heroTitle}>{copy.heroTitle}</Text>
              <Text style={styles.heroBody}>
                {scanMessageKey === 'ready' ? copy.scanCallout : copy[scanMessageKey]}
              </Text>
              <Pressable
                style={styles.scanButton}
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
          <View style={styles.limitedBanner}>
            <Text style={styles.limitedBannerText}>
              {copy.limitedAccess}
            </Text>
            <Pressable
              onPress={() => MediaLibrary.presentPermissionsPickerAsync()}
              accessibilityRole="button"
            >
              <Text style={styles.limitedBannerAction}>{copy.editSelection}</Text>
            </Pressable>
          </View>
        ) : null}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>{copy.review}</Text>
          {hasScanned ? (
            <Pressable onPress={scanLibrary} accessibilityRole="button">
              <Text style={styles.rescanButton}>{copy.rescan}</Text>
            </Pressable>
          ) : (
            <Text style={styles.sectionMeta}>{copy.categories}</Text>
          )}
        </View>
        <View style={styles.cards}>
          {Object.entries(categories).map(([key, config]) => {
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
                  {hasScanned ? (
                    <View style={styles.cardStats}>
                      <Text style={styles.cardCount}>{assets.length}</Text>
                      <Text style={styles.cardSize}>{formatBytes(bytes, copy.noSize)}</Text>
                    </View>
                  ) : null}
                  <Text style={styles.cardChevron}>›</Text>
                </Pressable>
            );
          })}
          <View style={[styles.card, styles.cardComingSoon]} accessibilityLabel={`${copy.similarPhotosTitle}. ${copy.inDevelopment}`}>
            <View style={[styles.categoryIcon, styles.categoryIconComingSoon]}>
              <Text style={styles.categoryIconText}>◫</Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{copy.similarPhotosTitle}</Text>
              <Text style={styles.cardDescription}>{copy.similarPhotosDescription}</Text>
            </View>
            <View style={styles.developmentBadge}>
              <Text style={styles.developmentBadgeText}>{copy.inDevelopment}</Text>
            </View>
          </View>
        </View>
        <Text style={styles.footnote}>{copy.estimateFootnote}</Text>
      </ScrollView>
      <BottomTabs activeTab={activeTab} copy={copy} onChange={setActiveTab} />
      </View>
    </SafeAreaView>
  );
}

function BaseTabScreen({ activeTab, copy, onChangeTab, children }) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <View style={styles.tabPage}>
        {children}
        <BottomTabs activeTab={activeTab} copy={copy} onChange={onChangeTab} />
      </View>
    </SafeAreaView>
  );
}

function BottomTabs({ activeTab, copy, onChange }) {
  const insets = useSafeAreaInsets();
  const tabs = [
    { key: 'home', icon: '⌂', label: copy.homeTab, accessibilityLabel: copy.homeTabLabel },
    { key: 'settings', icon: '⚙', label: copy.settingsTab, accessibilityLabel: copy.settingsTabLabel },
  ];

  return (
    <View
      style={[styles.bottomTabs, { paddingBottom: Math.max(insets.bottom, 5) }]}
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
            <Text style={[styles.bottomTabIcon, selected && styles.bottomTabTextActive]}>{tab.icon}</Text>
            <Text style={[styles.bottomTabText, selected && styles.bottomTabTextActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function SettingsScreen({ copy, language, onChangeLanguage, permission }) {
  const [languagePickerVisible, setLanguagePickerVisible] = useState(false);
  const accessLabel = permission.granted
    ? permission.accessPrivileges === 'limited'
      ? copy.photosAccessLimited
      : copy.photosAccessFull
    : copy.photosAccessDenied;

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
          <Text style={styles.settingsTitle}>{copy.settingsTitle}</Text>
          <Text style={styles.settingsSubtitle}>{copy.settingsSubtitle}</Text>
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [styles.settingsCard, pressed && styles.settingsCardPressed]}
        onPress={() => setLanguagePickerVisible(true)}
        accessibilityRole="button"
        accessibilityLabel={copy.chooseLanguage}
      >
        <View style={styles.settingsRow}>
          <View style={styles.settingsIcon}><Text style={styles.settingsIconText}>文</Text></View>
          <View style={styles.settingsRowCopy}>
            <Text style={styles.settingsCardTitle}>{copy.languageTitle}</Text>
            <Text style={styles.settingsCardBody}>{copy.languageDescription}</Text>
          </View>
          <View style={styles.settingsTrailing}>
            <Text style={styles.languagePickerValue}>
              {SUPPORTED_LANGUAGES.find((option) => option.key === language)?.nativeLabel}
            </Text>
            <Text style={styles.languagePickerChevron}>›</Text>
          </View>
        </View>
      </Pressable>

      <View style={styles.settingsCard}>
        <View style={styles.settingsRow}>
          <View style={styles.settingsIcon}><Text style={styles.settingsIconText}>◎</Text></View>
          <View style={styles.settingsRowCopy}>
            <Text style={styles.settingsCardTitle}>{copy.photosAccessTitle}</Text>
            <Text style={styles.settingsStatus}>{accessLabel}</Text>
          </View>
          <Pressable onPress={manageAccess} accessibilityRole="button" style={styles.settingsAction}>
            <Text style={styles.settingsActionText}>{copy.manageAccess}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.settingsCard}>
        <View style={styles.settingsRow}>
          <View style={styles.settingsIcon}><Text style={styles.settingsIconText}>✓</Text></View>
          <View style={styles.settingsRowCopy}>
            <Text style={styles.settingsCardTitle}>{copy.privacyTitle}</Text>
            <Text style={styles.settingsCardBody}>{copy.privacyBody}</Text>
          </View>
        </View>
      </View>

      <View style={styles.settingsCard}>
        <View style={styles.settingsRow}>
          <View style={styles.settingsIcon}><Text style={styles.settingsIconText}>i</Text></View>
          <View style={styles.settingsRowCopy}>
            <Text style={styles.settingsCardTitle}>{copy.versionTitle}</Text>
            <Text style={styles.settingsCardBody}>{copy.releaseChannel}</Text>
          </View>
          <Text style={styles.settingsVersionValue}>{copy.versionValue}</Text>
        </View>
      </View>

      <Modal
        visible={languagePickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLanguagePickerVisible(false)}
      >
        <Pressable style={styles.pickerBackdrop} onPress={() => setLanguagePickerVisible(false)}>
          <Pressable style={styles.pickerSheet} onPress={() => {}}>
            <View style={styles.pickerHandle} />
            <Text style={styles.pickerTitle}>{copy.chooseLanguage}</Text>
            {SUPPORTED_LANGUAGES.map((option) => {
              const selected = language === option.key;
              return (
                <Pressable
                  key={option.key}
                  style={styles.pickerOption}
                  onPress={() => {
                    onChangeLanguage(option.key);
                    setLanguagePickerVisible(false);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={option.nativeLabel}
                >
                  <Text style={[styles.pickerOptionText, selected && styles.pickerOptionTextSelected]}>
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

function LaunchScreen({ copy }) {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: LAUNCH_DURATION_MS - 150,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [progress]);

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

function ScanningScreen({ copy, onCancel }) {
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
        <Text style={styles.eyebrow}>{copy.appName}</Text>
        <View style={styles.scanningAnimation} accessibilityLabel={copy.scanScreenTitle}>
          <Animated.View
            style={[styles.scanningPulse, { opacity: outerOpacity, transform: [{ scale: outerScale }] }]}
          />
          <View style={styles.scanningCore}>
            <ActivityIndicator size="large" color="#17301F" />
          </View>
        </View>
        <Text style={styles.scanningTitle}>{copy.scanScreenTitle}</Text>
        <Text style={styles.body}>{copy.scanScreenBody}</Text>
        <Text style={styles.scanningHint}>{copy.scanScreenHint}</Text>
        <Pressable style={styles.cancelScanButton} onPress={onCancel} accessibilityRole="button">
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
        <Pressable
          style={styles.previewClose}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={copy.closePreview}
        >
          <Text style={styles.previewCloseText}>×</Text>
        </Pressable>
        <Text style={styles.previewPosition}>{copy.previewPosition(position, total)}</Text>
        {previewUri ? (
          <Image source={{ uri: previewUri }} style={styles.previewImage} resizeMode="contain" />
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
              style={[styles.previewArrow, styles.previewArrowLeft]}
              onPress={onPrevious}
              accessibilityRole="button"
              accessibilityLabel={copy.previousPhoto}
            >
              <Text style={styles.previewArrowText}>‹</Text>
            </Pressable>
            <Pressable
              style={[styles.previewArrow, styles.previewArrowRight]}
              onPress={onNext}
              accessibilityRole="button"
              accessibilityLabel={copy.nextPhoto}
            >
              <Text style={styles.previewArrowText}>›</Text>
            </Pressable>
          </>
        ) : null}
        <Pressable
          style={[styles.previewSelectButton, selected && styles.previewSelectedButton]}
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

function CleanupSuccessScreen({ result, onComplete, copy }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.successContainer}>
        <View style={styles.successIcon}>
          <Text style={styles.successIconText}>✓</Text>
        </View>
        <Text style={styles.eyebrow}>{copy.cleanupDone}</Text>
        <Text style={styles.successTitle}>{copy.movedForDeletion(result.count)}</Text>
        <Text style={styles.successEstimate}>{copy.estimatedSpace(formatBytes(result.bytes, copy.noSize))}</Text>
        <View style={styles.recentlyDeletedCard}>
          <Text style={styles.recentlyDeletedTitle}>{copy.spaceDelayTitle}</Text>
          <Text style={styles.recentlyDeletedText}>{copy.recentlyDeletedBody}</Text>
          <Text style={styles.recentlyDeletedText}>{copy.permanentlyDeleteBody}</Text>
        </View>
        <Pressable style={styles.primaryButton} onPress={onComplete} accessibilityRole="button">
          <Text style={styles.primaryButtonText}>{copy.done}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7FAF5' },
  tabPage: { flex: 1 },
  screen: { flex: 1, padding: 20 },
  screenScroll: { flex: 1 },
  screenContent: { flexGrow: 1, padding: 20, paddingBottom: 24 },
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
  primaryButton: { alignItems: 'center', backgroundColor: '#D9F45D', borderRadius: 24, marginTop: 24, padding: 17 },
  primaryButtonText: { color: '#17301F', fontSize: 16, fontWeight: '800' },
  scanningContainer: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 28 },
  scanningAnimation: { alignItems: 'center', height: 174, justifyContent: 'center', marginVertical: 36, width: 174 },
  scanningPulse: { backgroundColor: '#D9F45D', borderRadius: 87, height: 148, position: 'absolute', width: 148 },
  scanningCore: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 55, height: 110, justifyContent: 'center', width: 110 },
  scanningTitle: { color: '#17301F', fontSize: 29, fontWeight: '800', letterSpacing: -0.5, marginBottom: 10, textAlign: 'center' },
  scanningHint: { color: '#718078', fontSize: 13, lineHeight: 19, marginTop: 26, textAlign: 'center' },
  cancelScanButton: { alignItems: 'center', borderColor: '#B8C6BA', borderRadius: 20, borderWidth: 1, marginTop: 24, minHeight: 44, justifyContent: 'center', paddingHorizontal: 20 },
  cancelScanButtonText: { color: '#347C4B', fontSize: 14, fontWeight: '800' },
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
  heroCard: { backgroundColor: '#17301F', borderRadius: 30, minHeight: 326, overflow: 'hidden', padding: 24 },
  heroIntroCard: { minHeight: 272 },
  heroResultCard: { backgroundColor: '#23482F', minHeight: 238 },
  heroKicker: { color: '#CDE6B0', fontSize: 11, fontWeight: '800', letterSpacing: 1.1 },
  heroTitle: { color: '#FFFFFF', fontSize: 36, fontWeight: '800', letterSpacing: -1, lineHeight: 40, marginTop: 10 },
  heroBody: { color: '#C7D3C9', fontSize: 14, lineHeight: 20, marginTop: 12, maxWidth: 290 },
  scanButton: { alignItems: 'center', backgroundColor: '#D9F45D', borderRadius: 22, flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, minHeight: 64, paddingHorizontal: 22 },
  scanButtonIconBadge: { alignItems: 'center', backgroundColor: '#17301F', borderRadius: 18, height: 36, justifyContent: 'center', width: 36 },
  scanButtonIcon: { color: '#D9F45D', fontSize: 18, fontWeight: '800', lineHeight: 21 },
  scanButtonText: { color: '#17301F', fontSize: 17, fontWeight: '900', letterSpacing: -0.2 },
  resultHeroContent: { flex: 1 },
  resultEstimate: { color: '#D9F45D', fontSize: 48, fontWeight: '900', letterSpacing: -1.8, marginTop: 14 },
  resultEstimateLabel: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', marginTop: 2 },
  resultMetaRow: { borderTopColor: 'rgba(255,255,255,0.14)', borderTopWidth: 1, marginTop: 24, paddingTop: 16 },
  resultItemCount: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  resultStatus: { color: '#C7D3C9', fontSize: 12, lineHeight: 17, marginTop: 5 },
  sectionHeader: { alignItems: 'baseline', flexDirection: 'row', justifyContent: 'space-between', marginTop: 27 },
  sectionLabel: { color: '#17301F', fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  sectionMeta: { color: '#718078', fontSize: 12, fontWeight: '700' },
  rescanButton: { color: '#347C4B', fontSize: 13, fontWeight: '800' },
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
  cardComingSoon: { opacity: 0.78 },
  categoryIconComingSoon: { backgroundColor: '#EDF0EC' },
  developmentBadge: { backgroundColor: '#EFF3ED', borderRadius: 12, paddingHorizontal: 9, paddingVertical: 6 },
  developmentBadgeText: { color: '#52705B', fontSize: 10, fontWeight: '800' },
  footnote: { color: '#718078', fontSize: 12, lineHeight: 17, marginTop: 'auto', paddingVertical: 10 },
  headerRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  backButton: { color: '#347C4B', fontSize: 16, fontWeight: '800' },
  textButton: { color: '#347C4B', fontSize: 14, fontWeight: '800' },
  previewHint: { color: '#718078', fontSize: 12, fontWeight: '600', marginTop: 8 },
  grid: { gap: 6, paddingTop: 18, paddingBottom: 88 },
  asset: { aspectRatio: 1, borderRadius: 10, margin: 2, overflow: 'hidden', width: '31.9%' },
  assetSelected: { borderColor: '#347C4B', borderWidth: 3 },
  assetTopRow: { flexDirection: 'row', justifyContent: 'space-between', left: 7, position: 'absolute', right: 7, top: 7 },
  previewGlyph: { alignItems: 'center', backgroundColor: 'rgba(23,48,31,0.72)', borderRadius: 11, height: 22, justifyContent: 'center', width: 22 },
  previewGlyphText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  selectionMark: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.9)', borderColor: '#FFFFFF', borderRadius: 11, borderWidth: 2, height: 22, justifyContent: 'center', width: 22 },
  selectionMarkSelected: { backgroundColor: '#347C4B' },
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
  deleteButton: { alignItems: 'center', backgroundColor: '#C7473A', borderRadius: 16, bottom: 18, left: 20, padding: 17, position: 'absolute', right: 20 },
  deleteButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  previewBackdrop: { alignItems: 'center', backgroundColor: 'rgba(8, 18, 11, 0.96)', flex: 1, justifyContent: 'center' },
  previewClose: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 22, height: 44, justifyContent: 'center', position: 'absolute', right: 20, top: 58, width: 44, zIndex: 2 },
  previewCloseText: { color: '#FFFFFF', fontSize: 32, fontWeight: '300', lineHeight: 34 },
  previewPosition: { color: '#FFFFFF', fontSize: 13, fontWeight: '800', position: 'absolute', top: 72 },
  previewArrow: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 24, height: 48, justifyContent: 'center', position: 'absolute', top: '46%', width: 48, zIndex: 3 },
  previewArrowLeft: { left: 14 },
  previewArrowRight: { right: 14 },
  previewArrowText: { color: '#FFFFFF', fontSize: 38, fontWeight: '300', lineHeight: 40, marginTop: -3 },
  previewImage: { height: '72%', width: '100%' },
  previewLoading: { alignItems: 'center', gap: 16, padding: 32 },
  previewLoadingText: { color: '#FFFFFF', fontSize: 15, textAlign: 'center' },
  previewSelectButton: { alignItems: 'center', backgroundColor: '#D9F45D', borderRadius: 24, bottom: 42, left: 24, padding: 17, position: 'absolute', right: 24 },
  previewSelectedButton: { backgroundColor: '#FFFFFF' },
  previewSelectButtonText: { color: '#17301F', fontSize: 16, fontWeight: '800' },
  bottomTabs: { backgroundColor: '#FFFFFF', borderColor: '#E5EBE3', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, flexDirection: 'row', gap: 8, padding: 7, paddingBottom: 5 },
  bottomTab: { alignItems: 'center', borderRadius: 18, flex: 1, flexDirection: 'row', gap: 8, justifyContent: 'center', minHeight: 54, paddingHorizontal: 12 },
  bottomTabActive: { backgroundColor: '#17301F' },
  bottomTabIcon: { color: '#718078', fontSize: 20, fontWeight: '700' },
  bottomTabText: { color: '#718078', fontSize: 13, fontWeight: '800' },
  bottomTabTextActive: { color: '#FFFFFF' },
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
  settingsStatus: { color: '#347C4B', fontSize: 13, fontWeight: '700', marginTop: 4 },
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
});

import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as MediaLibrary from 'expo-media-library/legacy';
import { Alert, AppState, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import App from './App';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(null),
}));

jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg' },
  manipulateAsync: jest.fn(async (uri) => ({ uri })),
}));

jest.mock('expo-video-thumbnails', () => ({
  getThumbnailAsync: jest.fn(async () => ({ uri: 'file:///video-thumbnail.jpg' })),
}));

jest.mock('expo-media-library/legacy', () => ({
  MediaType: { photo: 'photo', video: 'video' },
  SortBy: { creationTime: 'creationTime' },
  deleteAssetsAsync: jest.fn(),
  addListener: jest.fn(() => ({ remove: jest.fn() })),
  getAssetsAsync: jest.fn(),
  getAssetInfoAsync: jest.fn(),
  presentPermissionsPickerAsync: jest.fn(),
  usePermissions: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaProvider: ({ children }) => children,
    SafeAreaView: ({ children, ...props }) => React.createElement(View, props, children),
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

describe('Photos permission flow', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('requests Photos access from the permission action', () => {
    const requestPermission = jest.fn();
    MediaLibrary.usePermissions.mockReturnValue([
      { granted: false, canAskAgain: true, accessPrivileges: 'none' },
      requestPermission,
    ]);

    render(<App />);
    fireEvent.press(screen.getByRole('button', { name: 'Fotoğraflara erişim ver' }));

    expect(requestPermission).toHaveBeenCalledTimes(1);
  });

  it('explains how to recover when Photos permission cannot be requested again', () => {
    MediaLibrary.usePermissions.mockReturnValue([
      { granted: false, canAskAgain: false, accessPrivileges: 'none' },
      jest.fn(),
    ]);

    render(<App />);

    expect(screen.getByText('Ayarları aç')).toBeOnTheScreen();
    expect(screen.getByText(/Ayarlar’dan kapatılmış/)).toBeOnTheScreen();
  });

  it('opens iOS Settings when Photos permission cannot be requested again', () => {
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    MediaLibrary.usePermissions.mockReturnValue([
      { granted: false, canAskAgain: false, accessPrivileges: 'none' },
      jest.fn(),
    ]);

    render(<App />);
    fireEvent.press(screen.getByRole('button', { name: 'Ayarları aç' }));

    expect(openSettings).toHaveBeenCalledTimes(1);
  });

  it('refreshes Photos permission when the app returns from iOS Settings', () => {
    let onAppStateChange;
    const remove = jest.fn();
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
      onAppStateChange = listener;
      return { remove };
    });
    const refreshPermission = jest.fn();
    MediaLibrary.usePermissions.mockReturnValue([
      { granted: false, canAskAgain: false, accessPrivileges: 'none' },
      jest.fn(),
      refreshPermission,
    ]);

    const { unmount } = render(<App />);
    act(() => onAppStateChange('active'));

    expect(refreshPermission).toHaveBeenCalledTimes(1);
    unmount();
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('discloses limited Photos access before scanning', () => {
    MediaLibrary.usePermissions.mockReturnValue([
      { granted: true, canAskAgain: true, accessPrivileges: 'limited' },
      jest.fn(),
    ]);

    render(<App />);

    expect(screen.getByText(/Sınırlı Fotoğraflar erişimi/)).toBeOnTheScreen();
    expect(screen.getByText('Seçimi düzenle')).toBeOnTheScreen();
  });

  it('opens the limited-library picker from the disclosure', () => {
    MediaLibrary.usePermissions.mockReturnValue([
      { granted: true, canAskAgain: true, accessPrivileges: 'limited' },
      jest.fn(),
    ]);

    render(<App />);
    fireEvent.press(screen.getByText('Seçimi düzenle'));

    expect(MediaLibrary.presentPermissionsPickerAsync).toHaveBeenCalledTimes(1);
  });

  it('shows limited Photos access in amber in Settings', () => {
    MediaLibrary.usePermissions.mockReturnValue([
      { granted: true, canAskAgain: true, accessPrivileges: 'limited' },
      jest.fn(),
    ]);

    render(<App />);
    fireEvent.press(screen.getByRole('tab', { name: 'Ayarları aç' }));

    expect(screen.getByText('Sınırlı erişim')).toHaveStyle({ color: '#875D00' });
  });

  it('shows disabled Photos access in red in Settings', () => {
    MediaLibrary.usePermissions.mockReturnValue([
      { granted: false, canAskAgain: false, accessPrivileges: 'none' },
      jest.fn(),
    ]);

    render(<App />);
    fireEvent.press(screen.getByRole('tab', { name: 'Ayarları aç' }));

    expect(screen.getByText('Erişim kapalı')).toHaveStyle({ color: '#B42318' });
  });

  it('scans only the assets returned by a limited Photos library and keeps the disclosure visible', async () => {
    MediaLibrary.usePermissions.mockReturnValue([
      { granted: true, canAskAgain: true, accessPrivileges: 'limited' },
      jest.fn(),
    ]);
    MediaLibrary.getAssetsAsync.mockResolvedValue({
      assets: [
        {
          id: 'limited-screenshot',
          mediaType: 'photo',
          mediaSubtypes: ['screenshot'],
          width: 1170,
          height: 2532,
          uri: 'file:///limited-screenshot.jpg',
        },
      ],
      endCursor: null,
      hasNextPage: false,
    });

    render(<App />);
    fireEvent.press(screen.getByRole('button', { name: 'Galeriyi tara' }));

    await waitFor(() => expect(screen.getByText('1 adet')).toBeOnTheScreen());
    expect(screen.getByText(/Sınırlı Fotoğraflar erişimi/)).toBeOnTheScreen();
    expect(screen.getByText('Seçimi düzenle')).toBeOnTheScreen();
    expect(MediaLibrary.getAssetsAsync).toHaveBeenCalledTimes(1);
  });

  it('keeps language selection in Settings and applies it to Home', () => {
    MediaLibrary.usePermissions.mockReturnValue([
      { granted: false, canAskAgain: true, accessPrivileges: 'none' },
      jest.fn(),
    ]);

    render(<App />);
    fireEvent.press(screen.getByRole('tab', { name: 'Ayarları aç' }));
    fireEvent.press(screen.getByRole('button', { name: 'Dil seçin' }));
    fireEvent.press(screen.getByRole('radio', { name: 'English' }));
    fireEvent.press(screen.getByRole('tab', { name: 'Open home' }));

    expect(AsyncStorage.setItem).toHaveBeenCalledWith('phone-cleaner.language', 'en');
    expect(screen.getByText('Make room for what matters.')).toBeOnTheScreen();
    expect(screen.getByText('Allow Photos access')).toBeOnTheScreen();
  });

  it('stores the dark appearance preference from Settings', () => {
    MediaLibrary.usePermissions.mockReturnValue([
      { granted: true, canAskAgain: true, accessPrivileges: 'all' },
      jest.fn(),
    ]);

    render(<App />);
    fireEvent.press(screen.getByRole('tab', { name: 'Ayarları aç' }));
    fireEvent(screen.getByRole('switch', { name: 'Koyu görünüm' }), 'valueChange', true);

    expect(AsyncStorage.setItem).toHaveBeenCalledWith('phone-cleaner.dark-mode', 'true');
  });

  it('allows an in-progress scan to be cancelled', async () => {
    MediaLibrary.usePermissions.mockReturnValue([
      { granted: true, canAskAgain: true, accessPrivileges: 'all' },
      jest.fn(),
    ]);
    let finishRequest;
    MediaLibrary.getAssetsAsync.mockReturnValue(
      new Promise((resolve) => {
        finishRequest = resolve;
      })
    );

    render(<App />);
    fireEvent.press(screen.getByRole('button', { name: 'Galeriyi tara' }));
    fireEvent.press(screen.getByText('Taramayı iptal et'));

    expect(screen.getByText(/Tarama iptal edildi/)).toBeOnTheScreen();
    await act(async () => {
      finishRequest({ assets: [], endCursor: null, hasNextPage: false });
    });
  });

  it('shows a safe empty state when scanning finds no matching media', async () => {
    MediaLibrary.usePermissions.mockReturnValue([
      { granted: true, canAskAgain: true, accessPrivileges: 'all' },
      jest.fn(),
    ]);
    MediaLibrary.getAssetsAsync.mockResolvedValue({
      assets: [],
      endCursor: null,
      hasNextPage: false,
    });

    render(<App />);
    fireEvent.press(screen.getByRole('button', { name: 'Galeriyi tara' }));

    await waitFor(() => expect(screen.getByText(/İncelenecek ekran görüntüsü/)).toBeOnTheScreen());
    expect(screen.getByText('0 incelenebilir öğe')).toBeOnTheScreen();
  });

  it('replaces category descriptions with count and size after a successful scan', async () => {
    MediaLibrary.usePermissions.mockReturnValue([
      { granted: true, canAskAgain: true, accessPrivileges: 'all' },
      jest.fn(),
    ]);
    MediaLibrary.getAssetsAsync.mockResolvedValue({
      assets: [
        {
          id: 'result-screenshot',
          mediaType: 'photo',
          mediaSubtypes: ['screenshot'],
          width: 1170,
          height: 2532,
          uri: 'file:///result-screenshot.jpg',
        },
      ],
      endCursor: null,
      hasNextPage: false,
    });

    render(<App />);
    expect(screen.getByText('Genellikle bir kez kullanılan görseller')).toBeOnTheScreen();
    fireEvent.press(screen.getByRole('button', { name: 'Galeriyi tara' }));

    await waitFor(() => expect(screen.getByText('1 adet')).toBeOnTheScreen());
    expect(screen.queryByText('Genellikle bir kez kullanılan görseller')).not.toBeOnTheScreen();
    expect(screen.queryByText(/Tarama tamamlandı\. Bir kategori/)).not.toBeOnTheScreen();
  });

  it('recovers to Home with an actionable message when scanning fails', async () => {
    MediaLibrary.usePermissions.mockReturnValue([
      { granted: true, canAskAgain: true, accessPrivileges: 'all' },
      jest.fn(),
    ]);
    MediaLibrary.getAssetsAsync.mockRejectedValue(new Error('library unavailable'));

    render(<App />);
    fireEvent.press(screen.getByRole('button', { name: 'Galeriyi tara' }));

    await waitFor(() => expect(screen.getByText(/Tarama tamamlanamadı/)).toBeOnTheScreen());
    expect(screen.getByRole('button', { name: 'Galeriyi tara' })).toBeEnabled();
  });

  it('keeps the selection when iOS does not complete deletion', async () => {
    MediaLibrary.usePermissions.mockReturnValue([
      { granted: true, canAskAgain: true, accessPrivileges: 'all' },
      jest.fn(),
    ]);
    MediaLibrary.getAssetsAsync.mockResolvedValue({
      assets: [
        {
          id: 'asset-cancelled',
          mediaType: 'photo',
          mediaSubtypes: ['screenshot'],
          width: 1170,
          height: 2532,
          uri: 'file:///cancelled.jpg',
        },
      ],
      endCursor: null,
      hasNextPage: false,
    });
    MediaLibrary.getAssetInfoAsync.mockResolvedValue({ localUri: 'file:///cancelled.jpg' });
    MediaLibrary.deleteAssetsAsync.mockResolvedValue(false);
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    render(<App />);
    fireEvent.press(screen.getByRole('button', { name: 'Galeriyi tara' }));
    await waitFor(() => expect(screen.getByText('Ekran görüntüleri')).toBeOnTheScreen());
    fireEvent.press(screen.getByText('Ekran görüntüleri'));
    await waitFor(() => expect(screen.queryAllByText('Önizleme\nhazırlanıyor')).toHaveLength(0));
    fireEvent.press(screen.getByRole('checkbox'));
    fireEvent.press(screen.getByText(/1 öğeyi sil/));

    const actions = alert.mock.calls[0][2];
    await act(async () => actions.find((action) => action.style === 'destructive').onPress());

    expect(MediaLibrary.deleteAssetsAsync).toHaveBeenCalledWith(['asset-cancelled']);
    expect(screen.getByText(/1 öğeyi sil/)).toBeOnTheScreen();
    expect(screen.queryByText(/Son Silinenler’e taşındı/)).not.toBeOnTheScreen();
  });

  it('selects and clears every item in a category', async () => {
    MediaLibrary.usePermissions.mockReturnValue([
      { granted: true, canAskAgain: true, accessPrivileges: 'all' },
      jest.fn(),
    ]);
    MediaLibrary.getAssetsAsync.mockResolvedValue({
      assets: ['bulk-1', 'bulk-2'].map((id) => ({
        id,
        mediaType: 'photo',
        mediaSubtypes: ['screenshot'],
        width: 1170,
        height: 2532,
        uri: `file:///${id}.jpg`,
      })),
      endCursor: null,
      hasNextPage: false,
    });
    MediaLibrary.getAssetInfoAsync.mockResolvedValue({ localUri: 'file:///bulk.jpg' });

    render(<App />);
    fireEvent.press(screen.getByRole('button', { name: 'Galeriyi tara' }));
    await waitFor(() => expect(screen.getByText('Ekran görüntüleri')).toBeOnTheScreen());
    fireEvent.press(screen.getByText('Ekran görüntüleri'));
    await waitFor(() => expect(screen.queryAllByText('Önizleme\nhazırlanıyor')).toHaveLength(0));
    fireEvent.press(screen.getByText('Tümünü seç'));

    expect(screen.getByText(/2 öğeyi sil/)).toBeOnTheScreen();
    screen.getAllByRole('checkbox').forEach((item) => {
      expect(item.props.accessibilityState).toEqual({ checked: true });
    });

    fireEvent.press(screen.getByText('Seçimi kaldır'));
    expect(screen.getByText('Silmek için öğe seçin')).toBeOnTheScreen();
  });

  it('shows a safe error and preserves selection when deletion fails', async () => {
    MediaLibrary.usePermissions.mockReturnValue([
      { granted: true, canAskAgain: true, accessPrivileges: 'all' },
      jest.fn(),
    ]);
    MediaLibrary.getAssetsAsync.mockResolvedValue({
      assets: [
        {
          id: 'asset-failed',
          mediaType: 'photo',
          mediaSubtypes: ['screenshot'],
          width: 1170,
          height: 2532,
          uri: 'file:///failed.jpg',
        },
      ],
      endCursor: null,
      hasNextPage: false,
    });
    MediaLibrary.getAssetInfoAsync.mockResolvedValue({ localUri: 'file:///failed.jpg' });
    MediaLibrary.deleteAssetsAsync.mockRejectedValue(new Error('delete failed'));
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    render(<App />);
    fireEvent.press(screen.getByRole('button', { name: 'Galeriyi tara' }));
    await waitFor(() => expect(screen.getByText('Ekran görüntüleri')).toBeOnTheScreen());
    fireEvent.press(screen.getByText('Ekran görüntüleri'));
    await waitFor(() => expect(screen.queryAllByText('Önizleme\nhazırlanıyor')).toHaveLength(0));
    fireEvent.press(screen.getByRole('checkbox'));
    fireEvent.press(screen.getByText(/1 öğeyi sil/));
    const actions = alert.mock.calls[0][2];
    await act(async () => actions.find((action) => action.style === 'destructive').onPress());

    expect(alert).toHaveBeenLastCalledWith('Silme tamamlanamadı', expect.any(String));
    expect(screen.getByText(/1 öğeyi sil/)).toBeOnTheScreen();
  });

  it('scans, selects and deletes only after both app and iOS confirmation steps', async () => {
    MediaLibrary.usePermissions.mockReturnValue([
      { granted: true, canAskAgain: true, accessPrivileges: 'all' },
      jest.fn(),
    ]);
    MediaLibrary.getAssetsAsync.mockResolvedValue({
      assets: [
        {
          id: 'asset-1',
          mediaType: 'photo',
          mediaSubtypes: ['screenshot'],
          width: 1170,
          height: 2532,
          uri: 'file:///screenshot.jpg',
        },
        {
          id: 'asset-2',
          mediaType: 'photo',
          mediaSubtypes: ['screenshot'],
          width: 1170,
          height: 2532,
          uri: 'file:///screenshot-2.jpg',
        },
      ],
      endCursor: null,
      hasNextPage: false,
    });
    MediaLibrary.getAssetInfoAsync.mockResolvedValue({ localUri: 'file:///screenshot.jpg' });
    MediaLibrary.deleteAssetsAsync.mockResolvedValue(true);
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    render(<App />);
    fireEvent.press(screen.getByRole('button', { name: 'Galeriyi tara' }));
    await waitFor(() => expect(screen.getByText('Ekran görüntüleri')).toBeOnTheScreen(), {
      timeout: 5000,
    });

    fireEvent.press(screen.getByText('Ekran görüntüleri'));
    const mediaItems = screen.getAllByRole('checkbox');
    fireEvent(mediaItems[0], 'longPress');
    expect(screen.getByText('1 / 2')).toBeOnTheScreen();
    fireEvent.press(screen.getByRole('button', { name: 'Sonraki fotoğraf' }));
    expect(screen.getByText('2 / 2')).toBeOnTheScreen();
    fireEvent.press(screen.getByRole('button', { name: 'Önizlemeyi kapat' }));
    fireEvent.press(mediaItems[0]);
    fireEvent.press(screen.getByText(/1 öğeyi sil/));

    expect(alert).toHaveBeenCalledWith(
      'Seçilenleri sil?',
      expect.stringContaining('1 öğe'),
      expect.any(Array)
    );
    const actions = alert.mock.calls[0][2];
    await act(async () => actions.find((action) => action.style === 'destructive').onPress());

    expect(MediaLibrary.deleteAssetsAsync).toHaveBeenCalledWith(['asset-1']);
    expect(screen.getByText('1 öğe Son Silinenler’e taşındı')).toBeOnTheScreen();
  });
});

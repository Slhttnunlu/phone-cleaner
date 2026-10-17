import { describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import * as MediaLibrary from 'expo-media-library/legacy';
import App from './App';

jest.mock('expo-media-library/legacy', () => ({
  MediaType: { photo: 'photo', video: 'video' },
  SortBy: { creationTime: 'creationTime' },
  deleteAssetsAsync: jest.fn(),
  getAssetsAsync: jest.fn(),
  presentPermissionsPickerAsync: jest.fn(),
  usePermissions: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaProvider: ({ children }) => children,
    SafeAreaView: ({ children, ...props }) => React.createElement(View, props, children),
  };
});

describe('Photos permission flow', () => {
  it('explains how to recover when Photos permission cannot be requested again', () => {
    MediaLibrary.usePermissions.mockReturnValue([
      { granted: false, canAskAgain: false, accessPrivileges: 'none' },
      jest.fn(),
    ]);

    render(<App />);

    expect(screen.getByText('Ayarları aç')).toBeOnTheScreen();
    expect(screen.getByText(/Ayarlar’dan kapatılmış/)).toBeOnTheScreen();
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
});

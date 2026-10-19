import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as MediaLibrary from 'expo-media-library/legacy';
import { manipulateAsync } from 'expo-image-manipulator';
import * as VideoThumbnails from 'expo-video-thumbnails';
import {
  getLocalAssetInfo,
  getPhotoPreviewUri,
  getThumbnailUri,
  peekPhotoPreviewUri,
} from './mediaPreview';

jest.mock('expo-media-library/legacy', () => ({
  getAssetInfoAsync: jest.fn(),
}));

jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg' },
  manipulateAsync: jest.fn(),
}));

jest.mock('expo-video-thumbnails', () => ({
  getThumbnailAsync: jest.fn(),
}));

describe('media previews', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('checks local availability without downloading an iCloud asset', async () => {
    const asset = { id: 'local-check' };
    MediaLibrary.getAssetInfoAsync.mockResolvedValue({ localUri: null, isNetworkAsset: true });

    await expect(getLocalAssetInfo(asset)).resolves.toEqual({
      localUri: null,
      isNetworkAsset: true,
    });
    expect(MediaLibrary.getAssetInfoAsync).toHaveBeenCalledWith(asset, {
      shouldDownloadFromNetwork: false,
    });
  });

  it('returns a cloud state without starting thumbnail work when media is not local', async () => {
    const asset = { id: 'cloud-thumbnail', mediaType: 'photo' };
    MediaLibrary.getAssetInfoAsync.mockResolvedValue({ localUri: null, isNetworkAsset: true });

    await expect(getThumbnailUri(asset)).resolves.toEqual({ uri: null, isNetworkAsset: true });
    expect(manipulateAsync).not.toHaveBeenCalled();
    expect(VideoThumbnails.getThumbnailAsync).not.toHaveBeenCalled();
  });

  it('creates and caches a resized local photo thumbnail', async () => {
    const asset = { id: 'photo-thumbnail', mediaType: 'photo' };
    MediaLibrary.getAssetInfoAsync.mockResolvedValue({ localUri: 'file:///photo.jpg' });
    manipulateAsync.mockResolvedValue({ uri: 'file:///photo-thumb.jpg' });

    await expect(getThumbnailUri(asset)).resolves.toEqual({
      uri: 'file:///photo-thumb.jpg',
      isNetworkAsset: false,
    });
    await getThumbnailUri(asset);

    expect(manipulateAsync).toHaveBeenCalledTimes(1);
    expect(manipulateAsync).toHaveBeenCalledWith(
      'file:///photo.jpg',
      [{ resize: { width: 480 } }],
      { compress: 0.72, format: 'jpeg' }
    );
  });

  it('creates a local video frame without downloading from iCloud', async () => {
    const asset = { id: 'video-thumbnail', mediaType: 'video', duration: 10 };
    MediaLibrary.getAssetInfoAsync.mockResolvedValue({ localUri: 'file:///video.mov' });
    VideoThumbnails.getThumbnailAsync.mockResolvedValue({ uri: 'file:///video-thumb.jpg' });

    await expect(getThumbnailUri(asset)).resolves.toEqual({
      uri: 'file:///video-thumb.jpg',
      isNetworkAsset: false,
    });
    expect(VideoThumbnails.getThumbnailAsync).toHaveBeenCalledWith('file:///video.mov', {
      quality: 0.7,
      time: 1000,
    });
  });

  it('downloads a full photo only when preview is explicitly opened and exposes the cached task', async () => {
    const asset = { id: 'icloud-preview', mediaType: 'photo' };
    MediaLibrary.getAssetInfoAsync.mockResolvedValue({ localUri: 'file:///downloaded.jpg' });

    const previewTask = getPhotoPreviewUri(asset);

    expect(peekPhotoPreviewUri(asset.id)).toBe(previewTask);
    await expect(previewTask).resolves.toBe('file:///downloaded.jpg');
    expect(MediaLibrary.getAssetInfoAsync).toHaveBeenCalledWith(asset, {
      shouldDownloadFromNetwork: true,
    });
  });
});

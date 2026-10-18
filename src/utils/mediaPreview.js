import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as MediaLibrary from 'expo-media-library/legacy';
import * as VideoThumbnails from 'expo-video-thumbnails';

const thumbnailCache = new Map();
const previewCache = new Map();

function cached(cache, key, factory) {
  if (!cache.has(key)) {
    const task = factory()
      .then((result) => {
        if (!result) cache.delete(key);
        return result;
      })
      .catch((error) => {
        cache.delete(key);
        throw error;
      });
    cache.set(key, task);
  }
  return cache.get(key);
}

export async function getLocalAssetInfo(asset) {
  return MediaLibrary.getAssetInfoAsync(asset, { shouldDownloadFromNetwork: false });
}

export function getThumbnailUri(asset) {
  return cached(thumbnailCache, asset.id, async () => {
    const info = await getLocalAssetInfo(asset);
    if (!info.localUri) return { uri: null, isNetworkAsset: Boolean(info.isNetworkAsset) };

    if (asset.mediaType === 'video') {
      const frame = await VideoThumbnails.getThumbnailAsync(info.localUri, {
        quality: 0.7,
        time: Math.min(1000, Math.max(0, (asset.duration || 0) * 500)),
      });
      return { uri: frame.uri, isNetworkAsset: false };
    }

    const thumbnail = await manipulateAsync(
      info.localUri,
      [{ resize: { width: 480 } }],
      { compress: 0.72, format: SaveFormat.JPEG }
    );
    return { uri: thumbnail.uri, isNetworkAsset: false };
  });
}

export function getPhotoPreviewUri(asset) {
  return cached(previewCache, asset.id, async () => {
    const info = await MediaLibrary.getAssetInfoAsync(asset, {
      shouldDownloadFromNetwork: true,
    });
    return info.localUri?.startsWith('file://') ? info.localUri : null;
  });
}

export function peekPhotoPreviewUri(assetId) {
  return previewCache.get(assetId) ?? null;
}

export const LARGE_PHOTO_PIXELS = 12_000_000;
export const LARGE_VIDEO_DURATION_SECONDS = 60;

export function estimateAssetBytes(asset) {
  const pixels = asset.width * asset.height;
  if (asset.mediaType === 'video') {
    return Math.round(Math.max(pixels * Math.max(asset.duration, 1) * 0.07, 1024 * 1024));
  }
  return Math.round(Math.max(pixels * 0.35, 512 * 1024));
}

export function formatBytes(bytes) {
  if (!bytes) return 'Boyut bilgisi yok';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export function getCategoryMatches(asset) {
  return {
    screenshots: asset.mediaSubtypes?.includes('screenshot') ?? false,
    largePhotos:
      asset.mediaType === 'photo' && asset.width * asset.height >= LARGE_PHOTO_PIXELS,
    largeVideos:
      asset.mediaType === 'video' && asset.duration >= LARGE_VIDEO_DURATION_SECONDS,
  };
}

export function calculateEstimatedBytes(assets) {
  return assets.reduce((total, asset) => total + estimateAssetBytes(asset), 0);
}

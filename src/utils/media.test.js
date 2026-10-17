import {
  calculateEstimatedBytes,
  estimateAssetBytes,
  formatBytes,
  getCategoryMatches,
} from './media';
import { describe, expect, it } from '@jest/globals';

describe('getCategoryMatches', () => {
  it('marks screenshots independently of photo resolution', () => {
    expect(
      getCategoryMatches({
        mediaType: 'photo',
        mediaSubtypes: ['screenshot'],
        width: 1170,
        height: 2532,
      })
    ).toEqual({ screenshots: true, largePhotos: false, largeVideos: false });
  });

  it('uses the documented thresholds for high-resolution photos and long videos', () => {
    expect(getCategoryMatches({ mediaType: 'photo', width: 4000, height: 3000 })).toMatchObject({
      largePhotos: true,
    });
    expect(getCategoryMatches({ mediaType: 'video', width: 1920, height: 1080, duration: 60 })).toMatchObject({
      largeVideos: true,
    });
    expect(getCategoryMatches({ mediaType: 'video', width: 1920, height: 1080, duration: 59 })).toMatchObject({
      largeVideos: false,
    });
  });
});

describe('estimated media size', () => {
  it('returns a bounded local estimate without reading media contents', () => {
    const photo = { mediaType: 'photo', width: 4000, height: 3000 };
    const video = { mediaType: 'video', width: 1920, height: 1080, duration: 90 };

    expect(estimateAssetBytes(photo)).toBeGreaterThan(0);
    expect(estimateAssetBytes(video)).toBeGreaterThan(estimateAssetBytes(photo));
    expect(calculateEstimatedBytes([photo, video])).toBe(
      estimateAssetBytes(photo) + estimateAssetBytes(video)
    );
  });

  it('formats estimates for the UI', () => {
    expect(formatBytes(0)).toBe('Boyut bilgisi yok');
    expect(formatBytes(1024 * 1024)).toBe('1.0 MB');
  });
});

import { describe, expect, it } from 'vitest';
import { isDirectMediaUrl } from '../direct-url';

describe('direct-url', () => {
  describe('isDirectMediaUrl', () => {
    it('returns true for image extensions', () => {
      expect(isDirectMediaUrl('https://example.com/photo.jpg')).toBe(true);
      expect(isDirectMediaUrl('https://i.ibb.co/example/photo.jpg')).toBe(true);
      expect(isDirectMediaUrl('https://example.com/photo.jpeg')).toBe(true);
      expect(isDirectMediaUrl('https://example.com/photo.jpe')).toBe(true);
      expect(isDirectMediaUrl('https://example.com/photo.jfif')).toBe(true);
      expect(isDirectMediaUrl('https://example.com/photo.jif')).toBe(true);
      expect(isDirectMediaUrl('https://example.com/photo.png')).toBe(true);
      expect(isDirectMediaUrl('https://example.com/photo.apng')).toBe(true);
      expect(isDirectMediaUrl('https://example.com/photo.gif')).toBe(true);
      expect(isDirectMediaUrl('https://example.com/photo.webp')).toBe(true);
      expect(isDirectMediaUrl('https://example.com/photo.avif')).toBe(true);
    });

    it('returns true for video extensions', () => {
      expect(isDirectMediaUrl('https://example.com/video.webm')).toBe(true);
      expect(isDirectMediaUrl('https://example.com/video.mp4')).toBe(true);
      expect(isDirectMediaUrl('https://example.com/video.mov')).toBe(true);
      expect(isDirectMediaUrl('https://example.com/video.avi')).toBe(true);
      expect(isDirectMediaUrl('https://example.com/video.mkv')).toBe(true);
      expect(isDirectMediaUrl('https://example.com/video.gifv')).toBe(true);
    });

    it('returns true for Flash movie extensions', () => {
      expect(isDirectMediaUrl('https://example.com/movie.swf')).toBe(true);
      expect(isDirectMediaUrl('https://example.com/movie.SWF?download=1')).toBe(true);
    });

    it('strips query strings and fragments before checking', () => {
      expect(isDirectMediaUrl('https://example.com/photo.jpg?size=large')).toBe(true);
      expect(isDirectMediaUrl('https://example.com/page.html?img=photo.jpg')).toBe(false);
      expect(isDirectMediaUrl('https://example.com/photo.png#section')).toBe(true);
      expect(isDirectMediaUrl('https://example.com/photo.gif#')).toBe(true);
    });

    it('is case insensitive', () => {
      expect(isDirectMediaUrl('https://example.com/photo.JPG')).toBe(true);
      expect(isDirectMediaUrl('https://example.com/photo.PNG')).toBe(true);
    });

    it('returns false for non-media URLs', () => {
      expect(isDirectMediaUrl('https://example.com/page.html')).toBe(false);
      expect(isDirectMediaUrl('https://imgur.com/abc123')).toBe(false);
      expect(isDirectMediaUrl('https://example.com/')).toBe(false);
    });
  });
});

import { describe, it, expect } from 'vitest';
import { hasLegacyImages } from './imageMigration.js';

describe('hasLegacyImages', () => {
  it('存在含 base64 字段的条目时返回 true', () => {
    expect(hasLegacyImages([
      { id: 'img-1', name: 'a.jpg', mimeType: 'image/jpeg' },
      { id: 'img-2', name: 'b.jpg', base64: 'AAAA', mimeType: 'image/jpeg' },
    ])).toBe(true);
  });

  it('全部为新格式时返回 false', () => {
    expect(hasLegacyImages([
      { id: 'img-1', name: 'a.jpg', mimeType: 'image/jpeg' },
    ])).toBe(false);
  });

  it('空数组返回 false', () => {
    expect(hasLegacyImages([])).toBe(false);
  });

  it('入参不是数组时返回 false', () => {
    expect(hasLegacyImages(null)).toBe(false);
    expect(hasLegacyImages(undefined)).toBe(false);
  });
});

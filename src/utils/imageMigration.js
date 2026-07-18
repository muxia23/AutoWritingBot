/**
 * 图片存储格式迁移判定
 *
 * 旧格式把 base64 直接存在 localStorage 的条目里，新格式二进制走 IndexedDB。
 */

/**
 * @param {unknown} images
 * @returns {boolean} 是否存在旧格式条目
 */
export function hasLegacyImages(images) {
  if (!Array.isArray(images)) return false;
  return images.some(img => img && typeof img.base64 === 'string');
}

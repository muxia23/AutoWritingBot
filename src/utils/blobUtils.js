/**
 * Blob 与 base64 互转工具
 */

/**
 * Blob → base64 字符串（不含 data: 前缀）
 * @param {Blob} blob
 * @returns {Promise<string>}
 */
export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const commaIndex = dataUrl.indexOf(',');
      resolve(commaIndex === -1 ? '' : dataUrl.slice(commaIndex + 1));
    };
    reader.onerror = () => reject(reader.error || new Error('读取图片失败'));
    reader.readAsDataURL(blob);
  });
}

/**
 * canvas → Blob
 * @param {HTMLCanvasElement} canvas
 * @param {string} mimeType
 * @param {number} quality
 * @returns {Promise<Blob>}
 */
export function canvasToBlob(canvas, mimeType, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('图片压缩失败'))),
      mimeType,
      quality
    );
  });
}

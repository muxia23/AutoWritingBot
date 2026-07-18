/**
 * 打包下载：推文 Word 文档 + 本次使用的图片
 *
 * 图片编号取 selectedImages 的顺序，与 ChatGeneratePage 喂给模型的
 * 提示词（「图片1（名称）：描述」）同源，因此正文里的编号和文件名一一对应。
 */

import { buildDocxBlob } from './exportDocx.js';
import { getImageBlob } from '../services/imageStore.js';

// 文件系统不接受的字符，与 constants.js 的 FILE_TEMPLATES 保持一致
const UNSAFE_CHARS = /[\\/:*?"<>|]/g;

const MIME_EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
};

function safeName(name, fallback) {
  const cleaned = (name || '').replace(UNSAFE_CHARS, '').trim().slice(0, 40);
  return cleaned || fallback;
}

/** 不信任原文件名的扩展名，优先按 mimeType 推导 */
function extensionFor(image) {
  if (MIME_EXT[image.mimeType]) return MIME_EXT[image.mimeType];
  const dot = (image.name || '').lastIndexOf('.');
  if (dot > 0) return image.name.slice(dot);
  return '.jpg';
}

function stripExtension(name) {
  const dot = (name || '').lastIndexOf('.');
  return dot > 0 ? name.slice(0, dot) : (name || '');
}

async function blobToU8(blob) {
  return new Uint8Array(await blob.arrayBuffer());
}

/**
 * @param {string} title 推文标题
 * @param {string} content 推文正文（Markdown）
 * @param {Array<{id: string, name: string, mimeType: string}>} selectedImages
 * @returns {Promise<{missing: number}>} 缺失的图片数量
 */
export async function downloadBundle(title, content, selectedImages = []) {
  const { zipSync } = await import('fflate');

  const docTitle = safeName(title, '推文');
  const files = {};

  const docxBlob = await buildDocxBlob(title, content);
  files[`${docTitle}.docx`] = await blobToU8(docxBlob);

  let missing = 0;
  for (const [index, image] of selectedImages.entries()) {
    const blob = await getImageBlob(image.id);
    if (!blob) {
      missing += 1;
      continue;
    }
    const label = safeName(stripExtension(image.name), `图片${index + 1}`);
    const filename = `图片${index + 1}_${label}${extensionFor(image)}`;
    files[`图片/${filename}`] = await blobToU8(blob);
  }

  // level 0（store）：图片和 docx 本身已是压缩格式，再压一遍只费时不省体积
  const zipped = zipSync(files, { level: 0 });

  const blob = new Blob([zipped], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${docTitle}_${new Date().toISOString().split('T')[0]}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // 同 exportDocx：同步 revoke 会下载到空文件
  setTimeout(() => URL.revokeObjectURL(url), 60_000);

  return { missing };
}

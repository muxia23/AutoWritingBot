/**
 * 图片二进制存储（IndexedDB）
 *
 * 图片体积大，放 localStorage 会撞 5MB 配额并连带拖垮其他数据。
 * 这里只存二进制，元数据（名称、描述等）仍由 ImageContext 放在 localStorage。
 */

import { createStore, get, set, del, clear } from 'idb-keyval';

const store = createStore('autowritingbot-images', 'blobs');

/**
 * @param {string} id
 * @returns {Promise<Blob|null>}
 */
export async function getImageBlob(id) {
  const blob = await get(id, store);
  return blob ?? null;
}

/**
 * @param {string} id
 * @param {Blob} blob
 */
export async function setImageBlob(id, blob) {
  await set(id, blob, store);
}

/**
 * @param {string} id
 */
export async function delImageBlob(id) {
  await del(id, store);
}

export async function clearImageBlobs() {
  await clear(store);
}

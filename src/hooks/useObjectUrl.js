/**
 * 按图片 id 从 IndexedDB 取 Blob 并生成 object URL，
 * 组件卸载或 id 变化时回收，避免内存泄漏。
 */

import { useState, useEffect } from 'react';
import { getImageBlob } from '../services/imageStore.js';

/**
 * @param {string} id 图片 id
 * @returns {string|null} object URL，加载中为 null
 */
export function useObjectUrl(id) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let createdUrl = null;

    getImageBlob(id).then(blob => {
      if (cancelled || !blob) return;
      createdUrl = URL.createObjectURL(blob);
      setUrl(createdUrl);
    }).catch(() => {});

    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
      setUrl(null);
    };
  }, [id]);

  return url;
}

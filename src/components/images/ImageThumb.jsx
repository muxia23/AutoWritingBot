/**
 * 图片缩略图 — 按 id 从 IndexedDB 读取并渲染
 */

import { useObjectUrl } from '../../hooks/useObjectUrl.js';

export default function ImageThumb({ id, alt, className }) {
  const url = useObjectUrl(id);

  if (!url) {
    return <div className={`${className || ''} image-thumb-placeholder`} />;
  }

  return <img src={url} alt={alt} className={className} />;
}

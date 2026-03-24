/**
 * 加载状态组件
 */

import { Loader2 } from 'lucide-react';

export default function Loading({ size = 'md', text = '加载中...' }) {
  const sizeClasses = {
    sm: 16,
    md: 24,
    lg: 32
  };

  return (
    <div className="loading-container">
      <Loader2 className="loading-spinner" size={sizeClasses[size]} />
      {text && <p className="loading-text">{text}</p>}
    </div>
  );
}

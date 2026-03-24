/**
 * 批注标记显示组件
 */

import { CheckCircle2, RefreshCw, Palette, XCircle } from 'lucide-react';

export default function AnnotationMarker({ annotation }) {
  const typeIcons = {
    rewrite: RefreshCw,
    fix: CheckCircle2,
    style: Palette
  };

  const typeLabels = {
    rewrite: '重写',
    fix: '修正',
    style: '润色'
  };

  const typeColors = {
    rewrite: '#ff6b6b',
    fix: '#51cf66',
    style: '#339af0'
  };

  const Icon = typeIcons[annotation.type];

  return (
    <div
      className="annotation-marker-item"
      style={{ borderLeftColor: typeColors[annotation.type] }}
    >
      <div className="annotation-header">
        <Icon size={14} style={{ color: typeColors[annotation.type] }} />
        <span className="annotation-type">{typeLabels[annotation.type]}</span>
        <span className="annotation-time">
          {new Date(annotation.createdAt).toLocaleTimeString()}
        </span>
      </div>
      <div className="annotation-selected-text">"{annotation.selectedText}"</div>
      <div className="annotation-content">{annotation.content}</div>
      {annotation.resolved && (
        <div className="annotation-resolved-badge">
          <XCircle size={12} />
          <span>已解决</span>
        </div>
      )}
    </div>
  );
}

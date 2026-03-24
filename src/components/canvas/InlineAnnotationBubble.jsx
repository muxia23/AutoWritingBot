/**
 * 内联批注气泡组件
 * 选中文字后显示批注输入气泡
 */

import { useState, useEffect, useRef } from 'react';
import { X, Check, Edit3, AlertCircle, Palette } from 'lucide-react';
import { ANNOTATION_TYPES } from '../../utils/constants.js';
import Button from '../form/Button.jsx';

export default function InlineAnnotationBubble({
  position,
  selectedText,
  onApply,
  onCancel
}) {
  const [annotationType, setAnnotationType] = useState('rewrite');
  const [content, setContent] = useState('');
  const bubbleRef = useRef(null);

  useEffect(() => {
    setContent('');
  }, [selectedText]);

  const typeIcons = {
    rewrite: Edit3,
    fix: Check,
    style: Palette
  };

  const typeLabels = {
    rewrite: '重写',
    fix: '修正',
    style: '润色'
  };

  const handleApply = () => {
    if (!content.trim()) {
      return;
    }

    onApply({
      type: annotationType,
      selectedText,
      content: content.trim()
    });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleApply();
    }
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div
      ref={bubbleRef}
      className="inline-annotation-bubble"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`
      }}
    >
      <div className="bubble-header">
        <div className="bubble-type-selector">
          {ANNOTATION_TYPES.map(type => {
            const Icon = typeIcons[type.value];
            return (
              <button
                key={type.value}
                className={`type-btn ${annotationType === type.value ? 'active' : ''}`}
                onClick={() => setAnnotationType(type.value)}
                title={type.label}
              >
                <Icon size={14} />
              </button>
            );
          })}
        </div>
        <button className="bubble-close" onClick={onCancel}>
          <X size={14} />
        </button>
      </div>

      <div className="bubble-content">
        <div className="selected-text-preview">
          <AlertCircle size={12} />
          <span>{selectedText.slice(0, 50)}{selectedText.length > 50 ? '...' : ''}</span>
        </div>

        <textarea
          className="bubble-input"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={`${typeLabels[annotationType]}这段文字...`}
          rows={2}
          autoFocus
        />

        <div className="bubble-actions">
          <Button variant="secondary" size="sm" onClick={onCancel}>
            取消
          </Button>
          <Button size="sm" onClick={handleApply} disabled={!content.trim()}>
            应用
          </Button>
        </div>
      </div>
    </div>
  );
}

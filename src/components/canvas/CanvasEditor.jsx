/**
 * 画布编辑器组件
 * 支持标题编辑、内容预览/编辑模式切换、内联批注功能
 */

import { useState, useRef, useCallback } from 'react';
import { Edit3, Eye, Copy, Download, Play, MessageSquarePlus } from 'lucide-react';
import Button from '../form/Button.jsx';
import InlineAnnotationBubble from './InlineAnnotationBubble.jsx';
import AnnotationSidebar from './AnnotationSidebar.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { usePromptContext } from '../../context/PromptContext.jsx';
import { useAnnotation } from '../../hooks/useAnnotation.js';
import { DeepSeekAPI } from '../../services/deepseek.js';
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '../../utils/constants.js';
import { downloadAsDocx } from '../../utils/exportDocx.js';

export default function CanvasEditor({ title, content, onTitleChange, onContentChange }) {
  const { activeModel, showToast } = useApp();
  const { buildSystemPrompt } = usePromptContext();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [viewMode, setViewMode] = useState('preview');
  const [isApplying, setIsApplying] = useState(false);
  const [bubblePosition, setBubblePosition] = useState(null);
  const [bubbleSelectedText, setBubbleSelectedText] = useState('');
  const contentRef = useRef(null);

  const {
    annotations,
    addAnnotation,
    deleteAnnotation,
    clearAllAnnotations,
    getPendingAnnotations
  } = useAnnotation();

  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (!text) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const containerRect = contentRef.current?.getBoundingClientRect();

    if (containerRect) {
      const left = Math.min(
        rect.left - containerRect.left,
        containerRect.width - 340
      );
      setBubblePosition({
        top: rect.bottom - containerRect.top + contentRef.current.scrollTop + 8,
        left: Math.max(0, left)
      });
      setBubbleSelectedText(text);
    }
  }, []);

  const handleBubbleApply = useCallback((annotationData) => {
    addAnnotation(annotationData);
    setBubblePosition(null);
    setBubbleSelectedText('');
    window.getSelection()?.removeAllRanges();
    showToast(SUCCESS_MESSAGES.ANNOTATION_ADDED);
  }, [addAnnotation, showToast]);

  const handleBubbleCancel = useCallback(() => {
    setBubblePosition(null);
    setBubbleSelectedText('');
  }, []);

  const handleApplyAnnotation = useCallback(async (annotation) => {
    if (!activeModel?.apiKey) {
      showToast(ERROR_MESSAGES.API_KEY_MISSING, 'error');
      return;
    }
    setIsApplying(true);
    try {
      const systemPrompt = buildSystemPrompt();
      const result = await DeepSeekAPI.applyInlineAnnotation(systemPrompt, content, annotation, activeModel);
      onContentChange(result);
      deleteAnnotation(annotation.id);
      showToast(SUCCESS_MESSAGES.ARTICLE_OPTIMIZED);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setIsApplying(false);
    }
  }, [activeModel, buildSystemPrompt, content, onContentChange, deleteAnnotation, showToast]);

  const handleApplyAllAnnotations = useCallback(async () => {
    const pending = getPendingAnnotations();
    if (pending.length === 0) return;
    if (!activeModel?.apiKey) {
      showToast(ERROR_MESSAGES.API_KEY_MISSING, 'error');
      return;
    }
    setIsApplying(true);
    try {
      const systemPrompt = buildSystemPrompt();
      const result = await DeepSeekAPI.applyAnnotations(systemPrompt, content, pending, activeModel);
      onContentChange(result);
      clearAllAnnotations();
      showToast(SUCCESS_MESSAGES.ARTICLE_OPTIMIZED);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setIsApplying(false);
    }
  }, [activeModel, buildSystemPrompt, content, onContentChange, getPendingAnnotations, clearAllAnnotations, showToast]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    showToast(SUCCESS_MESSAGES.COPIED);
  };

  const handleDownload = async () => {
    try {
      await downloadAsDocx(title, content);
      showToast(SUCCESS_MESSAGES.DOWNLOADED);
    } catch (error) {
      showToast('导出失败：' + error.message, 'error');
    }
  };

  const pendingAnnotations = getPendingAnnotations();

  return (
    <div className="canvas-editor">
      {/* 画布标题区 */}
      <div className="canvas-header">
        <div className="canvas-title-container">
          {isEditingTitle ? (
            <input
              type="text"
              className="canvas-title-input"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              onBlur={() => setIsEditingTitle(false)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') setIsEditingTitle(false);
              }}
              autoFocus
            />
          ) : (
            <div className="canvas-title-display" onClick={() => setIsEditingTitle(true)}>
              {title}
              <Edit3 size={16} className="edit-icon" />
            </div>
          )}
        </div>

        <div className="canvas-toolbar">
          <div className="view-toggle">
            <button
              className={`view-btn ${viewMode === 'preview' ? 'active' : ''}`}
              onClick={() => setViewMode('preview')}
              title="预览模式（支持选中文字添加批注）"
            >
              <Eye size={14} />
              预览
            </button>
            <button
              className={`view-btn ${viewMode === 'edit' ? 'active' : ''}`}
              onClick={() => setViewMode('edit')}
            >
              <Edit3 size={14} />
              编辑
            </button>
          </div>
          <div className="toolbar-divider" />
          {pendingAnnotations.length > 0 && (
            <Button
              size="sm"
              onClick={handleApplyAllAnnotations}
              loading={isApplying}
            >
              <Play size={14} />
              应用全部批注 ({pendingAnnotations.length})
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <Copy size={14} />
            复制
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download size={14} />
            下载
          </Button>
        </div>
      </div>

      {/* 画布主体：内容 + 批注侧边栏 */}
      <div className="canvas-body">
        {/* 内容区 */}
        <div className="canvas-content" ref={contentRef}>
          {viewMode === 'preview' ? (
            <>
              {viewMode === 'preview' && (
                <div className="annotation-hint">
                  <MessageSquarePlus size={12} />
                  选中文字可添加批注
                </div>
              )}
              <div
                className="markdown-preview"
                onMouseUp={handleTextSelection}
              >
                {content.split('\n').map((line, index) => {
                  if (line.startsWith('# ')) {
                    return <h1 key={index}>{line.slice(2)}</h1>;
                  }
                  if (line.startsWith('## ')) {
                    return <h2 key={index}>{line.slice(3)}</h2>;
                  }
                  if (line.startsWith('### ')) {
                    return <h3 key={index}>{line.slice(4)}</h3>;
                  }
                  if (line.trim() === '') {
                    return <p key={index}>&nbsp;</p>;
                  }
                  return <p key={index}>{line}</p>;
                })}
              </div>
            </>
          ) : (
            <textarea
              className="content-textarea"
              value={content}
              onChange={(e) => onContentChange(e.target.value)}
              placeholder="编辑内容..."
              spellCheck={false}
            />
          )}

          {/* 内联批注气泡 */}
          {bubblePosition && bubbleSelectedText && viewMode === 'preview' && (
            <InlineAnnotationBubble
              position={bubblePosition}
              selectedText={bubbleSelectedText}
              onApply={handleBubbleApply}
              onCancel={handleBubbleCancel}
            />
          )}
        </div>

        {/* 批注侧边栏 */}
        {pendingAnnotations.length > 0 && (
          <div className="canvas-annotation-panel">
            <AnnotationSidebar
              annotations={pendingAnnotations}
              onAdd={(ann) => addAnnotation(ann)}
              onDelete={deleteAnnotation}
              onApply={handleApplyAnnotation}
              onApplyAll={handleApplyAllAnnotations}
              onClearAll={clearAllAnnotations}
            />
          </div>
        )}
      </div>
    </div>
  );
}

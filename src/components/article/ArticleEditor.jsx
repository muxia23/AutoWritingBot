/**
 * 文章编辑器组件 - 支持批注功能
 */

import { useState } from 'react';
import { Edit3, Eye, EyeOff, MessageSquare, Trash2 } from 'lucide-react';
import AnnotationDialog from './AnnotationDialog.jsx';
import AnnotationMarker from './AnnotationMarker.jsx';
import { useAnnotation } from '../../hooks/useAnnotation.js';
import { ANNOTATION_TYPES } from '../../utils/constants.js';

export default function ArticleEditor({
  content = '',
  onChange,
  readOnly = false,
  showAnnotations = true
}) {
  const {
    annotations,
    selectedText,
    showAnnotationDialog,
    editingAnnotation,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    handleTextSelect,
    closeAnnotationDialog
  } = useAnnotation();

  const [viewMode, setViewMode] = useState('preview'); // 'preview' or 'edit'
  const [localContent, setLocalContent] = useState(content);
  const [showAnnotationMarkers, setShowAnnotationMarkers] = useState(true);

  const handleContentChange = (newContent) => {
    setLocalContent(newContent);
    onChange?.(newContent);
  };

  const handleAddAnnotation = (data) => {
    try {
      addAnnotation({
        ...data,
        selectedText: editingAnnotation?.selectedText || selectedText
      });
      closeAnnotationDialog();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDeleteAnnotation = (id) => {
    if (confirm('确定要删除这条批注吗？')) {
      deleteAnnotation(id);
    }
  };

  // 渲染带批注标记的内容
  const renderAnnotatedContent = () => {
    if (!localContent) return '';

    const pendingAnnotations = annotations.filter(a => !a.resolved);
    if (pendingAnnotations.length === 0 || !showAnnotationMarkers) {
      return localContent;
    }

    // 按位置排序批注
    const sortedAnnotations = [...pendingAnnotations].sort((a, b) => a.startIndex - b.startIndex);

    let result = localContent;
    let offset = 0;

    sortedAnnotations.forEach((annotation) => {
      const before = result.slice(0, annotation.startIndex + offset);
      const text = result.slice(annotation.startIndex + offset, annotation.endIndex + offset);
      const after = result.slice(annotation.endIndex + offset);

      const marker = `<span class="annotation-marker annotation-type-${annotation.type}">${text}</span>`;
      result = before + marker + after;
      offset += marker.length - text.length;
    });

    return result;
  };

  return (
    <div className="article-editor">
      <div className="editor-toolbar">
        <div className="toolbar-left">
          <button
            className={`toolbar-btn ${viewMode === 'preview' ? 'active' : ''}`}
            onClick={() => setViewMode('preview')}
          >
            <Eye size={16} />
            <span>预览</span>
          </button>
          <button
            className={`toolbar-btn ${viewMode === 'edit' ? 'active' : ''}`}
            onClick={() => setViewMode('edit')}
          >
            <Edit3 size={16} />
            <span>编辑</span>
          </button>
        </div>
        <div className="toolbar-right">
          {annotations.length > 0 && (
            <>
              <button
                className={`toolbar-btn ${showAnnotationMarkers ? 'active' : ''}`}
                onClick={() => setShowAnnotationMarkers(!showAnnotationMarkers)}
                title={showAnnotationMarkers ? '隐藏批注标记' : '显示批注标记'}
              >
                <MessageSquare size={16} />
              </button>
              <button
                className="toolbar-btn"
                onClick={() => {
                  if (confirm('确定要清空所有批注吗？')) {
                    annotations.forEach(a => deleteAnnotation(a.id));
                  }
                }}
                title="清空所有批注"
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      {viewMode === 'preview' ? (
        <div
          className="editor-preview markdown-preview"
          onMouseUp={!readOnly ? handleTextSelect : undefined}
          dangerouslySetInnerHTML={{ __html: renderAnnotatedContent() }}
        />
      ) : (
        <textarea
          className="editor-textarea"
          value={localContent}
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder="请输入或粘贴文章内容..."
          rows={15}
        />
      )}

      {showAnnotations && annotations.length > 0 && (
        <div className="annotations-panel">
          <h4 className="annotations-title">批注 ({annotations.filter(a => !a.resolved).length})</h4>
          <div className="annotations-list">
            {annotations.map((annotation) => (
              <div
                key={annotation.id}
                className={`annotation-item ${annotation.resolved ? 'resolved' : ''}`}
              >
                <AnnotationMarker annotation={annotation} />
                <button
                  className="annotation-delete"
                  onClick={() => handleDeleteAnnotation(annotation.id)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showAnnotationDialog && (
        <AnnotationDialog
          onClose={closeAnnotationDialog}
          onSubmit={handleAddAnnotation}
          selectedText={selectedText}
          annotationTypes={ANNOTATION_TYPES}
        />
      )}
    </div>
  );
}

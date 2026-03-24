/**
 * 批注侧边栏组件
 * 显示所有待处理批注，支持批量应用
 */

import { useState } from 'react';
import { Trash2, Check, RefreshCw, Plus } from 'lucide-react';
import Button from '../form/Button.jsx';
import { ANNOTATION_TYPES } from '../../utils/constants.js';

export default function AnnotationSidebar({
  annotations,
  onAdd,
  onUpdate,
  onDelete,
  onApply,
  onApplyAll,
  onClearAll
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAnnotation, setNewAnnotation] = useState({
    type: 'rewrite',
    selectedText: '',
    content: ''
  });

  const typeIcons = {
    rewrite: RefreshCw,
    fix: Check,
    style: Plus
  };

  const typeLabels = {
    rewrite: '重写',
    fix: '修正',
    style: '润色'
  };

  const handleAddAnnotation = () => {
    if (!newAnnotation.selectedText.trim() || !newAnnotation.content.trim()) {
      return;
    }

    onAdd({
      ...newAnnotation,
      id: Date.now().toString()
    });

    setNewAnnotation({
      type: 'rewrite',
      selectedText: '',
      content: ''
    });
    setShowAddForm(false);
  };

  const handleDeleteAnnotation = (id) => {
    onDelete(id);
  };

  if (annotations.length === 0 && !showAddForm) {
    return (
      <div className="annotation-sidebar">
        <div className="sidebar-header">
          <h4 className="sidebar-title">批注列表</h4>
          <Button variant="outline" size="sm" onClick={() => setShowAddForm(true)}>
            <Plus size={14} />
            添加批注
          </Button>
        </div>
        <div className="empty-state">
          <p>暂无批注</p>
          <p className="text-sm text-gray-500">
            选中文字或点击上方按钮添加批注
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="annotation-sidebar">
      <div className="sidebar-header">
        <h4 className="sidebar-title">
          批注列表
          <span className="badge">{annotations.length}</span>
        </h4>
        <div className="sidebar-actions">
          {annotations.length > 0 && (
            <Button variant="outline" size="sm" onClick={onClearAll}>
              清空
            </Button>
          )}
          {annotations.length > 1 && (
            <Button size="sm" onClick={onApplyAll}>
              批量应用
            </Button>
          )}
        </div>
      </div>

      {showAddForm && (
        <div className="add-annotation-form">
          <div className="form-group">
            <label>批注类型</label>
            <select
              value={newAnnotation.type}
              onChange={(e) => setNewAnnotation(prev => ({ ...prev, type: e.target.value }))}
              className="form-select"
            >
              {ANNOTATION_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>选中文字</label>
            <textarea
              value={newAnnotation.selectedText}
              onChange={(e) => setNewAnnotation(prev => ({ ...prev, selectedText: e.target.value }))}
              placeholder="请输入或粘贴需要批注的文字..."
              rows={2}
              className="form-textarea"
            />
          </div>
          <div className="form-group">
            <label>批注内容</label>
            <textarea
              value={newAnnotation.content}
              onChange={(e) => setNewAnnotation(prev => ({ ...prev, content: e.target.value }))}
              placeholder={`请输入${typeLabels[newAnnotation.type]}说明...`}
              rows={2}
              className="form-textarea"
            />
          </div>
          <div className="form-actions">
            <Button variant="secondary" size="sm" onClick={() => setShowAddForm(false)}>
              取消
            </Button>
            <Button size="sm" onClick={handleAddAnnotation}>
              添加
            </Button>
          </div>
        </div>
      )}

      <div className="annotations-list">
        {annotations.map(annotation => {
          const Icon = typeIcons[annotation.type];
          return (
            <div key={annotation.id} className="annotation-item">
              <div className="annotation-header">
                <div className="annotation-type">
                  <Icon size={14} />
                  <span>{typeLabels[annotation.type]}</span>
                </div>
                <button
                  className="delete-btn"
                  onClick={() => handleDeleteAnnotation(annotation.id)}
                  title="删除"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="annotation-text">
                <div className="selected-text">
                  "{annotation.selectedText.slice(0, 60)}
                  {annotation.selectedText.length > 60 ? '...' : ''}"
                </div>
              </div>
              <div className="annotation-content">
                {annotation.content}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="apply-btn"
                onClick={() => onApply(annotation)}
              >
                应用
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

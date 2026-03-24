/**
 * 批注管理 Hook
 */

import { useState, useCallback } from 'react';
import { Validators } from '../utils/validators.js';

// 生成唯一 ID
const generateId = () => `annotation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export function useAnnotation() {
  const [annotations, setAnnotations] = useState([]);
  const [selectedText, setSelectedText] = useState('');
  const [showAnnotationDialog, setShowAnnotationDialog] = useState(false);
  const [editingAnnotation, setEditingAnnotation] = useState(null);

  // 添加批注
  const addAnnotation = useCallback((annotationData) => {
    const validation = Validators.validateAnnotation(annotationData);
    if (!validation.valid) {
      throw new Error(validation.message);
    }

    const newAnnotation = {
      id: generateId(),
      selectedText: annotationData.selectedText,
      startIndex: annotationData.startIndex || 0,
      endIndex: annotationData.endIndex || annotationData.selectedText.length,
      type: annotationData.type,
      content: annotationData.content,
      scope: annotationData.scope || 'local',
      resolved: false,
      createdAt: Date.now()
    };

    setAnnotations(prev => [...prev, newAnnotation]);
    return newAnnotation;
  }, []);

  // 更新批注
  const updateAnnotation = useCallback((id, updates) => {
    setAnnotations(prev =>
      prev.map(ann => ann.id === id ? { ...ann, ...updates } : ann)
    );
  }, []);

  // 删除批注
  const deleteAnnotation = useCallback((id) => {
    setAnnotations(prev => prev.filter(ann => ann.id !== id));
  }, []);

  // 标记/取消标记为已解决
  const toggleAnnotationResolved = useCallback((id) => {
    setAnnotations(prev =>
      prev.map(ann => ann.id === id ? { ...ann, resolved: !ann.resolved } : ann)
    );
  }, []);

  // 清除所有批注
  const clearAllAnnotations = useCallback(() => {
    setAnnotations([]);
  }, []);

  // 清除已解决的批注
  const clearResolvedAnnotations = useCallback(() => {
    setAnnotations(prev => prev.filter(ann => !ann.resolved));
  }, []);

  // 获取未解决的批注
  const getPendingAnnotations = useCallback(() => {
    return annotations.filter(ann => !ann.resolved);
  }, [annotations]);

  // 获取已解决的批注
  const getResolvedAnnotations = useCallback(() => {
    return annotations.filter(ann => ann.resolved);
  }, [annotations]);

  // 选中文本
  const handleTextSelect = useCallback((e) => {
    const selection = window.getSelection();
    const text = selection.toString().trim();
    if (text.length > 0) {
      const range = selection.getRangeAt(0);
      setSelectedText(text);
      setEditingAnnotation({
        selectedText: text,
        startIndex: range.startOffset,
        endIndex: range.endOffset
      });
      setShowAnnotationDialog(true);
    }
  }, []);

  // 关闭批注对话框
  const closeAnnotationDialog = useCallback(() => {
    setShowAnnotationDialog(false);
    setSelectedText('');
    setEditingAnnotation(null);
  }, []);

  return {
    annotations,
    selectedText,
    showAnnotationDialog,
    editingAnnotation,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    toggleAnnotationResolved,
    clearAllAnnotations,
    clearResolvedAnnotations,
    getPendingAnnotations,
    getResolvedAnnotations,
    handleTextSelect,
    closeAnnotationDialog
  };
}

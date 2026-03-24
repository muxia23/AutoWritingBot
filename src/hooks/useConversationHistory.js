/**
 * 对话历史管理 Hook
 */

import { useState, useCallback, useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage.js';
import { STORAGE_KEYS, FILE_TEMPLATES } from '../utils/constants.js';

// 生成对话 ID
const generateConversationId = () => `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export function useConversationHistory() {
  const [history, setHistory, removeHistory] = useLocalStorage(STORAGE_KEYS.CONVERSATION_HISTORY, []);
  const [currentConversation, setCurrentConversation] = useState(null);

  // 添加新对话
  const addConversation = useCallback((data) => {
    const newConversation = {
      id: generateConversationId(),
      timestamp: Date.now(),
      type: data.type || 'generate',
      input: data.input || {},
      output: data.output || '',
      annotations: data.annotations || [],
      title: data.title || '未命名对话'
    };
    setHistory(prev => [newConversation, ...prev]);
    return newConversation;
  }, [setHistory]);

  // 更新对话
  const updateConversation = useCallback((id, updates) => {
    setHistory(prev =>
      prev.map(conv => conv.id === id ? { ...conv, ...updates } : conv)
    );
  }, [setHistory]);

  // 删除对话
  const deleteConversation = useCallback((id) => {
    setHistory(prev => prev.filter(conv => conv.id !== id));
    if (currentConversation?.id === id) {
      setCurrentConversation(null);
    }
  }, [setHistory, currentConversation]);

  // 清空历史
  const clearHistory = useCallback(() => {
    setHistory([]);
    setCurrentConversation(null);
  }, [setHistory]);

  // 导出历史
  const exportHistory = useCallback((conversationId = null) => {
    const dataToExport = conversationId
      ? history.find(conv => conv.id === conversationId)
      : history;

    if (!dataToExport) return null;

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = FILE_TEMPLATES.history();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return dataToExport;
  }, [history]);

  // 导入历史
  const importHistory = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedData = JSON.parse(e.target.result);
          if (Array.isArray(importedData)) {
            // 导入多个对话
            setHistory(prev => [...importedData, ...prev]);
            resolve(importedData);
          } else if (typeof importedData === 'object' && importedData.id) {
            // 导入单个对话
            setHistory(prev => [importedData, ...prev]);
            resolve([importedData]);
          } else {
            reject(new Error('无效的文件格式'));
          }
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsText(file);
    });
  }, [setHistory]);

  // 设置当前对话
  const selectConversation = useCallback((conversationId) => {
    const conversation = history.find(conv => conv.id === conversationId);
    setCurrentConversation(conversation);
    return conversation;
  }, [history]);

  // 清除当前对话
  const clearCurrentConversation = useCallback(() => {
    setCurrentConversation(null);
  }, []);

  return {
    history,
    currentConversation,
    addConversation,
    updateConversation,
    deleteConversation,
    clearHistory,
    exportHistory,
    importHistory,
    selectConversation,
    clearCurrentConversation
  };
}

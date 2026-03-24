/**
 * 应用全局状态 Context
 */

import { createContext, useContext, useState, useCallback } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import { STORAGE_KEYS, ROUTES } from '../utils/constants.js';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // 模型配置列表：[{ id, name, baseUrl, model, apiKey }]
  const [modelConfigs, setModelConfigs] = useLocalStorage(STORAGE_KEYS.MODEL_CONFIGS, []);
  const [activeModelId, setActiveModelId] = useLocalStorage(STORAGE_KEYS.ACTIVE_MODEL_ID, '');

  // 当前激活的模型（computed）
  const activeModel = modelConfigs.find(m => m.id === activeModelId) || modelConfigs[0] || null;

  // 向后兼容：apiKey
  const apiKey = activeModel?.apiKey || '';

  // 当前标签页
  const [currentTab, setCurrentTab] = useLocalStorage('current_tab', ROUTES.GENERATE);

  // Toast 通知状态
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const clearToast = useCallback(() => setToast(null), []);

  // 添加模型
  const addModelConfig = useCallback((config) => {
    const id = `model-${Date.now()}`;
    const newConfig = { ...config, id };
    setModelConfigs(prev => {
      const next = [...prev, newConfig];
      // 第一个模型自动激活
      if (prev.length === 0) setActiveModelId(id);
      return next;
    });
  }, [setModelConfigs, setActiveModelId]);

  // 更新模型
  const updateModelConfig = useCallback((id, updates) => {
    setModelConfigs(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  }, [setModelConfigs]);

  // 删除模型
  const removeModelConfig = useCallback((id) => {
    setModelConfigs(prev => {
      const next = prev.filter(m => m.id !== id);
      if (activeModelId === id) {
        setActiveModelId(next[0]?.id || '');
      }
      return next;
    });
  }, [setModelConfigs, activeModelId, setActiveModelId]);

  const value = {
    // 模型管理
    modelConfigs,
    activeModelId,
    activeModel,
    setActiveModelId,
    addModelConfig,
    updateModelConfig,
    removeModelConfig,
    // 向后兼容
    apiKey,
    // 全局 UI
    currentTab,
    setCurrentTab,
    toast,
    showToast,
    clearToast
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

/**
 * 提示词管理 Hook
 */

import { useState, useCallback } from 'react';
import { DEFAULT_PROMPT } from '../utils/default-prompt.js';
import { useLocalStorage } from './useLocalStorage.js';
import { STORAGE_KEYS } from '../utils/constants.js';

export function usePrompts() {
  const [customPrompt, setCustomPrompt, removeCustomPrompt] = useLocalStorage(
    STORAGE_KEYS.CUSTOM_PROMPT,
    ''
  );

  // 获取当前激活的提示词内容
  const getCurrentPrompt = useCallback(() => {
    if (customPrompt && customPrompt.trim() !== '') {
      return customPrompt;
    }
    return DEFAULT_PROMPT;
  }, [customPrompt]);

  // 保存自定义提示词内容
  const saveCustomPrompt = useCallback((content) => {
    setCustomPrompt(content);
  }, [setCustomPrompt]);

  // 重置为默认提示词
  const resetToDefault = useCallback(() => {
    removeCustomPrompt();
  }, [removeCustomPrompt]);

  // 检查是否有自定义提示词
  const hasCustomPrompt = useCallback(() => {
    return customPrompt && customPrompt.trim() !== '';
  }, [customPrompt]);

  // 构建 API 系统提示词
  const buildSystemPrompt = useCallback(() => {
    const promptContent = getCurrentPrompt();
    return promptContent;
  }, [getCurrentPrompt]);

  return {
    customPrompt,
    getCurrentPrompt,
    saveCustomPrompt,
    resetToDefault,
    hasCustomPrompt,
    buildSystemPrompt
  };
}

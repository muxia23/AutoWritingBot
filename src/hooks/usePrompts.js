/**
 * 提示词管理 Hook
 */

import { useCallback } from 'react';
import { DEFAULT_PROMPT } from '../utils/default-prompt.js';
import { DEFAULT_STEP_PROMPTS } from '../utils/default-step-prompts.js';
import { useLocalStorage } from './useLocalStorage.js';
import { STORAGE_KEYS } from '../utils/constants.js';

export function usePrompts() {
  const [customPrompt, setCustomPrompt, removeCustomPrompt] = useLocalStorage(
    STORAGE_KEYS.CUSTOM_PROMPT,
    ''
  );

  // Pipeline 各阶段提示词，只存被改过的那些，未改的回落到默认值
  const [customStepPrompts, setCustomStepPrompts] = useLocalStorage(
    STORAGE_KEYS.STEP_PROMPTS,
    {}
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

  // ── Pipeline 阶段提示词 ──────────────────────────

  const getStepPrompt = useCallback((stepId) => {
    const custom = customStepPrompts?.[stepId];
    if (custom && custom.trim() !== '') return custom;
    return DEFAULT_STEP_PROMPTS[stepId] || '';
  }, [customStepPrompts]);

  const saveStepPrompt = useCallback((stepId, content) => {
    setCustomStepPrompts(prev => ({ ...prev, [stepId]: content }));
  }, [setCustomStepPrompts]);

  const resetStepPrompt = useCallback((stepId) => {
    setCustomStepPrompts(prev => {
      const next = { ...prev };
      delete next[stepId];
      return next;
    });
  }, [setCustomStepPrompts]);

  const hasCustomStepPrompt = useCallback((stepId) => {
    const custom = customStepPrompts?.[stepId];
    return Boolean(custom && custom.trim() !== '');
  }, [customStepPrompts]);

  return {
    customPrompt,
    getCurrentPrompt,
    saveCustomPrompt,
    resetToDefault,
    hasCustomPrompt,
    buildSystemPrompt,
    getStepPrompt,
    saveStepPrompt,
    resetStepPrompt,
    hasCustomStepPrompt
  };
}

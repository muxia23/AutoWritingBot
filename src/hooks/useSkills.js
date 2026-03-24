/**
 * Skills 管理 Hook
 */

import { useState, useCallback } from 'react';
import { DEFAULT_SKILLS } from '../utils/default-skills.js';
import { useLocalStorage } from './useLocalStorage.js';
import { STORAGE_KEYS } from '../utils/constants.js';

export function useSkills() {
  const [customSkills, setCustomSkills, removeCustomSkills] = useLocalStorage(
    STORAGE_KEYS.CUSTOM_SKILLS,
    ''
  );

  // 获取当前激活的 skills 内容
  const getCurrentSkills = useCallback(() => {
    if (customSkills && customSkills.trim() !== '') {
      return customSkills;
    }
    return DEFAULT_SKILLS;
  }, [customSkills]);

  // 保存自定义 skills 内容
  const saveCustomSkills = useCallback((content) => {
    setCustomSkills(content);
  }, [setCustomSkills]);

  // 重置为默认 skills
  const resetToDefault = useCallback(() => {
    removeCustomSkills();
  }, [removeCustomSkills]);

  // 检查是否有自定义 skills
  const hasCustomSkills = useCallback(() => {
    return customSkills && customSkills.trim() !== '';
  }, [customSkills]);

  // 构建 API 系统提示词
  const buildSystemPrompt = useCallback(() => {
    const skillsContent = getCurrentSkills();
    return `你是专业的公众号推文撰写专家。请严格按照以下规范撰写推文：\n\n${skillsContent}`;
  }, [getCurrentSkills]);

  return {
    customSkills,
    getCurrentSkills,
    saveCustomSkills,
    resetToDefault,
    hasCustomSkills,
    buildSystemPrompt
  };
}

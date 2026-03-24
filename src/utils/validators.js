/**
 * 表单验证工具
 */

import { ERROR_MESSAGES } from './constants.js';

export const Validators = {
  /**
   * 验证 API Key
   */
  validateApiKey(apiKey) {
    if (!apiKey || apiKey.trim() === '') {
      return { valid: false, message: ERROR_MESSAGES.API_KEY_MISSING };
    }
    if (apiKey.length < 10) {
      return { valid: false, message: ERROR_MESSAGES.API_KEY_INVALID };
    }
    return { valid: true };
  },

  /**
   * 验证生成表单
   */
  validateGenerateForm(formData) {
    const errors = [];

    if (!formData.topic || formData.topic.trim() === '') {
      errors.push('请输入文章主题');
    }

    if (!formData.activityType || formData.activityType.trim() === '') {
      errors.push('请选择活动类型');
    }

    if (!formData.keyPoints || formData.keyPoints.trim() === '') {
      errors.push('请填写关键信息/事件要点');
    }

    if (errors.length > 0) {
      return { valid: false, message: errors.join('；') };
    }

    return { valid: true };
  },

  /**
   * 验证优化表单
   */
  validateOptimizeForm(formData) {
    const errors = [];

    if (!formData.originalText || formData.originalText.trim() === '') {
      errors.push('请输入或粘贴原始文案');
    }

    if (!formData.optimizationType || formData.optimizationType.trim() === '') {
      errors.push('请选择优化方向');
    }

    if (errors.length > 0) {
      return { valid: false, message: errors.join('；') };
    }

    return { valid: true };
  },

  /**
   * 验证提示词内容
   */
  validatePromptContent(content) {
    if (!content || content.trim() === '') {
      return { valid: false, message: ERROR_MESSAGES.PROMPT_EMPTY };
    }
    return { valid: true };
  },

  /**
   * 验证 Skills 内容（保留用于向后兼容）
   */
  validateSkillsContent(content) {
    if (!content || content.trim() === '') {
      return { valid: false, message: ERROR_MESSAGES.PROMPT_EMPTY };
    }
    return { valid: true };
  },

  /**
   * 验证非空字符串
   */
  validateNotEmpty(value, fieldName) {
    if (!value || value.trim() === '') {
      return { valid: false, message: `${fieldName}不能为空` };
    }
    return { valid: true };
  },

  /**
   * 验证批注
   */
  validateAnnotation(annotation) {
    const errors = [];

    if (!annotation.selectedText || annotation.selectedText.trim() === '') {
      errors.push('请先选择需要批注的文本');
    }

    if (!annotation.type) {
      errors.push('请选择批注类型');
    }

    if (!annotation.content || annotation.content.trim() === '') {
      errors.push('请输入批注内容');
    }

    if (errors.length > 0) {
      return { valid: false, message: errors.join('；') };
    }

    return { valid: true };
  }
};

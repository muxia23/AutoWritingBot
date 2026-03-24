/**
 * LLM API 调用封装（OpenAI 兼容接口）
 */

import { ApiService } from './api.js';
import { ERROR_MESSAGES } from '../utils/constants.js';

const DEFAULTS = {
  model: 'deepseek-chat',
  baseUrl: 'https://api.deepseek.com',
  temperature: 0.7,
  maxTokens: 4000
};

export const DeepSeekAPI = {
  /**
   * 核心聊天请求
   * @param {Array} messages - 消息数组
   * @param {Object} modelConfig - { apiKey, baseUrl?, model? }
   */
  async chat(messages, modelConfig) {
    const {
      apiKey,
      baseUrl = DEFAULTS.baseUrl,
      model = DEFAULTS.model
    } = modelConfig || {};

    const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;

    const body = {
      model,
      messages,
      temperature: DEFAULTS.temperature,
      max_tokens: DEFAULTS.maxTokens
    };

    try {
      const response = await ApiService.post(url, body, {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      });
      return response.choices?.[0]?.message?.content || '';
    } catch (error) {
      console.error('LLM API Error:', error);
      if (error.message.includes('401')) throw new Error(ERROR_MESSAGES.API_KEY_INVALID);
      if (error.message.includes('network') || error.message.includes('fetch')) {
        throw new Error(ERROR_MESSAGES.NETWORK_ERROR);
      }
      throw new Error(error.message || ERROR_MESSAGES.API_ERROR);
    }
  },

  /**
   * 生成推文
   */
  async generateArticle(skillsPrompt, userPrompt, modelConfig) {
    const messages = [
      { role: 'system', content: skillsPrompt },
      { role: 'user', content: userPrompt }
    ];
    return this.chat(messages, modelConfig);
  },

  /**
   * 流式多轮对话（推文生成专用）
   * @param {string} systemPrompt
   * @param {Array} messages - 纯对话历史（不含 system）
   * @param {Object} modelConfig
   * @param {function} onChunk - (delta, fullText) => void
   */
  async chatWithHistoryStream(systemPrompt, messages, modelConfig, onChunk) {
    const {
      apiKey,
      baseUrl = DEFAULTS.baseUrl,
      model = DEFAULTS.model
    } = modelConfig || {};

    const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
    const fullMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    const body = {
      model,
      messages: fullMessages,
      temperature: DEFAULTS.temperature,
      max_tokens: DEFAULTS.maxTokens,
      stream: true
    };

    return ApiService.postStream(url, body, {
      'Authorization': `Bearer ${apiKey}`
    }, onChunk);
  },

  /**
   * 支持多轮对话历史的聊天
   */
  async chatWithHistory(systemPrompt, messages, modelConfig) {
    const fullMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];
    return this.chat(fullMessages, modelConfig);
  },

  /**
   * 批量应用批注
   * - 含 rewrite 类型：修改后检查全文连贯性
   * - 仅 fix/style 类型：严格局部修改，其余不变
   */
  async applyAnnotations(skillsPrompt, articleText, annotations, modelConfig) {
    const typeMap = { rewrite: '重写', fix: '修正', style: '润色' };

    const annotationPrompts = annotations.map(ann =>
      `[批注] ${typeMap[ann.type] || ann.type} "${ann.selectedText}"：${ann.content}`
    ).join('\n');

    const hasRewrite = annotations.some(ann => ann.type === 'rewrite');

    const userPrompt = hasRewrite
      ? `请根据以下批注修改推文中的指定内容，修改完成后，检查全文逻辑连贯性，必要时调整相关段落使整体流畅：\n\n${annotationPrompts}\n\n推文内容：\n${articleText}`
      : `请仅根据以下批注修正推文中的指定内容，其他部分严格保持不变，不得额外修改：\n\n${annotationPrompts}\n\n推文内容：\n${articleText}`;

    const messages = [
      { role: 'system', content: skillsPrompt },
      { role: 'user', content: userPrompt }
    ];

    return this.chat(messages, modelConfig);
  },

  /**
   * 应用单个批注
   * - fix/style：仅修正指定段落，其余不变
   * - rewrite：修正后检查全文连贯性
   */
  /**
   * 分析图片内容（Vision API）
   * @param {string} base64 - 图片 base64 数据（不含 data:... 前缀）
   * @param {string} mimeType - 图片 MIME 类型（如 image/jpeg）
   * @param {Object} modelConfig - { apiKey, baseUrl?, model? }
   */
  async analyzeImage(base64, mimeType, modelConfig) {
    const messages = [{
      role: 'user',
      content: [
        { type: 'text', text: '用一两句话简要描述这张图片的活动内容和场景，不超过50字。' },
        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } }
      ]
    }];
    return this.chat(messages, modelConfig);
  },

  async applyInlineAnnotation(systemPrompt, articleContent, annotation, modelConfig) {
    const typeMap = { rewrite: '重写', fix: '修正', style: '润色' };
    const typeLabel = typeMap[annotation.type] || annotation.type;

    const userPrompt = annotation.type === 'rewrite'
      ? `请根据批注重写推文中的指定内容，修改完成后检查全文逻辑连贯性，必要时调整相关段落：\n\n[批注] ${typeLabel} "${annotation.selectedText}"：${annotation.content}\n\n推文内容：\n${articleContent}`
      : `请仅根据批注修正推文中的指定内容，其他部分严格保持不变，不得额外修改：\n\n[批注] ${typeLabel} "${annotation.selectedText}"：${annotation.content}\n\n推文内容：\n${articleContent}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    return this.chat(messages, modelConfig);
  }
};

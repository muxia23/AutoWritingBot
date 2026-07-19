/**
 * LLM API 调用封装（OpenAI 兼容接口）
 */

import { ApiService } from './api.js';
import { ERROR_MESSAGES } from '../utils/constants.js';
import { DEFAULT_STEP_PROMPTS } from '../utils/default-step-prompts.js';

const DEFAULTS = {
  model: 'deepseek-chat',
  baseUrl: 'https://api.deepseek.com',
  temperature: 0.7,
  // deepseek-chat 输出上限 8192；4000 会截断长推文
  maxTokens: 8000
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
      model = DEFAULTS.model,
      temperature = DEFAULTS.temperature,
      maxTokens = DEFAULTS.maxTokens
    } = modelConfig || {};

    const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;

    const body = {
      model,
      messages,
      temperature,
      max_tokens: maxTokens
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
   * 流式多轮对话（推文生成专用）
   * @param {string} systemPrompt
   * @param {Array} messages - 纯对话历史（不含 system）
   * @param {Object} modelConfig
   * @param {function} onChunk - (delta, fullText) => void
   */
  async chatWithHistoryStream(systemPrompt, messages, modelConfig, onChunk, signal) {
    const {
      apiKey,
      baseUrl = DEFAULTS.baseUrl,
      model = DEFAULTS.model,
      temperature = DEFAULTS.temperature,
      maxTokens = DEFAULTS.maxTokens
    } = modelConfig || {};

    const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
    const fullMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    const body = {
      model,
      messages: fullMessages,
      temperature,
      max_tokens: maxTokens,
      stream: true
    };

    return ApiService.postStream(url, body, {
      'Authorization': `Bearer ${apiKey}`
    }, onChunk, signal);
  },

  /**
   * 批量应用批注：规则按条生效——
   * rewrite 允许衔接调整，fix/style 严格局部修改；
   * 每条批注附全文中的前后文位置参考，避免同文多处出现时改错位置
   */
  async applyAnnotations(systemPrompt, articleText, annotations, modelConfig) {
    const typeMap = { rewrite: '重写', fix: '修正', style: '润色' };

    const annotationPrompts = annotations.map(ann => {
      let line = `[批注] ${typeMap[ann.type] || ann.type} "${ann.selectedText}"：${ann.content}`;
      const ctx = locateContext(articleText, ann.selectedText);
      if (ctx) line += `\n  位置参考：…${ctx.before}【批注文字】${ctx.after}…`;
      return line;
    }).join('\n');

    const userPrompt = `请根据以下批注逐条修改推文，每条批注只作用于其指出的位置（有"位置参考"时以该处为准）：
- 「重写」批注：完成修改后可对相邻段落做必要的衔接调整，保持全文连贯
- 「修正」「润色」批注：仅改动批注涉及的文字，其余内容逐字保留

${annotationPrompts}

推文内容：
${articleText}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    return this.chat(messages, modelConfig);
  },

  /**
   * 分析图片内容（Vision API）
   * @param {string} base64 - 图片 base64 数据（不含 data:... 前缀）
   * @param {string} mimeType - 图片 MIME 类型（如 image/jpeg）
   * @param {Object} modelConfig - { apiKey, baseUrl?, model? }
   * @param {string} [prompt] - 识图指令，缺省用默认识图提示词
   */
  async analyzeImage(base64, mimeType, modelConfig, prompt) {
    const messages = [{
      role: 'user',
      content: [
        { type: 'text', text: prompt || DEFAULT_STEP_PROMPTS.imageAnalyze },
        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } }
      ]
    }];
    return this.chat(messages, modelConfig);
  },

  /**
   * 应用单个批注（批量路径的单条特例）
   */
  async applyInlineAnnotation(systemPrompt, articleContent, annotation, modelConfig) {
    return this.applyAnnotations(systemPrompt, articleContent, [annotation], modelConfig);
  }
};

/**
 * 在全文中定位选中文字，返回前后各 30 字作为位置锚点。
 * 找不到（如正文在批注后被手动编辑过）或没有前后文时返回 null。
 * 同文多处出现时锚定首次出现——与旧行为一致，但至少给了模型一个明确参照。
 */
function locateContext(articleText, selectedText) {
  const idx = articleText.indexOf(selectedText);
  if (idx === -1) return null;
  const before = articleText.slice(Math.max(0, idx - 30), idx).replace(/\n+/g, ' ');
  const after = articleText.slice(idx + selectedText.length, idx + selectedText.length + 30).replace(/\n+/g, ' ');
  if (!before && !after) return null;
  return { before, after };
}

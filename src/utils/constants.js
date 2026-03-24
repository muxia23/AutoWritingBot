/**
 * 常量定义文件
 */

// 固定人名列表（按 skills 定义的顺序）
export const FIXED_PERSONS = [
  { id: 'fangjie', name: '常务副院长方捷', gender: 'male' },
  { id: 'wengsuiping', name: '党委书记翁穗平', gender: 'female' },
  { id: 'wangtao', name: '党委副书记王涛', gender: 'female' },
  { id: 'huangcaijin', name: '副院长黄彩进', gender: 'male' },
  { id: 'counselor', name: '辅导员', gender: '', canCustom: true }
];

// 活动类型选项
export const ACTIVITY_TYPES = [
  '参观',
  '座谈',
  '讲座',
];

// 批注类型
export const ANNOTATION_TYPES = [
  { value: 'rewrite', label: '重写', icon: 'RefreshCw' },
  { value: 'fix', label: '修正', icon: 'CheckCircle' },
  { value: 'style', label: '润色', icon: 'Palette' }
];

// 修改范围
export const MODIFICATION_SCOPE = [
  { value: 'local', label: '局部修改', description: '仅修改标注的部分' },
  { value: 'global', label: '全局优化', description: '根据批注修改后，重新检查整篇文章' }
];

// 错误消息
export const ERROR_MESSAGES = {
  API_KEY_MISSING: '请先配置 DeepSeek API Key',
  API_KEY_INVALID: 'API Key 无效，请检查后重试',
  NETWORK_ERROR: '网络连接失败，请检查网络设置',
  API_ERROR: 'API 调用失败',
  GENERATION_FAILED: '生成失败，请重试',
  VALIDATION_FAILED: '请填写必要的输入信息',
  PROMPT_EMPTY: '提示词内容不能为空',
  IMAGE_ANALYZE_FAILED: '图片识别失败，请确认当前模型支持视觉能力（如 GPT-4o）'
};

// 成功消息
export const SUCCESS_MESSAGES = {
  API_KEY_SAVED: 'API Key 已保存',
  ARTICLE_GENERATED: '推文生成成功',
  ARTICLE_OPTIMIZED: '推文优化成功',
  PROMPT_SAVED: '提示词内容已保存',
  PROMPT_RESET: '提示词已恢复默认设置',
  COPIED: '已复制到剪贴板',
  DOWNLOADED: '文件已下载',
  ANNOTATION_ADDED: '批注已添加',
  ANNOTATION_DELETED: '批注已删除',
  HISTORY_EXPORTED: '对话历史已导出',
  HISTORY_IMPORTED: '对话历史已导入',
  VERSION_RESTORED: '版本已恢复',
  IMAGE_ANALYZED: '图片识别完成',
  IMAGE_UPLOADED: '图片上传成功'
};

// API 状态
export const API_STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error'
};

// 文件名模板
export const FILE_TEMPLATES = {
  article: (date, title) => `${date}_${title.slice(0, 20)}.md`,
  history: () => `conversation_history_${new Date().toISOString().split('T')[0]}.json`
};

// 预设模型（OpenAI 兼容接口）
export const PRESET_MODELS = [
  { name: 'DeepSeek Chat',    baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat' },
  { name: 'DeepSeek Reasoner',baseUrl: 'https://api.deepseek.com', model: 'deepseek-reasoner' },
  { name: 'GPT-4o',           baseUrl: 'https://api.openai.com',   model: 'gpt-4o' },
  { name: 'GPT-4o Mini',      baseUrl: 'https://api.openai.com',   model: 'gpt-4o-mini' },
  { name: 'Claude 3.5 Sonnet (兼容)',  baseUrl: 'https://api.anthropic.com/v1', model: 'claude-sonnet-4-5' },
  { name: '自定义',            baseUrl: '', model: '' }
];

// 存储键名
export const STORAGE_KEYS = {
  API_KEY: 'deepseek_api_key',
  CUSTOM_PROMPT: 'custom_prompt',
  CONVERSATION_HISTORY: 'conversation_history',
  USER_PREFERENCES: 'user_preferences',
  MODEL_CONFIGS: 'model_configs',
  ACTIVE_MODEL_ID: 'active_model_id',
  IMAGE_LIBRARY: 'image_library'
};

// 路由路径
export const ROUTES = {
  CHAT: '/chat',
  OPTIMIZE: '/optimize',
  PROMPT: '/prompt',
  IMAGES: '/images'
};

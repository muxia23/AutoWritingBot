/**
 * 常量定义文件
 */

// 固定人名列表（按 skills 定义的顺序）
export const FIXED_PERSONS = [
  { id: 'fangjie', name: '常务副院长方捷', gender: 'male' },
  { id: 'wengsuiping', name: '党委书记翁穗平', gender: 'female' },
  { id: 'wangtao', name: '党委副书记王涛', gender: 'female' },
  { id: 'huangcaijin', name: '副院长黄彩进', gender: 'male' },
  { id: 'liuxinyi', name: '院团委书记刘歆一', gender: 'female' },
  { id: 'yangyang', name: '辅导员杨洋', gender: 'male' },
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

// 错误消息
export const ERROR_MESSAGES = {
  API_KEY_MISSING: '请先配置 DeepSeek API Key',
  API_KEY_INVALID: 'API Key 无效，请检查后重试',
  NETWORK_ERROR: '网络连接失败，请检查网络设置',
  API_ERROR: 'API 调用失败',
  VALIDATION_FAILED: '请填写必要的输入信息',
  PROMPT_EMPTY: '提示词内容不能为空',
  IMAGE_ANALYZE_FAILED: '图片识别失败，请确认当前模型支持视觉能力（如 GPT-4o）'
};

// 成功消息
export const SUCCESS_MESSAGES = {
  ARTICLE_OPTIMIZED: '推文优化成功',
  PROMPT_SAVED: '提示词内容已保存',
  PROMPT_RESET: '提示词已恢复默认设置',
  COPIED: '已复制到剪贴板',
  DOWNLOADED: '文件已下载',
  ANNOTATION_ADDED: '批注已添加',
  IMAGE_ANALYZED: '图片识别完成',
  IMAGE_UPLOADED: '图片上传成功'
};

// 文件名模板
export const FILE_TEMPLATES = {
  article: (date, title) => `${date}_${title.slice(0, 20)}.md`,
  history: () => `对话历史_全部_${new Date().toISOString().split('T')[0]}.json`,
  // 单条记录：用标题做文件名，剥掉文件系统不接受的字符
  conversation: (title) => {
    const safe = (title || '未命名推文').replace(/[\\/:*?"<>|]/g, '').trim().slice(0, 40);
    return `${safe || '未命名推文'}_${new Date().toISOString().split('T')[0]}.json`;
  }
};

// 预设模型（OpenAI 兼容接口）
// OpenAI/Anthropic 官方接口不允许浏览器跨域直连，预设走本站的 nginx/vite 代理路径
export const PRESET_MODELS = [
  { name: 'DeepSeek Chat',    baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat' },
  { name: 'DeepSeek Reasoner',baseUrl: 'https://api.deepseek.com', model: 'deepseek-reasoner' },
  { name: 'GPT-4o',           baseUrl: '/openai-proxy/v1',   model: 'gpt-4o' },
  { name: 'GPT-4o Mini',      baseUrl: '/openai-proxy/v1',   model: 'gpt-4o-mini' },
  { name: 'Claude Sonnet 4.5 (兼容)',  baseUrl: '/anthropic-proxy/v1', model: 'claude-sonnet-4-5' },
  { name: '自定义',            baseUrl: '', model: '' }
];

// 存储键名
export const STORAGE_KEYS = {
  CUSTOM_PROMPT: 'custom_prompt',
  STEP_PROMPTS: 'step_prompts',
  CONVERSATION_HISTORY: 'conversation_history',
  MODEL_CONFIGS: 'model_configs',
  ACTIVE_MODEL_ID: 'active_model_id',
  IMAGE_LIBRARY: 'image_library'
};

// 路由路径
export const ROUTES = {
  CHAT: '/chat',
  PROMPT: '/prompt',
  IMAGES: '/images'
};

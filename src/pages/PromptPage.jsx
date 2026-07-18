/**
 * 提示词编辑页面
 *
 * 覆盖 pipeline 全部 4 个阶段：
 * 「生成初稿」用主提示词，其余 3 个阶段各有独立提示词。
 */

import { useState, useEffect } from 'react';
import { RotateCcw, X, Save, Image as ImageIcon, MessageSquareText } from 'lucide-react';
import Button from '../components/form/Button.jsx';
import { usePromptContext } from '../context/PromptContext.jsx';
import { useApp } from '../context/AppContext.jsx';
import { SUCCESS_MESSAGES } from '../utils/constants.js';
import { Validators } from '../utils/validators.js';
import { DEFAULT_PROMPT } from '../utils/default-prompt.js';
import { STEP_PROMPT_META, TOOL_PROMPT_META, DEFAULT_STEP_PROMPTS } from '../utils/default-step-prompts.js';

// 按 pipeline 实际执行顺序排列，主提示词是第 2 步「生成初稿」
const TABS = [
  STEP_PROMPT_META[0],
  { id: 'main', name: '生成初稿', description: '第 2 步：推文写作的主提示词，决定文章结构与文风' },
  STEP_PROMPT_META[1],
  STEP_PROMPT_META[2],
];

// 独立工具提示词（不属于 pipeline 流程），标签用图标代替步骤序号
const TOOL_ICONS = { imageAnalyze: ImageIcon, annotation: MessageSquareText };
const ALL_TABS = [...TABS, ...TOOL_PROMPT_META];

export default function PromptPage() {
  const {
    customPrompt, saveCustomPrompt, resetToDefault, hasCustomPrompt,
    getStepPrompt, saveStepPrompt, resetStepPrompt, hasCustomStepPrompt,
  } = usePromptContext();
  const { showToast } = useApp();

  const [activeTab, setActiveTab] = useState('main');
  const [content, setContent] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  const isMain = activeTab === 'main';
  const activeMeta = ALL_TABS.find(t => t.id === activeTab);

  const savedValue = isMain ? (customPrompt || DEFAULT_PROMPT) : getStepPrompt(activeTab);
  const defaultValue = isMain ? DEFAULT_PROMPT : DEFAULT_STEP_PROMPTS[activeTab];
  const isCustomized = isMain ? hasCustomPrompt() : hasCustomStepPrompt(activeTab);

  // 切换标签或外部值变化时同步编辑区
  useEffect(() => {
    setContent(savedValue);
    setHasChanges(false);
  }, [activeTab, savedValue]);

  const switchTab = (id) => {
    if (id === activeTab) return;
    if (hasChanges && !confirm('当前标签有未保存的更改，切换后将丢失。确定继续吗？')) return;
    setActiveTab(id);
  };

  const handleChange = (e) => {
    setContent(e.target.value);
    setHasChanges(true);
  };

  const handleSave = () => {
    const validation = Validators.validatePromptContent(content);
    if (!validation.valid) {
      showToast(validation.message, 'error');
      return;
    }
    if (isMain) saveCustomPrompt(content);
    else saveStepPrompt(activeTab, content);
    setHasChanges(false);
    showToast(SUCCESS_MESSAGES.PROMPT_SAVED);
  };

  const handleReset = () => {
    if (!confirm(`确定要将「${activeMeta.name}」恢复为默认提示词吗？当前的自定义内容将被删除。`)) return;
    if (isMain) resetToDefault();
    else resetStepPrompt(activeTab);
    setContent(defaultValue);
    setHasChanges(false);
    showToast(SUCCESS_MESSAGES.PROMPT_RESET);
  };

  const handleCancel = () => {
    if (hasChanges && !confirm('您有未保存的更改，确定要取消吗？')) return;
    setContent(savedValue);
    setHasChanges(false);
  };

  return (
    <div className="panel-container full-width">
      <div className="prompt-editor-container">
        <h2 className="section-title">提示词内容编辑</h2>
        <p className="section-desc">
          推文生成分 4 个阶段依次执行，每个阶段使用各自的提示词；分隔线右侧是图片识别与批注修改的独立工具提示词。修改后立即对下一次使用生效。
        </p>

        <div className="prompt-tabs" role="tablist">
          {TABS.map((tab, i) => {
            const customized = tab.id === 'main' ? hasCustomPrompt() : hasCustomStepPrompt(tab.id);
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`prompt-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => switchTab(tab.id)}
              >
                <span className="prompt-tab-index">{i + 1}</span>
                <span className="prompt-tab-name">{tab.name}</span>
                {customized && <span className="prompt-tab-dot" title="已自定义" />}
              </button>
            );
          })}
          <span className="prompt-tabs-divider" aria-hidden="true" />
          {TOOL_PROMPT_META.map((tab) => {
            const Icon = TOOL_ICONS[tab.id];
            const customized = hasCustomStepPrompt(tab.id);
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`prompt-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => switchTab(tab.id)}
              >
                <span className="prompt-tab-index"><Icon size={11} /></span>
                <span className="prompt-tab-name">{tab.name}</span>
                {customized && <span className="prompt-tab-dot" title="已自定义" />}
              </button>
            );
          })}
        </div>

        <p className="prompt-tab-desc">{activeMeta.description}</p>

        <div className="editor-toolbar">
          {isCustomized && (
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw size={16} />
              恢复默认
            </Button>
          )}
          <div className="toolbar-spacer"></div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {hasChanges && (
              <span className="unsaved-indicator">
                <span className="unsaved-dot"></span>
                有未保存的更改
              </span>
            )}
            <Button variant="secondary" size="sm" onClick={handleCancel} disabled={!hasChanges}>
              <X size={16} />
              取消
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!hasChanges}>
              <Save size={16} />
              保存
            </Button>
          </div>
        </div>

        <textarea
          className="prompt-editor"
          value={content}
          onChange={handleChange}
          placeholder="请输入提示词内容..."
          spellCheck={false}
        />
      </div>
    </div>
  );
}

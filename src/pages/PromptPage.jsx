/**
 * 提示词编辑页面
 */

import { useState, useEffect } from 'react';
import { RotateCcw, X, Save } from 'lucide-react';
import Button from '../components/form/Button.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { usePromptContext } from '../context/PromptContext.jsx';
import { useApp } from '../context/AppContext.jsx';
import { SUCCESS_MESSAGES } from '../utils/constants.js';
import { Validators } from '../utils/validators.js';
import { DEFAULT_PROMPT } from '../utils/default-prompt.js';

export default function PromptPage() {
  const { customPrompt, saveCustomPrompt, resetToDefault, hasCustomPrompt } = usePromptContext();
  const { showToast } = useApp();

  const [content, setContent] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setContent(customPrompt || DEFAULT_PROMPT);
  }, [customPrompt]);

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

    saveCustomPrompt(content);
    setHasChanges(false);
    showToast(SUCCESS_MESSAGES.PROMPT_SAVED);
  };

  const handleReset = () => {
    if (confirm('确定要恢复为默认提示词内容吗？当前的自定义内容将被删除。')) {
      resetToDefault();
      setContent(DEFAULT_PROMPT);
      setHasChanges(false);
      showToast(SUCCESS_MESSAGES.PROMPT_RESET);
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      if (confirm('您有未保存的更改，确定要取消吗？')) {
        setContent(customPrompt || DEFAULT_PROMPT);
        setHasChanges(false);
      }
    } else {
      setContent(customPrompt || DEFAULT_PROMPT);
    }
  };

  return (
    <div className="panel-container full-width">
      <div className="prompt-editor-container">
        <h2 className="section-title">提示词内容编辑</h2>
        <p className="section-desc">编辑用于生成和优化推文的系统提示词内容</p>

        <div className="editor-toolbar">
          {hasCustomPrompt() && (
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

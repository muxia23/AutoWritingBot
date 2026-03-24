/**
 * Skills 编辑页面
 */

import { useState, useEffect } from 'react';
import { RotateCcw, X, Save } from 'lucide-react';
import Button from '../components/form/Button.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { useSkillsContext } from '../context/SkillsContext.jsx';
import { useApp } from '../context/AppContext.jsx';
import { SUCCESS_MESSAGES } from '../utils/constants.js';
import { Validators } from '../utils/validators.js';
import { DEFAULT_SKILLS } from '../utils/default-skills.js';

export default function SkillsPage() {
  const { customSkills, saveCustomSkills, resetToDefault, hasCustomSkills } = useSkillsContext();
  const { showToast } = useApp();

  const [content, setContent] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setContent(customSkills || DEFAULT_SKILLS);
  }, [customSkills]);

  const handleChange = (e) => {
    setContent(e.target.value);
    setHasChanges(true);
  };

  const handleSave = () => {
    const validation = Validators.validateSkillsContent(content);
    if (!validation.valid) {
      showToast(validation.message, 'error');
      return;
    }

    saveCustomSkills(content);
    setHasChanges(false);
    showToast(SUCCESS_MESSAGES.SKILLS_SAVED);
  };

  const handleReset = () => {
    if (confirm('确定要恢复为默认 Skills 内容吗？当前的自定义内容将被删除。')) {
      resetToDefault();
      setContent(DEFAULT_SKILLS);
      setHasChanges(false);
      showToast(SUCCESS_MESSAGES.SKILLS_RESET);
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      if (confirm('您有未保存的更改，确定要取消吗？')) {
        setContent(customSkills || DEFAULT_SKILLS);
        setHasChanges(false);
      }
    } else {
      setContent(customSkills || DEFAULT_SKILLS);
    }
  };

  return (
    <div className="panel-container full-width">
      <div className="skills-editor-container">
        <h2 className="section-title">Skills 内容编辑</h2>
        <p className="section-desc">编辑用于生成和优化推文的系统提示词内容</p>

        <div className="editor-toolbar">
          {hasCustomSkills() && (
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
          className="skills-editor"
          value={content}
          onChange={handleChange}
          placeholder="请输入 Skills 内容..."
          spellCheck={false}
        />
      </div>
    </div>
  );
}

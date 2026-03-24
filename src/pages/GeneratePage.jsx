/**
 * 推文生成页面
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Download } from 'lucide-react';
import Input from '../components/form/Input.jsx';
import TextArea from '../components/form/TextArea.jsx';
import Select from '../components/form/Select.jsx';
import Checkbox from '../components/form/Checkbox.jsx';
import Button from '../components/form/Button.jsx';
import Loading from '../components/common/Loading.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { useApp } from '../context/AppContext.jsx';
import { useSkillsContext } from '../context/SkillsContext.jsx';
import { useDeepSeekAPI } from '../hooks/useDeepSeekAPI.js';
import { useConversationHistory } from '../hooks/useConversationHistory.js';
import { FIXED_PERSONS, ACTIVITY_TYPES, SUCCESS_MESSAGES } from '../utils/constants.js';
import { Formatters } from '../utils/formatters.js';
import { Validators } from '../utils/validators.js';

const OPTIMIZATION_OPTIONS = [
  { value: 'comprehensive', label: '全面优化' },
  { value: 'checkNames', label: '检查和修正人名顺序' },
  { value: 'adjustStyle', label: '调整语言风格为正式书面语' },
  { value: 'improveStructure', label: '完善推文结构' },
  { value: 'fixPronouns', label: '优化人称和代词使用' }
];

export default function GeneratePage() {
  const navigate = useNavigate();
  const { apiKey, showToast } = useApp();
  const { buildSystemPrompt } = useSkillsContext();
  const { generateArticle, isLoading } = useDeepSeekAPI();
  const { addConversation } = useConversationHistory();

  const [formData, setFormData] = useState({
    topic: '',
    activityType: '',
    time: '',
    location: '',
    persons: [],
    targetAudience: '',
    keyPoints: '',
    imageDescription: '',
    additionalNotes: ''
  });

  const [customCounselorName, setCustomCounselorName] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [viewMode, setViewMode] = useState('preview');

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePersonToggle = (personId) => {
    setFormData(prev => {
      const currentPersons = prev.persons || [];
      const isSelected = currentPersons.includes(personId);
      const newPersons = isSelected
        ? currentPersons.filter(id => id !== personId)
        : [...currentPersons, personId];
      return { ...prev, persons: newPersons };
    });
  };

  const handleGenerate = async () => {
    const validation = Validators.validateGenerateForm(formData);
    if (!validation.valid) {
      showToast(validation.message, 'error');
      return;
    }

    if (!apiKey) {
      showToast('请先配置 DeepSeek API Key', 'error');
      return;
    }

    const skillsPrompt = buildSystemPrompt();

    // 构建生成提示词
    const personsText = Formatters.formatSelectedPersons(
      formData.persons.map(id => FIXED_PERSONS.find(p => p.id === id)),
      customCounselorName
    );

    let userPrompt = `请根据以下信息生成一篇公众号推文：

主题：${formData.topic}
活动类型：${formData.activityType}`;

    if (formData.time) userPrompt += `\n时间：${formData.time}`;
    if (formData.location) userPrompt += `\n地点：${formData.location}`;
    if (personsText) userPrompt += `\n参与领导：${personsText}`;
    if (formData.targetAudience) userPrompt += `\n活动对象：${formData.targetAudience}`;
    if (formData.keyPoints) userPrompt += `\n关键信息/事件要点：\n${formData.keyPoints}`;
    if (formData.imageDescription) userPrompt += `\n图片描述：${formData.imageDescription}`;
    if (formData.additionalNotes) userPrompt += `\n额外说明：${formData.additionalNotes}`;

    try {
      const result = await generateArticle(skillsPrompt, userPrompt, apiKey);
      setGeneratedContent(result);
      showToast(SUCCESS_MESSAGES.ARTICLE_GENERATED);

      // 保存到对话历史
      addConversation({
        type: 'generate',
        input: formData,
        output: result,
        title: formData.topic
      });
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedContent);
    showToast(SUCCESS_MESSAGES.COPIED);
  };

  const handleDownload = () => {
    const blob = new Blob([generatedContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = Formatters.generateFileName(formData.topic);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(SUCCESS_MESSAGES.DOWNLOADED);
  };

  const handleContinueEdit = () => {
    navigate('/editor', { state: { content: generatedContent, title: formData.topic } });
  };

  if (isLoading) {
    return (
      <div className="panel-container">
        <Loading text="正在生成推文..." />
      </div>
    );
  }

  return (
    <div className="panel-container">
      <div className="input-section">
        <h2 className="section-title">生成参数</h2>

        <Input
          id="article-topic"
          label="文章主题"
          required
          placeholder="请输入文章主题"
          value={formData.topic}
          onChange={(e) => handleInputChange('topic', e.target.value)}
        />

        <div className="form-row">
          <Select
            id="activity-type"
            label="活动类型"
            required
            placeholder="请选择活动类型"
            value={formData.activityType}
            onChange={(e) => handleInputChange('activityType', e.target.value)}
            options={ACTIVITY_TYPES.map(type => ({ value: type, label: type }))}
          />
          <Input
            id="article-time"
            label="时间"
            placeholder="如：2024年3月15日"
            value={formData.time}
            onChange={(e) => handleInputChange('time', e.target.value)}
          />
        </div>

        <Input
          id="article-location"
          label="地点"
          placeholder="请输入活动地点"
          value={formData.location}
          onChange={(e) => handleInputChange('location', e.target.value)}
        />

        <div className="form-group">
          <label>参与领导（按固定顺序）</label>
          <div className="persons-container">
            {FIXED_PERSONS.map(person => (
              <Checkbox
                key={person.id}
                id={`person-${person.id}`}
                label={person.name}
                checked={formData.persons?.includes(person.id)}
                onChange={() => handlePersonToggle(person.id)}
              />
            ))}
          </div>
          {formData.persons?.includes('counselor') && (
            <Input
              id="counselor-name"
              placeholder="请输入辅导员姓名（可选）"
              value={customCounselorName}
              onChange={(e) => setCustomCounselorName(e.target.value)}
            />
          )}
        </div>

        <Input
          id="target-audience"
          label="活动对象"
          placeholder="如：学院师生、学生代表"
          value={formData.targetAudience}
          onChange={(e) => handleInputChange('targetAudience', e.target.value)}
        />

        <TextArea
          id="key-points"
          label="关键信息/事件要点"
          required
          placeholder="请描述活动的关键信息、事件要点等..."
          value={formData.keyPoints}
          onChange={(e) => handleInputChange('keyPoints', e.target.value)}
          rows={5}
        />

        <TextArea
          id="image-description"
          label="图片描述（可选）"
          placeholder="请描述图片内容，用于生成图文排版建议..."
          value={formData.imageDescription}
          onChange={(e) => handleInputChange('imageDescription', e.target.value)}
          rows={3}
        />

        <TextArea
          id="additional-notes"
          label="额外说明（可选）"
          placeholder="其他需要补充的信息..."
          value={formData.additionalNotes}
          onChange={(e) => handleInputChange('additionalNotes', e.target.value)}
          rows={2}
        />

        <Button
          className="btn-lg btn-full"
          onClick={handleGenerate}
          loading={isLoading}
        >
          生成推文
        </Button>
      </div>

      <div className="output-section">
        <h2 className="section-title">生成结果</h2>
        {!generatedContent ? (
          <EmptyState
            icon="default"
            title="暂无生成结果"
            description="生成结果将显示在这里"
          />
        ) : (
          <>
            <div className="output-toolbar">
              <div className="view-toggle">
                <button
                  className={`view-btn ${viewMode === 'preview' ? 'active' : ''}`}
                  onClick={() => setViewMode('preview')}
                >
                  预览
                </button>
                <button
                  className={`view-btn ${viewMode === 'raw' ? 'active' : ''}`}
                  onClick={() => setViewMode('raw')}
                >
                  原文
                </button>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button variant="secondary" size="sm" onClick={handleCopy}>
                  <Copy size={14} />
                  复制
                </Button>
                <Button variant="secondary" size="sm" onClick={handleDownload}>
                  <Download size={14} />
                  下载
                </Button>
              </div>
            </div>
            <div className="output-view">
              {viewMode === 'preview' ? (
                <div
                  className="output-preview markdown-preview"
                  dangerouslySetInnerHTML={{ __html: generatedContent }}
                />
              ) : (
                <textarea
                  className="output-text"
                  value={generatedContent}
                  onChange={(e) => setGeneratedContent(e.target.value)}
                />
              )}
            </div>
            <div style={{ padding: '1.5rem', borderTop: '1px solid #e8e8e8' }}>
              <Button className="btn-lg btn-full" onClick={handleContinueEdit}>
                继续编辑（批注功能）
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

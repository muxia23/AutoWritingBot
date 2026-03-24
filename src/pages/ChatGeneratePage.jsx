/**
 * 推文生成页面 - Pipeline 工作流模式
 * 左侧：配置 + Pipeline状态（30%）| 右侧：Canvas编辑器（70%）
 */

import { useState, useRef } from 'react';
import { Send, RotateCcw, Plus, X, GripVertical, ChevronDown, ChevronUp, ImageIcon, FileSearch, Square } from 'lucide-react';
import CanvasEditor from '../components/canvas/CanvasEditor.jsx';
import Button from '../components/form/Button.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import ImagePickerModal from '../components/images/ImagePickerModal.jsx';
import ArticleRefModal from '../components/chat/ArticleRefModal.jsx';
import PipelinePanel from '../components/pipeline/PipelinePanel.jsx';
import { useApp } from '../context/AppContext.jsx';
import { usePromptContext } from '../context/PromptContext.jsx';
import { useConversation } from '../hooks/useConversation.js';
import { usePipeline } from '../hooks/usePipeline.js';
import { FIXED_PERSONS, ACTIVITY_TYPES, ERROR_MESSAGES } from '../utils/constants.js';

export default function ChatGeneratePage() {
  const { activeModel, modelConfigs, activeModelId, setActiveModelId, showToast } = useApp();
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const { buildSystemPrompt } = usePromptContext();
  const {
    currentArticle,
    currentTitle,
    setCurrentTitle,
    setCurrentArticle,
    clearConversation,
  } = useConversation();

  const [userInput, setUserInput] = useState('');
  const [selectedActivityType, setSelectedActivityType] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [articleRefs, setArticleRefs] = useState([]);
  const [showArticleRefModal, setShowArticleRefModal] = useState(false);

  // 有序领导列表
  const [orderedPersons, setOrderedPersons] = useState([]);
  const [customPersonInput, setCustomPersonInput] = useState('');
  const [showPersonInput, setShowPersonInput] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const dragIndexRef = useRef(null);

  const [activityExpanded, setActivityExpanded] = useState(true);
  const [personsExpanded, setPersonsExpanded] = useState(true);

  const { steps, isRunning, currentStepId, isDone, runPipeline, abort, resetSteps } = usePipeline({
    buildSystemPrompt,
    activeModel,
    setCurrentArticle,
    setCurrentTitle,
    showToast,
  });

  // ── 领导管理 ──────────────────────────────────────

  const handlePersonToggle = (person) => {
    setOrderedPersons(prev => {
      const exists = prev.find(p => p.id === person.id);
      if (exists) return prev.filter(p => p.id !== person.id);
      return [...prev, { id: person.id, name: person.name, isCustom: false }];
    });
  };

  const handleAddCustomPerson = () => {
    const name = customPersonInput.trim();
    if (!name) return;
    if (orderedPersons.some(p => p.name === name)) return;
    setOrderedPersons(prev => [...prev, { id: `custom-${Date.now()}`, name, isCustom: true }]);
    setCustomPersonInput('');
    setShowPersonInput(false);
  };

  const handleRemovePerson = (id) => {
    setOrderedPersons(prev => prev.filter(p => p.id !== id));
  };

  const handleDragStart = (index) => { dragIndexRef.current = index; };
  const handleDragOver = (e, index) => { e.preventDefault(); setDragOverIndex(index); };
  const handleDrop = (index) => {
    const from = dragIndexRef.current;
    if (from !== null && from !== index) {
      setOrderedPersons(prev => {
        const next = [...prev];
        const [item] = next.splice(from, 1);
        next.splice(index, 0, item);
        return next;
      });
    }
    setDragOverIndex(null);
    dragIndexRef.current = null;
  };

  // ── 构建完整输入 ────────────────────────────────────

  const buildFullInput = () => {
    let base = '';
    if (selectedActivityType) base += `活动类型：${selectedActivityType}\n`;
    if (orderedPersons.length > 0) {
      base += `参与领导（按此顺序在推文中出现）：${orderedPersons.map(p => p.name).join('、')}\n`;
    }
    if (userInput.trim()) base += userInput.trim();

    const imagesWithDesc = selectedImages.filter(img => img.description?.trim());
    const imageBlock = imagesWithDesc.length > 0
      ? `\n\n【活动图片信息，请根据内容在推文对应段落后标注插图位置「📷 插图：图片N」】\n` +
        imagesWithDesc.map((img, i) => `图片${i + 1}（${img.name}）：${img.description.trim()}`).join('\n')
      : '';

    const refBlock = articleRefs.length > 0
      ? '\n\n【参考推文（请学习其写作风格、结构和表达方式，但不要照搬内容）】\n' +
        articleRefs.map((ref, i) => `参考${i + 1}《${ref.title || '无标题'}》：\n${ref.content}`).join('\n\n')
      : '';

    return base + imageBlock + refBlock;
  };

  // ── 开始生成 ───────────────────────────────────────

  const handleStartPipeline = () => {
    const fullInput = buildFullInput();
    if (!fullInput.trim()) {
      showToast(ERROR_MESSAGES.VALIDATION_FAILED, 'error');
      return;
    }
    runPipeline({ fullInput });
  };

  const handleClear = () => {
    if (!isRunning && (steps.some(s => s.status !== 'pending') || currentArticle)) {
      if (!confirm('确定要清空当前内容吗？')) return;
    }
    if (isRunning) abort();
    resetSteps();
    clearConversation();
    setSelectedActivityType('');
    setOrderedPersons([]);
    setUserInput('');
    setSelectedImages([]);
    setArticleRefs([]);
  };

  const handleQuickOptionClick = (type) => {
    setSelectedActivityType(type);
  };

  return (
    <div className="chat-page">
      {/* 左侧面板（30%） */}
      <div className="chat-sidebar">
        <div className="chat-sidebar-header">
          <h3 className="sidebar-title">推文生成</h3>
          <div className="sidebar-actions">
            <Button variant="outline" size="sm" onClick={handleClear}>
              <RotateCcw size={14} />
              清空
            </Button>
          </div>
        </div>

        {/* 可滚动区域（模型、活动类型、参与领导） */}
        <div className="chat-sidebar-scroll">

        {/* 模型选择器 */}
        <div className="model-selector-bar">
          {modelConfigs.length === 0 ? (
            <span className="model-selector-hint">请先在「模型管理」中添加模型</span>
          ) : (
            <div className="model-selector-wrap">
              <button
                className="model-selector-btn"
                onClick={() => setShowModelDropdown(v => !v)}
              >
                <span className="model-selector-dot" />
                <span className="model-selector-name">{activeModel?.name || '选择模型'}</span>
                <ChevronDown size={12} />
              </button>
              {showModelDropdown && (
                <div className="model-selector-dropdown">
                  {modelConfigs.map(m => (
                    <button
                      key={m.id}
                      className={`model-dropdown-item ${m.id === activeModelId ? 'active' : ''}`}
                      onClick={() => { setActiveModelId(m.id); setShowModelDropdown(false); }}
                    >
                      <span className="model-dropdown-name">{m.name}</span>
                      <span className="model-dropdown-id">{m.model}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 活动类型 */}
        <div className="quick-options">
          <div className="quick-option-label collapsible" onClick={() => setActivityExpanded(v => !v)}>
            活动类型
            {selectedActivityType && !activityExpanded && (
              <span className="collapsed-summary">{selectedActivityType}</span>
            )}
            <span className="collapse-toggle">{activityExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}</span>
          </div>
          {activityExpanded && (
            <>
              <div className="quick-option-buttons">
                {ACTIVITY_TYPES.map(type => (
                  <button
                    key={type}
                    className={`quick-option-btn ${selectedActivityType === type ? 'active' : ''}`}
                    onClick={() => setSelectedActivityType(selectedActivityType === type ? '' : type)}
                  >
                    {type}
                  </button>
                ))}
              </div>
              <input
                className="activity-type-input"
                value={ACTIVITY_TYPES.includes(selectedActivityType) ? '' : selectedActivityType}
                onChange={e => setSelectedActivityType(e.target.value)}
                onFocus={() => {
                  if (ACTIVITY_TYPES.includes(selectedActivityType)) setSelectedActivityType('');
                }}
                placeholder="或自定义输入活动类型..."
              />
            </>
          )}
        </div>

        {/* 参与领导 */}
        <div className="quick-options">
          <div className="quick-option-label collapsible" onClick={() => setPersonsExpanded(v => !v)}>
            参与领导
            {orderedPersons.length > 0 && personsExpanded && (
              <span className="persons-order-hint">拖动可调整顺序</span>
            )}
            {orderedPersons.length > 0 && !personsExpanded && (
              <span className="collapsed-summary">{orderedPersons.map(p => p.name.replace('常务副院长', '').replace('党委书记', '').replace('党委副书记', '').replace('副院长', '')).join('、')}</span>
            )}
            <span className="collapse-toggle">{personsExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}</span>
          </div>
          {personsExpanded && (
            <>
              <div className="quick-option-buttons small">
                {FIXED_PERSONS.filter(p => p.id !== 'counselor').map(person => {
                  const isSelected = orderedPersons.some(p => p.id === person.id);
                  return (
                    <button
                      key={person.id}
                      className={`quick-option-btn ${isSelected ? 'active' : ''}`}
                      onClick={() => handlePersonToggle(person)}
                    >
                      {person.name.replace('常务副院长', '').replace('党委书记', '').replace('党委副书记', '').replace('副院长', '')}
                    </button>
                  );
                })}
              </div>
              {orderedPersons.length > 0 && (
                <div className="persons-order-list">
                  {orderedPersons.map((person, index) => (
                    <div
                      key={person.id}
                      className={`person-order-item ${dragOverIndex === index ? 'drag-over' : ''}`}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={() => setDragOverIndex(null)}
                      onDrop={() => handleDrop(index)}
                      onDragEnd={() => { setDragOverIndex(null); dragIndexRef.current = null; }}
                    >
                      <GripVertical size={14} className="drag-handle" />
                      <span className="person-order-rank">{index + 1}</span>
                      <span className="person-order-name">{person.name}</span>
                      <button className="person-remove-btn" onClick={() => handleRemovePerson(person.id)}>
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {showPersonInput ? (
                <div className="custom-person-input-row">
                  <input
                    className="custom-person-input"
                    value={customPersonInput}
                    onChange={e => setCustomPersonInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleAddCustomPerson();
                      if (e.key === 'Escape') { setShowPersonInput(false); setCustomPersonInput(''); }
                    }}
                    placeholder="如：副书记李明"
                    autoFocus
                    maxLength={20}
                  />
                  <button className="quick-option-btn active" onClick={handleAddCustomPerson}>确定</button>
                  <button className="quick-option-btn" onClick={() => { setShowPersonInput(false); setCustomPersonInput(''); }}>✕</button>
                </div>
              ) : (
                <button className="quick-option-btn" style={{ marginTop: '4px' }} onClick={() => setShowPersonInput(true)}>
                  <Plus size={12} />
                  添加
                </button>
              )}
            </>
          )}
        </div>

        </div>{/* end chat-sidebar-scroll */}

        {/* 输入框 */}
        <div className="chat-input-container">
          {(selectedImages.length > 0 || articleRefs.length > 0) && (
            <div className="selected-images-bar">
              {selectedImages.map(img => (
                <span key={img.id} className="selected-image-chip">
                  <ImageIcon size={12} />
                  <span className="chip-name">{img.name}</span>
                  <button className="chip-remove" onClick={() => setSelectedImages(prev => prev.filter(i => i.id !== img.id))}>
                    <X size={10} />
                  </button>
                </span>
              ))}
              {articleRefs.map((ref, i) => (
                <span key={i} className="selected-image-chip article-ref-chip">
                  <FileSearch size={12} />
                  <span className="chip-name">{ref.title || '参考推文'}</span>
                  <button className="chip-remove" onClick={() => setArticleRefs(prev => prev.filter((_, idx) => idx !== i))}>
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <textarea
            className="chat-input"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !isRunning) {
                e.preventDefault();
                handleStartPipeline();
              }
            }}
            placeholder="描述活动内容、时间地点或特别要求..."
            rows={3}
            disabled={isRunning}
          />
          <div className="chat-input-actions">
            <button className="image-picker-trigger" onClick={() => setShowArticleRefModal(true)} title="添加参考推文" type="button">
              <FileSearch size={16} />
              {articleRefs.length > 0 && <span className="image-trigger-badge">{articleRefs.length}</span>}
            </button>
            <button className="image-picker-trigger" onClick={() => setShowImagePicker(true)} title="选择图片" type="button">
              <ImageIcon size={16} />
              {selectedImages.length > 0 && <span className="image-trigger-badge">{selectedImages.length}</span>}
            </button>
            {isRunning ? (
              <Button variant="outline" size="sm" onClick={abort}>
                <Square size={14} />
                中断
              </Button>
            ) : (
              <Button size="sm" onClick={handleStartPipeline}>
                <Send size={14} />
                开始生成
              </Button>
            )}
          </div>
        </div>

        {showImagePicker && (
          <ImagePickerModal
            selectedIds={selectedImages.map(i => i.id)}
            onConfirm={setSelectedImages}
            onClose={() => setShowImagePicker(false)}
          />
        )}
        {showArticleRefModal && (
          <ArticleRefModal
            onConfirm={(ref) => setArticleRefs(prev => [...prev, ref])}
            onClose={() => setShowArticleRefModal(false)}
          />
        )}
      </div>

      {/* 右侧画布（70%） */}
      <div className="canvas-container">
        {!currentArticle ? (
          <EmptyState
            icon="default"
            title="等待生成"
            description="填写左侧信息后点击「开始生成」，AI 将自动完成 4 个步骤"
            size="lg"
          />
        ) : (
          <CanvasEditor
            title={currentTitle}
            content={currentArticle}
            onTitleChange={setCurrentTitle}
            onContentChange={setCurrentArticle}
          />
        )}
        {/* Pipeline 状态面板（画布底部） */}
        {steps.some(s => s.status !== 'pending') && (
          <div className="canvas-pipeline-bar">
            <PipelinePanel steps={steps} isRunning={isRunning} currentStepId={currentStepId} />
          </div>
        )}
      </div>
    </div>
  );
}

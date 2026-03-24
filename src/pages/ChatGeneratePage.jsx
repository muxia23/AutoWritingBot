/**
 * 对话式推文生成页面
 * ChatGPT Canvas 风格：左侧对话框（30%）+ 右侧画布预览（70%）
 */

import { useState, useRef, useEffect } from 'react';
import { Send, RotateCcw, MessageSquare, FileText, RefreshCw, Plus, X, GripVertical, ChevronDown, ImageIcon, FileSearch } from 'lucide-react';
import CanvasEditor from '../components/canvas/CanvasEditor.jsx';
import Button from '../components/form/Button.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import ImagePickerModal from '../components/images/ImagePickerModal.jsx';
import ArticleRefModal from '../components/chat/ArticleRefModal.jsx';
import { useApp } from '../context/AppContext.jsx';
import { usePromptContext } from '../context/PromptContext.jsx';
import { useConversation } from '../hooks/useConversation.js';
import { DeepSeekAPI } from '../services/deepseek.js';
import { FIXED_PERSONS, ACTIVITY_TYPES, SUCCESS_MESSAGES, ERROR_MESSAGES } from '../utils/constants.js';

export default function ChatGeneratePage() {
  const { activeModel, modelConfigs, activeModelId, setActiveModelId, showToast } = useApp();
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const { buildSystemPrompt } = usePromptContext();
  const {
    messages,
    currentArticle,
    currentTitle,
    isLoading,
    setIsLoading,
    setCurrentTitle,
    setCurrentArticle,
    addUserMessage,
    addAssistantMessage,
    setCurrentResponse,
    clearConversation,
    removeLastMessage,
  } = useConversation();

  const [userInput, setUserInput] = useState('');
  const [selectedActivityType, setSelectedActivityType] = useState('');
  const [selectedImages, setSelectedImages] = useState([]); // { id, name, description }[]
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [articleRefs, setArticleRefs] = useState([]); // [{ title, content }]
  const [showArticleRefModal, setShowArticleRefModal] = useState(false);

  // 有序领导列表：[{ id, name, isCustom }]，顺序即推文出现顺序
  const [orderedPersons, setOrderedPersons] = useState([]);
  const [customPersonInput, setCustomPersonInput] = useState('');
  const [showPersonInput, setShowPersonInput] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const dragIndexRef = useRef(null);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 切换默认领导选中状态（已选则移除，未选则追加到末尾）
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

  // 拖拽排序
  const handleDragStart = (index) => {
    dragIndexRef.current = index;
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

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

  const buildQuickPrompt = () => {
    let prompt = '';
    if (selectedActivityType) {
      prompt += `活动类型：${selectedActivityType}\n`;
    }
    if (orderedPersons.length > 0) {
      const names = orderedPersons.map(p => p.name).join('、');
      prompt += `参与领导（按此顺序在推文中出现）：${names}\n`;
    }
    return prompt;
  };

  const handleSendMessage = async () => {
    const quickContext = buildQuickPrompt();
    const textInput = userInput.trim();
    // 始终将活动类型/参与领导上下文拼入消息，无论是否有文字输入
    const input = textInput && quickContext
      ? `${quickContext}\n${textInput}`
      : textInput || quickContext;

    if (!input) {
      showToast(ERROR_MESSAGES.VALIDATION_FAILED, 'error');
      return;
    }

    if (!activeModel?.apiKey) {
      showToast(ERROR_MESSAGES.API_KEY_MISSING, 'error');
      return;
    }

    // 将图片描述拼入用户消息（而非 system prompt），让模型更直接关注
    const imagesWithDesc = selectedImages.filter(img => img.description?.trim());
    const imageBlock = imagesWithDesc.length > 0
      ? `\n\n【活动图片信息，请根据内容在推文对应段落后标注插图位置「📷 插图：图片N」】\n` +
        imagesWithDesc.map((img, i) => `图片${i + 1}（${img.name}）：${img.description.trim()}`).join('\n')
      : '';

    const refBlock = articleRefs.length > 0
      ? '\n\n【参考推文（请学习其写作风格、结构和表达方式，但不要照搬内容）】\n' +
        articleRefs.map((ref, i) =>
          `参考${i + 1}《${ref.title || '无标题'}》：\n${ref.content}`
        ).join('\n\n')
      : '';

    const fullInput = input + imageBlock + refBlock;

    addUserMessage(fullInput);
    setUserInput('');
    setIsLoading(true);

    try {
      const systemPrompt = buildSystemPrompt();
      // 流式输出：实时更新画布，无超时问题
      const response = await DeepSeekAPI.chatWithHistoryStream(
        systemPrompt,
        messages,
        activeModel,
        (_delta, fullText) => {
          // 每收到新内容就实时解析并更新画布
          setCurrentResponse(fullText);
        }
      );
      addAssistantMessage(response);
      setCurrentResponse(response);
      showToast(SUCCESS_MESSAGES.ARTICLE_GENERATED);
    } catch (error) {
      showToast(error.message, 'error');
      removeLastMessage();
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleQuickOptionClick = (type) => {
    setSelectedActivityType(type);
    const templates = {
      '参观': '请帮我写一篇关于参观企业的推文',
      '座谈': '请帮我写一篇关于座谈会的推文',
      '实践': '请帮我写一篇关于实践活动的推文'
    };
    if (templates[type]) setUserInput(templates[type]);
  };

  const handleClearConversation = () => {
    if (messages.length === 0 || confirm('确定要清空对话吗？')) {
      clearConversation();
      setSelectedActivityType('');
      setOrderedPersons([]);
      setCustomPersonInput('');
      setShowPersonInput(false);
      setUserInput('');
      setSelectedImages([]);
      setArticleRefs([]);
    }
  };

  const handleRegenerate = async () => {
    if (messages.length === 0 || !activeModel?.apiKey) return;
    removeLastMessage();
    setIsLoading(true);
    try {
      const systemPrompt = buildSystemPrompt();
      const response = await DeepSeekAPI.chatWithHistoryStream(
        systemPrompt,
        messages,
        activeModel,
        (_delta, fullText) => { setCurrentResponse(fullText); }
      );
      addAssistantMessage(response);
      setCurrentResponse(response);
      showToast(SUCCESS_MESSAGES.ARTICLE_GENERATED);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-page">
      {/* 左侧对话框区域（30%） */}
      <div className="chat-sidebar">
        <div className="chat-sidebar-header">
          <h3 className="sidebar-title">对话生成</h3>
          <div className="sidebar-actions">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearConversation}
              disabled={messages.length === 0}
            >
              <RotateCcw size={14} />
              清空
            </Button>
          </div>
        </div>

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
                <span className="model-selector-name">
                  {activeModel?.name || '选择模型'}
                </span>
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
          <div className="quick-option-label">活动类型</div>
          <div className="quick-option-buttons">
            {ACTIVITY_TYPES.slice(0, 6).map(type => (
              <button
                key={type}
                className={`quick-option-btn ${selectedActivityType === type ? 'active' : ''}`}
                onClick={() => handleQuickOptionClick(type)}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* 参与领导 */}
        <div className="quick-options">
          <div className="quick-option-label">
            参与领导
            {orderedPersons.length > 0 && (
              <span className="persons-order-hint">拖动可调整顺序</span>
            )}
          </div>

          {/* 默认人员切换按钮 */}
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

          {/* 已选领导排序列表（可拖动） */}
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
                  <button
                    className="person-remove-btn"
                    onClick={() => handleRemovePerson(person.id)}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 添加自定义人员 */}
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
            <button
              className="quick-option-btn"
              style={{ marginTop: '4px' }}
              onClick={() => setShowPersonInput(true)}
            >
              <Plus size={12} />
              添加
            </button>
          )}
        </div>

        {/* 消息历史 */}
        <div className="message-history">
          {messages.length === 0 ? (
            <EmptyState
              icon="default"
              title="开始对话"
              description="选择活动类型或输入描述，开始生成推文"
              size="sm"
            />
          ) : (
            messages.map((msg, index) => (
              <div key={index} className={`message ${msg.role}`}>
                <div className="message-header">
                  {msg.role === 'user' ? <MessageSquare size={14} /> : <FileText size={14} />}
                  <span className="message-role">{msg.role === 'user' ? '你' : 'AI'}</span>
                </div>
                <div className="message-content">{msg.content}</div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="message assistant">
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 输入框 */}
        <div className="chat-input-container">
          {/* chips 区：已选图片 + 参考推文 */}
          {(selectedImages.length > 0 || articleRefs.length > 0) && (
            <div className="selected-images-bar">
              {selectedImages.map(img => (
                <span key={img.id} className="selected-image-chip">
                  <ImageIcon size={12} />
                  <span className="chip-name">{img.name}</span>
                  <button
                    className="chip-remove"
                    onClick={() => setSelectedImages(prev => prev.filter(i => i.id !== img.id))}
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
              {articleRefs.map((ref, i) => (
                <span key={i} className="selected-image-chip article-ref-chip">
                  <FileSearch size={12} />
                  <span className="chip-name">{ref.title || '参考推文'}</span>
                  <button
                    className="chip-remove"
                    onClick={() => setArticleRefs(prev => prev.filter((_, idx) => idx !== i))}
                  >
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
            onKeyPress={handleKeyPress}
            placeholder="描述你的活动内容，或直接输入需要生成的要求..."
            rows={3}
            disabled={isLoading}
          />
          <div className="chat-input-actions">
            <button
              className="image-picker-trigger"
              onClick={() => setShowArticleRefModal(true)}
              title="添加参考推文"
              type="button"
            >
              <FileSearch size={16} />
              {articleRefs.length > 0 && (
                <span className="image-trigger-badge">{articleRefs.length}</span>
              )}
            </button>
            <button
              className="image-picker-trigger"
              onClick={() => setShowImagePicker(true)}
              title="选择图片"
              type="button"
            >
              <ImageIcon size={16} />
              {selectedImages.length > 0 && (
                <span className="image-trigger-badge">{selectedImages.length}</span>
              )}
            </button>
            {messages.length > 0 && messages[messages.length - 1].role === 'assistant' && (
              <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={isLoading}>
                <RefreshCw size={14} />
                重新生成
              </Button>
            )}
            <Button size="sm" onClick={handleSendMessage} loading={isLoading}>
              <Send size={14} />
              发送
            </Button>
          </div>
        </div>

        {/* 选图弹窗 */}
        {showImagePicker && (
          <ImagePickerModal
            selectedIds={selectedImages.map(i => i.id)}
            onConfirm={setSelectedImages}
            onClose={() => setShowImagePicker(false)}
          />
        )}

        {/* 参考推文弹窗 */}
        {showArticleRefModal && (
          <ArticleRefModal
            onConfirm={(ref) => setArticleRefs(prev => [...prev, ref])}
            onClose={() => setShowArticleRefModal(false)}
          />
        )}
      </div>

      {/* 右侧画布区域（70%） */}
      <div className="canvas-container">
        {!currentArticle ? (
          <EmptyState
            icon="default"
            title="等待生成"
            description="生成的推文将显示在这里"
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
      </div>
    </div>
  );
}

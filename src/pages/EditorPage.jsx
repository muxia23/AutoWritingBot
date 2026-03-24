/**
 * 批注编辑页面
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Copy, Download, Play, History, Sparkles } from 'lucide-react';
import Button from '../components/form/Button.jsx';
import ArticleEditor from '../components/article/ArticleEditor.jsx';
import ConversationHistory from '../components/conversation/ConversationHistory.jsx';
import Loading from '../components/common/Loading.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { useApp } from '../context/AppContext.jsx';
import { useSkillsContext } from '../context/SkillsContext.jsx';
import { useDeepSeekAPI } from '../hooks/useDeepSeekAPI.js';
import { useAnnotation } from '../hooks/useAnnotation.js';
import { useConversationHistory } from '../hooks/useConversationHistory.js';
import { SUCCESS_MESSAGES } from '../utils/constants.js';
import { Formatters } from '../utils/formatters.js';

export default function EditorPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { apiKey, showToast } = useApp();
  const { buildSystemPrompt } = useSkillsContext();
  const { applyAnnotations, isLoading } = useDeepSeekAPI();
  const { annotations, getPendingAnnotations, clearAllAnnotations } = useAnnotation();
  const { addConversation } = useConversationHistory();

  const [content, setContent] = useState('');
  const [title, setTitle] = useState('未命名文章');
  const [viewMode, setViewMode] = useState('split'); // 'split', 'editor', 'history'
  const [selectedConversation, setSelectedConversation] = useState(null);

  // 从路由状态或 localStorage 恢复内容
  useEffect(() => {
    if (location.state?.content) {
      setContent(location.state.content);
      setTitle(location.state.title || '未命名文章');
    } else {
      const savedContent = localStorage.getItem('editor_content');
      const savedTitle = localStorage.getItem('editor_title');
      if (savedContent) setContent(savedContent);
      if (savedTitle) setTitle(savedTitle);
    }
  }, [location.state]);

  // 自动保存内容
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('editor_content', content);
      localStorage.setItem('editor_title', title);
    }, 1000);
    return () => clearTimeout(timer);
  }, [content, title]);

  const handleApplyAnnotations = async () => {
    const pendingAnnotations = getPendingAnnotations();
    if (pendingAnnotations.length === 0) {
      showToast('没有待处理的批注', 'warning');
      return;
    }

    if (!apiKey) {
      showToast('请先配置 DeepSeek API Key', 'error');
      return;
    }

    const skillsPrompt = buildSystemPrompt();

    try {
      // 获取全局优化标志（从第一个批注中获取）
      const globalOptimize = pendingAnnotations[0]?.scope === 'global';

      const result = await applyAnnotations(
        skillsPrompt,
        content,
        pendingAnnotations,
        apiKey,
        globalOptimize
      );

      setContent(result);
      showToast(SUCCESS_MESSAGES.ARTICLE_OPTIMIZED);

      // 标记批注为已解决
      pendingAnnotations.forEach(ann => {
        // 这里需要使用 updateAnnotation 方法来标记为已解决
        // 由于 useAnnotation hook 没有暴露这个方法，我们需要在 hook 中添加
      });

      // 保存到对话历史
      addConversation({
        type: 'edit',
        input: { originalContent: content },
        output: result,
        annotations: pendingAnnotations,
        title: `${title} - 批注修改`
      });

      clearAllAnnotations();
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    showToast(SUCCESS_MESSAGES.COPIED);
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = Formatters.generateFileName(title);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(SUCCESS_MESSAGES.DOWNLOADED);
  };

  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation);
    setContent(conversation.output);
    setTitle(conversation.title);
    setViewMode('editor');
  };

  const handleDeleteConversation = (conversationId) => {
    if (selectedConversation?.id === conversationId) {
      setSelectedConversation(null);
    }
  };

  if (isLoading) {
    return <Loading text="正在处理批注..." />;
  }

  return (
    <div className="editor-page">
      <div className="editor-header">
        <div className="editor-title">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="title-input"
            placeholder="文章标题"
          />
        </div>
        <div className="editor-actions">
          <div className="view-mode-toggle">
            <button
              className={`mode-btn ${viewMode === 'split' ? 'active' : ''}`}
              onClick={() => setViewMode('split')}
              title="分屏视图"
            >
              <History size={16} />
            </button>
            <button
              className={`mode-btn ${viewMode === 'editor' ? 'active' : ''}`}
              onClick={() => setViewMode('editor')}
              title="编辑视图"
            >
              <Sparkles size={16} />
            </button>
          </div>
          <Button variant="secondary" size="sm" onClick={handleCopy}>
            <Copy size={14} />
            复制
          </Button>
          <Button variant="secondary" size="sm" onClick={handleDownload}>
            <Download size={14} />
            下载
          </Button>
          <Button onClick={handleApplyAnnotations} disabled={getPendingAnnotations().length === 0}>
            <Play size={16} />
            应用批注 ({getPendingAnnotations().length})
          </Button>
        </div>
      </div>

      <div className={`editor-content ${viewMode}`}>
        <div className="editor-main">
          {!content ? (
            <EmptyState
              icon="default"
              title="暂无内容"
              description="请生成或导入推文内容，然后使用批注功能进行编辑"
              action={
                <Button onClick={() => navigate('/generate')}>
                  前往生成推文
                </Button>
              }
            />
          ) : (
            <ArticleEditor
              content={content}
              onChange={setContent}
              showAnnotations={true}
            />
          )}
        </div>

        {(viewMode === 'split' || viewMode === 'history') && (
          <div className="editor-sidebar">
            <ConversationHistory
              onSelectConversation={handleSelectConversation}
              onDeleteConversation={handleDeleteConversation}
            />
          </div>
        )}
      </div>
    </div>
  );
}

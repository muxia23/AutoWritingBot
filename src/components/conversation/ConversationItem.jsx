/**
 * 单条对话项组件
 */

import { Trash2, MessageSquareText, Download } from 'lucide-react';
import { Formatters } from '../../utils/formatters.js';

// 历史记录当前只产生 'chat' 一种类型，徽章对它是纯噪音，故不显示。
// 其余类型来自早期版本或导入的备份，仍标注出来以便区分。
const TYPE_LABELS = {
  generate: '生成',
  optimize: '优化',
  edit: '批注修改',
};

export default function ConversationItem({
  conversation,
  onSelect,
  onDelete,
  onExport
}) {
  const typeLabel = TYPE_LABELS[conversation.type];
  const annotationCount = conversation.annotations?.length || 0;

  return (
    <div
      className="conversation-item"
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <div className="conversation-main">
        <h4 className="conversation-title">{conversation.title || '未命名推文'}</h4>
        <div className="conversation-meta">
          <time className="conversation-time">
            {Formatters.formatRelativeDateTime(conversation.timestamp)}
          </time>
          {typeLabel && <span className="conversation-type-badge">{typeLabel}</span>}
          {annotationCount > 0 && (
            <span className="conversation-annotations">
              <MessageSquareText size={12} />
              {annotationCount}
            </span>
          )}
        </div>
      </div>

      <div className="conversation-actions">
      <button
        className="conversation-action-btn"
        title="下载这条记录（JSON，可再导入）"
        aria-label={`下载「${conversation.title || '未命名推文'}」`}
        onClick={(e) => {
          e.stopPropagation();
          onExport?.();
        }}
      >
        <Download size={15} />
      </button>

      <button
        className="conversation-action-btn delete"
        title="删除这条记录"
        aria-label={`删除「${conversation.title || '未命名推文'}」`}
        onClick={(e) => {
          e.stopPropagation();
          if (confirm('确定要删除这条对话记录吗？')) {
            onDelete();
          }
        }}
      >
        <Trash2 size={15} />
      </button>
      </div>
    </div>
  );
}

/**
 * 单条对话项组件
 */

import { ChevronRight, Trash2 } from 'lucide-react';
import { Formatters } from '../../utils/formatters.js';

export default function ConversationItem({
  conversation,
  onSelect,
  onDelete
}) {
  const typeLabels = {
    generate: '生成',
    optimize: '优化',
    edit: '批注修改'
  };

  const typeColors = {
    generate: '#339af0',
    optimize: '#51cf66',
    edit: '#ff6b6b'
  };

  return (
    <div
      className="conversation-item"
      onClick={onSelect}
      role="button"
      tabIndex={0}
    >
      <div className="conversation-header">
        <span
          className="conversation-type-badge"
          style={{ backgroundColor: typeColors[conversation.type] }}
        >
          {typeLabels[conversation.type]}
        </span>
        <span className="conversation-time">
          {Formatters.formatDateTime(conversation.timestamp)}
        </span>
      </div>
      <h4 className="conversation-title">{conversation.title}</h4>
      {conversation.annotations && conversation.annotations.length > 0 && (
        <div className="conversation-annotations">
          {conversation.annotations.length} 条批注
        </div>
      )}
      <div className="conversation-actions">
        <button
          className="conversation-action-btn delete"
          onClick={(e) => {
            e.stopPropagation();
            if (confirm('确定要删除这条对话记录吗？')) {
              onDelete();
            }
          }}
        >
          <Trash2 size={14} />
        </button>
        <ChevronRight size={16} className="conversation-arrow" />
      </div>
    </div>
  );
}

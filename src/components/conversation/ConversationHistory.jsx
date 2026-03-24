/**
 * 对话历史列表组件
 */

import { useState } from 'react';
import { Clock, FileText, Trash2, Download, Upload } from 'lucide-react';
import { useConversationHistory } from '../../hooks/useConversationHistory.js';
import { Formatters } from '../../utils/formatters.js';
import ConversationItem from './ConversationItem.jsx';
import ImportExport from './ImportExport.jsx';

export default function ConversationHistory({
  onSelectConversation,
  onDeleteConversation
}) {
  const {
    history,
    clearHistory,
    exportHistory,
    importHistory
  } = useConversationHistory();

  const [showImportExport, setShowImportExport] = useState(false);

  const handleClearHistory = () => {
    if (confirm('确定要清空所有对话历史吗？此操作不可恢复。')) {
      clearHistory();
    }
  };

  const handleExport = () => {
    exportHistory();
  };

  const handleImport = (file) => {
    importHistory(file)
      .then(() => {
        setShowImportExport(false);
        alert('对话历史导入成功！');
      })
      .catch((error) => {
        alert(`导入失败：${error.message}`);
      });
  };

  if (history.length === 0) {
    return (
      <div className="conversation-history empty">
        <FileText size={48} />
        <h3>暂无对话历史</h3>
        <p>生成或修改推文后，历史记录将显示在这里</p>
        <div className="history-actions">
          <button className="btn btn-secondary" onClick={() => setShowImportExport(true)}>
            <Upload size={16} />
            导入历史
          </button>
        </div>
        {showImportExport && (
          <ImportExport
            onClose={() => setShowImportExport(false)}
            onImport={handleImport}
          />
        )}
      </div>
    );
  }

  return (
    <div className="conversation-history">
      <div className="history-header">
        <div className="history-title">
          <Clock size={20} />
          <h3>对话历史 ({history.length})</h3>
        </div>
        <div className="history-actions">
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowImportExport(true)}
            title="导入/导出"
          >
            <Upload size={16} />
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleExport}
            title="导出全部"
          >
            <Download size={16} />
          </button>
          <button
            className="btn btn-outline btn-sm"
            onClick={handleClearHistory}
            title="清空历史"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="history-list">
        {history.map((conversation) => (
          <ConversationItem
            key={conversation.id}
            conversation={conversation}
            onSelect={() => onSelectConversation?.(conversation)}
            onDelete={() => onDeleteConversation?.(conversation.id)}
          />
        ))}
      </div>

      {showImportExport && (
        <ImportExport
          onClose={() => setShowImportExport(false)}
          onImport={handleImport}
        />
      )}
    </div>
  );
}

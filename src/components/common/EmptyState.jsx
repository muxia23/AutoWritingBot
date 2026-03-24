/**
 * 空状态组件
 */

import { FileText, AlertCircle, RefreshCw } from 'lucide-react';

export default function EmptyState({
  icon = 'default',
  title = '暂无内容',
  description = '这里暂时没有任何内容',
  action = null
}) {
  const icons = {
    default: FileText,
    error: AlertCircle,
    refresh: RefreshCw
  };

  const Icon = icons[icon] || FileText;

  return (
    <div className="empty-state">
      <Icon size={48} className="empty-state-icon" />
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-description">{description}</p>
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}

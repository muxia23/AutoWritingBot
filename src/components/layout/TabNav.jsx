/**
 * 标签页导航组件
 */

import { useNavigate, useLocation } from 'react-router-dom';
import { MessageSquare, FileText, Image } from 'lucide-react';
import { ROUTES } from '../../utils/constants.js';

export default function TabNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { path: ROUTES.CHAT, icon: MessageSquare, label: '对话生成' },
    { path: ROUTES.IMAGES, icon: Image, label: '图片库' },
    { path: ROUTES.PROMPT, icon: FileText, label: '提示词设置' }
  ];

  return (
    <nav className="tabs">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = location.pathname === tab.path;
        return (
          <button
            key={tab.path}
            className={`tab-btn ${isActive ? 'active' : ''}`}
            onClick={() => navigate(tab.path)}
          >
            <Icon size={18} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

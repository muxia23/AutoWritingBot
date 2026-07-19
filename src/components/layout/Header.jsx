/**
 * 顶部导航栏组件
 */

import { Settings, Github } from 'lucide-react';
import { useState } from 'react';
import ModelManager from '../models/ModelManager.jsx';
import { GITHUB_URL } from '../../utils/constants.js';

export default function Header() {
  const [showModelManager, setShowModelManager] = useState(false);

  return (
    <>
      <header className="header">
        <div className="header-content">
          <div className="app-brand">
            {/* 用羽毛笔局部而非完整图标：完整图标是浅色系，30px 下认不出 */}
            <img src="/icon-mark.png" alt="" className="app-logo" />
            <h1 className="app-title">学院公众号推文生成器</h1>
          </div>
          <div className="header-actions">
            <a
              className="header-link"
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              title="在 GitHub 上查看源码"
              aria-label="在 GitHub 上查看源码"
            >
              <Github size={16} />
            </a>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setShowModelManager(true)}
            >
              <Settings size={16} />
              <span>模型管理</span>
            </button>
          </div>
        </div>
      </header>

      {showModelManager && (
        <ModelManager onClose={() => setShowModelManager(false)} />
      )}
    </>
  );
}

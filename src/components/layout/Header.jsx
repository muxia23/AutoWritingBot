/**
 * 顶部导航栏组件
 */

import { Settings } from 'lucide-react';
import { useState } from 'react';
import ModelManager from '../models/ModelManager.jsx';

export default function Header() {
  const [showModelManager, setShowModelManager] = useState(false);

  return (
    <>
      <header className="header">
        <div className="header-content">
          <div className="app-brand">
            <img src="/favicon.svg" alt="" className="app-logo" />
            <h1 className="app-title">学院公众号推文生成器</h1>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowModelManager(true)}
          >
            <Settings size={16} />
            <span>模型管理</span>
          </button>
        </div>
      </header>

      {showModelManager && (
        <ModelManager onClose={() => setShowModelManager(false)} />
      )}
    </>
  );
}

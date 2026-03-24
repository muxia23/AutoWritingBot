/**
 * 顶部导航栏组件
 */

import { Settings } from 'lucide-react';
import { useState } from 'react';
import ModelManager from '../models/ModelManager.jsx';
import { useApp } from '../../context/AppContext.jsx';

export default function Header() {
  const { activeModel } = useApp();
  const [showModelManager, setShowModelManager] = useState(false);

  return (
    <>
      <header className="header">
        <div className="header-content">
          <h1 className="app-title">学院公众号推文生成器</h1>
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

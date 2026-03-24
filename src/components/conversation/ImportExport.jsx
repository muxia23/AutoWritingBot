/**
 * 导入/导出对话框组件
 */

import { useState, useRef } from 'react';
import Modal from '../layout/Modal.jsx';
import { Download, Upload, FileJson } from 'lucide-react';

export default function ImportExport({ onClose, onImport }) {
  const fileInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState('import');

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      onImport(file);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Modal onClose={onClose} title="导入/导出对话历史">
      <div className="import-export-modal">
        <div className="import-export-tabs">
          <button
            className={`tab ${activeTab === 'import' ? 'active' : ''}`}
            onClick={() => setActiveTab('import')}
          >
            <Upload size={16} />
            导入历史
          </button>
          <button
            className={`tab ${activeTab === 'export' ? 'active' : ''}`}
            onClick={() => setActiveTab('export')}
          >
            <Download size={16} />
            导出历史
          </button>
        </div>

        {activeTab === 'export' && (
          <div className="import-export-content">
            <div className="export-instructions">
              <FileJson size={48} />
              <h3>导出对话历史</h3>
              <p>导出的对话历史将以 JSON 格式保存到本地，可用于备份或迁移到其他设备。</p>
              <button
                className="btn btn-primary btn-lg"
                onClick={onClose}
              >
                使用历史列表中的导出按钮
              </button>
            </div>
          </div>
        )}

        {activeTab === 'import' && (
          <div className="import-export-content">
            <div className="import-instructions">
              <Upload size={48} />
              <h3>导入对话历史</h3>
              <p>请选择之前导出的 JSON 文件以恢复对话历史。</p>
              <button
                className="btn btn-primary btn-lg"
                onClick={handleImportClick}
              >
                选择文件
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

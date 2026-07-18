/**
 * 导入对话历史
 *
 * 导出不在这里：整体导出是工具栏的「导出全部」，单条导出是每条记录上的下载按钮。
 * 原先这里有个「导出」标签页，内容只是提示用户去别处点按钮，是个死胡同，已移除。
 */

import { useState, useRef } from 'react';
import Modal from '../layout/Modal.jsx';
import { UploadCloud } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { MAX_HISTORY } from '../../utils/historyUtils.js';

export default function ImportExport({ onClose, onImport }) {
  const { showToast } = useApp();
  const fileInputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const pick = (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.json')) {
      showToast('请选择 .json 格式的备份文件', 'error');
      return;
    }
    onImport(file);
  };

  return (
    <Modal onClose={onClose} title="导入对话历史">
      <div className="import-panel">
        <div
          className={`import-dropzone ${dragging ? 'dragging' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            pick(e.dataTransfer.files?.[0]);
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
        >
          <UploadCloud size={32} />
          <p className="import-dropzone-main">把备份文件拖到这里，或点击选择</p>
          <p className="import-dropzone-sub">支持导出的 .json 文件，可以是全部历史或单条记录</p>
        </div>

        <ul className="import-notes">
          <li>导入的记录会排在现有记录前面，不会覆盖已有内容。</li>
          <li>历史最多保留 {MAX_HISTORY} 条，超出的最旧记录会被自动清理。</li>
        </ul>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          style={{ display: 'none' }}
          onChange={(e) => {
            pick(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>
    </Modal>
  );
}

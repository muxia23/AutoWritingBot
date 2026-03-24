/**
 * 批注对话框组件
 */

import { useState } from 'react';
import Modal from '../layout/Modal.jsx';
import { RefreshCw, CheckCircle, Palette } from 'lucide-react';
import { MODIFICATION_SCOPE } from '../../utils/constants.js';

export default function AnnotationDialog({
  onClose,
  onSubmit,
  selectedText = '',
  annotationTypes = []
}) {
  const [type, setType] = useState('');
  const [content, setContent] = useState('');
  const [scope, setScope] = useState('local');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ type, content, scope });
  };

  const typeIcons = {
    rewrite: RefreshCw,
    fix: CheckCircle,
    style: Palette
  };

  return (
    <Modal onClose={onClose}>
      <div className="modal-header">
        <h3 className="modal-title">添加批注</h3>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="modal-body">
          <div className="form-group">
            <label>选中文本</label>
            <div className="selected-text-display">
              {selectedText}
            </div>
          </div>

          <div className="form-group">
            <label className="required">批注类型</label>
            <div className="annotation-types">
              {annotationTypes.map((annotationType) => {
                const Icon = typeIcons[annotationType.value];
                return (
                  <button
                    key={annotationType.value}
                    type="button"
                    className={`annotation-type-btn ${type === annotationType.value ? 'active' : ''}`}
                    onClick={() => setType(annotationType.value)}
                  >
                    <Icon size={18} />
                    <span>{annotationType.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="form-group">
            <label className="required">批注内容</label>
            <textarea
              className="form-control"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="请输入您的批注内容，例如：请将这段文字改写为更正式的表达..."
              rows={4}
              required
            />
          </div>

          <div className="form-group">
            <label>修改范围</label>
            <div className="modification-scope">
              {MODIFICATION_SCOPE.map((option) => (
                <label key={option.value} className="scope-option">
                  <input
                    type="radio"
                    name="scope"
                    value={option.value}
                    checked={scope === option.value}
                    onChange={(e) => setScope(e.target.value)}
                  />
                  <div>
                    <span className="scope-label">{option.label}</span>
                    <span className="scope-description">{option.description}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>取消</button>
          <button type="submit" className="btn btn-primary" disabled={!type || !content}>
            添加批注
          </button>
        </div>
      </form>
    </Modal>
  );
}

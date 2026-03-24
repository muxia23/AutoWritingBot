/**
 * 选图弹窗 — 在 ChatGeneratePage 中使用
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import Modal from '../layout/Modal.jsx';
import Button from '../form/Button.jsx';
import { useImageContext } from '../../context/ImageContext.jsx';
import { ROUTES } from '../../utils/constants.js';

export default function ImagePickerModal({ selectedIds, onConfirm, onClose }) {
  const { images } = useImageContext();
  const navigate = useNavigate();
  const [localSelected, setLocalSelected] = useState(new Set(selectedIds || []));

  const toggleSelect = (id) => {
    setLocalSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    const selected = images.filter(img => localSelected.has(img.id));
    onConfirm(selected);
    onClose();
  };

  return (
    <Modal title="选择图片" onClose={onClose}>
      <div className="image-picker-body">
        {images.length === 0 ? (
          <div className="image-picker-empty">
            <p>图片库为空</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { onClose(); navigate(ROUTES.IMAGES); }}
            >
              去图片库上传
            </Button>
          </div>
        ) : (
          <div className="image-picker-grid">
            {images.map(img => {
              const isSelected = localSelected.has(img.id);
              return (
                <div
                  key={img.id}
                  className={`image-picker-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => toggleSelect(img.id)}
                >
                  <img
                    src={`data:${img.mimeType};base64,${img.base64}`}
                    alt={img.name}
                    className="image-picker-thumb"
                  />
                  {isSelected && (
                    <div className="image-picker-check">
                      <Check size={14} />
                    </div>
                  )}
                  {img.description && (
                    <div className="image-picker-desc" title={img.description}>
                      {img.description.slice(0, 30)}{img.description.length > 30 ? '…' : ''}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      {images.length > 0 && (
        <div className="image-picker-footer">
          <span className="image-picker-count">已选 {localSelected.size} 张</span>
          <Button size="sm" onClick={handleConfirm}>确认选择</Button>
        </div>
      )}
    </Modal>
  );
}

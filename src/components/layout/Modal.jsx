/**
 * 通用模态框组件
 */

import { X } from 'lucide-react';
import { useEffect } from 'react';

export default function Modal({ children, onClose, title }) {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {title && (
          <div className="modal-header">
            <h3 className="modal-title">{title}</h3>
            <button className="modal-close" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

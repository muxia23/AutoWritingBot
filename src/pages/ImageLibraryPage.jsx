/**
 * 图片库页面 — 上传图片，AI 自动生成描述
 */

import { useRef, useState } from 'react';
import { Upload, Trash2, Sparkles, ChevronDown } from 'lucide-react';
import { useImageContext } from '../context/ImageContext.jsx';
import { useApp } from '../context/AppContext.jsx';
import Button from '../components/form/Button.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '../utils/constants.js';

export default function ImageLibraryPage() {
  const { images, addImage, updateName, updateDescription, removeImage, analyzeImage } = useImageContext();
  const { modelConfigs, activeModel, showToast } = useApp();
  const fileInputRef = useRef(null);
  const [analyzingIds, setAnalyzingIds] = useState(new Set());
  // 图片识别专用模型，默认跟随全局激活模型
  const [visionModelId, setVisionModelId] = useState(activeModel?.id || '');
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  const visionModel = modelConfigs.find(m => m.id === visionModelId) || activeModel;

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    for (const file of files) {
      try {
        await addImage(file);
      } catch {
        showToast(`上传失败：${file.name}`, 'error');
      }
    }
    showToast(SUCCESS_MESSAGES.IMAGE_UPLOADED);
    e.target.value = '';
  };

  const handleAnalyze = async (id) => {
    if (!visionModel?.apiKey) {
      showToast(ERROR_MESSAGES.API_KEY_MISSING, 'error');
      return;
    }
    setAnalyzingIds(prev => new Set(prev).add(id));
    try {
      await analyzeImage(id, visionModel);
      showToast(SUCCESS_MESSAGES.IMAGE_ANALYZED);
    } catch {
      showToast(ERROR_MESSAGES.IMAGE_ANALYZE_FAILED, 'error');
    } finally {
      setAnalyzingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleRemove = (id) => {
    if (confirm('确认删除这张图片？')) {
      removeImage(id);
    }
  };

  return (
    <div className="image-library-page">
      <div className="image-library-header">
        <div className="image-library-title-row">
          <h2 className="image-library-title">图片库</h2>
          <span className="image-library-count">{images.length} 张图片</span>
        </div>
        <p className="image-library-hint">
          上传活动图片后，可使用 AI 识别功能自动生成描述，在对话生成时注入推文背景信息。
          AI 识别需要支持视觉能力的模型（建议使用 GPT-4o）。
        </p>

        <div className="image-library-toolbar">
          <Button onClick={() => fileInputRef.current?.click()}>
            <Upload size={16} />
            上传图片
          </Button>

          {/* 识别模型选择器 */}
          <div className="vision-model-selector">
            <span className="vision-model-label">识别模型</span>
            {modelConfigs.length === 0 ? (
              <span className="vision-model-empty">请先在「模型管理」中添加模型</span>
            ) : (
              <div className="vision-model-wrap">
                <button
                  className="vision-model-btn"
                  onClick={() => setShowModelDropdown(v => !v)}
                >
                  <span className="model-selector-dot" />
                  <span>{visionModel?.name || '选择模型'}</span>
                  <ChevronDown size={12} />
                </button>
                {showModelDropdown && (
                  <div className="vision-model-dropdown">
                    {modelConfigs.map(m => (
                      <button
                        key={m.id}
                        className={`vision-model-item ${m.id === visionModelId ? 'active' : ''}`}
                        onClick={() => { setVisionModelId(m.id); setShowModelDropdown(false); }}
                      >
                        <span className="vision-model-item-name">{m.name}</span>
                        <span className="vision-model-item-id">{m.model}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>

      {images.length === 0 ? (
        <EmptyState
          icon="default"
          title="暂无图片"
          description="点击「上传图片」添加活动照片"
          size="lg"
        />
      ) : (
        <div className="image-grid">
          {images.map(img => (
            <div key={img.id} className="image-card">
              <div className="image-card-thumb">
                <img
                  src={`data:${img.mimeType};base64,${img.base64}`}
                  alt={img.name}
                  className="image-thumb"
                />
                <button
                  className="image-delete-btn"
                  onClick={() => handleRemove(img.id)}
                  title="删除"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="image-card-body">
                <input
                  className="image-card-name-input"
                  value={img.name}
                  onChange={e => updateName(img.id, e.target.value)}
                  placeholder="图片名称"
                />
                <textarea
                  className="image-desc-input"
                  value={img.description}
                  onChange={e => updateDescription(img.id, e.target.value)}
                  placeholder="一两句话描述图片内容，或点击 AI 识别自动生成"
                  rows={2}
                />
                <div className="image-card-footer">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAnalyze(img.id)}
                    loading={analyzingIds.has(img.id)}
                    disabled={analyzingIds.has(img.id)}
                  >
                    <Sparkles size={13} />
                    AI 识别
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

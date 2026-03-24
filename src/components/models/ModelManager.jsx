/**
 * 模型管理组件
 * 支持添加、编辑、删除和切换 AI 模型配置
 */

import { useState } from 'react';
import { Plus, Pencil, Trash2, Check, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import Modal from '../layout/Modal.jsx';
import Button from '../form/Button.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { PRESET_MODELS } from '../../utils/constants.js';

const EMPTY_FORM = { name: '', baseUrl: '', model: '', apiKey: '' };

export default function ModelManager({ onClose }) {
  const { modelConfigs, activeModelId, setActiveModelId, addModelConfig, updateModelConfig, removeModelConfig, showToast } = useApp();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showApiKey, setShowApiKey] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState('');

  const handlePresetSelect = (presetName) => {
    const preset = PRESET_MODELS.find(p => p.name === presetName);
    if (!preset) return;
    setSelectedPreset(presetName);
    setForm(prev => ({
      ...prev,
      name: prev.name || preset.name,
      baseUrl: preset.baseUrl,
      model: preset.model
    }));
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setSelectedPreset('');
    setShowApiKey(false);
    setShowForm(true);
  };

  const handleOpenEdit = (config) => {
    setEditingId(config.id);
    setForm({ name: config.name, baseUrl: config.baseUrl, model: config.model, apiKey: config.apiKey });
    setSelectedPreset('');
    setShowApiKey(false);
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = () => {
    if (!form.name.trim()) { showToast('请填写模型名称', 'error'); return; }
    if (!form.baseUrl.trim()) { showToast('请填写 API 地址', 'error'); return; }
    if (!form.model.trim()) { showToast('请填写模型 ID', 'error'); return; }
    if (!form.apiKey.trim()) { showToast('请填写 API Key', 'error'); return; }

    if (editingId) {
      updateModelConfig(editingId, form);
      showToast('模型配置已更新');
    } else {
      addModelConfig(form);
      showToast('模型已添加');
    }
    handleCancelForm();
  };

  const handleDelete = (id) => {
    if (!confirm('确定删除该模型配置？')) return;
    removeModelConfig(id);
    showToast('已删除');
  };

  const handleSetActive = (id) => {
    setActiveModelId(id);
    showToast('已切换模型');
  };

  return (
    <Modal onClose={onClose}>
      <div className="modal-header">
        <h3 className="modal-title">模型管理</h3>
      </div>

      <div className="modal-body model-manager-body">
        {/* 已配置模型列表 */}
        {modelConfigs.length === 0 ? (
          <div className="model-empty">
            <p>暂无模型配置，请添加一个模型开始使用</p>
          </div>
        ) : (
          <div className="model-list">
            {modelConfigs.map(config => (
              <div
                key={config.id}
                className={`model-item ${config.id === activeModelId ? 'active' : ''}`}
              >
                <div className="model-item-main">
                  <div className="model-item-info">
                    <div className="model-item-name">
                      {config.id === activeModelId && (
                        <span className="model-active-badge">使用中</span>
                      )}
                      {config.name}
                    </div>
                    <div className="model-item-meta">
                      <span className="model-id-tag">{config.model}</span>
                      <span className="model-url-tag">{config.baseUrl.replace('https://', '')}</span>
                    </div>
                  </div>
                  <div className="model-item-actions">
                    {config.id !== activeModelId && (
                      <button className="model-action-btn" onClick={() => handleSetActive(config.id)} title="切换为当前模型">
                        <Check size={14} />
                        使用
                      </button>
                    )}
                    <button className="model-action-btn" onClick={() => handleOpenEdit(config)} title="编辑">
                      <Pencil size={14} />
                    </button>
                    <button className="model-action-btn danger" onClick={() => handleDelete(config.id)} title="删除">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 添加/编辑表单 */}
        {showForm ? (
          <div className="model-form">
            <div className="model-form-title">{editingId ? '编辑模型' : '添加模型'}</div>

            {/* 预设快速填充 */}
            {!editingId && (
              <div className="form-group">
                <label>快速选择预设</label>
                <div className="preset-buttons">
                  {PRESET_MODELS.map(p => (
                    <button
                      key={p.name}
                      className={`preset-btn ${selectedPreset === p.name ? 'active' : ''}`}
                      onClick={() => handlePresetSelect(p.name)}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="form-group">
              <label>名称 <span className="required-mark">*</span></label>
              <input
                className="form-control"
                placeholder="如：DeepSeek Chat"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label>API 地址 <span className="required-mark">*</span></label>
              <input
                className="form-control"
                placeholder="如：https://api.deepseek.com"
                value={form.baseUrl}
                onChange={e => setForm(p => ({ ...p, baseUrl: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label>模型 ID <span className="required-mark">*</span></label>
              <input
                className="form-control"
                placeholder="如：deepseek-chat"
                value={form.model}
                onChange={e => setForm(p => ({ ...p, model: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label>API Key <span className="required-mark">*</span></label>
              <div className="api-key-input-wrap">
                <input
                  className="form-control"
                  type={showApiKey ? 'text' : 'password'}
                  placeholder="sk-..."
                  value={form.apiKey}
                  onChange={e => setForm(p => ({ ...p, apiKey: e.target.value }))}
                />
                <button className="api-key-toggle" onClick={() => setShowApiKey(v => !v)} tabIndex={-1}>
                  {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="form-hint">API Key 仅存储在本地浏览器，不会上传到任何服务器</p>
            </div>

            <div className="model-form-actions">
              <Button variant="secondary" size="sm" onClick={handleCancelForm}>取消</Button>
              <Button size="sm" onClick={handleSave}>{editingId ? '保存修改' : '添加'}</Button>
            </div>
          </div>
        ) : (
          <button className="add-model-btn" onClick={handleOpenAdd}>
            <Plus size={16} />
            添加模型
          </button>
        )}
      </div>

      <div className="modal-footer">
        <button className="btn btn-primary" onClick={onClose}>完成</button>
      </div>
    </Modal>
  );
}

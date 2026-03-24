/**
 * 参考推文弹窗 — 粘贴微信文章 URL，拉取内容作为生成参考
 */

import { useState } from 'react';
import { Link, Loader2, CheckCircle } from 'lucide-react';
import Modal from '../layout/Modal.jsx';
import Button from '../form/Button.jsx';
import { fetchWeixinArticle } from '../../utils/fetchWeixinArticle.js';

export default function ArticleRefModal({ onConfirm, onClose }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(null); // { title, content }
  const [error, setError] = useState('');

  const handleFetch = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setError('');
    setFetched(null);
    setLoading(true);
    try {
      const result = await fetchWeixinArticle(trimmed);
      setFetched(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!fetched) return;
    onConfirm(fetched);
    onClose();
  };

  return (
    <Modal title="添加参考推文" onClose={onClose}>
      <div className="article-ref-body">
        <p className="article-ref-hint">
          粘贴微信公众号文章链接，AI 将参考其写作风格和结构生成推文（不会照搬内容）。
        </p>

        <div className="article-ref-input-row">
          <input
            className="article-ref-url-input"
            value={url}
            onChange={e => { setUrl(e.target.value); setFetched(null); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleFetch()}
            placeholder="https://mp.weixin.qq.com/s/..."
            disabled={loading}
          />
          <Button size="sm" onClick={handleFetch} loading={loading} disabled={!url.trim() || loading}>
            {loading ? <Loader2 size={14} /> : <Link size={14} />}
            获取
          </Button>
        </div>

        {error && <p className="article-ref-error">{error}</p>}

        {fetched && (
          <div className="article-ref-preview">
            <div className="article-ref-preview-header">
              <CheckCircle size={14} className="article-ref-check" />
              <span className="article-ref-preview-title">{fetched.title || '（无标题）'}</span>
            </div>
            <p className="article-ref-preview-content">
              {fetched.content.slice(0, 200)}{fetched.content.length > 200 ? '……' : ''}
            </p>
          </div>
        )}
      </div>

      {fetched && (
        <div className="article-ref-footer">
          <Button size="sm" onClick={handleConfirm}>添加为参考</Button>
        </div>
      )}
    </Modal>
  );
}

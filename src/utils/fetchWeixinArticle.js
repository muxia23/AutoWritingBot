/**
 * 拉取微信公众号文章内容
 * 通过 Vite dev server 代理转发（/weixin-proxy → mp.weixin.qq.com），规避 CORS
 */

/**
 * 从 HTML 字符串提取微信文章标题和正文纯文本
 */
function parseWeixinHtml(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // 标题
  const titleEl =
    doc.querySelector('#activity-name') ||
    doc.querySelector('.rich_media_title');
  const title = titleEl?.textContent?.trim() || '';

  // 正文
  const contentEl =
    doc.querySelector('#js_content') ||
    doc.querySelector('.rich_media_content');

  if (!contentEl) return { title, content: '' };

  contentEl.querySelectorAll('script, style').forEach(el => el.remove());

  // 按段落提取文本
  const lines = [];
  contentEl.querySelectorAll('p, section, h1, h2, h3, h4').forEach(el => {
    const text = el.textContent?.trim();
    if (text) lines.push(text);
  });

  const content = lines.length > 0
    ? lines.join('\n')
    : contentEl.textContent?.trim() || '';

  return { title, content };
}

/**
 * 拉取并解析微信文章
 * @param {string} url 微信文章 URL（mp.weixin.qq.com/s/...）
 * @returns {Promise<{ title: string, content: string }>}
 */
export async function fetchWeixinArticle(url) {
  if (!url.includes('mp.weixin.qq.com')) {
    throw new Error('仅支持微信公众号文章链接（mp.weixin.qq.com）');
  }

  // 提取 mp.weixin.qq.com 之后的路径部分，通过 Vite 代理请求
  const urlObj = new URL(url);
  const proxyPath = '/weixin-proxy' + urlObj.pathname + urlObj.search;

  const res = await fetch(proxyPath, {
    signal: AbortSignal.timeout(15000),
    headers: { 'Accept': 'text/html' }
  });

  if (!res.ok) {
    throw new Error(`获取失败：HTTP ${res.status}`);
  }

  const html = await res.text();
  if (!html) throw new Error('返回内容为空，请检查链接是否有效');

  const { title, content } = parseWeixinHtml(html);
  if (!content) throw new Error('未能解析到文章正文，请确认链接可正常访问');

  return { title, content };
}

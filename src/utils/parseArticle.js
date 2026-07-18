/**
 * 从模型输出中解析推文标题与正文
 * 支持「# [标题]」与「# 标题」两种格式；找不到标题时返回原文
 */
export function parseArticle(text) {
  const lines = text.split('\n');
  for (const line of lines) {
    const match = line.match(/^#\s+\[(.+?)\]/) || line.match(/^#\s+(.+)/);
    if (match) {
      const title = match[1].trim();
      const content = text.slice(text.indexOf(line) + line.length).trim();
      return { title, content: content || text };
    }
  }
  return { title: '', content: text };
}

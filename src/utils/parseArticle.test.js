import { describe, it, expect } from 'vitest';
import { parseArticle } from './parseArticle.js';

describe('parseArticle', () => {
  it('解析「# [标题]」方括号格式', () => {
    const { title, content } = parseArticle('# [青春启航]\n\n正文第一段');
    expect(title).toBe('青春启航');
    expect(content).toBe('正文第一段');
  });

  it('解析普通「# 标题」格式', () => {
    const { title, content } = parseArticle('# 青春启航\n\n正文第一段');
    expect(title).toBe('青春启航');
    expect(content).toBe('正文第一段');
  });

  it('标题行前有说明文字时也能定位标题', () => {
    const { title, content } = parseArticle('以下是推文：\n\n# 青春启航\n正文');
    expect(title).toBe('青春启航');
    expect(content).toBe('正文');
  });

  it('无标题时返回空标题和原文', () => {
    const text = '没有标题的纯正文内容';
    const { title, content } = parseArticle(text);
    expect(title).toBe('');
    expect(content).toBe(text);
  });

  it('标题后无正文时回退返回原文', () => {
    const text = '# 只有标题';
    const { title, content } = parseArticle(text);
    expect(title).toBe('只有标题');
    expect(content).toBe(text);
  });
});

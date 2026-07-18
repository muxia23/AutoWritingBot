import { describe, it, expect } from 'vitest';
import { formatArticleText } from './formatText.js';

describe('formatArticleText 引号处理', () => {
  it('配对的英文双引号替换为中文引号', () => {
    expect(formatArticleText('他说"你好"然后离开')).toBe('他说“你好”然后离开');
  });

  it('未配对的双引号按上文判断方向', () => {
    // 行首无上文 → 开引号
    expect(formatArticleText('"开头引号')).toBe('“开头引号');
    // 跟在中文后 → 收引号。旧实现在这里一律给开引号，是个 bug
    expect(formatArticleText('结尾引号"')).toBe('结尾引号”');
  });

  it('开括号后的引号判为开引号', () => {
    expect(formatArticleText('（"引用')).toBe('（“引用');
  });

  it('配对的英文单引号替换为中文单引号', () => {
    expect(formatArticleText("他说'嗨'就走了")).toBe('他说‘嗨’就走了');
  });

  it('英文缩写中的撇号原样保留', () => {
    expect(formatArticleText("I don't know")).toBe("I don't know");
  });

  it('一行内两个撇号不被误配对', () => {
    // 配对正则若不排除撇号，会匹配到 't it' 并整段替换
    expect(formatArticleText("don't it's fine")).toBe("don't it's fine");
  });
});

describe('formatArticleText 边界', () => {
  it('空值不抛异常', () => {
    expect(formatArticleText('')).toBe('');
    expect(formatArticleText(undefined)).toBe('');
  });

  it('纯英文文本不被破坏', () => {
    // 占位符若是空字符串，replaceAll 会在每个字符间插入引号，这条会炸
    expect(formatArticleText('hello world')).toBe('hello world');
  });
});

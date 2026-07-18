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

describe('formatArticleText 空格处理', () => {
  it('删除中文之间的空格', () => {
    expect(formatArticleText('今天 上午 天气很好')).toBe('今天上午天气很好');
  });

  it('删除中文与英文/数字之间的空格', () => {
    expect(formatArticleText('学院举办 AI 讲座')).toBe('学院举办AI讲座');
    expect(formatArticleText('共 30 人参加')).toBe('共30人参加');
  });

  it('保留英文单词之间的空格', () => {
    expect(formatArticleText('使用 DeepSeek Chat 模型')).toBe('使用DeepSeek Chat模型');
  });

  it('连续多处中文空格在单次调用中全部处理', () => {
    // 若替换时消费掉第二个字符，"文 中" 在同一趟全局替换里就不再匹配，
    // 所以必须用前瞻
    expect(formatArticleText('中 文 中 文')).toBe('中文中文');
  });

  it('删除行首行尾空白', () => {
    expect(formatArticleText('  正文内容  ')).toBe('正文内容');
  });

  it('不吞换行符', () => {
    expect(formatArticleText('第一段\n第二段')).toBe('第一段\n第二段');
  });
});

describe('formatArticleText Markdown 标记', () => {
  it('标题标记后的空格保留', () => {
    // "#" 是 ASCII、"活" 是中文，中英删空格的规则会把它变成 "##活动回顾"，
    // 标题标记直接失效。必须先剥离标记再修正
    expect(formatArticleText('## 活动回顾')).toBe('## 活动回顾');
    expect(formatArticleText('# 主标题')).toBe('# 主标题');
    expect(formatArticleText('### 三级标题')).toBe('### 三级标题');
  });

  it('列表标记后的空格保留', () => {
    expect(formatArticleText('- 第一条')).toBe('- 第一条');
    expect(formatArticleText('1. 第一条')).toBe('1. 第一条');
  });

  it('引用标记后的空格保留', () => {
    expect(formatArticleText('> 引用内容')).toBe('> 引用内容');
  });

  it('标记内部的正文照常修正', () => {
    expect(formatArticleText('## 活动 回顾 与 展望')).toBe('## 活动回顾与展望');
  });

  it('空行保留', () => {
    expect(formatArticleText('第一段\n\n第二段')).toBe('第一段\n\n第二段');
  });
});

describe('formatArticleText 幂等性', () => {
  it('重复调用结果不变', () => {
    // 正文在生成时修正一次、导出时兜底再修正一次，两次结果必须一致
    const samples = [
      '他说"你好 世界"然后 离开',
      '## 活动 回顾',
      "I don't know 这个 答案",
      '- 第一条  \n- 第二条',
      '',
    ];
    for (const s of samples) {
      const once = formatArticleText(s);
      expect(formatArticleText(once)).toBe(once);
    }
  });
});

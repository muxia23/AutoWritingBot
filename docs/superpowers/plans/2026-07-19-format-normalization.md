# 格式修正系统 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 统一推文的文本格式（中文引号、去除中文相关空格）与 Word 排版（宋体/黑体、三号/四号/五号、单倍行距），并新增「下载压缩包」功能，一次性打包文稿与按顺序编号的图片。

**Architecture:** 新增一个零依赖的纯函数模块 `formatText.js` 承担全部文本层修正，由 pipeline 阶段落定处与批注应用处调用以改写正文，同时在 Word 导出时幂等地兜底再跑一次。`exportDocx.js` 抽出 `buildDocxBlob` 供单独下载与压缩包复用，新增 `exportBundle.js` 用 fflate 组装 zip。

**Tech Stack:** React 18、Vite 5、Vitest 2（jsdom）、docx 9、fflate 0.8、idb-keyval 6

**Spec:** `docs/superpowers/specs/2026-07-19-format-normalization-design.md`

---

## 文件结构

| 文件 | 职责 |
|---|---|
| `src/utils/formatText.js`（新建） | 文本层修正。纯函数，无依赖。导出 `formatArticleText(text)` |
| `src/utils/formatText.test.js`（新建） | `formatText.js` 的单元测试 |
| `src/utils/exportBundle.js`（新建） | 压缩包组装与下载。依赖 `exportDocx.js`、`imageStore.js`、fflate |
| `src/utils/exportDocx.js`（改） | 移除内部引号函数、补行距、抽出 `buildDocxBlob`、延后 revoke |
| `src/hooks/usePipeline.js`（改） | 两处阶段落定时接入修正 |
| `src/components/canvas/CanvasEditor.jsx`（改） | 批注结果接入修正；下载按钮改下拉；接收 `selectedImages` |
| `src/pages/ChatGeneratePage.jsx`（改） | 向 `CanvasEditor` 传 `selectedImages` |
| `src/styles.css`（改） | 下载下拉菜单样式 |
| `package.json`（改） | 增加 fflate 依赖 |

**边界说明：** `formatText.js` 不知道 docx、不知道 React，只做字符串进字符串出。`exportBundle.js` 不重复实现文档构造，只调 `buildDocxBlob`。这两条边界是后续所有任务的前提。

---

## 背景知识（实施者必读）

**这是一个中文微信公众号推文生成器。** 正文以 Markdown 书写，`# 标题`、`## 小标题`、正文段落。模型输出的文本常带英文引号和多余空格，需要修正。

**项目约定：**
- 无 TypeScript，纯 JSX/JS，ESM
- 注释用中文，只在「为什么」不明显时才写，不写「做什么」的复述
- 测试用 Vitest，文件名 `*.test.js`，与被测文件同目录
- 运行测试：`npm test`（等价 `vitest run`）
- 测试的 `describe`/`it` 描述用中文

**行号会漂移。** 本计划记录的行号取自 2026-07-19 的工作区快照，实施时请**按内容定位**（函数名、相邻代码），把行号当作参考而非依据。若某处内容与计划描述不符，停下来报告，不要凭猜测改动。

---

**一个已经踩过的坑：** `URL.revokeObjectURL` 不能在 `link.click()` 之后同步调用。浏览器下载是异步的，同步吊销会导致下载列表出现条目但文件为空、打不开。本计划中所有下载入口都必须延后 60 秒回收。

---

## Task 1: 文本修正模块 —— 引号

**Files:**
- Create: `src/utils/formatText.js`
- Test: `src/utils/formatText.test.js`

本任务只实现引号处理，空格规则在 Task 2 加入。

- [ ] **Step 1: 写失败的测试**

创建 `src/utils/formatText.test.js`：

```js
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
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- formatText`
Expected: FAIL，报错类似 `Failed to resolve import "./formatText.js"`

- [ ] **Step 3: 实现引号处理**

创建 `src/utils/formatText.js`：

```js
/**
 * 推文文本格式修正
 *
 * 纯函数，幂等：formatArticleText(formatArticleText(x)) === formatArticleText(x)。
 * 幂等是必要性质——正文在 AI 生成后修正一次，导出时还会兜底再跑一次。
 */

// 撇号占位符。私有区码位，正文不会出现
const APOSTROPHE = '\uE000';

/**
 * 判断该位置的引号是收引号还是开引号。
 * 前面有实质字符（非空白、非开括号）时判为收引号。
 */
function closingOrOpening(str, index, closing, opening) {
  const prev = str[index - 1];
  return prev && !/[\s（(【「『]/.test(prev) ? closing : opening;
}

function normalizeQuotes(text) {
  let out = text.replace(/"([^"\n]*)"/g, '“$1”');
  out = out.replace(/"/g, (_, i, s) => closingOrOpening(s, i, '”', '“'));

  // 撇号（don't / it's）先藏起来再做配对，否则 "don't it's" 里的
  // 't it' 会被当成一对引号整段替换掉
  out = out.replace(/([A-Za-z])'(?=[A-Za-z])/g, `$1${APOSTROPHE}`);
  out = out.replace(/'([^'\n]*)'/g, '‘$1’');
  out = out.replace(/'/g, (_, i, s) => closingOrOpening(s, i, '’', '‘'));
  out = out.replaceAll(APOSTROPHE, "'");

  return out;
}

export function formatArticleText(text) {
  if (!text) return '';
  return text.split('\n').map(normalizeQuotes).join('\n');
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- formatText`
Expected: PASS，6 个用例全绿

- [ ] **Step 5: 提交**

```bash
git add src/utils/formatText.js src/utils/formatText.test.js
git commit -m "feat: 新增文本修正模块，规范化中文引号

修复旧实现中未配对引号一律变成开引号的缺陷，
并排除英文缩写撇号避免被误配对。"
```

---

## Task 2: 文本修正模块 —— 空格与 Markdown 标记隔离

**Files:**
- Modify: `src/utils/formatText.js`
- Test: `src/utils/formatText.test.js`

- [ ] **Step 1: 写失败的测试**

在 `src/utils/formatText.test.js` 末尾追加：

```js
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
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- formatText`
Expected: FAIL。空格用例失败（如 `今天 上午 天气很好` 未被处理），Markdown 用例目前恰好通过（尚无空格规则去破坏它们）

- [ ] **Step 3: 加入空格处理与行结构隔离**

修改 `src/utils/formatText.js`：在 `normalizeQuotes` 之后、`formatArticleText` 之前插入以下内容，并替换 `formatArticleText` 的实现。

```js
// 基本汉字、扩展 A 区、中文标点、全角字符
const CJK = '\\u4e00-\\u9fff\\u3400-\\u4dbf\\u3000-\\u303f\\uff00-\\uffef';

// 用前瞻而非捕获第二个字符：若消费掉它，"中 文 中" 里的 "文 中"
// 在同一趟全局替换中就不会再匹配
const CJK_BEFORE = new RegExp(`([${CJK}])[ \\t]+(?=[${CJK}A-Za-z0-9])`, 'g');
const CJK_AFTER = new RegExp(`([A-Za-z0-9])[ \\t]+(?=[${CJK}])`, 'g');

function stripCjkSpaces(text) {
  // 用 [ \t] 而非 \s，避免吞掉换行
  return text.replace(CJK_BEFORE, '$1').replace(CJK_AFTER, '$1');
}

// 行首 Markdown 标记：标题、无序列表、有序列表、引用
const LINE_PREFIX = /^\s*(#{1,6}|[-*+]|\d+\.|>)\s+/;

function formatLine(line) {
  const match = line.match(LINE_PREFIX);
  const prefix = match ? `${match[1]} ` : '';
  const body = match ? line.slice(match[0].length) : line;
  const formatted = stripCjkSpaces(normalizeQuotes(body)).trim();
  return formatted ? prefix + formatted : formatted;
}

export function formatArticleText(text) {
  if (!text) return '';
  return text.split('\n').map(formatLine).join('\n');
}
```

同时删除文件中原有的 `formatArticleText` 定义（Task 1 写的那个只调 `normalizeQuotes` 的版本）。

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- formatText`
Expected: PASS，全部用例通过（含 Task 1 的 6 个）

- [ ] **Step 5: 运行全量测试确认无回归**

Run: `npm test`
Expected: PASS，所有既有测试仍通过

- [ ] **Step 6: 提交**

```bash
git add src/utils/formatText.js src/utils/formatText.test.js
git commit -m "feat: 文本修正加入空格规则与 Markdown 标记隔离

只删中文相关空格，保留英文单词间空格。
行首标记先剥离再修正，否则 '## 标题' 会被压成 '##标题'。"
```

---

## Task 3: Word 导出接入修正、补行距、抽出 buildDocxBlob

**Files:**
- Modify: `src/utils/exportDocx.js`（整份替换）

本任务无单元测试（涉及二进制文档生成与浏览器下载 API），验证方式为构建通过 + Task 7 的浏览器实测。

改动要点：删除文件内自带的 `normalizeQuotes`（其中第 13-16 行是死代码，导致未配对引号一律变成开引号）、所有段落补单倍行距、把文档构造与下载拆开以便压缩包复用、`revokeObjectURL` 延后。

- [ ] **Step 1: 整份替换 exportDocx.js**

将 `src/utils/exportDocx.js` 全部内容替换为：

```js
/**
 * 导出 Word 文档（.docx）
 * 字体：宋体（正文）/ 黑体（标题）
 * 字号：标题三号(16pt)、小标题四号(14pt)、正文五号(10.5pt)
 * docx 库动态按需加载，不影响首屏体积
 */

import { formatArticleText } from './formatText.js';

// 字号（半磅单位，docx 规范）
const SIZE = {
  TITLE: 32,   // 三号 16pt
  HEADING: 28, // 四号 14pt
  BODY: 21,    // 五号 10.5pt
};

const FONT = {
  TITLE: '黑体',
  HEADING: '黑体',
  BODY: '宋体',
};

// 单倍行距。240 twip = 1 行
const LINE_SPACING = { line: 240, lineRule: 'auto' };

/**
 * 构造 .docx 并返回 Blob。
 * 与 downloadAsDocx 分离，是为了让压缩包导出复用同一份文档构造逻辑。
 */
export async function buildDocxBlob(title, content) {
  const { Document, Packer, Paragraph, TextRun, AlignmentType, convertInchesToTwip } =
    await import('docx');

  // 兜底：正文在 AI 生成时已修正过，但用户可能手动编辑引入新的格式问题。
  // formatArticleText 幂等，重复调用安全
  const text = formatArticleText(content);
  const docTitle = formatArticleText(title);

  const mkTitle = (t) => new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 200, ...LINE_SPACING },
    children: [new TextRun({ text: t, font: FONT.TITLE, size: SIZE.TITLE, bold: true })],
  });

  const mkH2 = (t) => new Paragraph({
    spacing: { before: 160, after: 80, ...LINE_SPACING },
    children: [new TextRun({ text: t, font: FONT.HEADING, size: SIZE.HEADING, bold: true })],
  });

  const mkH3 = (t) => new Paragraph({
    spacing: { before: 120, after: 60, ...LINE_SPACING },
    children: [new TextRun({ text: t, font: FONT.HEADING, size: SIZE.HEADING })],
  });

  const mkBody = (t) => new Paragraph({
    spacing: { before: 0, after: 60, ...LINE_SPACING },
    indent: { firstLine: convertInchesToTwip(0.28) }, // 首行缩进约两字符
    children: [new TextRun({ text: t, font: FONT.BODY, size: SIZE.BODY })],
  });

  const mkEmpty = () => new Paragraph({
    spacing: { ...LINE_SPACING },
    children: [new TextRun({ text: '', font: FONT.BODY, size: SIZE.BODY })],
  });

  // 解析 Markdown 行
  const paragraphs = [];
  if (docTitle) {
    paragraphs.push(mkTitle(docTitle));
    paragraphs.push(mkEmpty());
  }

  for (const line of text.split('\n')) {
    if (line.startsWith('### '))      paragraphs.push(mkH3(line.slice(4).trim()));
    else if (line.startsWith('## '))  paragraphs.push(mkH2(line.slice(3).trim()));
    else if (line.startsWith('# '))   paragraphs.push(mkTitle(line.slice(2).trim()));
    else if (line.trim() === '')      paragraphs.push(mkEmpty());
    else                              paragraphs.push(mkBody(line.trim()));
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: FONT.BODY, size: SIZE.BODY },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(1.18),
            bottom: convertInchesToTwip(1.18),
            left: convertInchesToTwip(1.25),
            right: convertInchesToTwip(1.25),
          },
        },
      },
      children: paragraphs,
    }],
  });

  return Packer.toBlob(doc);
}

/**
 * 生成并下载 .docx 文件
 */
export async function downloadAsDocx(title, content) {
  const blob = await buildDocxBlob(title, content);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(title || '推文').slice(0, 30)}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // 下载是异步的：同步 revoke 会在浏览器读完 blob 前就吊销 URL，
  // 结果是下载列表里有条目但文件为空、打不开
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
```

- [ ] **Step 2: 确认没有残留的旧引用**

Run: `grep -n "normalizeQuotes" src/utils/exportDocx.js`
Expected: 无输出（该函数已完全移除）

- [ ] **Step 3: 确认构建通过**

Run: `npm run build`
Expected: 构建成功，无 import 报错

- [ ] **Step 4: 确认既有测试无回归**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/utils/exportDocx.js
git commit -m "refactor: exportDocx 抽出 buildDocxBlob，补单倍行距

引号处理下沉到 formatText.js，顺带修掉原实现里
未配对引号一律变开引号的缺陷。
revokeObjectURL 延后 60 秒，避免下载到空文件。"
```

---

## Task 4: 安装 fflate 并实现压缩包导出

**Files:**
- Create: `src/utils/exportBundle.js`
- Modify: `package.json`

- [ ] **Step 1: 安装依赖**

Run: `npm install fflate@^0.8.2`
Expected: `package.json` 的 `dependencies` 出现 `"fflate": "^0.8.2"`

- [ ] **Step 2: 确认 imageStore 接口**

Run: `cat src/services/imageStore.js`
Expected: 输出中包含 `export async function getImageBlob(id)`，返回 `Promise<Blob | undefined>`

- [ ] **Step 3: 实现 exportBundle**

创建 `src/utils/exportBundle.js`：

```js
/**
 * 打包下载：推文 Word 文档 + 本次使用的图片
 *
 * 图片编号取 selectedImages 的顺序，与 ChatGeneratePage 喂给模型的
 * 提示词（「图片1（名称）：描述」）同源，因此正文里的编号和文件名一一对应。
 */

import { buildDocxBlob } from './exportDocx.js';
import { getImageBlob } from '../services/imageStore.js';

// 文件系统不接受的字符，与 constants.js 的 FILE_TEMPLATES 保持一致
const UNSAFE_CHARS = /[\\/:*?"<>|]/g;

const MIME_EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
};

function safeName(name, fallback) {
  const cleaned = (name || '').replace(UNSAFE_CHARS, '').trim().slice(0, 40);
  return cleaned || fallback;
}

/** 不信任原文件名的扩展名，优先按 mimeType 推导 */
function extensionFor(image) {
  if (MIME_EXT[image.mimeType]) return MIME_EXT[image.mimeType];
  const dot = (image.name || '').lastIndexOf('.');
  if (dot > 0) return image.name.slice(dot);
  return '.jpg';
}

function stripExtension(name) {
  const dot = (name || '').lastIndexOf('.');
  return dot > 0 ? name.slice(0, dot) : (name || '');
}

async function blobToU8(blob) {
  return new Uint8Array(await blob.arrayBuffer());
}

/**
 * @param {string} title 推文标题
 * @param {string} content 推文正文（Markdown）
 * @param {Array<{id: string, name: string, mimeType: string}>} selectedImages
 * @returns {Promise<{missing: number}>} 缺失的图片数量
 */
export async function downloadBundle(title, content, selectedImages = []) {
  const { zipSync } = await import('fflate');

  const docTitle = safeName(title, '推文');
  const files = {};

  const docxBlob = await buildDocxBlob(title, content);
  files[`${docTitle}.docx`] = await blobToU8(docxBlob);

  let missing = 0;
  for (const [index, image] of selectedImages.entries()) {
    const blob = await getImageBlob(image.id);
    if (!blob) {
      missing += 1;
      continue;
    }
    const label = safeName(stripExtension(image.name), `图片${index + 1}`);
    const filename = `图片${index + 1}_${label}${extensionFor(image)}`;
    files[`图片/${filename}`] = await blobToU8(blob);
  }

  // level 0（store）：图片和 docx 本身已是压缩格式，再压一遍只费时不省体积
  const zipped = zipSync(files, { level: 0 });

  const blob = new Blob([zipped], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${docTitle}_${new Date().toISOString().split('T')[0]}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // 同 exportDocx：同步 revoke 会下载到空文件
  setTimeout(() => URL.revokeObjectURL(url), 60_000);

  return { missing };
}
```

- [ ] **Step 4: 确认构建通过**

Run: `npm run build`
Expected: 构建成功

- [ ] **Step 5: 提交**

```bash
git add package.json package-lock.json src/utils/exportBundle.js
git commit -m "feat: 新增压缩包导出，打包 Word 文稿与编号图片

图片编号取选择顺序，与提示词中的编号一致。
zip 用 store 模式，图片和 docx 已是压缩格式。"
```

---

## Task 5: pipeline 与批注结果接入修正

**Files:**
- Modify: `src/hooks/usePipeline.js:115,163`
- Modify: `src/components/canvas/CanvasEditor.jsx:82,102`

- [ ] **Step 1: pipeline 阶段落定处接入**

编辑 `src/hooks/usePipeline.js`，在文件的 import 区加入：

```js
import { formatArticleText } from '../utils/formatText.js';
```

将第 115 行：

```js
      setCurrentArticle(draftContent || step2Out);
```

改为：

```js
      setCurrentArticle(formatArticleText(draftContent || step2Out));
```

将第 163 行：

```js
      setCurrentArticle(finalContent || step4Out);
```

改为：

```js
      setCurrentArticle(formatArticleText(finalContent || step4Out));
```

**不要改动第 107 行和第 155 行。** 那两处是流式写入，每个响应分片都会触发一次；在那里做修正会让引号在流式过程中反复跳变，且是无谓的重复计算。修正只挂在阶段落定处。

- [ ] **Step 2: 批注结果接入**

编辑 `src/components/canvas/CanvasEditor.jsx`，在 import 区加入：

```js
import { formatArticleText } from '../../utils/formatText.js';
```

将第 82 行（`handleApplyAnnotation` 内）的 `onContentChange(result);` 改为：

```js
      onContentChange(formatArticleText(result));
```

将第 102 行（`handleApplyAllAnnotations` 内）的 `onContentChange(result);` 改为：

```js
      onContentChange(formatArticleText(result));
```

**不要改动第 214 行**（`onChange={(e) => onContentChange(e.target.value)}`）。那是用户在编辑框里逐字输入，实时修正会在打字过程中改动光标位置，体验极差。用户手改的内容由导出时的兜底覆盖。

- [ ] **Step 3: 确认构建与测试通过**

Run: `npm run build && npm test`
Expected: 构建成功，所有测试通过

- [ ] **Step 4: 提交**

```bash
git add src/hooks/usePipeline.js src/components/canvas/CanvasEditor.jsx
git commit -m "feat: AI 生成结果写入正文前先做格式修正

只挂在 pipeline 阶段落定处与批注应用处，
流式写入和用户手动输入不修正。"
```

---

## Task 6: 下载按钮改为下拉菜单

**Files:**
- Modify: `src/components/canvas/CanvasEditor.jsx`
- Modify: `src/pages/ChatGeneratePage.jsx:468-473`
- Modify: `src/styles.css`

- [ ] **Step 1: ChatGeneratePage 传入 selectedImages**

编辑 `src/pages/ChatGeneratePage.jsx`，将第 468-473 行：

```jsx
          <CanvasEditor
            title={currentTitle}
            content={currentArticle}
            onTitleChange={setCurrentTitle}
            onContentChange={setCurrentArticle}
          />
```

改为：

```jsx
          <CanvasEditor
            title={currentTitle}
            content={currentArticle}
            onTitleChange={setCurrentTitle}
            onContentChange={setCurrentArticle}
            selectedImages={selectedImages}
          />
```

`selectedImages` 已存在于该组件（第 40 行 `const [selectedImages, setSelectedImages] = useState([]);`），无需新增状态。

- [ ] **Step 2: CanvasEditor 接收 prop 并加入下拉状态**

编辑 `src/components/canvas/CanvasEditor.jsx`：

将第 20 行的组件签名改为：

```jsx
export default function CanvasEditor({ title, content, onTitleChange, onContentChange, selectedImages = [] }) {
```

将第 6 行的 React import 改为（增加 `useEffect`）：

```jsx
import { useState, useRef, useCallback, useEffect } from 'react';
```

将 lucide-react 的 import 改为（增加 `ChevronDown`、`FileText`、`Package`）：

```jsx
import { Edit3, Eye, Copy, Download, Play, MessageSquarePlus, ChevronDown, FileText, Package } from 'lucide-react';
```

加入 exportBundle 的 import：

```jsx
import { downloadBundle } from '../../utils/exportBundle.js';
```

在 `const contentRef = useRef(null);` 之后加入：

```jsx
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [isBundling, setIsBundling] = useState(false);
  const downloadMenuRef = useRef(null);
```

- [ ] **Step 3: 加入点击外部关闭菜单**

在 `handleTextSelection` 定义之前加入：

```jsx
  useEffect(() => {
    if (!showDownloadMenu) return;
    const close = (e) => {
      if (!downloadMenuRef.current?.contains(e.target)) setShowDownloadMenu(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [showDownloadMenu]);
```

- [ ] **Step 4: 加入压缩包下载处理函数**

在现有 `handleDownload` 函数之后加入：

```jsx
  const handleDownloadBundle = async () => {
    setShowDownloadMenu(false);
    setIsBundling(true);
    try {
      const { missing } = await downloadBundle(title, content, selectedImages);
      if (missing > 0) {
        showToast(`${missing} 张图片数据缺失，已跳过`, 'error');
      } else {
        showToast(SUCCESS_MESSAGES.DOWNLOADED);
      }
    } catch (error) {
      showToast('打包失败：' + error.message, 'error');
    } finally {
      setIsBundling(false);
    }
  };
```

同时修改现有的 `handleDownload`，在开头加入关闭菜单：

```jsx
  const handleDownload = async () => {
    setShowDownloadMenu(false);
    try {
      await downloadAsDocx(title, content);
      showToast(SUCCESS_MESSAGES.DOWNLOADED);
    } catch (error) {
      showToast('导出失败：' + error.message, 'error');
    }
  };
```

- [ ] **Step 5: 替换工具栏下载按钮**

将工具栏中的下载按钮：

```jsx
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download size={14} />
            下载
          </Button>
```

替换为：

```jsx
          <div className="download-menu-wrap" ref={downloadMenuRef}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDownloadMenu(v => !v)}
              loading={isBundling}
              aria-haspopup="menu"
              aria-expanded={showDownloadMenu}
            >
              <Download size={14} />
              下载
              <ChevronDown size={12} />
            </Button>
            {showDownloadMenu && (
              <div className="download-menu" role="menu">
                <button className="download-menu-item" role="menuitem" onClick={handleDownload}>
                  <FileText size={14} />
                  <span className="download-menu-label">下载 Word</span>
                </button>
                <button
                  className="download-menu-item"
                  role="menuitem"
                  onClick={handleDownloadBundle}
                  disabled={selectedImages.length === 0}
                  title={selectedImages.length === 0 ? '本次未选择图片' : ''}
                >
                  <Package size={14} />
                  <span className="download-menu-label">下载压缩包</span>
                  <span className="download-menu-hint">
                    {selectedImages.length === 0 ? '未选图片' : `${selectedImages.length} 张图`}
                  </span>
                </button>
              </div>
            )}
          </div>
```

- [ ] **Step 6: 加入样式**

在 `src/styles.css` 中，紧跟 `.model-dropdown-id { ... }` 规则块之后插入：

```css
/* 画布工具栏 · 下载下拉 */
.download-menu-wrap {
  position: relative;
}

.download-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  min-width: 190px;
  background: var(--bg-card);
  border: 1px solid var(--border-medium);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  z-index: 200;
  overflow: hidden;
}

.download-menu-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  font-size: 0.85rem;
  color: var(--text-primary);
  transition: background var(--transition-fast);
}

.download-menu-item:hover:not(:disabled) {
  background: var(--bg-secondary);
}

.download-menu-item:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.download-menu-label {
  flex: 1;
}

.download-menu-hint {
  font-size: 0.72rem;
  color: var(--text-tertiary);
}
```

- [ ] **Step 7: 确认构建与测试通过**

Run: `npm run build && npm test`
Expected: 构建成功，所有测试通过

- [ ] **Step 8: 提交**

```bash
git add src/components/canvas/CanvasEditor.jsx src/pages/ChatGeneratePage.jsx src/styles.css
git commit -m "feat: 下载按钮改为下拉，新增下载压缩包入口

工具栏已有四组控件，并排加按钮过于拥挤。
未选图片时压缩包项禁用并说明原因。"
```

---

## Task 7: 浏览器实测验收

**Files:** 无代码改动

zip 与 docx 涉及二进制格式与浏览器下载 API，单元测试无法覆盖，必须实测。

- [ ] **Step 1: 启动开发服务器**

Run: `npm run dev`
Expected: 输出 `Local: http://localhost:5173/`

- [ ] **Step 2: 准备素材**

在浏览器打开 `http://localhost:5173/images`，上传 3 张测试图片，为每张填写描述（描述非空才会进入提示词）。

- [ ] **Step 3: 生成一篇推文**

打开 `http://localhost:5173/chat`，选择模型，勾选刚才 3 张图片，填写活动信息，运行 pipeline 直到完成。

- [ ] **Step 4: 验证文本修正生效**

在画布中切到「编辑」模式，检查正文：
- 引号应为中文引号 `“”`，不应出现 ASCII 的 `"`
- 中文与中文之间、中文与英文之间不应有空格
- `## 小标题` 的标记后仍有空格，标题在「预览」模式下正常渲染为标题

若预览模式下小标题变成了普通段落文字，说明 Markdown 标记被破坏，回到 Task 2 检查 `LINE_PREFIX`。

- [ ] **Step 5: 验证 Word 下载**

点击「下载」→「下载 Word」。确认：
- 文件真的落到下载目录且能双击打开（不是 0 字节）
- 标题为黑体、约 16pt（三号）
- 小标题为黑体、约 14pt（四号）
- 正文为宋体、约 10.5pt（五号）
- 正文中的英文字符也是宋体，不是 Times New Roman 等西文字体
- 在 Word 中选中正文段落，「段落」对话框中行距显示为「单倍行距」

- [ ] **Step 6: 验证压缩包下载**

点击「下载」→「下载压缩包」。确认：
- 下拉中该项显示「3 张图」
- 下载得到的 `.zip` 能正常解压
- 结构为：根目录一个 `.docx`，一个 `图片/` 目录内含 3 个文件
- 图片文件名形如 `图片1_原名.jpg`，编号顺序与勾选顺序一致
- 用图片查看器打开每张图，内容与勾选的图片对应

- [ ] **Step 7: 验证未选图片时的禁用态**

刷新页面重新生成一篇推文，这次不勾选任何图片。完成后点击「下载」，确认「下载压缩包」项为灰色不可点，鼠标悬停显示「本次未选择图片」。

- [ ] **Step 8: 验证手改内容的兜底修正**

在「编辑」模式下手动输入一段带英文引号和中文间空格的文字，例如 `他说"测试" 内容 如此`。切回预览——此时正文**不应**被修正（这是预期行为，编辑时不打断输入）。然后点击「下载 Word」，打开文档确认这段文字在文档中已被修正为 `他说“测试”内容如此`。

- [ ] **Step 9: 记录结果**

将 Step 4-8 的实测结果（通过/失败及具体现象）汇总反馈。若全部通过，本计划完成。

---

## 验收标准

全部满足即为完成：

1. `npm test` 全绿，`formatText.test.js` 覆盖引号、空格、Markdown 标记、幂等性四类
2. `npm run build` 成功
3. 生成的推文正文中无 ASCII 引号、无中文相关空格，Markdown 标题标记完好
4. Word 文档：黑体标题/宋体正文、三号/四号/五号、单倍行距、英文字符也走宋体
5. 压缩包结构与图片编号符合 spec §6.2，且下载的文件能正常打开
6. 未选图片时压缩包入口禁用
7. 用户手动编辑的内容在导出时被兜底修正

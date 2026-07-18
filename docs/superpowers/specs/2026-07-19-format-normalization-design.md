# 格式修正系统设计

**日期：** 2026-07-19
**目标：** 统一推文的文本格式（引号、空格）与排版格式（字体、字号、行距），并支持一次性下载包含文稿与编号图片的压缩包。

---

## 一、背景与现状

排查现有代码后确认，需求中约一半已经实现，缺口集中在四处。

| 需求 | 现状 |
|---|---|
| 英文引号 → 中文引号 | 已有，但仅在 Word 导出时生效，且实现有缺陷（见下） |
| 文字间不留空格 | **缺失** |
| 宋体 / 黑体，不用英文字体 | 已满足。`docx` 库的 `createRunFonts` 在接收字符串时会同时写入 `ascii`/`cs`/`eastAsia`/`hAnsi` 四个属性（`node_modules/docx/dist/index.mjs:10144`），因此拉丁字符也走宋体 |
| 标题三号 / 小标题四号 / 正文五号 | 已满足（`exportDocx.js:20-24`，32/28/21 半磅 = 16/14/10.5pt） |
| 单倍行距 | **缺失**，`spacing` 中没有 `line`/`lineRule` |
| 压缩包（文稿 + 编号图片） | **缺失**，项目未安装任何 zip 库 |
| 渲染前修正 | **缺失**，网页预览走原始文本，修正只在导出时发生 |

### 现有引号函数的缺陷

`exportDocx.js:9-17` 的 `normalizeQuotes` 中，第 13-16 行经 hexdump 核对，13、14 行匹配的是同一个 ASCII 双引号 `"`，15、16 行同理匹配同一个 ASCII 单引号 `'`。由于第 13 行已将所有残留双引号替换为开引号，第 14 行成为死代码。

**后果：** 任何未配对的引号一律变成开引号，收引号永远不会出现。

---

## 二、决策记录

以下四项由用户在设计讨论中确定：

1. **空格规则**：只删除中文相关空格。中文↔中文、中文↔英文/数字之间的空格删除；英文单词之间、数字之间的空格保留。
2. **修正时机**：AI 生成后立即改写正文（所见即所得）。附加：导出时再跑一次同一函数兜底，覆盖用户手动编辑引入的格式问题。该函数幂等，重复调用无副作用。
3. **压缩包文稿格式**：仅 `.docx`。
4. **图片命名**：`图片N_原文件名.ext`，N 取用户在图片选择器中的勾选顺序。

---

## 三、依赖选型

压缩包需要 zip 能力，项目当前无相关依赖。

| 方案 | 体积 | 结论 |
|---|---|---|
| **fflate** | ~8KB gzip | **采用。** 仅需 `zipSync` 一个导出，tree-shake 后极小，按 `docx` 的既有模式动态 import，不影响首屏 |
| JSZip | ~100KB | 为单一功能引入过大 |
| 手写 store-only zip | 0 | 需手写 CRC32 表与本地文件头，约 80 行二进制格式代码，出错面大于引入一个成熟依赖 |

**动作：** `package.json` 的 `dependencies` 增加 `"fflate": "^0.8.2"`。

---

## 四、文本修正层 · `src/utils/formatText.js`（新建）

纯函数模块，无外部依赖，全部可单元测试。

### 4.1 对外接口

```js
export function formatArticleText(text): string
```

内部实现拆为两个不导出的辅助函数 `normalizeQuotes` 与 `stripCjkSpaces`，以及一个逐行处理的外壳。

### 4.2 逐行处理与 Markdown 标记隔离

`formatArticleText` 按 `\n` 分行处理，每行先剥离行首 Markdown 标记，仅对剩余正文做修正，再拼回。

**为什么必须隔离：** `## 活动回顾` 中 `#` 是 ASCII 字符、`活` 是中文，「中英之间删空格」的规则会把它变成 `##活动回顾`，标题标记失效。这是规则的直接后果，不隔离必然触发。

行结构正则：

```js
const LINE_PREFIX = /^\s*(#{1,6}\s+|[-*+]\s+|\d+\.\s+|>\s*)?/;
```

处理流程：
1. 匹配并取出 prefix（可能为 `undefined`）
2. prefix 归一化：有标记时统一为 `标记 + 单个空格`（如 `##` + ` `）；无标记时 prefix 为空字符串，行首缩进空白一并丢弃
3. 对行内剩余部分依次应用 `normalizeQuotes`、`stripCjkSpaces`，并 `trim()`
4. 拼接 `prefix + body`
5. 空行原样保留为空字符串

### 4.3 `normalizeQuotes`

**双引号：**

1. 配对替换：`/"([^"\n]*)"/g` → `“$1”`（不跨行，避免把两个不同段落的引号错误配对）
2. 残留的未配对 `"` 按上文判断方向：

```js
out.replace(/"/g, (_, i, s) => {
  const prev = s[i - 1];
  return prev && !/[\s（(【「『]/.test(prev) ? '”' : '“';
});
```

即：前面有实质字符且不是空白或开括号时判为收引号 `”`，否则判为开引号 `“`。这修复了现有实现中「残留引号一律变开引号」的缺陷。

**单引号：**

英文缩写中的撇号必须排除。这不只是「视觉相近但语义错误」的问题：`don't it's` 这类一行内出现两个撇号的文本，配对正则会匹配到 `'t it'` 并把它整段替换成 `‘t it’`，破坏范围远超单个字符。

**判定规则：** 一个 `'` 若同时满足「前一个字符是字母」且「后一个字符是字母」，则判定为撇号，原样保留，且不参与配对。

1. 预处理：扫描全行，把所有满足撇号条件的 `'` 临时替换为私有区占位符 `\uE000`（该码位不会出现在正文中）
2. 配对替换 `/'([^'\n]*)'/g` → `‘$1’`
3. 残留单引号按与双引号相同的上文规则判断方向
4. 还原占位符为 `'`

占位符方案避免了在正则中表达「跳过」这一难以正确实现的语义。

### 4.4 `stripCjkSpaces`

CJK 字符类定义：

```js
const CJK = '\\u4e00-\\u9fff\\u3400-\\u4dbf\\u3000-\\u303f\\uff00-\\uffef';
```

覆盖基本汉字、扩展 A 区、中文标点、全角字符。

两条替换规则，均使用**前瞻**而非捕获第二个字符，以正确处理连续情况（`中 文 中` 在单次全局替换中，若消费第二个字符，`文 中` 将不再匹配）：

```js
text
  .replace(new RegExp(`([${CJK}])[ \\t]+(?=[${CJK}A-Za-z0-9])`, 'g'), '$1')
  .replace(new RegExp(`([A-Za-z0-9])[ \\t]+(?=[${CJK}])`, 'g'), '$1')
```

使用 `[ \t]` 而非 `\s`，避免吞掉换行符。

**保留的空格：** 英文单词之间（`DeepSeek Chat`）、数字之间。这两类不匹配上述任一规则。

### 4.5 幂等性

`formatArticleText(formatArticleText(x)) === formatArticleText(x)` 必须成立，这是「写入时修正 + 导出时兜底」两次调用的安全前提。

各步骤的幂等性论证：
- 引号：首次处理后所有 ASCII 引号已消失，第二次无可匹配
- 空格：首次处理后不存在 CJK 相邻空格，第二次无可匹配
- prefix 归一化：`## ` 归一化后仍为 `## `，稳定

该性质由单元测试锁定。

---

## 五、Word 导出改造 · `src/utils/exportDocx.js`

三处改动：

1. **删除文件内的 `normalizeQuotes`**（第 9-17 行），改为 `import { formatArticleText } from './formatText.js'`。消除重复实现，同时使导出继承修复后的引号逻辑
2. **补充行距。** 所有段落构造函数（`mkTitle`/`mkH2`/`mkH3`/`mkBody`/`mkEmpty`）的 `spacing` 对象增加 `line: 240, lineRule: 'auto'`。240 twip 等于单倍行距
3. **抽出 `buildDocxBlob(title, content)`**，返回 `Promise<Blob>`，包含现有全部文档构造逻辑。`downloadAsDocx` 退化为调用它并触发下载的薄壳

第 3 点是压缩包功能的前提——压缩包与单独下载必须共用同一份文档生成逻辑，不能存在两套。

**不改动：** 字体（`FONT`）、字号（`SIZE`）、页边距。这些已符合要求。

`downloadAsDocx` 中的 `URL.revokeObjectURL(url)`（第 115 行）改为延后 60 秒执行，理由见 §6.4。

---

## 六、压缩包 · `src/utils/exportBundle.js`（新建）

### 6.1 对外接口

```js
export async function downloadBundle(title, content, selectedImages): Promise<{ missing: number }>
```

`selectedImages` 为图片元数据数组（`{ id, name, mimeType }`），顺序即用户勾选顺序。返回缺失图片数量，供调用方提示。

### 6.2 压缩包结构

```
推文标题_2026-07-19.zip
├── 推文标题.docx
└── 图片/
    ├── 图片1_开幕式.jpg
    ├── 图片2_领导讲话.jpg
    └── 图片3_合影.jpg
```

编号顺序与 `ChatGeneratePage.jsx:168` 喂给模型的提示词（`图片${i + 1}（${img.name}）：...`）严格一致，因两者同源于 `selectedImages` 数组顺序。

### 6.3 实现要点

- 文档部分调用 `buildDocxBlob(title, formatArticleText(content))`
- 图片二进制通过 `getImageBlob(id)`（`src/services/imageStore.js`）从 IndexedDB 读取
- Blob 转 `Uint8Array`：`new Uint8Array(await blob.arrayBuffer())`
- 打包：`zipSync(files, { level: 0 })`。图片与 docx 本身已是压缩格式，store 模式无体积损失且更快。`files` 的键使用带斜杠的完整路径字符串（`'图片/图片1_开幕式.jpg'`）
- 扩展名由 `mimeType` 推导，不信任原文件名：`image/jpeg`→`.jpg`、`image/png`→`.png`、`image/gif`→`.gif`、`image/webp`→`.webp`；无法识别时回退到原文件名中的扩展名，仍无法确定则用 `.jpg`
- 文件名清洗复用 `FILE_TEMPLATES.conversation`（`src/utils/constants.js:79`）中的字符过滤规则 `/[\\/:*?"<>|]/g`，图片原名去掉扩展名后再参与拼接
- `getImageBlob` 返回空的图片**跳过并计数**，不静默丢弃。调用方据 `missing` 数量 toast 提示

### 6.4 对象 URL 生命周期

下载触发后，`URL.revokeObjectURL` 必须延后 60 秒：

```js
setTimeout(() => URL.revokeObjectURL(url), 60_000);
```

**理由：** 浏览器下载是异步的。同步 revoke 会在浏览器读完 blob 前吊销 URL，结果是下载列表中出现条目但文件为空、无法打开。此问题已在 `useConversationHistory.js` 的历史导出中实际发生并修复，本次新增的下载入口不得重蹈。

---

## 七、接入点

| 文件与位置 | 改动 |
|---|---|
| `src/hooks/usePipeline.js:127` | `setCurrentArticle(formatArticleText(draftContent \|\| step2Out))` |
| `src/hooks/usePipeline.js:175` | `setCurrentArticle(formatArticleText(finalContent \|\| step4Out))` |
| `src/hooks/usePipeline.js:119`、`:167` | **不改动。** 这两处是流式写入，每个 chunk 触发一次；在此修正会造成引号在流式过程中反复跳变，且做无谓的重复计算。修正只挂在阶段落定处 |
| `src/components/canvas/CanvasEditor.jsx:80` | 批注应用结果 `onContentChange(formatArticleText(result))` |
| `src/components/canvas/CanvasEditor.jsx:101` | 批量批注应用结果同上 |
| `src/utils/exportDocx.js` | 导出时兜底再跑一次修正（幂等，堵住用户手动编辑引入的问题） |
| `src/components/canvas/CanvasEditor.jsx` 工具栏 | 「下载」拆分为「下载 Word」与「下载压缩包」两个动作 |
| `src/pages/ChatGeneratePage.jsx:472` | 向 `CanvasEditor` 传入 `selectedImages` prop（压缩包所需，当前未传） |

### 下载按钮交互

工具栏现有预览/编辑、复制、下载共四组控件，并排再加一个按钮会显得拥挤。采用**主按钮 + 下拉**：主按钮文字为「下载」，点击展开两项菜单（下载 Word / 下载压缩包）。

无选中图片时，「下载压缩包」项禁用并提示「本次未选择图片」。

---

## 八、错误处理

| 场景 | 处理 |
|---|---|
| 部分图片在 IndexedDB 中缺失 | 跳过该图，其余正常打包，toast 提示「N 张图片数据缺失，已跳过」 |
| 全部图片缺失 | 仍生成仅含 docx 的压缩包，toast 提示 |
| `zipSync` 抛错 | catch 后 toast「打包失败：<message>」，与现有 `handleDownload` 的错误处理一致 |
| 未选择任何图片 | 下拉中该项禁用，不进入此流程 |

---

## 九、测试

### 单元测试 · `src/utils/formatText.test.js`（新建）

走既有 Vitest 配置（`vitest.config.js`，jsdom 环境）。覆盖：

- 配对双引号替换
- 未配对双引号的方向判断（行首 → 开引号；跟在中文后 → 收引号）
- 英文缩写 `don't` 的撇号不被替换
- 一行内两个撇号（`don't it's`）不被误配对成 `‘t it’`
- 中文↔中文空格删除
- 中文↔英文空格删除
- 英文单词之间空格保留（`DeepSeek Chat`）
- 连续多处中文空格在单次调用中全部处理（前瞻规则的验证）
- Markdown 标题标记 `## 标题` 不被破坏
- 列表标记 `- 条目`、`1. 条目` 不被破坏
- 空行保留
- **幂等性**：`f(f(x)) === f(x)`

### 浏览器实测

zip 与 docx 涉及二进制格式与浏览器下载 API，不写单元测试，改为实际验证：

1. 生成一篇推文，选择 2-3 张图片
2. 下载压缩包，在系统中解压
3. 确认压缩包结构与 §6.2 一致，图片编号与提示词中的编号对应
4. 用 Word 打开 docx，检查字体为宋体/黑体、标题字号、行距为单倍
5. 确认下载的文件可正常打开（验证 §6.4 的延后 revoke 生效）

---

## 十、文件清单

**新建：**
- `src/utils/formatText.js` — 文本层修正，纯函数
- `src/utils/formatText.test.js` — 单元测试
- `src/utils/exportBundle.js` — 压缩包组装与下载

**修改：**
- `package.json` — 增加 `fflate` 依赖
- `src/utils/exportDocx.js` — 移除内部引号函数、补行距、抽出 `buildDocxBlob`、延后 revoke
- `src/hooks/usePipeline.js` — 两处阶段落定时接入修正
- `src/components/canvas/CanvasEditor.jsx` — 两处批注结果接入修正、下载按钮改下拉、接收 `selectedImages`
- `src/pages/ChatGeneratePage.jsx` — 传递 `selectedImages`

---

## 十一、明确不做

- 不迁移或修正历史记录中已存的文章文本。修正只作用于新生成的内容与导出流程
- 不做代码块、URL 的保护逻辑。公众号推文中不出现代码块；URL 内部本无空格，中英空格规则不会破坏它
- 不为 zip 与 docx 写单元测试，理由见 §9
- 不改动字体、字号、页边距，现状已符合要求

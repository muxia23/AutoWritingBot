/**
 * 推文文本格式修正
 *
 * 纯函数，幂等：formatArticleText(formatArticleText(x)) === formatArticleText(x)。
 * 幂等是必要性质——正文在 AI 生成后修正一次，导出时还会兜底再跑一次。
 */

// 撇号占位符。私有区码位 U+E000，正文不会出现。
// 用 fromCharCode 而非字面量，避免该字符在编辑/复制过程中丢失
const APOSTROPHE = String.fromCharCode(0xe000);

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
  // 't it' 会被当成一对引号整段替换掉。
  // 尾部用前瞻而非捕获：否则 a'b'c 里的第二个撇号会因 b 已被消费而漏掉
  out = out.replace(/([A-Za-z])'(?=[A-Za-z])/g, `$1${APOSTROPHE}`);
  out = out.replace(/'([^'\n]*)'/g, '‘$1’');
  out = out.replace(/'/g, (_, i, s) => closingOrOpening(s, i, '’', '‘'));
  out = out.replaceAll(APOSTROPHE, "'");

  return out;
}

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

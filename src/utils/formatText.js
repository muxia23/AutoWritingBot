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

export function formatArticleText(text) {
  if (!text) return '';
  return text.split('\n').map(normalizeQuotes).join('\n');
}

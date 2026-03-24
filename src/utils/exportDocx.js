/**
 * 导出 Word 文档（.docx）
 * 字体：宋体（正文）/ 黑体（标题）
 * 字号：标题三号(16pt)、小标题四号(14pt)、正文五号(10.5pt)
 * docx 库动态按需加载，不影响首屏体积
 */

// 中文引号替换（英文引号 → 中文引号）
function normalizeQuotes(text) {
  return text
    .replace(/"([^"]*)"/g, '\u201c$1\u201d')
    .replace(/'([^']*)'/g, '\u2018$1\u2019')
    .replace(/"/g, '\u201c')
    .replace(/"/g, '\u201d')
    .replace(/'/g, '\u2018')
    .replace(/'/g, '\u2019');
}

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

/**
 * 生成并下载 .docx 文件
 * @param {string} title 文章标题
 * @param {string} content Markdown 正文内容
 */
export async function downloadAsDocx(title, content) {
  const { Document, Packer, Paragraph, TextRun, AlignmentType, convertInchesToTwip } =
    await import('docx');

  const T = (text) => normalizeQuotes(text);

  const mkTitle = (text) => new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 200 },
    children: [new TextRun({ text: T(text), font: FONT.TITLE, size: SIZE.TITLE, bold: true })],
  });

  const mkH2 = (text) => new Paragraph({
    spacing: { before: 160, after: 80 },
    children: [new TextRun({ text: T(text), font: FONT.HEADING, size: SIZE.HEADING, bold: true })],
  });

  const mkH3 = (text) => new Paragraph({
    spacing: { before: 120, after: 60 },
    children: [new TextRun({ text: T(text), font: FONT.HEADING, size: SIZE.HEADING })],
  });

  const mkBody = (text) => new Paragraph({
    spacing: { before: 0, after: 60 },
    indent: { firstLine: convertInchesToTwip(0.28) }, // 首行缩进约两字符
    children: [new TextRun({ text: T(text), font: FONT.BODY, size: SIZE.BODY })],
  });

  const mkEmpty = () => new Paragraph({
    children: [new TextRun({ text: '', font: FONT.BODY, size: SIZE.BODY })],
  });

  // 解析 Markdown 行
  const paragraphs = [];
  if (title) {
    paragraphs.push(mkTitle(title));
    paragraphs.push(mkEmpty());
  }

  for (const line of content.split('\n')) {
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

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(title || '推文').slice(0, 30)}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

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
  // 文件名同样过修正：否则内容里是「学院举办AI讲座」而文件名带空格
  a.download = `${(formatArticleText(title) || '推文').slice(0, 30)}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // 下载是异步的：同步 revoke 会在浏览器读完 blob 前就吊销 URL，
  // 结果是下载列表里有条目但文件为空、打不开
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

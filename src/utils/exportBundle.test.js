import { describe, it, expect, vi, beforeEach } from 'vitest';

// jsdom 的 Blob 没有 arrayBuffer()，真实浏览器都有（Chrome 76+/Safari 14+）
if (!Blob.prototype.arrayBuffer) {
  Blob.prototype.arrayBuffer = function () {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = reject;
      fr.readAsArrayBuffer(this);
    });
  };
}

vi.mock('./exportDocx.js', () => ({
  buildDocxBlob: async () => new Blob(['docx'], { type: 'application/octet-stream' }),
}));
const store = new Map();
vi.mock('../services/imageStore.js', () => ({
  getImageBlob: async (id) => store.get(id),
}));

const { downloadBundle } = await import('./exportBundle.js');

describe('downloadBundle 命名与缺图', () => {
  let captured;
  beforeEach(() => {
    store.clear();
    captured = null;
    // jsdom 不实现这两个方法，spyOn 无从下手，直接赋值
    URL.createObjectURL = (b) => { captured = b; return 'blob:x'; };
    URL.revokeObjectURL = () => {};
    HTMLAnchorElement.prototype.click = vi.fn();
  });

  it('按勾选顺序编号，保留原文件名，扩展名按 mimeType 推导', async () => {
    store.set('a', new Blob([new Uint8Array([1])]));
    store.set('b', new Blob([new Uint8Array([2])]));
    const { missing } = await downloadBundle('活动回顾', '正文', [
      { id: 'a', name: '开幕式.jpeg', mimeType: 'image/jpeg' },
      { id: 'b', name: '合影.bmp', mimeType: 'image/png' },
    ]);
    expect(missing).toBe(0);
    const { unzipSync } = await import('fflate');
    const names = Object.keys(unzipSync(new Uint8Array(await captured.arrayBuffer())));
    expect(names).toContain('活动回顾.docx');
    expect(names).toContain('图片/图片1_开幕式.jpg');
    expect(names).toContain('图片/图片2_合影.png');
  });

  it('缺失的图片被跳过并计数，docx 仍然生成', async () => {
    store.set('a', new Blob([new Uint8Array([1])]));
    const { missing } = await downloadBundle('推文', '正文', [
      { id: 'a', name: '有.jpg', mimeType: 'image/jpeg' },
      { id: 'gone', name: '没了.jpg', mimeType: 'image/jpeg' },
    ]);
    expect(missing).toBe(1);
    const { unzipSync } = await import('fflate');
    const names = Object.keys(unzipSync(new Uint8Array(await captured.arrayBuffer())));
    expect(names).toContain('推文.docx');
    expect(names).toHaveLength(2);
  });

  it('文件名与文档内容用同一套修正，标题里的空格不残留', async () => {
    // 浏览器实测抓到的 bug：文件名走原始 title，内容走 formatArticleText，
    // 结果压缩包里是「学院 举办 AI 讲座.docx」而正文标题是「学院举办AI讲座」
    await downloadBundle('学院 举办 AI 讲座', '正文', []);
    const { unzipSync } = await import('fflate');
    const names = Object.keys(unzipSync(new Uint8Array(await captured.arrayBuffer())));
    expect(names).toContain('学院举办AI讲座.docx');
  });

  it('标题里的非法字符被清洗', async () => {
    await downloadBundle('活动/回顾:2026', '正文', []);
    const { unzipSync } = await import('fflate');
    expect(Object.keys(unzipSync(new Uint8Array(await captured.arrayBuffer())))).toContain('活动回顾2026.docx');
  });
});

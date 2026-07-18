import { describe, it, expect } from 'vitest';
import { blobToBase64 } from './blobUtils.js';

describe('blobToBase64', () => {
  it('把 Blob 转成不含 data URL 前缀的 base64', async () => {
    const blob = new Blob(['hello'], { type: 'text/plain' });
    const base64 = await blobToBase64(blob);
    expect(base64).toBe('aGVsbG8=');
    expect(base64).not.toContain('data:');
    expect(base64).not.toContain(',');
  });

  it('空 Blob 返回空字符串', async () => {
    const blob = new Blob([], { type: 'text/plain' });
    const base64 = await blobToBase64(blob);
    expect(base64).toBe('');
  });
});

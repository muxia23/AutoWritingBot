import { describe, it, expect, vi, afterEach } from 'vitest';
import { ApiService } from './api.js';

const encoder = new TextEncoder();

/** 把若干段字节流包装成 fetch Response 形状；条目为 { throw: err } 时在 read() 中抛出 */
function mockStreamResponse(chunks) {
  let i = 0;
  return {
    ok: true,
    body: {
      getReader: () => ({
        read: async () => {
          if (i < chunks.length) {
            const chunk = chunks[i++];
            if (typeof chunk === 'object' && chunk.throw) throw chunk.throw;
            return { done: false, value: encoder.encode(chunk) };
          }
          return { done: true, value: undefined };
        },
        cancel: vi.fn()
      })
    }
  };
}

const sse = (content) => `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n`;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ApiService.postStream', () => {
  it('拼接多个 SSE 分块并逐段回调', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      mockStreamResponse([sse('你好') + sse('世界'), sse('！') + 'data: [DONE]\n'])
    ));

    const deltas = [];
    const result = await ApiService.postStream('http://x', {}, {}, (d) => deltas.push(d));

    expect(result).toBe('你好世界！');
    expect(deltas).toEqual(['你好', '世界', '！']);
  });

  it('data 行被网络分块截断时能跨块拼接', async () => {
    const line = sse('完整内容');
    const mid = Math.floor(line.length / 2);
    vi.stubGlobal('fetch', vi.fn(async () =>
      mockStreamResponse([line.slice(0, mid), line.slice(mid)])
    ));

    const result = await ApiService.postStream('http://x', {}, {}, () => {});
    expect(result).toBe('完整内容');
  });

  it('跳过空行、[DONE] 和无法解析的行', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      mockStreamResponse(['\n: keep-alive\ndata: {broken json\n' + sse('ok') + 'data: [DONE]\n'])
    ));

    const result = await ApiService.postStream('http://x', {}, {}, () => {});
    expect(result).toBe('ok');
  });

  it('非 2xx 响应抛出接口返回的错误信息', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({ error: { message: 'Invalid API key' } })
    })));

    await expect(ApiService.postStream('http://x', {}, {}, () => {}))
      .rejects.toThrow('Invalid API key');
  });

  it('读流中途被 abort 时抛出 AbortError，而不是把半截文本当成功返回', async () => {
    const abortError = new DOMException('aborted', 'AbortError');
    vi.stubGlobal('fetch', vi.fn(async () =>
      mockStreamResponse([sse('前半段'), { throw: abortError }])
    ));

    await expect(ApiService.postStream('http://x', {}, {}, () => {}))
      .rejects.toMatchObject({ name: 'AbortError' });
  });
});

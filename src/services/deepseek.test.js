import { describe, it, expect, vi, afterEach } from 'vitest';
import { DeepSeekAPI } from './deepseek.js';
import { ApiService } from './api.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('DeepSeekAPI 模型参数', () => {
  it('chat 默认使用内置 temperature/max_tokens', async () => {
    const post = vi.spyOn(ApiService, 'post').mockResolvedValue({
      choices: [{ message: { content: 'ok' } }]
    });

    await DeepSeekAPI.chat([{ role: 'user', content: 'hi' }], { apiKey: 'k' });

    const body = post.mock.calls[0][1];
    expect(body.temperature).toBe(0.7);
    expect(body.max_tokens).toBe(4000);
  });

  it('chat 使用模型配置里的 temperature/maxTokens 覆盖默认值', async () => {
    const post = vi.spyOn(ApiService, 'post').mockResolvedValue({
      choices: [{ message: { content: 'ok' } }]
    });

    await DeepSeekAPI.chat(
      [{ role: 'user', content: 'hi' }],
      { apiKey: 'k', temperature: 1.2, maxTokens: 8000 }
    );

    const body = post.mock.calls[0][1];
    expect(body.temperature).toBe(1.2);
    expect(body.max_tokens).toBe(8000);
  });

  it('temperature 为 0 时不被默认值覆盖', async () => {
    const post = vi.spyOn(ApiService, 'post').mockResolvedValue({
      choices: [{ message: { content: 'ok' } }]
    });

    await DeepSeekAPI.chat([{ role: 'user', content: 'hi' }], { apiKey: 'k', temperature: 0 });

    expect(post.mock.calls[0][1].temperature).toBe(0);
  });

  it('chatWithHistoryStream 也透传模型配置参数', async () => {
    const postStream = vi.spyOn(ApiService, 'postStream').mockResolvedValue('ok');

    await DeepSeekAPI.chatWithHistoryStream(
      'sys',
      [{ role: 'user', content: 'hi' }],
      { apiKey: 'k', temperature: 0.3, maxTokens: 6000 },
      () => {}
    );

    const body = postStream.mock.calls[0][1];
    expect(body.temperature).toBe(0.3);
    expect(body.max_tokens).toBe(6000);
    expect(body.stream).toBe(true);
  });
});

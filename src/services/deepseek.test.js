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
    expect(body.max_tokens).toBe(8000);
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

  it('analyzeImage 使用传入的提示词文本', async () => {
    const post = vi.spyOn(ApiService, 'post').mockResolvedValue({
      choices: [{ message: { content: '场景：会议室' } }]
    });

    await DeepSeekAPI.analyzeImage('base64data', 'image/jpeg', { apiKey: 'k' }, '自定义识图指令');

    const body = post.mock.calls[0][1];
    expect(body.messages[0].content[0].text).toBe('自定义识图指令');
    expect(body.messages[0].content[1].image_url.url).toBe('data:image/jpeg;base64,base64data');
  });

  it('analyzeImage 未传提示词时回落到默认识图提示词', async () => {
    const post = vi.spyOn(ApiService, 'post').mockResolvedValue({
      choices: [{ message: { content: '场景：会议室' } }]
    });

    await DeepSeekAPI.analyzeImage('base64data', 'image/jpeg', { apiKey: 'k' });

    const text = post.mock.calls[0][1].messages[0].content[0].text;
    expect(text).toContain('客观');
    expect(text).toContain('可见文字');
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

describe('DeepSeekAPI 批注应用', () => {
  const mockPost = () => vi.spyOn(ApiService, 'post').mockResolvedValue({
    choices: [{ message: { content: '改后的正文' } }]
  });
  const userPromptOf = (post) => post.mock.calls[0][1].messages[1].content;

  const article = '开头段落写了活动背景介绍。中间这句话需要修改一下。结尾段落做了总结与展望。';

  it('批注附带全文中的前后文位置参考', async () => {
    const post = mockPost();

    await DeepSeekAPI.applyAnnotations('sys', article, [
      { type: 'fix', selectedText: '中间这句话需要修改一下', content: '改成主动语态' }
    ], { apiKey: 'k' });

    const prompt = userPromptOf(post);
    expect(prompt).toContain('位置参考');
    expect(prompt).toContain('活动背景介绍。');   // 前文
    expect(prompt).toContain('。结尾段落');        // 后文
  });

  it('选中文字在全文中找不到时不输出位置参考', async () => {
    const post = mockPost();

    await DeepSeekAPI.applyAnnotations('sys', article, [
      { type: 'fix', selectedText: '早已不存在的句子', content: '随便改改' }
    ], { apiKey: 'k' });

    expect(userPromptOf(post)).not.toContain('【批注文字】');
  });

  it('批量混合批注时按条约束：重写与修正/润色规则同时在场', async () => {
    const post = mockPost();

    await DeepSeekAPI.applyAnnotations('sys', article, [
      { type: 'rewrite', selectedText: '开头段落写了活动背景介绍', content: '更有感染力' },
      { type: 'fix', selectedText: '中间这句话需要修改一下', content: '改错别字' }
    ], { apiKey: 'k' });

    const prompt = userPromptOf(post);
    expect(prompt).toContain('「重写」');
    expect(prompt).toContain('衔接');
    expect(prompt).toContain('逐字保留');   // 修正/润色的严格约束不再因重写在场而消失
  });

  it('applyInlineAnnotation 复用批量路径，格式一致', async () => {
    const post = mockPost();

    await DeepSeekAPI.applyInlineAnnotation('sys', article, {
      type: 'style', selectedText: '结尾段落做了总结与展望', content: '更简洁'
    }, { apiKey: 'k' });

    const prompt = userPromptOf(post);
    expect(prompt).toContain('[批注] 润色');
    expect(prompt).toContain('位置参考');
    expect(post.mock.calls[0][1].messages[0].content).toBe('sys');
  });
});

/**
 * 通用 API 服务层
 */

export const ApiService = {
  /**
   * 发送 HTTP 请求
   */
  async request(url, options = {}) {
    const {
      method = 'GET',
      headers = {},
      body = null,
      timeout = 120000
    } = options;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: body ? JSON.stringify(body) : null,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // 兼容不同厂商的错误格式：{ message }, { error: { message } }, { msg }
        const errMsg =
          errorData?.error?.message ||
          errorData?.message ||
          errorData?.msg ||
          `HTTP ${response.status}: ${response.statusText}`;
        console.error('[API Error]', response.status, errMsg, errorData);
        throw new Error(errMsg);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error('请求超时');
      }

      throw error;
    }
  },

  /**
   * GET 请求
   */
  async get(url, headers = {}) {
    return this.request(url, { method: 'GET', headers });
  },

  /**
   * POST 请求
   */
  async post(url, data, headers = {}) {
    return this.request(url, { method: 'POST', headers, body: data });
  },

  /**
   * 流式 POST 请求（Server-Sent Events）
   * @param {string} url
   * @param {object} data - 请求体（调用方需自行设置 stream: true）
   * @param {object} headers
   * @param {function} onChunk - 每收到一段文字回调 (delta: string) => void
   * @returns {Promise<string>} 完整响应文本
   */
  async postStream(url, data, headers = {}, onChunk) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errMsg =
        errorData?.error?.message ||
        errorData?.message ||
        errorData?.msg ||
        `HTTP ${response.status}: ${response.statusText}`;
      console.error('[API Stream Error]', response.status, errMsg, errorData);
      throw new Error(errMsg);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      // 最后一行可能不完整，留到下次拼接
      buffer = lines.pop();

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (!trimmed.startsWith('data: ')) continue;

        try {
          const json = JSON.parse(trimmed.slice(6));
          const delta = json.choices?.[0]?.delta?.content || '';
          if (delta) {
            fullText += delta;
            onChunk?.(delta, fullText);
          }
        } catch {
          // 跳过解析失败的行
        }
      }
    }

    return fullText;
  }
};

/**
 * 对话管理 Hook
 * 支持多轮对话、标题提取、消息历史管理
 */

import { useState, useCallback, useEffect } from 'react';

export function useConversation() {
  const [messages, setMessages] = useState([]);
  const [currentArticle, setCurrentArticle] = useState('');
  const [currentTitle, setCurrentTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 添加用户消息
  const addUserMessage = useCallback((content) => {
    setMessages(prev => [...prev, { role: 'user', content }]);
  }, []);

  // 添加助手消息
  const addAssistantMessage = useCallback((content) => {
    setMessages(prev => [...prev, { role: 'assistant', content }]);
  }, []);

  // 解析 AI 响应，提取标题和内容
  const parseResponse = useCallback((response) => {
    // 检查是否包含 # [标题] 格式
    const titleMatch = response.match(/^#\s+(.+?)$/m);

    if (titleMatch) {
      const title = titleMatch[1].trim();
      // 移除标题行，保留剩余内容
      const content = response.replace(/^#\s+.+?\n?/m, '').trim();
      return { title, content };
    }

    // 如果没有标题格式，自动生成标题
    return { title: '未命名推文', content: response };
  }, []);

  // 设置当前文章和标题
  const setCurrentResponse = useCallback((response) => {
    const { title, content } = parseResponse(response);
    setCurrentTitle(title);
    setCurrentArticle(content);
    return { title, content };
  }, [parseResponse]);

  // 清空对话
  const clearConversation = useCallback(() => {
    setMessages([]);
    setCurrentArticle('');
    setCurrentTitle('');
  }, []);

  // 删除最后一条消息（用于重新生成）
  const removeLastMessage = useCallback(() => {
    setMessages(prev => prev.slice(0, -1));
  }, []);

  // 构建消息数组（包含系统提示词）
  const buildMessagesWithSystem = useCallback((systemPrompt) => {
    return [
      { role: 'system', content: systemPrompt },
      ...messages
    ];
  }, [messages]);

  // 获取消息历史（不包含系统提示词）
  const getMessageHistory = useCallback(() => {
    return messages;
  }, [messages]);

  // 设置完整的消息数组（用于恢复对话）
  const setMessagesFull = useCallback((newMessages) => {
    setMessages(newMessages);
  }, [setMessages]);

  return {
    // 状态
    messages,
    currentArticle,
    currentTitle,
    isLoading,
    setIsLoading,
    setCurrentArticle,
    setCurrentTitle,

    // 操作方法
    addUserMessage,
    addAssistantMessage,
    parseResponse,
    setCurrentResponse,
    clearConversation,
    removeLastMessage,
    buildMessagesWithSystem,
    getMessageHistory,
    setMessages: setMessagesFull
  };
}

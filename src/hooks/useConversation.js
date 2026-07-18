/**
 * 当前推文（标题 + 正文）状态管理 Hook
 */

import { useState, useCallback } from 'react';

export function useConversation() {
  const [currentArticle, setCurrentArticle] = useState('');
  const [currentTitle, setCurrentTitle] = useState('');

  // 清空当前推文
  const clearConversation = useCallback(() => {
    setCurrentArticle('');
    setCurrentTitle('');
  }, []);

  return {
    currentArticle,
    currentTitle,
    setCurrentArticle,
    setCurrentTitle,
    clearConversation
  };
}

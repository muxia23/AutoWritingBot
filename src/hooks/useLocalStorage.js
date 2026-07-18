/**
 * localStorage 自定义 Hook
 */

import { useState, useCallback } from 'react';

/**
 * @param {string} key
 * @param {*} initialValue
 * @param {(error: Error) => void} [onError] 写入/读取失败时的回调（如配额超限）
 */
export function useLocalStorage(key, initialValue = '', onError) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // 必须走 React 的函数式更新拿 prev，不能读闭包捕获的 storedValue：
  // 调用方（如图片库批量上传）会在一次渲染内连续调用，读闭包会让后一次覆盖前一次。
  const setValue = useCallback((value) => {
    setStoredValue(prev => {
      const valueToStore = value instanceof Function ? value(prev) : value;
      try {
        localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
        if (onError) onError(error);
      }
      return valueToStore;
    });
  }, [key, onError]);

  const removeValue = useCallback(() => {
    try {
      localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
      if (onError) onError(error);
    }
  }, [key, initialValue, onError]);

  return [storedValue, setValue, removeValue];
}

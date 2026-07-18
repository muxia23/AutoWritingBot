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

  const setValue = useCallback((value) => {
    const valueToStore = value instanceof Function ? value(storedValue) : value;
    try {
      localStorage.setItem(key, JSON.stringify(valueToStore));
      setStoredValue(valueToStore);
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
      setStoredValue(valueToStore);
      if (onError) onError(error);
    }
  }, [key, storedValue, onError]);

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

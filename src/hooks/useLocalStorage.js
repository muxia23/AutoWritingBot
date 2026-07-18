/**
 * localStorage 自定义 Hook
 *
 * 同一个 key 可能被多个组件各自调用（如 ChatGeneratePage 与弹窗内的
 * ConversationHistory）。模块级订阅表让这些实例保持同步——否则陈旧实例
 * 会在下次写入时把别处已删除的数据重新写回。
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/** key -> Set<(value) => void> */
const listeners = new Map();

function readKey(key, initialValue) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : initialValue;
  } catch (error) {
    console.error(`Error reading localStorage key "${key}":`, error);
    return initialValue;
  }
}

/** 写入并同步通知该 key 的所有实例 */
function writeKey(key, value, onError) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error setting localStorage key "${key}":`, error);
    if (onError) onError(error);
  }
  const subs = listeners.get(key);
  if (subs) subs.forEach(fn => fn(value));
}

/**
 * @param {string} key
 * @param {*} initialValue
 * @param {(error: Error) => void} [onError] 写入/读取失败时的回调（如配额超限）
 */
export function useLocalStorage(key, initialValue = '', onError) {
  const [storedValue, setStoredValue] = useState(() => readKey(key, initialValue));

  // 镜像最新值。通知是同步的，所以一次渲染内连续调用 setValue
  // （如图片库批量上传的 for + await 循环）也能读到上一次的结果。
  const valueRef = useRef(storedValue);

  useEffect(() => {
    const fresh = readKey(key, initialValue);
    valueRef.current = fresh;
    setStoredValue(fresh);

    const receive = (value) => {
      valueRef.current = value;
      setStoredValue(value);
    };
    let subs = listeners.get(key);
    if (!subs) {
      subs = new Set();
      listeners.set(key, subs);
    }
    subs.add(receive);

    return () => {
      subs.delete(receive);
      if (subs.size === 0) listeners.delete(key);
    };
    // initialValue 常为字面量，纳入依赖会导致每次渲染重订阅
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const setValue = useCallback((value) => {
    const next = value instanceof Function ? value(valueRef.current) : value;
    valueRef.current = next;
    writeKey(key, next, onError);
  }, [key, onError]);

  const removeValue = useCallback(() => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
      if (onError) onError(error);
    }
    valueRef.current = initialValue;
    const subs = listeners.get(key);
    if (subs) subs.forEach(fn => fn(initialValue));
    else setStoredValue(initialValue);
  }, [key, initialValue, onError]);

  return [storedValue, setValue, removeValue];
}

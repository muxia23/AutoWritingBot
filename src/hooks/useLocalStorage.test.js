import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from './testUtils.js';
import { useLocalStorage } from './useLocalStorage.js';

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('useLocalStorage', () => {
  it('写入成功时不调用 onError', () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useLocalStorage('k', [], onError));
    act(() => result.current[1](['a']));
    expect(onError).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem('k'))).toEqual(['a']);
  });

  it('写入抛 QuotaExceededError 时调用 onError', () => {
    const onError = vi.fn();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      const err = new Error('quota');
      err.name = 'QuotaExceededError';
      throw err;
    });
    const { result } = renderHook(() => useLocalStorage('k', [], onError));
    act(() => result.current[1](['a']));
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0].name).toBe('QuotaExceededError');
  });

  it('不传 onError 时不抛异常', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    const { result } = renderHook(() => useLocalStorage('k', []));
    expect(() => act(() => result.current[1](['a']))).not.toThrow();
  });

  // 回归测试：图片库上传多张图时是 `for (const f of files) await addImage(f)` 循环，
  // 循环快于 React 重渲染。若函数式更新读的是闭包捕获的 storedValue 而非最新 state，
  // 后一次会覆盖前一次，导致只剩最后一条。
  it('同一次渲染内连续函数式更新不丢数据', () => {
    const { result } = renderHook(() => useLocalStorage('k', []));
    act(() => {
      result.current[1](prev => [...prev, 'a']);
      result.current[1](prev => [...prev, 'b']);
      result.current[1](prev => [...prev, 'c']);
    });
    expect(result.current[0]).toEqual(['a', 'b', 'c']);
    expect(JSON.parse(localStorage.getItem('k'))).toEqual(['a', 'b', 'c']);
  });

  it('连续函数式更新后 localStorage 与 state 一致', () => {
    const { result } = renderHook(() => useLocalStorage('k', []));
    act(() => {
      for (let i = 0; i < 30; i++) {
        result.current[1](prev => [...prev, i]);
      }
    });
    expect(result.current[0]).toHaveLength(30);
    expect(JSON.parse(localStorage.getItem('k'))).toHaveLength(30);
  });
});

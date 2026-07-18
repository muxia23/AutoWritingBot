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
});

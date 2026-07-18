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

  // 回归测试：同一个 key 会被多个组件各自调用（如 ChatGeneratePage 与弹窗内的
  // ConversationHistory）。若实例间不同步，弹窗里「清空历史」后，页面那份陈旧
  // 实例会在下次写入时把已删数据重新写回，用户的删除被静默撤销。
  it('同一 key 的多个实例保持同步', () => {
    const a = renderHook(() => useLocalStorage('shared', ['x']));
    const b = renderHook(() => useLocalStorage('shared', ['x']));

    act(() => b.result.current[1]([]));           // 实例 B 清空
    expect(b.result.current[0]).toEqual([]);
    expect(a.result.current[0]).toEqual([]);      // 实例 A 必须同步感知

    act(() => a.result.current[1](prev => [...prev, 'new']));
    expect(JSON.parse(localStorage.getItem('shared'))).toEqual(['new']);  // 不能复活 'x'
  });

  it('实例卸载后不再接收更新', () => {
    const a = renderHook(() => useLocalStorage('shared2', []));
    const b = renderHook(() => useLocalStorage('shared2', []));
    a.unmount();
    expect(() => act(() => b.result.current[1](['ok']))).not.toThrow();
    expect(JSON.parse(localStorage.getItem('shared2'))).toEqual(['ok']);
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

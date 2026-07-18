import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('idb-keyval', () => ({
  createStore: vi.fn(() => 'MOCK_STORE'),
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  clear: vi.fn(),
}));

import { get, set, del, clear } from 'idb-keyval';
import { getImageBlob, setImageBlob, delImageBlob, clearImageBlobs } from './imageStore.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('imageStore', () => {
  it('setImageBlob 用 id 作为键写入自定义 store', async () => {
    const blob = new Blob(['x']);
    await setImageBlob('img-1', blob);
    expect(set).toHaveBeenCalledWith('img-1', blob, 'MOCK_STORE');
  });

  it('getImageBlob 用 id 作为键读取', async () => {
    const blob = new Blob(['x']);
    get.mockResolvedValue(blob);
    const result = await getImageBlob('img-1');
    expect(get).toHaveBeenCalledWith('img-1', 'MOCK_STORE');
    expect(result).toBe(blob);
  });

  it('getImageBlob 在图片不存在时返回 null', async () => {
    get.mockResolvedValue(undefined);
    const result = await getImageBlob('missing');
    expect(result).toBeNull();
  });

  it('delImageBlob 删除对应键', async () => {
    await delImageBlob('img-1');
    expect(del).toHaveBeenCalledWith('img-1', 'MOCK_STORE');
  });

  it('clearImageBlobs 清空整个 store', async () => {
    await clearImageBlobs();
    expect(clear).toHaveBeenCalledWith('MOCK_STORE');
  });
});

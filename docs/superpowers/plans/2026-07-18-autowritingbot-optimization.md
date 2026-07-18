# AutoWritingBot 优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复图片库存储配额缺陷，为 ChatGeneratePage 接入对话历史，让 Pipeline 面板可折叠，放宽领导名字数上限，并修复重新部署后前端白屏的缓存问题。

**Architecture:** 图片二进制迁移到 IndexedDB（`idb-keyval`），localStorage 只保留元数据，腾出配额给对话历史；`useLocalStorage` 增加可选 `onError` 回调，把静默的 `QuotaExceededError` 变成可见的 toast；纯逻辑抽成独立模块以便单测；nginx 为 `index.html` 关闭缓存。

**Tech Stack:** React 18 + Vite 5 + react-router-dom 6，新增 `idb-keyval`（运行时）与 `vitest` + `jsdom`（开发时）。无 TypeScript。

**依赖顺序：** Task 1 → 2 → 3 → 4 → 5 → 6 → 7 必须按序（图片迁移链）。Task 8-10（对话历史）依赖 Task 1 与 Task 7。Task 11、12、13 相互独立，可随时插入。

---

## 关键背景（实施者必读）

**这个项目没有后端。** 纯前端 SPA，构建产物由 nginx 静态托管。所有数据存在浏览器里。

**代码库中存在不可达代码。** `src/pages/EditorPage.jsx` 与 `src/pages/GeneratePage.jsx` 未在 `src/App.jsx` 注册任何路由，无法访问。它们引用了 `useConversationHistory`，但这不代表该功能在线上可用。**本计划不修改、不删除这两个文件**，但修改共享 hook 时它们会被动受影响——这没关系，因为它们本来就跑不到。

**`useLocalStorage` 每个调用方持有独立 state。** 它内部是 `useState` + `localStorage`，没有跨组件同步机制。两个组件同时调用 `useConversationHistory()` 会得到两份互不相通的 state。Task 9 用「条件挂载」规避，不要试图在别处共享。

**当前 localStorage 可能已被图片撑爆。** 开发时若发现数据存不进去，先在 DevTools → Application → Local Storage 里清掉 `image_library` 这个 key。

---

## 文件结构

**新建：**

| 文件 | 职责 |
|------|------|
| `vitest.config.js` | Vitest 配置，jsdom 环境 |
| `src/services/imageStore.js` | IndexedDB 图片二进制读写封装 |
| `src/utils/blobUtils.js` | Blob ↔ base64 转换（纯函数，可单测） |
| `src/utils/imageMigration.js` | 旧格式图片条目识别（纯函数，可单测） |
| `src/utils/historyUtils.js` | 历史记录追加与容量淘汰（纯函数，可单测） |
| `src/hooks/useObjectUrl.js` | 从 Blob 生成 object URL 并在卸载时回收 |

**修改：**

| 文件 | 改动 |
|------|------|
| `src/hooks/useLocalStorage.js` | 增加可选 `onError` 回调 |
| `src/context/ImageContext.jsx` | 图片二进制走 IndexedDB，元数据留 localStorage |
| `src/pages/ImageLibraryPage.jsx` | 缩略图改用 object URL |
| `src/components/images/ImagePickerModal.jsx` | 缩略图改用 object URL |
| `src/hooks/useConversationHistory.js` | 容量上限 + 写入失败上报 |
| `src/pages/ChatGeneratePage.jsx` | 保存/恢复历史、领导名 maxLength |
| `src/components/pipeline/PipelinePanel.jsx` | 折叠能力 |
| `nginx.conf` | `index.html` 禁用缓存 |
| `Dockerfile` | 增加 HEALTHCHECK |

---

## Task 1: 搭建 Vitest

**Files:**
- Create: `vitest.config.js`
- Modify: `package.json`

- [ ] **Step 1: 安装依赖**

```bash
npm install -D vitest@^2.1.8 jsdom@^25.0.1
```

- [ ] **Step 2: 创建 Vitest 配置**

Create `vitest.config.js`:

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.js'],
  },
});
```

- [ ] **Step 3: 添加 test 脚本**

Modify `package.json`，在 `"scripts"` 中 `"preview": "vite preview"` 之后加一行（注意前一行补逗号）：

```json
    "preview": "vite preview",
    "test": "vitest run"
```

- [ ] **Step 4: 写一个冒烟测试确认框架能跑**

Create `src/utils/blobUtils.test.js`:

```js
import { describe, it, expect } from 'vitest';

describe('vitest smoke test', () => {
  it('runs in a jsdom environment', () => {
    expect(typeof window).toBe('object');
    expect(typeof Blob).toBe('function');
    expect(typeof FileReader).toBe('function');
  });
});
```

- [ ] **Step 5: 运行测试**

Run: `npm test`
Expected: PASS，1 passed。若报 `environment jsdom not found`，说明 jsdom 没装上，重跑 Step 1。

- [ ] **Step 6: 提交**

```bash
git add package.json package-lock.json vitest.config.js src/utils/blobUtils.test.js
git commit -m "chore: 引入 vitest 测试框架"
```

---

## Task 2: useLocalStorage 增加错误上报

当前 `src/hooks/useLocalStorage.js:22-30` 中，`setStoredValue` 先执行、`localStorage.setItem` 后执行，setItem 抛出的 `QuotaExceededError` 被 catch 后仅 `console.error`。结果：React state 更新成功、UI 正常，数据没落盘，用户无感知。

**Files:**
- Modify: `src/hooks/useLocalStorage.js`
- Test: `src/hooks/useLocalStorage.test.js`

- [ ] **Step 1: 写失败的测试**

Create `src/hooks/useLocalStorage.test.js`:

```js
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
```

- [ ] **Step 2: 创建极简 renderHook 工具**

本项目不装 `@testing-library/react`。用 React 官方的 `react-dom/client` 手写一个够用的版本。

Create `src/hooks/testUtils.js`:

```js
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';

export function renderHook(callback) {
  const result = { current: null };

  function TestComponent() {
    result.current = callback();
    return null;
  }

  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(React.createElement(TestComponent));
  });

  return { result, unmount: () => act(() => root.unmount()) };
}

export { act };
```

- [ ] **Step 3: 运行测试确认失败**

Run: `npm test src/hooks/useLocalStorage.test.js`
Expected: FAIL。前两个用例失败，因为 `useLocalStorage` 目前只接受 2 个参数，`onError` 从未被调用。

若报 `IS_REACT_ACT_ENVIRONMENT` 相关警告或错误，在 `vitest.config.js` 的 `test` 中加一行 `globals: true`，并在配置同级新增：

```js
    setupFiles: ['./src/test-setup.js'],
```

Create `src/test-setup.js`:

```js
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
```

- [ ] **Step 4: 实现**

Modify `src/hooks/useLocalStorage.js`，替换整个文件：

```js
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
```

注意：`setItem` 移到 `setStoredValue` 之前，这样失败时能先拿到异常；但仍然更新 state（保持 UI 响应），只是额外触发 `onError`。原有的 `useEffect` import 是未使用的，一并移除。

- [ ] **Step 5: 运行测试确认通过**

Run: `npm test src/hooks/useLocalStorage.test.js`
Expected: PASS，3 passed。

- [ ] **Step 6: 提交**

```bash
git add src/hooks/useLocalStorage.js src/hooks/useLocalStorage.test.js src/hooks/testUtils.js vitest.config.js src/test-setup.js
git commit -m "fix: useLocalStorage 支持写入失败上报，避免配额超限被静默吞掉"
```

---

## Task 3: Blob ↔ base64 转换工具

**Files:**
- Create: `src/utils/blobUtils.js`
- Test: `src/utils/blobUtils.test.js`（Task 1 已创建冒烟测试，此处追加）

- [ ] **Step 1: 写失败的测试**

Modify `src/utils/blobUtils.test.js`，替换整个文件：

```js
import { describe, it, expect } from 'vitest';
import { blobToBase64, canvasToBlob } from './blobUtils.js';

describe('blobToBase64', () => {
  it('把 Blob 转成不含 data URL 前缀的 base64', async () => {
    const blob = new Blob(['hello'], { type: 'text/plain' });
    const base64 = await blobToBase64(blob);
    expect(base64).toBe('aGVsbG8=');
    expect(base64).not.toContain('data:');
    expect(base64).not.toContain(',');
  });

  it('空 Blob 返回空字符串', async () => {
    const blob = new Blob([], { type: 'text/plain' });
    const base64 = await blobToBase64(blob);
    expect(base64).toBe('');
  });
});

describe('canvasToBlob', () => {
  it('导出为 Blob 且 type 与入参一致', async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 2;
    const blob = await canvasToBlob(canvas, 'image/png', 0.82);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/png');
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test src/utils/blobUtils.test.js`
Expected: FAIL，`Failed to resolve import "./blobUtils.js"`。

- [ ] **Step 3: 实现**

Create `src/utils/blobUtils.js`:

```js
/**
 * Blob 与 base64 互转工具
 */

/**
 * Blob → base64 字符串（不含 data: 前缀）
 * @param {Blob} blob
 * @returns {Promise<string>}
 */
export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const commaIndex = dataUrl.indexOf(',');
      resolve(commaIndex === -1 ? '' : dataUrl.slice(commaIndex + 1));
    };
    reader.onerror = () => reject(reader.error || new Error('读取图片失败'));
    reader.readAsDataURL(blob);
  });
}

/**
 * canvas → Blob
 * @param {HTMLCanvasElement} canvas
 * @param {string} mimeType
 * @param {number} quality
 * @returns {Promise<Blob>}
 */
export function canvasToBlob(canvas, mimeType, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('图片压缩失败'))),
      mimeType,
      quality
    );
  });
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test src/utils/blobUtils.test.js`
Expected: PASS，3 passed。

若 `canvasToBlob` 用例失败并提示 `canvas.toBlob is not a function`，说明 jsdom 未实现 canvas。此时删除 `canvasToBlob` 那个 describe 块（保留实现代码），在提交信息中注明该函数由浏览器手工验证。不要为此安装 `canvas` 原生依赖，代价过高。

- [ ] **Step 5: 提交**

```bash
git add src/utils/blobUtils.js src/utils/blobUtils.test.js
git commit -m "feat: 新增 Blob 与 base64 转换工具"
```

---

## Task 4: IndexedDB 图片存储封装

**Files:**
- Create: `src/services/imageStore.js`
- Test: `src/services/imageStore.test.js`
- Modify: `package.json`

- [ ] **Step 1: 安装 idb-keyval**

```bash
npm install idb-keyval@^6.2.1
```

- [ ] **Step 2: 写失败的测试**

测试目标是本封装层的键名前缀与调用行为，不是 IndexedDB 本身，所以 mock 掉 `idb-keyval`。

Create `src/services/imageStore.test.js`:

```js
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
```

- [ ] **Step 3: 运行测试确认失败**

Run: `npm test src/services/imageStore.test.js`
Expected: FAIL，`Failed to resolve import "./imageStore.js"`。

- [ ] **Step 4: 实现**

Create `src/services/imageStore.js`:

```js
/**
 * 图片二进制存储（IndexedDB）
 *
 * 图片体积大，放 localStorage 会撞 5MB 配额并连带拖垮其他数据。
 * 这里只存二进制，元数据（名称、描述等）仍由 ImageContext 放在 localStorage。
 */

import { createStore, get, set, del, clear } from 'idb-keyval';

const store = createStore('autowritingbot-images', 'blobs');

/**
 * @param {string} id
 * @returns {Promise<Blob|null>}
 */
export async function getImageBlob(id) {
  const blob = await get(id, store);
  return blob ?? null;
}

/**
 * @param {string} id
 * @param {Blob} blob
 */
export async function setImageBlob(id, blob) {
  await set(id, blob, store);
}

/**
 * @param {string} id
 */
export async function delImageBlob(id) {
  await del(id, store);
}

export async function clearImageBlobs() {
  await clear(store);
}
```

- [ ] **Step 5: 运行测试确认通过**

Run: `npm test src/services/imageStore.test.js`
Expected: PASS，5 passed。

- [ ] **Step 6: 提交**

```bash
git add package.json package-lock.json src/services/imageStore.js src/services/imageStore.test.js
git commit -m "feat: 新增基于 IndexedDB 的图片二进制存储"
```

---

## Task 5: 旧格式图片识别

旧的图片条目形如 `{ id, name, base64, mimeType, description, createdAt }`。新格式去掉 `base64`。用户已确认旧图片不迁移、重新上传。

**Files:**
- Create: `src/utils/imageMigration.js`
- Test: `src/utils/imageMigration.test.js`

- [ ] **Step 1: 写失败的测试**

Create `src/utils/imageMigration.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { hasLegacyImages } from './imageMigration.js';

describe('hasLegacyImages', () => {
  it('存在含 base64 字段的条目时返回 true', () => {
    expect(hasLegacyImages([
      { id: 'img-1', name: 'a.jpg', mimeType: 'image/jpeg' },
      { id: 'img-2', name: 'b.jpg', base64: 'AAAA', mimeType: 'image/jpeg' },
    ])).toBe(true);
  });

  it('全部为新格式时返回 false', () => {
    expect(hasLegacyImages([
      { id: 'img-1', name: 'a.jpg', mimeType: 'image/jpeg' },
    ])).toBe(false);
  });

  it('空数组返回 false', () => {
    expect(hasLegacyImages([])).toBe(false);
  });

  it('入参不是数组时返回 false', () => {
    expect(hasLegacyImages(null)).toBe(false);
    expect(hasLegacyImages(undefined)).toBe(false);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test src/utils/imageMigration.test.js`
Expected: FAIL，`Failed to resolve import "./imageMigration.js"`。

- [ ] **Step 3: 实现**

Create `src/utils/imageMigration.js`:

```js
/**
 * 图片存储格式迁移判定
 *
 * 旧格式把 base64 直接存在 localStorage 的条目里，新格式二进制走 IndexedDB。
 */

/**
 * @param {unknown} images
 * @returns {boolean} 是否存在旧格式条目
 */
export function hasLegacyImages(images) {
  if (!Array.isArray(images)) return false;
  return images.some(img => img && typeof img.base64 === 'string');
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test src/utils/imageMigration.test.js`
Expected: PASS，4 passed。

- [ ] **Step 5: 提交**

```bash
git add src/utils/imageMigration.js src/utils/imageMigration.test.js
git commit -m "feat: 新增旧格式图片条目识别"
```

---

## Task 6: ImageContext 迁移到 IndexedDB

**Files:**
- Modify: `src/context/ImageContext.jsx`

本任务无自动化测试（涉及 canvas、IndexedDB、React context 三者交织），验证方式为浏览器手工验证，步骤见 Step 3。

- [ ] **Step 1: 替换 ImageContext.jsx 全文**

```jsx
/**
 * 图片库全局状态管理
 *
 * 存储分层：二进制存 IndexedDB（见 services/imageStore.js），
 * 元数据存 localStorage。避免图片撑爆 localStorage 5MB 配额。
 */

import { createContext, useContext, useCallback, useEffect, useRef } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import { DeepSeekAPI } from '../services/deepseek.js';
import { getImageBlob, setImageBlob, delImageBlob, clearImageBlobs } from '../services/imageStore.js';
import { blobToBase64, canvasToBlob } from '../utils/blobUtils.js';
import { hasLegacyImages } from '../utils/imageMigration.js';
import { STORAGE_KEYS } from '../utils/constants.js';
import { useApp } from './AppContext.jsx';

const ImageContext = createContext(null);

/**
 * 压缩图片：最大边 1024px，返回 Blob
 */
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = async () => {
      URL.revokeObjectURL(objectUrl);
      const maxSide = 1024;
      let { width, height } = img;
      if (width > maxSide || height > maxSide) {
        if (width >= height) {
          height = Math.round((height * maxSide) / width);
          width = maxSide;
        } else {
          width = Math.round((width * maxSide) / height);
          height = maxSide;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      const mimeType = file.type || 'image/jpeg';
      try {
        const blob = await canvasToBlob(canvas, mimeType, 0.82);
        resolve({ blob, mimeType });
      } catch (error) {
        reject(error);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('图片解码失败'));
    };
    img.src = objectUrl;
  });
}

export function ImageProvider({ children }) {
  const { showToast } = useApp();

  const handleStorageError = useCallback((error) => {
    if (error?.name === 'QuotaExceededError') {
      showToast('本地存储空间已满，请到图片库删除部分图片', 'error');
    } else {
      showToast('本地存储写入失败', 'error');
    }
  }, [showToast]);

  const [images, setImages] = useLocalStorage(STORAGE_KEYS.IMAGE_LIBRARY, [], handleStorageError);

  // 检测到旧格式（base64 存在 localStorage）时清空重来。
  // 用户已确认旧图片不迁移、重新上传。
  const migrationChecked = useRef(false);
  useEffect(() => {
    if (migrationChecked.current) return;
    migrationChecked.current = true;
    if (hasLegacyImages(images)) {
      setImages([]);
      clearImageBlobs().catch(() => {});
      showToast('图片存储已升级，请重新上传图片', 'info');
    }
  }, [images, setImages, showToast]);

  const addImage = useCallback(async (file) => {
    const { blob, mimeType } = await compressImage(file);
    const id = `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await setImageBlob(id, blob);
    const entry = {
      id,
      name: file.name,
      mimeType,
      description: '',
      createdAt: new Date().toISOString().split('T')[0]
    };
    setImages(prev => [entry, ...prev]);
    return entry;
  }, [setImages]);

  const updateDescription = useCallback((id, description) => {
    setImages(prev => prev.map(img => img.id === id ? { ...img, description } : img));
  }, [setImages]);

  const updateName = useCallback((id, name) => {
    setImages(prev => prev.map(img => img.id === id ? { ...img, name } : img));
  }, [setImages]);

  const removeImage = useCallback((id) => {
    setImages(prev => prev.filter(img => img.id !== id));
    delImageBlob(id).catch(() => {});
  }, [setImages]);

  const analyzeImage = useCallback(async (id, modelConfig) => {
    const img = images.find(i => i.id === id);
    if (!img) return;
    const blob = await getImageBlob(id);
    if (!blob) throw new Error('图片数据缺失，请重新上传');
    const base64 = await blobToBase64(blob);
    const description = await DeepSeekAPI.analyzeImage(base64, img.mimeType, modelConfig);
    setImages(prev => prev.map(i => i.id === id ? { ...i, description } : i));
    return description;
  }, [images, setImages]);

  return (
    <ImageContext.Provider value={{ images, addImage, updateName, updateDescription, removeImage, analyzeImage }}>
      {children}
    </ImageContext.Provider>
  );
}

export function useImageContext() {
  const ctx = useContext(ImageContext);
  if (!ctx) throw new Error('useImageContext must be used within ImageProvider');
  return ctx;
}
```

- [ ] **Step 2: 确认 Provider 嵌套顺序**

`ImageProvider` 现在调用 `useApp()`，必须位于 `AppProvider` 内部。检查 `src/App.jsx:36-40`，确认顺序为 `AppProvider` → `PromptProvider` → `ImageProvider`。已经是正确的，**无需修改**。若不是，把 `ImageProvider` 移到 `AppProvider` 内层。

- [ ] **Step 3: 手工验证**

此时缩略图会显示为裂图（Task 7 才修消费端），这是预期的。本步只验证存储层。

```bash
npm run dev
```

1. 打开 DevTools → Application → Local Storage，删除 `image_library` 这个 key，刷新
2. 进入图片库页面，上传 1 张图片
3. Application → Local Storage → `image_library`：确认条目里**没有 `base64` 字段**，只有 id/name/mimeType/description/createdAt
4. Application → IndexedDB → `autowritingbot-images` → `blobs`：确认有一条以 `img-` 开头的记录，值为 Blob
5. 刷新页面，确认图片条目仍在列表中
6. 删除该图片，确认 IndexedDB 中对应记录也消失

Expected：全部符合。

- [ ] **Step 4: 提交**

```bash
git add src/context/ImageContext.jsx
git commit -m "fix: 图片二进制迁移到 IndexedDB，解除 localStorage 5MB 配额限制"
```

---

## Task 7: 缩略图改用 object URL

`ImagePickerModal.jsx:58` 与 `ImageLibraryPage.jsx:139` 现在读 `img.base64`，该字段已不存在。必须改用 object URL，**且必须回收**——不回收会造成真实的内存泄漏。

**Files:**
- Create: `src/hooks/useObjectUrl.js`
- Modify: `src/components/images/ImagePickerModal.jsx`
- Modify: `src/pages/ImageLibraryPage.jsx`

- [ ] **Step 1: 创建 useObjectUrl hook**

Create `src/hooks/useObjectUrl.js`:

```js
/**
 * 按图片 id 从 IndexedDB 取 Blob 并生成 object URL，
 * 组件卸载或 id 变化时回收，避免内存泄漏。
 */

import { useState, useEffect } from 'react';
import { getImageBlob } from '../services/imageStore.js';

/**
 * @param {string} id 图片 id
 * @returns {string|null} object URL，加载中为 null
 */
export function useObjectUrl(id) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let createdUrl = null;

    getImageBlob(id).then(blob => {
      if (cancelled || !blob) return;
      createdUrl = URL.createObjectURL(blob);
      setUrl(createdUrl);
    }).catch(() => {});

    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
      setUrl(null);
    };
  }, [id]);

  return url;
}
```

- [ ] **Step 2: 创建缩略图组件**

两个消费端都需要「按 id 渲染一张图」，抽成一个组件，避免在列表里直接调 hook（hook 不能在循环中调用）。

Create `src/components/images/ImageThumb.jsx`:

```jsx
/**
 * 图片缩略图 — 按 id 从 IndexedDB 读取并渲染
 */

import { useObjectUrl } from '../../hooks/useObjectUrl.js';

export default function ImageThumb({ id, alt, className }) {
  const url = useObjectUrl(id);

  if (!url) {
    return <div className={`${className || ''} image-thumb-placeholder`} />;
  }

  return <img src={url} alt={alt} className={className} />;
}
```

- [ ] **Step 3: 添加占位样式**

Modify `src/styles.css`，在文件末尾追加：

```css
/* 图片缩略图加载占位 */
.image-thumb-placeholder {
  background: #f0f0f0;
  display: block;
}
```

- [ ] **Step 4: 修改 ImagePickerModal**

Modify `src/components/images/ImagePickerModal.jsx`。

在文件顶部的 import 区加入：

```jsx
import ImageThumb from './ImageThumb.jsx';
```

把 `ImagePickerModal.jsx:57-61` 的：

```jsx
                  <img
                    src={`data:${img.mimeType};base64,${img.base64}`}
                    alt={img.name}
                    className="image-picker-thumb"
                  />
```

替换为：

```jsx
                  <ImageThumb
                    id={img.id}
                    alt={img.name}
                    className="image-picker-thumb"
                  />
```

- [ ] **Step 5: 修改 ImageLibraryPage**

Modify `src/pages/ImageLibraryPage.jsx`。

在 import 区加入：

```jsx
import ImageThumb from '../components/images/ImageThumb.jsx';
```

把 `ImageLibraryPage.jsx:138-142` 附近的 `<img src={`data:${img.mimeType};base64,${img.base64}`} ... />` 整段替换为（保留原有的 className 与 alt 取值）：

```jsx
                    <ImageThumb
                      id={img.id}
                      alt={img.name}
                      className="image-library-thumb"
                    />
```

注意：替换前先读一遍原 `<img>` 标签上的 `className`，用原值，不要照抄本计划里的 `image-library-thumb`。

- [ ] **Step 6: 手工验证**

```bash
npm run dev
```

1. 图片库页面上传 2 张图，确认缩略图正常显示
2. 刷新页面，确认缩略图仍正常显示（证明是从 IndexedDB 读的）
3. 生成页点「选择图片」，确认选择器里缩略图正常显示
4. **内存泄漏验证**：DevTools → Performance monitor，观察 JS heap size；在图片库与生成页之间来回切换 10 次，确认 heap 不持续单调上升（会有波动，看趋势）

Expected：1-3 全部正常，4 无持续增长。

- [ ] **Step 7: 提交**

```bash
git add src/hooks/useObjectUrl.js src/components/images/ImageThumb.jsx src/components/images/ImagePickerModal.jsx src/pages/ImageLibraryPage.jsx src/styles.css
git commit -m "fix: 缩略图改用 object URL 并在卸载时回收"
```

---

## Task 8: 对话历史容量上限

**Files:**
- Create: `src/utils/historyUtils.js`
- Test: `src/utils/historyUtils.test.js`
- Modify: `src/hooks/useConversationHistory.js`

- [ ] **Step 1: 写失败的测试**

Create `src/utils/historyUtils.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { appendConversation, MAX_HISTORY } from './historyUtils.js';

const conv = (id) => ({ id, title: `t-${id}` });

describe('appendConversation', () => {
  it('新记录插到最前面', () => {
    const result = appendConversation([conv('a')], conv('b'));
    expect(result.map(c => c.id)).toEqual(['b', 'a']);
  });

  it('超过上限时淘汰最旧的', () => {
    const existing = Array.from({ length: MAX_HISTORY }, (_, i) => conv(`old-${i}`));
    const result = appendConversation(existing, conv('new'));
    expect(result).toHaveLength(MAX_HISTORY);
    expect(result[0].id).toBe('new');
    expect(result.map(c => c.id)).not.toContain(`old-${MAX_HISTORY - 1}`);
  });

  it('未达上限时不淘汰', () => {
    const existing = [conv('a'), conv('b')];
    const result = appendConversation(existing, conv('c'));
    expect(result).toHaveLength(3);
  });

  it('上限为 30', () => {
    expect(MAX_HISTORY).toBe(30);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test src/utils/historyUtils.test.js`
Expected: FAIL，`Failed to resolve import "./historyUtils.js"`。

- [ ] **Step 3: 实现**

Create `src/utils/historyUtils.js`:

```js
/**
 * 对话历史工具
 *
 * 推文正文动辄数千字，不设上限会撞 localStorage 配额。
 */

export const MAX_HISTORY = 30;

/**
 * 追加一条对话并淘汰超出上限的最旧记录
 * @param {Array} history
 * @param {Object} conversation
 * @returns {Array}
 */
export function appendConversation(history, conversation) {
  return [conversation, ...history].slice(0, MAX_HISTORY);
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test src/utils/historyUtils.test.js`
Expected: PASS，4 passed。

- [ ] **Step 5: 接入 useConversationHistory**

Modify `src/hooks/useConversationHistory.js`。

在 import 区加入：

```js
import { appendConversation } from '../utils/historyUtils.js';
```

修改 hook 签名，接受可选的 `onError`（第 12 行附近）：

```js
export function useConversationHistory(onError) {
  const [history, setHistory, removeHistory] = useLocalStorage(STORAGE_KEYS.CONVERSATION_HISTORY, [], onError);
```

修改 `addConversation` 中的 `setHistory` 调用（第 27 行附近），把：

```js
    setHistory(prev => [newConversation, ...prev]);
```

替换为：

```js
    setHistory(prev => appendConversation(prev, newConversation));
```

其余部分不动。

- [ ] **Step 6: 运行全部测试**

Run: `npm test`
Expected: 全部 PASS。

- [ ] **Step 7: 提交**

```bash
git add src/utils/historyUtils.js src/utils/historyUtils.test.js src/hooks/useConversationHistory.js
git commit -m "feat: 对话历史限制 30 条并支持写入失败上报"
```

---

## Task 9: ChatGeneratePage 保存对话历史

`ChatGeneratePage` 目前完全没有接入历史，生成的内容从未被保存。

**Files:**
- Modify: `src/pages/ChatGeneratePage.jsx`

- [ ] **Step 1: 引入 hook**

Modify `src/pages/ChatGeneratePage.jsx`。

第 6 行的 import 改为（加入 `useEffect`、`useCallback`）：

```jsx
import { useState, useRef, useEffect, useCallback } from 'react';
```

在 import 区加入：

```jsx
import { useConversationHistory } from '../hooks/useConversationHistory.js';
```

- [ ] **Step 2: 在组件内接入**

在 `const { steps, isRunning, ... } = usePipeline({...});`（第 49-55 行）**之后**插入：

```jsx
  const handleHistoryError = useCallback(() => {
    showToast('对话历史保存失败，本地存储空间可能已满', 'error');
  }, [showToast]);

  const { addConversation } = useConversationHistory(handleHistoryError);

  // pipeline 完成时自动存一条历史。用 ref 防止 isDone 保持 true 期间重复写入。
  const savedForRunRef = useRef(false);

  useEffect(() => {
    if (isRunning) {
      savedForRunRef.current = false;
      return;
    }
    if (!isDone || savedForRunRef.current || !currentArticle) return;
    savedForRunRef.current = true;
    addConversation({
      type: 'chat',
      title: currentTitle || '未命名推文',
      output: currentArticle,
      input: {
        userInput,
        activityType: selectedActivityType,
        persons: orderedPersons,
        imageIds: selectedImages.map(i => i.id),
        articleRefs,
      },
    });
  }, [isDone, isRunning, currentArticle, currentTitle, userInput, selectedActivityType,
      orderedPersons, selectedImages, articleRefs, addConversation]);
```

- [ ] **Step 3: 手工验证**

```bash
npm run dev
```

1. 填活动类型 + 选 2 位领导 + 输入内容，点「开始生成」，等 4 步跑完
2. DevTools → Application → Local Storage → `conversation_history`
3. 确认存在一条记录，`type` 为 `chat`，`output` 为正文，`input.persons` 为选中的领导数组，`input.imageIds` 为图片 id 数组（不含 base64）
4. 再生成一次，确认变成 2 条且新的在前
5. 确认同一次生成**只**产生 1 条记录（不重复）

Expected：全部符合。

- [ ] **Step 4: 提交**

```bash
git add src/pages/ChatGeneratePage.jsx
git commit -m "feat: ChatGeneratePage 在 pipeline 完成后保存对话历史"
```

---

## Task 10: ChatGeneratePage 历史面板与恢复

**Files:**
- Modify: `src/pages/ChatGeneratePage.jsx`
- Modify: `src/styles.css`

**重要约束：** `useConversationHistory` 每个调用方持有独立 state（内部是 `useState` + localStorage，无跨组件同步）。`ConversationHistory` 组件内部自己调了一次。因此历史面板必须**条件挂载**（`{showHistory && <ConversationHistory/>}`），关闭即卸载，下次打开重新挂载时才会读到最新的 localStorage。不要改成 CSS 隐藏。

- [ ] **Step 1: 引入组件与图标**

Modify `src/pages/ChatGeneratePage.jsx`。

第 7 行的 lucide 图标 import 加入 `History`：

```jsx
import { Send, RotateCcw, Plus, X, GripVertical, ChevronDown, ChevronUp, ImageIcon, FileSearch, Square, History } from 'lucide-react';
```

在 import 区加入：

```jsx
import ConversationHistory from '../components/conversation/ConversationHistory.jsx';
import Modal from '../components/layout/Modal.jsx';
```

- [ ] **Step 2: 添加状态与恢复逻辑**

在 Task 9 插入的代码之后继续插入：

```jsx
  const [showHistory, setShowHistory] = useState(false);

  const handleSelectConversation = (conv) => {
    if (!conv) return;
    if (currentArticle && !confirm('恢复历史记录会覆盖当前画布内容，确定继续吗？')) return;

    setCurrentArticle(conv.output || '');
    setCurrentTitle(conv.title || '');
    setSelectedActivityType(conv.input?.activityType || '');
    setOrderedPersons(conv.input?.persons || []);
    setUserInput(conv.input?.userInput || '');
    setArticleRefs(conv.input?.articleRefs || []);

    const ids = conv.input?.imageIds || [];
    setSelectedImages(images.filter(img => ids.includes(img.id)));

    resetSteps();
    savedForRunRef.current = true;  // 恢复出来的内容不应再被存成新记录
    setShowHistory(false);
  };
```

- [ ] **Step 3: 引入图片库以支持按 id 反查**

在组件顶部，`const { activeModel, ... } = useApp();`（第 21 行）之后插入：

```jsx
  const { images } = useImageContext();
```

并在 import 区加入：

```jsx
import { useImageContext } from '../context/ImageContext.jsx';
```

- [ ] **Step 4: 添加入口按钮**

Modify `src/pages/ChatGeneratePage.jsx`，在侧边栏 header 的 `sidebar-actions` 中（第 158-163 行），把「清空」按钮**之前**插入历史按钮：

```jsx
            <Button variant="outline" size="sm" onClick={() => setShowHistory(true)}>
              <History size={14} />
              历史
            </Button>
```

- [ ] **Step 5: 添加面板**

在 `ChatGeneratePage.jsx` 中已有的 `{showArticleRefModal && (...)}` 块（第 381-386 行）**之后**插入：

```jsx
        {showHistory && (
          <Modal onClose={() => setShowHistory(false)} title="对话历史">
            <div className="history-modal-body">
              <ConversationHistory
                onSelectConversation={handleSelectConversation}
              />
            </div>
          </Modal>
        )}
```

- [ ] **Step 6: 添加样式**

Modify `src/styles.css`，文件末尾追加：

```css
/* 历史记录弹窗 */
.history-modal-body {
  max-height: 60vh;
  overflow-y: auto;
}
```

- [ ] **Step 7: 核对 ConversationHistory 的回调签名**

打开 `src/components/conversation/ConversationHistory.jsx`，确认 `onSelectConversation` 被调用时传入的是**完整的 conversation 对象**而非 id。若传的是 id，把 Step 2 的 `handleSelectConversation` 改为先按 id 查找：

```jsx
  const handleSelectConversation = (convOrId) => {
    const conv = typeof convOrId === 'string'
      ? history.find(c => c.id === convOrId)
      : convOrId;
    if (!conv) return;
    // ...其余不变
```

并相应地从 `useConversationHistory(handleHistoryError)` 解构出 `history`。

- [ ] **Step 8: 手工验证**

```bash
npm run dev
```

1. 生成一篇推文（含活动类型、2 位领导、1 张图片）
2. 点「清空」清掉当前内容
3. 点「历史」，确认列表中有刚才那条
4. 点击它，确认正文、标题、活动类型、领导顺序、图片全部恢复
5. 在画布有内容时再点一条历史，确认弹出覆盖确认框
6. 确认框点取消，确认画布内容未变
7. 恢复一条历史后，确认**没有**因此新增一条历史记录

Expected：全部符合。

- [ ] **Step 9: 提交**

```bash
git add src/pages/ChatGeneratePage.jsx src/styles.css
git commit -m "feat: ChatGeneratePage 支持查看与恢复历史对话"
```

---

## Task 11: Pipeline 面板可折叠

`ChatGeneratePage.jsx:407` 的渲染条件是 `steps.some(s => s.status !== 'pending')`——跑过一次就永久占据画布底部。

**Files:**
- Modify: `src/components/pipeline/PipelinePanel.jsx`
- Modify: `src/pages/ChatGeneratePage.jsx`
- Modify: `src/styles.css`

- [ ] **Step 1: 给 PipelinePanel 加折叠能力**

Modify `src/components/pipeline/PipelinePanel.jsx`。

第 6 行改为：

```jsx
import { useState, useEffect } from 'react';
```

第 14 行的函数签名改为：

```jsx
export default function PipelinePanel({ steps, isRunning, currentStepId, isDone }) {
  const [expandedStep, setExpandedStep] = useState(null);
  const [collapsed, setCollapsed] = useState(false);

  // 运行中强制展开；完成时自动折叠为摘要
  useEffect(() => {
    if (isRunning) setCollapsed(false);
    else if (isDone) setCollapsed(true);
  }, [isRunning, isDone]);

  const doneCount = steps.filter(s => s.status === 'done').length;
```

在 `return (` 之后、`<div className="pipeline-panel">` 内部的最前面，插入折叠头：

```jsx
      <div
        className="pipeline-collapse-header"
        onClick={() => setCollapsed(v => !v)}
      >
        <span className="pipeline-collapse-summary">
          {collapsed ? `✓ 已完成 ${doneCount} 步 · 点击展开` : '生成步骤'}
        </span>
        {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
      </div>
```

然后把原有的 `{steps.map((step) => {...})}` 整块和末尾的 `{!isRunning && steps.every(...) && (...)}` 提示块，一起包进折叠条件里。具体做法：在 `{steps.map(` 之前加 `{!collapsed && (<>`，在 `pipeline-empty-hint` 那个块的 `)}` 之后加 `</>)}`。

最终结构应为：

```jsx
  return (
    <div className="pipeline-panel">
      <div className="pipeline-collapse-header" onClick={() => setCollapsed(v => !v)}>
        ...
      </div>
      {!collapsed && (
        <>
          {steps.map((step) => { ... })}
          {!isRunning && steps.every(s => s.status === 'pending') && (
            <div className="pipeline-empty-hint">...</div>
          )}
        </>
      )}
    </div>
  );
```

- [ ] **Step 2: 传入 isDone**

Modify `src/pages/ChatGeneratePage.jsx:409`，把：

```jsx
            <PipelinePanel steps={steps} isRunning={isRunning} currentStepId={currentStepId} />
```

改为：

```jsx
            <PipelinePanel steps={steps} isRunning={isRunning} currentStepId={currentStepId} isDone={isDone} />
```

- [ ] **Step 3: 添加样式**

Modify `src/styles.css`，文件末尾追加：

```css
/* Pipeline 折叠头 */
.pipeline-collapse-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  cursor: pointer;
  user-select: none;
  font-size: 13px;
  color: #666;
  border-bottom: 1px solid #eee;
}

.pipeline-collapse-header:hover {
  background: #fafafa;
}

.pipeline-collapse-summary {
  font-weight: 500;
}
```

- [ ] **Step 4: 手工验证**

```bash
npm run dev
```

1. 点「开始生成」，确认运行期间面板保持展开、能看到实时进度
2. 4 步跑完后，确认面板自动折叠为 `✓ 已完成 4 步 · 点击展开`
3. 点击折叠头，确认能展开看到 4 个步骤详情
4. 再点一次，确认能收起
5. 再次点「开始生成」，确认面板自动重新展开

Expected：全部符合。

- [ ] **Step 5: 提交**

```bash
git add src/components/pipeline/PipelinePanel.jsx src/pages/ChatGeneratePage.jsx src/styles.css
git commit -m "feat: Pipeline 面板支持折叠，完成后自动收起"
```

---

## Task 12: 放宽领导名字数上限

**Files:**
- Modify: `src/pages/ChatGeneratePage.jsx:296`

- [ ] **Step 1: 修改**

Modify `src/pages/ChatGeneratePage.jsx`，把自定义领导输入框的：

```jsx
                    maxLength={20}
```

改为：

```jsx
                    maxLength={30}
```

- [ ] **Step 2: 手工验证**

```bash
npm run dev
```

生成页 → 参与领导 → 「添加」，输入 `党委副书记、纪委书记张某某测试补足三十字上限`（30 字），确认能完整输入不被截断。

- [ ] **Step 3: 提交**

```bash
git add src/pages/ChatGeneratePage.jsx
git commit -m "feat: 领导名字数上限由 20 放宽至 30"
```

---

## Task 13: nginx 缓存修复与部署加固

**前置条件（不可跳过）：** 设计文档中「重新部署后白屏」的成因是**假说**，尚未证实。用户提供的容器日志已被确认为其本人手动停机所致，不构成故障现场。

实施前请先完成验证：下次白屏时**先不要重启**，打开 DevTools → Network → 刷新页面，检查是否存在 `.js` 文件返回 404。若有，假说成立，继续本任务。若没有 404，**停止，回报结果**，需要重新排查。

本任务的改动即使假说被证伪也是正确的加固，可以先做；但验证步骤仍需补做，以确认问题真的被解决。

**Files:**
- Modify: `nginx.conf`
- Modify: `Dockerfile`

- [ ] **Step 1: 为 index.html 禁用缓存**

Modify `nginx.conf`，在 `location /assets/ {...}` 块**之后**、`location /weixin-proxy/ {...}` 块之前插入：

```nginx
    # index.html 绝不缓存：它引用带 hash 的 JS 产物，
    # 缓存住旧 html 会去请求已不存在的旧 hash 文件，导致白屏
    location = /index.html {
        add_header Cache-Control "no-store, must-revalidate";
    }
```

- [ ] **Step 2: 增加 HEALTHCHECK**

Modify `Dockerfile`，在 `EXPOSE 80` 之后、`CMD [...]` 之前插入：

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1
```

- [ ] **Step 3: 本地验证构建与缓存头**

```bash
docker build -t autowritingbot-test .
docker run -d --name awb-test -p 8081:80 autowritingbot-test
sleep 3
curl -sI http://localhost:8081/index.html | grep -i cache-control
```

Expected 输出包含：`Cache-Control: no-store, must-revalidate`

再确认静态资源仍然是长缓存：

```bash
ASSET=$(curl -s http://localhost:8081/ | grep -o '/assets/[^"]*\.js' | head -1)
curl -sI "http://localhost:8081${ASSET}" | grep -i cache-control
```

Expected 输出包含：`Cache-Control: public, immutable`

确认健康检查生效：

```bash
sleep 35
docker inspect --format='{{.State.Health.Status}}' awb-test
```

Expected: `healthy`

清理：

```bash
docker rm -f awb-test
```

- [ ] **Step 4: 提交**

```bash
git add nginx.conf Dockerfile
git commit -m "fix: index.html 禁用缓存，修复重新部署后白屏；增加容器健康检查"
```

- [ ] **Step 5: 服务器侧配置（手工，无代码改动）**

在 1Panel 中把该容器的重启策略设为 `unless-stopped`，确保容器意外退出后自动拉起。此项无法通过代码完成，需在面板上操作。

- [ ] **Step 6: 部署后验证**

重新构建部署到服务器后：

1. 用之前出现过白屏的浏览器直接访问（**不要**强制刷新、不要用无痕窗口）
2. 确认页面正常加载，无白屏
3. DevTools → Network → 找到 `index.html` 请求，确认响应头含 `Cache-Control: no-store`

Expected：全部符合。这是本任务真正的成功标准。

---

## 收尾

- [ ] **运行全部测试**

Run: `npm test`
Expected: 全部 PASS。

- [ ] **构建确认无破坏**

Run: `npm run build`
Expected: 构建成功，无报错。

- [ ] **对照设计文档的验收标准逐条核验**

见 `docs/superpowers/specs/2026-07-18-autowritingbot-optimization-design.md` 末尾的 7 条验收标准，逐条走一遍。

import { describe, it, expect, afterEach } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import PromptPage from './PromptPage.jsx';
import { AppProvider } from '../context/AppContext.jsx';
import { PromptProvider } from '../context/PromptContext.jsx';
import { DEFAULT_STEP_PROMPTS } from '../utils/default-step-prompts.js';

let root, container;

function renderPage() {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(
      <AppProvider>
        <PromptProvider>
          <PromptPage />
        </PromptProvider>
      </AppProvider>
    );
  });
  return container;
}

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  localStorage.clear();
});

describe('PromptPage 提示词标签', () => {
  it('渲染 4 个流程标签和 2 个工具标签', () => {
    const el = renderPage();
    const tabNames = [...el.querySelectorAll('.prompt-tab-name')].map(s => s.textContent);
    expect(tabNames).toEqual(['整理素材', '生成初稿', '质量评估', '精炼优化', '图片识别', '批注修改']);
  });

  it('切换到图片识别标签时编辑区显示默认识图提示词', () => {
    const el = renderPage();
    const imageTab = [...el.querySelectorAll('.prompt-tab')]
      .find(t => t.textContent.includes('图片识别'));
    act(() => {
      imageTab.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(el.querySelector('.prompt-editor').value).toBe(DEFAULT_STEP_PROMPTS.imageAnalyze);
  });
});

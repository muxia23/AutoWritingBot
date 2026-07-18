import { describe, it, expect, afterEach } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import CanvasEditor from './CanvasEditor.jsx';
import { AppProvider } from '../../context/AppContext.jsx';
import { PromptProvider } from '../../context/PromptContext.jsx';

let root, container;

function renderEditor(props) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(
      <AppProvider>
        <PromptProvider>
          <CanvasEditor
            title="测试标题"
            content={props.content}
            onTitleChange={() => {}}
            onContentChange={() => {}}
          />
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

describe('CanvasEditor markdown 预览', () => {
  it('渲染加粗、列表和标题为真实 HTML 元素', () => {
    const el = renderEditor({
      content: '## 段落标题\n\n这是 **加粗文字**。\n\n- 项目一\n- 项目二'
    });

    const preview = el.querySelector('.markdown-preview');
    expect(preview).toBeTruthy();
    expect(preview.querySelector('h2')?.textContent).toBe('段落标题');
    expect(preview.querySelector('strong')?.textContent).toBe('加粗文字');
    expect([...preview.querySelectorAll('li')].map(li => li.textContent)).toEqual(['项目一', '项目二']);
    // 星号不应以原文形式出现
    expect(preview.textContent).not.toContain('**');
  });
});

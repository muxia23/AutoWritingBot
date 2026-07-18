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

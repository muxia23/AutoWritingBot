/**
 * 提示词 Context
 */

import { createContext, useContext } from 'react';
import { usePrompts } from '../hooks/usePrompts.js';

const PromptContext = createContext(null);

export function PromptProvider({ children }) {
  const prompts = usePrompts();

  return (
    <PromptContext.Provider value={prompts}>
      {children}
    </PromptContext.Provider>
  );
}

export function usePromptContext() {
  const context = useContext(PromptContext);
  if (!context) {
    throw new Error('usePromptContext must be used within a PromptProvider');
  }
  return context;
}

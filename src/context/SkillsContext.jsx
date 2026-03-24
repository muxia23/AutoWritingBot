/**
 * Skills Context
 */

import { createContext, useContext } from 'react';
import { useSkills } from '../hooks/useSkills.js';

const SkillsContext = createContext(null);

export function SkillsProvider({ children }) {
  const skills = useSkills();

  return (
    <SkillsContext.Provider value={skills}>
      {children}
    </SkillsContext.Provider>
  );
}

export function useSkillsContext() {
  const context = useContext(SkillsContext);
  if (!context) {
    throw new Error('useSkillsContext must be used within a SkillsProvider');
  }
  return context;
}

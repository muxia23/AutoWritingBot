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

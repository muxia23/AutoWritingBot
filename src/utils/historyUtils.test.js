import { describe, it, expect } from 'vitest';
import { appendConversation, mergeImportedConversations, MAX_HISTORY } from './historyUtils.js';

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

describe('mergeImportedConversations', () => {
  it('导入的记录排在已有记录之前', () => {
    const result = mergeImportedConversations([{ id: 'old' }], [{ id: 'imp' }]);
    expect(result.map(c => c.id)).toEqual(['imp', 'old']);
  });

  // 回归测试：导入一个大备份曾绕过上限，直接重现配额撑爆问题
  it('导入超量记录时裁剪到上限', () => {
    const imported = Array.from({ length: 500 }, (_, i) => ({ id: `imp-${i}` }));
    const result = mergeImportedConversations([{ id: 'old' }], imported);
    expect(result).toHaveLength(MAX_HISTORY);
    expect(result[0].id).toBe('imp-0');
  });
});

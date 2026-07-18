import { describe, it, expect } from 'vitest';
import { stripPersonTitle, Formatters } from './formatters.js';

describe('stripPersonTitle', () => {
  it('去掉各类职务前缀', () => {
    expect(stripPersonTitle('常务副院长方捷')).toBe('方捷');
    expect(stripPersonTitle('党委书记翁穗平')).toBe('翁穗平');
    expect(stripPersonTitle('副院长黄彩进')).toBe('黄彩进');
    expect(stripPersonTitle('院团委书记刘歆一')).toBe('刘歆一');
    expect(stripPersonTitle('辅导员杨洋')).toBe('杨洋');
  });

  // 「党委副书记」若按短前缀先匹配会被「党委书记」以外的规则截错，
  // 故前缀表须按具体度排序
  it('长前缀优先，不被短前缀截错', () => {
    expect(stripPersonTitle('党委副书记王涛')).toBe('王涛');
  });

  it('无具体姓名的泛称保留原文，不返回空串', () => {
    expect(stripPersonTitle('辅导员')).toBe('辅导员');
  });

  it('未知职务的自定义人名原样返回', () => {
    expect(stripPersonTitle('副书记李明')).toBe('副书记李明');
    expect(stripPersonTitle('张三')).toBe('张三');
  });

  it('空值不抛异常', () => {
    expect(stripPersonTitle('')).toBe('');
    expect(stripPersonTitle(undefined)).toBe('');
  });
});

describe('formatRelativeDateTime', () => {
  const at = (d, h = 9, m = 5) => {
    const x = new Date();
    x.setHours(h, m, 0, 0);
    x.setDate(x.getDate() - d);
    return x.getTime();
  };

  it('今天显示「今天 HH:MM」', () => {
    expect(Formatters.formatRelativeDateTime(at(0, 20, 53))).toBe('今天 20:53');
  });

  it('昨天显示「昨天 HH:MM」', () => {
    expect(Formatters.formatRelativeDateTime(at(1, 8, 7))).toBe('昨天 08:07');
  });

  it('更早的本年日期省略年份', () => {
    const ts = at(10, 14, 30);
    const d = new Date(ts);
    if (d.getFullYear() === new Date().getFullYear()) {
      const M = String(d.getMonth() + 1).padStart(2, '0');
      const D = String(d.getDate()).padStart(2, '0');
      expect(Formatters.formatRelativeDateTime(ts)).toBe(`${M}-${D} 14:30`);
    }
  });

  it('跨年显示完整日期', () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 2, 2, 9);
    expect(Formatters.formatRelativeDateTime(d.getTime())).toBe(`${d.getFullYear()}-03-09`);
  });

  it('无效时间戳返回空串', () => {
    expect(Formatters.formatRelativeDateTime(NaN)).toBe('');
  });
});

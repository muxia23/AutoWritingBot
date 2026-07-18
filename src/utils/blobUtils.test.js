import { describe, it, expect } from 'vitest';

describe('vitest smoke test', () => {
  it('runs in a jsdom environment', () => {
    expect(typeof window).toBe('object');
    expect(typeof Blob).toBe('function');
    expect(typeof FileReader).toBe('function');
  });
});

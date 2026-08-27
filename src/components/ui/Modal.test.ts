import { describe, expect, it } from 'vitest';
import { FOCUSABLE_SELECTOR, getFocusableElements } from './Modal';

describe('modal focus management', () => {
  it('uses the shared focusable-element contract', () => {
    expect(getFocusableElements).toBeTypeOf('function');
    expect(FOCUSABLE_SELECTOR).toContain('button:not(:disabled)');
    expect(FOCUSABLE_SELECTOR).toContain('[tabindex]:not([tabindex="-1"])');
  });
});

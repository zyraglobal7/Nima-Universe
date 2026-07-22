import { cn } from './utils';

describe('cn', () => {
  it('joins simple class strings', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('drops falsy inputs', () => {
    expect(cn('a', false, undefined, null, '', 'b')).toBe('a b');
  });

  it('resolves conflicting tailwind classes, last one wins', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
    expect(cn('text-sm', 'font-bold', 'text-lg')).toBe('font-bold text-lg');
  });

  it('merges conditional class objects', () => {
    expect(cn('base', { active: true, hidden: false })).toBe('base active');
  });
});

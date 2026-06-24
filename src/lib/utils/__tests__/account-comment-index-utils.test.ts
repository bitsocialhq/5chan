import { describe, expect, it } from 'vitest';
import { normalizeAccountCommentIndex } from '../account-comment-index-utils';

describe('normalizeAccountCommentIndex', () => {
  it('accepts non-negative integer numbers and strings', () => {
    expect(normalizeAccountCommentIndex(0)).toBe(0);
    expect(normalizeAccountCommentIndex(7)).toBe(7);
    expect(normalizeAccountCommentIndex('0')).toBe(0);
    expect(normalizeAccountCommentIndex('7')).toBe(7);
  });

  it('rejects missing, negative, fractional, and malformed values', () => {
    expect(normalizeAccountCommentIndex(undefined)).toBeUndefined();
    expect(normalizeAccountCommentIndex(null)).toBeUndefined();
    expect(normalizeAccountCommentIndex('')).toBeUndefined();
    expect(normalizeAccountCommentIndex(-1)).toBeUndefined();
    expect(normalizeAccountCommentIndex('1.5')).toBeUndefined();
    expect(normalizeAccountCommentIndex('1abc')).toBeUndefined();
  });
});

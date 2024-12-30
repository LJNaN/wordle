import { describe, test, expect } from 'vitest'
import { removeToneFromPinyin } from './pinyinUtils'

describe('removeToneFromPinyin', () => {
  test('should handle ü correctly', () => {
    const testCases = [
      ['lǜ', 'lü'],
      ['nǚ', 'nü'],
      ['lv', 'lü'],
      ['lǘ', 'lü'],
      ['lǖ', 'lü']
    ];

    testCases.forEach(([input, expected]) => {
      const result = removeToneFromPinyin(input);
      console.log({
        input: {
          string: input,
          codes: Array.from(input).map(c => c.codePointAt(0)?.toString(16))
        },
        result: {
          string: result,
          codes: Array.from(result).map(c => c.codePointAt(0)?.toString(16))
        },
        expected: {
          string: expected,
          codes: Array.from(expected).map(c => c.codePointAt(0)?.toString(16))
        }
      });
      expect(result).toBe(expected);
    });
  });

  test('should handle regular pinyin correctly', () => {
    expect(removeToneFromPinyin('mā')).toBe('ma');
    expect(removeToneFromPinyin('hǎo')).toBe('hao');
    expect(removeToneFromPinyin('nǐ')).toBe('ni');
  });
}); 
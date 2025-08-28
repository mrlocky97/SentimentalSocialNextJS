import { toStringArray } from '../../src/lib/utils/array.utils';

describe('toStringArray utility function', () => {
  test('should return empty array for null, undefined, and empty string', () => {
    expect(toStringArray(null)).toEqual([]);
    expect(toStringArray(undefined)).toEqual([]);
    expect(toStringArray('')).toEqual([]);
    expect(toStringArray([])).toEqual([]);
  });

  test('should convert single string to array with one item', () => {
    expect(toStringArray('test')).toEqual(['test']);
  });

  test('should handle array input', () => {
    expect(toStringArray(['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
  });

  test('should trim strings and filter empty values', () => {
    expect(toStringArray(['  a  ', '', '  ', 'b', null, undefined])).toEqual(['a', 'b']);
  });

  test('should remove specified prefix from strings', () => {
    expect(toStringArray(['#hashtag1', 'hashtag2'], { stripPrefix: '#' })).toEqual(['hashtag1', 'hashtag2']);
    expect(toStringArray('@username', { stripPrefix: '@' })).toEqual(['username']);
  });

  test('should handle multiple prefix options', () => {
    expect(toStringArray(['#tag1', '@user1', 'plain'], { stripPrefix: ['#', '@'] })).toEqual(['tag1', 'user1', 'plain']);
  });

  test('should convert non-string values to strings', () => {
    expect(toStringArray([123, true, { toString: () => 'object' }])).toEqual(['123', 'true', 'object']);
  });
});

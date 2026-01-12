import { describe, expect, test } from 'bun:test';
import { deduplicateLocations } from './deduplicate';

describe('deduplicateLocations', () => {
  test('removes duplicate file:line entries', () => {
    const locations = [
      { file: 'a.ts', line: 10, importStatement: 'import x' },
      { file: 'a.ts', line: 10, importStatement: 'import x' },
      { file: 'b.ts', line: 5, importStatement: 'import y' },
    ];

    const result = deduplicateLocations(locations);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(locations[0]);
    expect(result[1]).toEqual(locations[2]);
  });

  test('keeps different lines in same file', () => {
    const locations = [
      { file: 'a.ts', line: 10, importStatement: 'import x' },
      { file: 'a.ts', line: 20, importStatement: 'import y' },
    ];

    const result = deduplicateLocations(locations);
    expect(result).toHaveLength(2);
  });

  test('keeps same line in different files', () => {
    const locations = [
      { file: 'a.ts', line: 10, importStatement: 'import x' },
      { file: 'b.ts', line: 10, importStatement: 'import y' },
    ];

    const result = deduplicateLocations(locations);
    expect(result).toHaveLength(2);
  });

  test('handles empty array', () => {
    const result = deduplicateLocations([]);
    expect(result).toHaveLength(0);
  });
});

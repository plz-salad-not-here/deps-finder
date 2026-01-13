import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { R } from '@mobily/ts-belt';
import { readFile, readFileAsync, readJSONFile, readJSONFileAsync } from './file-reader';

describe('file-reader', () => {
  const testDir = './test-file-reader';

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('Sync API', () => {
    test('readFile - returns Ok for valid file', async () => {
      const filePath = `${testDir}/test.txt`;
      await writeFile(filePath, 'hello world');

      const result = readFile(filePath);
      expect(R.isOk(result)).toBe(true);
      expect(R.getExn(result)).toBe('hello world');
    });

    test('readFile - returns Error for non-existent file', () => {
      const result = readFile(`${testDir}/non-existent.txt`);
      expect(R.isError(result)).toBe(true);
      R.match(
        result,
        () => {
          throw new Error('Should not be Ok');
        },
        (error) => {
          expect(error.type).toBe('FILE_NOT_FOUND');
          expect(error.path).toContain('non-existent.txt');
        },
      );
    });

    test('readJSONFile - parses valid JSON', async () => {
      const filePath = `${testDir}/test.json`;
      await writeFile(filePath, JSON.stringify({ name: 'test' }));

      const result = readJSONFile<{ name: string }>(filePath);
      expect(R.isOk(result)).toBe(true);
      expect(R.getExn(result).name).toBe('test');
    });

    test('readJSONFile - returns PARSE_ERROR for invalid JSON', async () => {
      const filePath = `${testDir}/invalid.json`;
      await writeFile(filePath, '{ invalid }');

      const result = readJSONFile(filePath);
      expect(R.isError(result)).toBe(true);
      R.match(
        result,
        () => {
          throw new Error('Should not be Ok');
        },
        (error) => {
          expect(error.type).toBe('PARSE_ERROR');
        },
      );
    });
  });

  describe('Async API', () => {
    test('readFileAsync - returns Ok for valid file', async () => {
      const filePath = `${testDir}/test-async.txt`;
      await writeFile(filePath, 'hello async world');

      const result = await readFileAsync(filePath);
      expect(R.isOk(result)).toBe(true);
      expect(R.getExn(result)).toBe('hello async world');
    });

    test('readFileAsync - returns Error for non-existent file', async () => {
      const result = await readFileAsync(`${testDir}/non-existent-async.txt`);
      expect(R.isError(result)).toBe(true);

      R.match(
        result,
        () => {
          throw new Error('Should not be Ok');
        },
        (error) => {
          expect(error.type).toBe('FILE_NOT_FOUND');
        },
      );
    });

    test('readJSONFileAsync - parses valid JSON', async () => {
      const filePath = `${testDir}/test-async.json`;
      await writeFile(filePath, JSON.stringify({ name: 'async-test' }));

      const result = await readJSONFileAsync<{ name: string }>(filePath);
      expect(R.isOk(result)).toBe(true);
      expect(R.getExn(result).name).toBe('async-test');
    });

    test('readJSONFileAsync - returns PARSE_ERROR for invalid JSON', async () => {
      const filePath = `${testDir}/invalid-async.json`;
      await writeFile(filePath, '{ invalid }');

      const result = await readJSONFileAsync(filePath);
      expect(R.isError(result)).toBe(true);
      R.match(
        result,
        () => {
          throw new Error('Should not be Ok');
        },
        (error) => {
          expect(error.type).toBe('PARSE_ERROR');
        },
      );
    });
  });
});

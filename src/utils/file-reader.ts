import { readFile as fsReadFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { AR, R, pipe } from '@mobily/ts-belt';
import type { FileError } from '../domain/errors.js';

/**
 * 동기로 파일 읽기
 */
export const readFile = (path: string): R.Result<string, FileError> => {
  return pipe(
    R.fromExecution(() => readFileSync(path, 'utf-8')),
    R.mapError((error) => {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        return { type: 'FILE_NOT_FOUND', path } as const;
      }
      return { type: 'READ_ERROR', path, error: error as Error } as const;
    }),
  );
};

/**
 * 동기로 JSON 파일 읽기
 */
export const readJSONFile = <T>(path: string): R.Result<T, FileError> => {
  return pipe(
    readFile(path),
    R.flatMap((content) =>
      pipe(
        R.fromExecution(() => JSON.parse(content) as T),
        R.mapError((error) => ({ type: 'PARSE_ERROR', path, error: error as Error }) as const),
      ),
    ),
  );
};

/**
 * 비동기로 파일 읽기 (향후 대량 처리나 외부 API 연동 시 활용)
 */
export const readFileAsync = (path: string): AR.AsyncResult<string, FileError> => {
  return pipe(
    AR.make(fsReadFile(path, 'utf-8')),
    AR.mapError((error) => {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        return { type: 'FILE_NOT_FOUND', path } as const;
      }
      return { type: 'READ_ERROR', path, error: error as Error } as const;
    }),
  );
};

/**
 * 비동기로 JSON 파일 읽기 (향후 대량 처리나 외부 API 연동 시 활용)
 */
export const readJSONFileAsync = <T>(path: string): AR.AsyncResult<T, FileError> => {
  return pipe(
    readFileAsync(path),
    AR.flatMap((content) => {
      return AR.make(Promise.resolve().then(() => JSON.parse(content) as T));
    }),
    AR.mapError((error) => {
      // If it's already a FileError from readFileAsync, just return it
      if (typeof error === 'object' && error !== null && 'type' in error) {
        return error as FileError;
      }
      return { type: 'PARSE_ERROR', path, error: error as Error } as const;
    }),
  );
};

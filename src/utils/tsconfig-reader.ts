import { join } from 'node:path';
import { R } from '@mobily/ts-belt';
import type { FileError } from '../domain/errors.js';
import { readJSONFile } from './file-reader.js';

export type TsConfig = {
  compilerOptions?: {
    outDir?: string;
  };
};

export const readTsConfig = (projectRoot: string): R.Result<TsConfig, FileError> => {
  const path = join(projectRoot, 'tsconfig.json');
  return readJSONFile<TsConfig>(path);
};

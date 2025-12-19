import { readFileSync } from 'node:fs';
import path from 'node:path';
import { A, S, O, pipe } from '@mobily/ts-belt';
import { globSync } from 'glob';
import {
  ANALYZABLE_EXTENSIONS,
  PRODUCTION_CONFIG_PATTERNS,
  DEV_CONFIG_PATTERNS,
  EXCLUDED_DIRECTORY_PATTERNS,
  EXCLUDED_FILENAME_PATTERNS,
  NODE_BUILTIN_MODULES,
  BUN_BUILTIN_MODULES,
  IMPORT_REGEX,
  REQUIRE_REGEX,
  MULTILINE_COMMENT_REGEX,
  SINGLE_LINE_COMMENT_REGEX,
} from '../constants/patterns.js';

/**
 * 주석 제거
 */
export const removeComments = (code: string): string =>
  pipe(
    code,
    S.replaceByRe(MULTILINE_COMMENT_REGEX, ''),
    S.replaceByRe(SINGLE_LINE_COMMENT_REGEX, ''),
  );

/**
 * 패키지명 추출
 */
export const extractPackageName = (importPath: string): string | null => {
  if (S.startsWith(importPath, '.') || S.startsWith(importPath, '/')) {
    return null;
  }

  if (S.startsWith(importPath, '@')) {
    const parts = S.split(importPath, '/');
    return A.length(parts) >= 2 ? `${parts[0]}/${parts[1]}` : null;
  }

  return pipe(importPath, S.split('/'), A.head, O.toNullable);
};

/**
 * 내장 모듈 여부 확인
 */
export const isBuiltinModule = (packageName: string): boolean => {
  const nodeBuiltins = [...NODE_BUILTIN_MODULES] as string[];
  const bunBuiltins = [...BUN_BUILTIN_MODULES] as string[];
  const prefixedNodeBuiltins = A.map(nodeBuiltins, (m) => `node:${m}`);

  const allBuiltins = [...nodeBuiltins, ...bunBuiltins, ...prefixedNodeBuiltins];

  return A.some(allBuiltins, (builtin) => packageName === builtin);
};

/**
 * 정규식 매칭 결과를 배열로 변환
 */
const execAll = (regex: RegExp, text: string): RegExpExecArray[] => {
  const matches: RegExpExecArray[] = [];
  let match: RegExpExecArray | null = regex.exec(text);
  regex.lastIndex = 0;

  // Use simple loop to avoid assignment in condition
  while (true) {
    match = regex.exec(text);
    if (match === null) break;
    matches.push(match);
  }
  return matches;
};

/**
 * Import 구문에서 패키지명 추출
 */
const extractImportsFromMatches = (matches: RegExpExecArray[]): readonly string[] =>
  pipe(
    matches,
    A.map((match) => match[1] as string),
    A.map(extractPackageName),
    A.filter((pkg): pkg is string => pkg !== null),
    A.filter((pkg) => !isBuiltinModule(pkg)),
  );

/**
 * 파일 확장자 확인
 */
const hasAnalyzableExtension = (filePath: string): boolean =>
  pipe(filePath, path.extname, (ext) =>
    A.some(ANALYZABLE_EXTENSIONS, (allowed) => allowed === ext),
  );

/**
 * 프로덕션 config 파일 여부
 */
export const isProductionConfigFile = (filePath: string): boolean =>
  pipe(filePath, path.basename, (filename) =>
    A.some(PRODUCTION_CONFIG_PATTERNS, (pattern) => pattern.test(filename)),
  );

/**
 * 제외 대상 경로 여부
 */
export const isExcludedPath = (filePath: string): boolean => {
  // Normalize to use forward slashes and ensure leading slash for directory matching
  const rawNormalized = S.replaceByRe(filePath, /\\/g, '/');
  const normalizedPath = S.startsWith(rawNormalized, '/') ? rawNormalized : `/${rawNormalized}`;
  const filename = path.basename(filePath);

  const hasExcludedDir = pipe(
    EXCLUDED_DIRECTORY_PATTERNS,
    A.some((pattern) => S.includes(normalizedPath, pattern)),
  );

  if (hasExcludedDir) return true;

  const hasExcludedFilename = pipe(
    EXCLUDED_FILENAME_PATTERNS,
    A.some((pattern) => S.includes(filename, pattern)),
  );

  if (hasExcludedFilename) return true;

  const isDevConfig = pipe(
    DEV_CONFIG_PATTERNS,
    A.some((pattern) => S.includes(filename, pattern)),
  );

  return isDevConfig;
};

/**
 * 분석 대상 파일 여부
 */
export const shouldAnalyzeFile = (filePath: string): boolean => {
  if (!hasAnalyzableExtension(filePath)) return false;
  if (isProductionConfigFile(filePath)) return true;
  if (isExcludedPath(filePath)) return false;
  return true;
};

/**
 * 파일에서 import/require 파싱
 */
export const parseImports = (filePath: string): Set<string> => {
  if (!shouldAnalyzeFile(filePath)) {
    return new Set();
  }

  try {
    return pipe(
      filePath,
      readFileSync,
      (buffer) => buffer.toString('utf-8'),
      removeComments,
      (cleanContent) => {
        const importMatches = execAll(IMPORT_REGEX, cleanContent);
        const requireMatches = execAll(REQUIRE_REGEX, cleanContent);
        return [
          ...extractImportsFromMatches(importMatches),
          ...extractImportsFromMatches(requireMatches),
        ];
      },
      A.uniq,
      (imports) => new Set(imports),
    );
  } catch (_error) {
    return new Set();
  }
};

/**
 * Find all analyzable files in the directory
 */
export const findFiles = (rootDir: string): readonly string[] => {
  const files = globSync('**/*', {
    cwd: rootDir,
    absolute: true,
    nodir: true,
    ignore: [
      ...EXCLUDED_DIRECTORY_PATTERNS.map((p) => `**${p}**`),
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/out/**',
      '**/coverage/**',
    ],
  });

  return A.filter(files, shouldAnalyzeFile);
};

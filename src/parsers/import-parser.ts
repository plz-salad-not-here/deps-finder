import { readFileSync } from 'node:fs';
import path from 'node:path';
import { A, O, pipe, S } from '@mobily/ts-belt';
import { globSync } from 'glob';
import { match, P } from 'ts-pattern';
import {
  ANALYZABLE_EXTENSIONS,
  BUN_BUILTIN_MODULES,
  DEV_CONFIG_PATTERNS,
  EXCLUDED_DIRECTORY_PATTERNS,
  EXCLUDED_FILENAME_PATTERNS,
  IMPORT_REGEX,
  MIXED_TYPE_IMPORT_REGEX,
  MULTILINE_COMMENT_REGEX,
  NODE_BUILTIN_MODULES,
  PRODUCTION_CONFIG_PATTERNS,
  REQUIRE_REGEX,
  SINGLE_LINE_COMMENT_REGEX,
  TYPE_ONLY_IMPORT_REGEX,
} from '../constants/patterns.js';
import type { ImportDetails, ImportType, PackageName } from '../domain/types.js';
import { isNotNullable } from '../utils/type-guards.js';

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
 * Deep import를 올바르게 처리
 *
 * 예시:
 * - 'react' → 'react'
 * - 'lodash/map' → 'lodash'
 * - '@scope/pkg' → '@scope/pkg'
 * - '@scope/pkg/sub' → '@scope/pkg'
 * - './relative' → null
 * - 'core-js/actual' → 'core-js'
 */
export const extractPackageName = (importPath: string | undefined | null): string | null =>
  match(importPath)
    // 1. null/undefined 제외
    .with(P.nullish, () => null)

    // 2. 빈 문자열 제외
    .with('', () => null)

    // 3. Protocol URL 제외
    .with(P.string.includes('://'), () => null)

    // 4. Relative path 제외 (.)
    .with(P.string.startsWith('.'), () => null)

    // 5. Absolute path 제외 (/)
    .with(P.string.startsWith('/'), () => null)

    // 6. Scoped package 처리 (@scope/package)
    .with(P.string.startsWith('@'), (path) => {
      const parts = S.split(path, '/');

      // @scope/package 형태 검증
      if (A.length(parts) < 2) return null;

      const scope = A.get(parts, 0);
      const packagePart = A.get(parts, 1);

      if (!scope || !packagePart || S.isEmpty(scope) || S.isEmpty(packagePart)) {
        return null;
      }

      // @scope/package만 반환 (sub-path 제외)
      return `${scope}/${packagePart}`;
    })

    // 7. Regular package 처리
    .otherwise((path) => pipe(path, S.split('/'), A.head, O.toNullable));

/**
 * 내장 모듈 여부 확인
 */
export const isBuiltinModule = (packageName: string): boolean => {
  const nodeBuiltins = [...NODE_BUILTIN_MODULES];
  const bunBuiltins = [...BUN_BUILTIN_MODULES];
  const prefixedNodeBuiltins = A.map(nodeBuiltins, (m) => `node:${m}`);

  const allBuiltins = [...nodeBuiltins, ...bunBuiltins, ...prefixedNodeBuiltins];

  return A.some(allBuiltins, (builtin) => packageName === builtin);
};

/**
 * 정규식 매칭 결과를 배열로 변환
 */
const execAll = (regex: RegExp, text: string): RegExpExecArray[] => {
  const matches: RegExpExecArray[] = [];
  regex.lastIndex = 0;

  let match = regex.exec(text);
  while (match !== null) {
    matches.push(match);
    match = regex.exec(text);
  }
  return matches;
};

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
  const rawNormalized = S.replaceByRe(filePath, /\\/g, '/');
  const normalizedPath = S.startsWith(rawNormalized, '/') ? rawNormalized : `/${rawNormalized}`;
  const filename = path.basename(filePath);

  const hasExcludedDir = A.some(EXCLUDED_DIRECTORY_PATTERNS, (pattern) =>
    S.includes(normalizedPath, pattern),
  );

  if (hasExcludedDir) return true;

  const hasExcludedFilename = A.some(EXCLUDED_FILENAME_PATTERNS, (pattern) =>
    S.includes(filename, pattern),
  );

  if (hasExcludedFilename) return true;

  const isDevConfig = A.some(DEV_CONFIG_PATTERNS, (pattern) => S.includes(filename, pattern));

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
 * 파일에서 import/require 파싱 및 타입 분류
 */
export const parseImportsWithType = (filePath: string): Set<ImportDetails> => {
  if (!shouldAnalyzeFile(filePath)) {
    return new Set();
  }

  try {
    const fileContent = pipe(
      filePath,
      readFileSync,
      (buffer) => buffer.toString('utf-8'),
      removeComments,
    );

    const importsMap = new Map<PackageName, ImportType>();

    // Pass 1: Initialize packages. Assume runtime initially for all general imports.
    const allGeneralImportMatches = [
      ...execAll(IMPORT_REGEX, fileContent),
      ...execAll(REQUIRE_REGEX, fileContent),
    ];

    A.forEach(allGeneralImportMatches, (match) => {
      const packageName = extractPackageName(match[1] ?? match[2]);
      if (isNotNullable(packageName) && !isBuiltinModule(packageName)) {
        importsMap.set(packageName, 'runtime');
      }
    });

    // Pass 2: Refine for explicit `import type X from 'pkg'` statements.
    A.forEach(execAll(TYPE_ONLY_IMPORT_REGEX, fileContent), (match) => {
      const packageName = extractPackageName(match[1]);
      if (isNotNullable(packageName) && !isBuiltinModule(packageName)) {
        if (importsMap.get(packageName) !== 'runtime') {
          importsMap.set(packageName, 'type-only');
        }
      }
    });

    // Pass 3: Refine for `import { type X, Y } from 'pkg'` or `import { type X } from 'pkg'` statements.
    A.forEach(execAll(MIXED_TYPE_IMPORT_REGEX, fileContent), (match) => {
      const fullImportStr = match[1]; // match[1] can be undefined
      const pkgPath = match[2]; // match[2] can be undefined
      const packageName = extractPackageName(pkgPath);

      if (!isNotNullable(packageName) || isBuiltinModule(packageName)) return;
      if (!isNotNullable(fullImportStr)) return;

      const hasRuntimeSpecifier = pipe(
        S.split(fullImportStr, ','),
        A.some((spec) => !S.includes(spec.trim(), 'type ')),
      );

      if (hasRuntimeSpecifier) {
        importsMap.set(packageName, 'runtime');
      } else {
        if (importsMap.get(packageName) !== 'runtime') {
          importsMap.set(packageName, 'type-only');
        }
      }
    });

    // Convert map values to Set<ImportDetails>
    const finalImports = pipe(
      Array.from(importsMap.entries()),
      A.map(([packageName, importType]) => ({ packageName, importType })),
      (items) => new Set(items),
    );

    return finalImports;
  } catch (_error) {
    return new Set();
  }
};

/**
 * Files from `findFiles` will be consumed by `parseImportsWithType`
 * So `parseImports` can be removed or adapted.
 * I will keep `parseImports` for now and just make it call `parseImportsWithType`
 * to maintain current call signature if there are any other direct callers.
 */
export const parseImports = (filePath: string): Set<string> => {
  const details = parseImportsWithType(filePath);
  return new Set(A.map([...details], (d) => d.packageName));
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

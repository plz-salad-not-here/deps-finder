import { readFileSync } from 'node:fs';
import path from 'node:path';
import { A, O, S, pipe } from '@mobily/ts-belt';
import { globSync } from 'glob';
import { P, match } from 'ts-pattern';
import {
  ANALYZABLE_EXTENSIONS,
  BUN_BUILTIN_MODULES,
  DEV_CONFIG_PATTERNS,
  EXCLUDED_DIRECTORY_PATTERNS,
  EXCLUDED_FILENAME_PATTERNS,
  IGNORE_GLOB_PATTERNS,
  IMPORT_REGEX,
  MIXED_TYPE_IMPORT_REGEX,
  MULTILINE_COMMENT_REGEX,
  NODE_BUILTIN_MODULES,
  PRODUCTION_CONFIG_PATTERNS,
  REQUIRE_REGEX,
  SINGLE_LINE_COMMENT_REGEX,
  TYPE_ONLY_IMPORT_REGEX,
} from '../constants/patterns.js';
import type { ImportDetails } from '../domain/types.js';
import { isNotNullable, isString } from '../utils/type-guards.js';

/**
 * 주석 제거 (줄바꿈 보존)
 */
export const removeComments = (code: string): string => {
  return code
    .replace(MULTILINE_COMMENT_REGEX, (match) => {
      // 매치된 문자열 내의 줄바꿈 개수만큼 줄바꿈 문자 유지
      const newlines = (match.match(/\n/g) || []).join('');
      return newlines;
    })
    .replace(SINGLE_LINE_COMMENT_REGEX, '');
};

/**
 * 줄 번호 계산
 */
const getLineNumber = (content: string, index: number): number => {
  return content.substring(0, index).split('\n').length;
};

/**
 * 패키지명 추출
 */
export const extractPackageName = (importPath: string | undefined | null): string | null => {
  return match(importPath)
    .with(P.nullish, () => null)
    .with(
      P.when((p) => !isString(p) || S.isEmpty(p)),
      () => null,
    )
    .with(
      P.when((p) => /^(?:http|https|file):/.test(p as string)),
      () => null,
    )
    .with(
      P.when((p) => S.startsWith(p as string, '.') || S.startsWith(p as string, '/')),
      () => null,
    )
    .with(
      P.when((p) => S.startsWith(p as string, '@')),
      (p) => {
        const parts = S.split(p as string, '/');
        return A.length(parts) >= 2 && S.isNotEmpty(parts[1] ?? '')
          ? `${parts[0]}/${parts[1]}`
          : null;
      },
    )
    .otherwise((p) => pipe(p as string, S.split('/'), A.head, O.toNullable));
};

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

  return match({ normalizedPath, filename })
    .with(
      P.when(({ normalizedPath }) =>
        A.some(EXCLUDED_DIRECTORY_PATTERNS, (pattern) => S.includes(normalizedPath, pattern)),
      ),
      () => true,
    )
    .with(
      P.when(({ filename }) =>
        A.some(EXCLUDED_FILENAME_PATTERNS, (pattern) => S.includes(filename, pattern)),
      ),
      () => true,
    )
    .with(
      P.when(({ filename }) =>
        A.some(DEV_CONFIG_PATTERNS, (pattern) => S.includes(filename, pattern)),
      ),
      () => true,
    )
    .otherwise(() => false);
};

/**
 * 분석 대상 파일 여부
 */
export const shouldAnalyzeFile = (filePath: string): boolean => {
  return match(filePath)
    .with(
      P.when((p) => p.endsWith('.d.ts')),
      () => false,
    )
    .with(
      P.when((p) => !hasAnalyzableExtension(p)),
      () => false,
    )
    .with(P.when(isProductionConfigFile), () => true)
    .with(P.when(isExcludedPath), () => false)
    .otherwise(() => true);
};

/**
 * 파일에서 import/require 파싱 및 타입 분류
 */
export const parseImportsWithType = (filePath: string): Set<ImportDetails> => {
  if (!shouldAnalyzeFile(filePath)) {
    return new Set();
  }

  try {
    const rawFileContent = readFileSync(filePath).toString('utf-8');
    const fileContent = removeComments(rawFileContent);
    const findings: ImportDetails[] = [];

    // Pass 1: Initialize packages. Assume runtime initially for all general imports.
    const allGeneralImportMatches = [
      ...execAll(IMPORT_REGEX, fileContent),
      ...execAll(REQUIRE_REGEX, fileContent),
    ];

    A.forEach(allGeneralImportMatches, (match) => {
      const packageName = extractPackageName(match[1] ?? match[2]);
      if (isNotNullable(packageName) && !isBuiltinModule(packageName)) {
        findings.push({
          packageName,
          importType: 'runtime',
          file: filePath,
          line: getLineNumber(fileContent, match.index),
          importStatement: match[0].trim(),
        });
      }
    });

    // Pass 2: Refine for explicit `import type X from 'pkg'` statements.
    const typeOnlyMatches = execAll(TYPE_ONLY_IMPORT_REGEX, fileContent);
    A.forEach(typeOnlyMatches, (match) => {
      const packageName = extractPackageName(match[1]);
      if (isNotNullable(packageName) && !isBuiltinModule(packageName)) {
        findings.push({
          packageName,
          importType: 'type-only',
          file: filePath,
          line: getLineNumber(fileContent, match.index),
          importStatement: match[0].trim(),
        });
      }
    });

    // Pass 3: Refine for `import { type X, Y } from 'pkg'` or `import { type X } from 'pkg'` statements.
    const mixedTypeMatches = execAll(MIXED_TYPE_IMPORT_REGEX, fileContent);
    A.forEach(mixedTypeMatches, (match) => {
      const fullImportStr = match[1]; // match[1] can be undefined
      const pkgPath = match[2]; // match[2] can be undefined
      const packageName = extractPackageName(pkgPath);

      if (!isNotNullable(packageName) || isBuiltinModule(packageName)) return;
      if (!isNotNullable(fullImportStr)) return;

      // Skip if there is no 'type' keyword involved, as Pass 1 already caught standard imports.
      if (!fullImportStr.includes('type ')) return;

      const hasRuntimeSpecifier = pipe(
        S.split(fullImportStr, ','),
        A.some((spec) => !S.includes(spec.trim(), 'type ')),
      );

      findings.push({
        packageName,
        importType: hasRuntimeSpecifier ? 'runtime' : 'type-only',
        file: filePath,
        line: getLineNumber(fileContent, match.index),
        importStatement: match[0].trim(),
      });
    });

    return new Set(findings);
  } catch (_error) {
    return new Set();
  }
};

/**
 * Files from `findFiles` will be consumed by `parseImportsWithType`
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
    ignore: [...IGNORE_GLOB_PATTERNS],
  });

  return A.filter(files, shouldAnalyzeFile);
};

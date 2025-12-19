import { A, D, O, pipe } from '@mobily/ts-belt';
import type { PackageJson, AnalysisResult } from '../domain/types.js';
import { parseImports } from '../parsers/import-parser.js';

/**
 * 의존성 타입 분류
 */
type DependencyCategory = 'dependencies' | 'peerDependencies' | 'devDependencies';

/**
 * 의존성 카테고리별 패키지 추출
 */
const extractDependenciesByCategory = (
  packageJson: PackageJson,
  category: DependencyCategory,
): ReadonlyArray<string> => pipe(packageJson[category], O.getWithDefault({}), D.keys);

/**
 * 모든 의존성 추출
 */
const extractAllDependencies = (
  packageJson: PackageJson,
  checkAll: boolean,
): ReadonlyArray<string> => {
  const deps = extractDependenciesByCategory(packageJson, 'dependencies');
  const peerDeps = extractDependenciesByCategory(packageJson, 'peerDependencies');

  return checkAll
    ? [...deps, ...peerDeps, ...extractDependenciesByCategory(packageJson, 'devDependencies')]
    : [...deps, ...peerDeps];
};

/**
 * 파일 목록에서 모든 import 수집
 */
const collectAllImports = (files: ReadonlyArray<string>): Set<string> =>
  pipe(
    files,
    A.map(parseImports),
    A.reduce(new Set<string>(), (acc, imports) => {
      for (const pkg of imports) {
        acc.add(pkg);
      }
      return acc;
    }),
  );

/**
 * 미사용 의존성 찾기
 */
const findUnused = (declared: ReadonlyArray<string>, used: Set<string>): ReadonlyArray<string> =>
  pipe(
    declared,
    A.filter((dep) => !used.has(dep)),
  );

/**
 * 잘못 배치된 의존성 찾기
 */
const findMisplaced = (packageJson: PackageJson, used: Set<string>): ReadonlyArray<string> => {
  const devDeps = extractDependenciesByCategory(packageJson, 'devDependencies');

  return pipe(
    devDeps,
    A.filter((dep) => used.has(dep)),
  );
};

/**
 * 무시할 패키지 필터링
 */
const filterIgnored = (
  packages: ReadonlyArray<string>,
  ignoredPackages: ReadonlyArray<string>,
): ReadonlyArray<string> =>
  pipe(
    packages,
    A.filter((pkg) => !A.includes(ignoredPackages, pkg)),
  );

/**
 * 의존성 분석 실행
 */
export const analyzeDependencies = (
  packageJson: PackageJson,
  files: ReadonlyArray<string>,
  options: { checkAll: boolean; ignoredPackages: ReadonlyArray<string> },
): AnalysisResult => {
  // 1. 선언된 의존성 추출
  const declaredDeps = extractAllDependencies(packageJson, options.checkAll);

  // 2. 사용된 의존성 수집
  const usedDeps = collectAllImports(files);

  // 3. 미사용 의존성 찾기
  const unused = pipe(
    declaredDeps,
    (deps) => findUnused(deps, usedDeps),
    (deps) => filterIgnored(deps, options.ignoredPackages),
  );

  // 4. 잘못 배치된 의존성 찾기
  const misplaced = options.checkAll
    ? []
    : pipe(
        packageJson,
        (pkg) => findMisplaced(pkg, usedDeps),
        (deps) => filterIgnored(deps, options.ignoredPackages),
      );

  return {
    unused,
    misplaced,
    totalIssues: A.length(unused) + A.length(misplaced),
  };
};

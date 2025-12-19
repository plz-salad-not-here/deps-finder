import { A, D, O, pipe } from '@mobily/ts-belt';
import type { PackageJson, AnalysisResult, ImportDetails, PackageName } from '../domain/types.js';
import { parseImportsWithType } from '../parsers/import-parser.js';

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

type CategorizedImports = {
  runtime: Set<PackageName>;
  typeOnly: Set<PackageName>;
};

/**
 * 파일 목록에서 모든 import 수집 및 분류
 */
const collectAllImports = (files: ReadonlyArray<string>): CategorizedImports => {
  const allImports = pipe(
    files,
    A.map(parseImportsWithType),
    A.reduce(new Set<ImportDetails>(), (acc, imports) => {
      for (const detail of imports) {
        // Changed from imports.forEach
        acc.add(detail);
      }
      return acc;
    }),
  );

  const runtimeImports = new Set<PackageName>();
  const typeOnlyCandidateImports = new Map<PackageName, boolean>();

  for (const detail of allImports) {
    // Changed from A.forEach
    if (detail.importType === 'runtime') {
      runtimeImports.add(detail.packageName);
      typeOnlyCandidateImports.set(detail.packageName, false);
    } else {
      if (typeOnlyCandidateImports.get(detail.packageName) === undefined) {
        typeOnlyCandidateImports.set(detail.packageName, true);
      }
    }
  }

  const exclusivelyTypeOnlyImports = new Set<PackageName>();
  typeOnlyCandidateImports.forEach((isOnlyType, packageName) => {
    if (isOnlyType && !runtimeImports.has(packageName)) {
      exclusivelyTypeOnlyImports.add(packageName);
    }
  });

  return {
    runtime: runtimeImports,
    typeOnly: exclusivelyTypeOnlyImports,
  };
};

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

  // 2. 사용된 의존성 수집 및 분류
  const { runtime: runtimeUsedDeps, typeOnly: typeOnlyUsedDeps } = collectAllImports(files);

  // 3. 미사용 의존성 찾기
  // Declared deps that are not used at runtime AND not exclusively type-only.
  // We first find unused considering only runtime, then filter out the typeOnly ones.
  const unusedCandidates = findUnused(declaredDeps, runtimeUsedDeps);

  const unused = pipe(
    unusedCandidates,
    A.filter((dep) => !typeOnlyUsedDeps.has(dep)), // remove type-only deps from unused
    (deps) => filterIgnored(deps, options.ignoredPackages),
  );

  const finalTypeOnly = pipe(
    declaredDeps,
    A.filter((dep) => typeOnlyUsedDeps.has(dep)),
    (deps) => filterIgnored(deps, options.ignoredPackages),
  );

  // 4. 잘못 배치된 의존성 찾기
  const misplaced = options.checkAll
    ? []
    : pipe(
        packageJson,
        (pkg) => findMisplaced(pkg, runtimeUsedDeps),
        (deps) => filterIgnored(deps, options.ignoredPackages),
      );

  return {
    unused,
    misplaced,
    typeOnly: finalTypeOnly,
    totalIssues: A.length(unused) + A.length(misplaced),
  };
};

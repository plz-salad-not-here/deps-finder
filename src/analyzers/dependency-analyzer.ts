import { A, D, O, pipe } from '@mobily/ts-belt';
import { match } from 'ts-pattern';
import type {
  AnalysisResult,
  DependencyUsage,
  ImportDetails,
  ImportLocation,
  PackageJson,
  PackageName,
} from '../domain/types.js';
import { isProductionConfigFile } from '../parsers/import-parser.js';
import { deduplicateLocations } from '../utils/deduplicate.js';

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
): ReadonlyArray<string> => O.mapWithDefault(packageJson[category], [], D.keys);

/**
 * 모든 의존성 추출
 */
const extractAllDependencies = (
  packageJson: PackageJson,
  checkAll: boolean,
): ReadonlyArray<string> => {
  const deps = extractDependenciesByCategory(packageJson, 'dependencies');
  const peerDeps = extractDependenciesByCategory(packageJson, 'peerDependencies');
  const devDeps = extractDependenciesByCategory(packageJson, 'devDependencies');

  return match(checkAll)
    .with(true, () => [...deps, ...peerDeps, ...devDeps])
    .otherwise(() => [...deps, ...peerDeps]);
};

type CategorizedImports = {
  runtime: Map<PackageName, ImportLocation[]>;
  typeOnly: Map<PackageName, ImportLocation[]>;
};

/**
 * import 목록 분류
 */
const categorizeImports = (imports: ReadonlyArray<ImportDetails>): CategorizedImports => {
  return A.reduce(
    imports,
    {
      runtime: new Map<PackageName, ImportLocation[]>(),
      typeOnly: new Map<PackageName, ImportLocation[]>(),
    },
    (acc, detail) => {
      const loc: ImportLocation = {
        file: detail.file,
        line: detail.line,
        importStatement: detail.importStatement,
      };

      match(detail.importType)
        .with('runtime', () => {
          const list = acc.runtime.get(detail.packageName) || [];
          list.push(loc);
          acc.runtime.set(detail.packageName, list);
        })
        .otherwise(() => {
          const list = acc.typeOnly.get(detail.packageName) || [];
          list.push(loc);
          acc.typeOnly.set(detail.packageName, list);
        });
      return acc;
    },
  );
};

/**
 * 미사용 의존성 찾기
 */
const findUnused = (
  declared: ReadonlyArray<string>,
  usedRuntime: Map<PackageName, ImportLocation[]>,
  usedTypeOnly: Map<PackageName, ImportLocation[]>,
): ReadonlyArray<string> =>
  A.filter(declared, (dep) => !usedRuntime.has(dep) && !usedTypeOnly.has(dep));

/**
 * 잘못 배치된 의존성 찾기
 */
const findMisplaced = (
  packageJson: PackageJson,
  usedRuntime: Map<PackageName, ImportLocation[]>,
): ReadonlyArray<DependencyUsage> => {
  const devDeps = extractDependenciesByCategory(packageJson, 'devDependencies');

  return A.filterMap(devDeps, (dep) => {
    const locations = usedRuntime.get(dep);
    if (!locations) return O.None;

    // Filter out usages in build config files
    const problematicLocations = A.filter(locations, (loc) => !isProductionConfigFile(loc.file));
    const uniqueLocations = deduplicateLocations(problematicLocations);

    return match(uniqueLocations)
      .with([], () => O.None)
      .otherwise((locs) =>
        O.Some({
          packageName: dep,
          locations: locs,
        }),
      );
  });
};

/**
 * 무시할 패키지 필터링
 */
const filterIgnored = <T extends string | DependencyUsage>(
  items: ReadonlyArray<T>,
  ignoredPackages: ReadonlyArray<string>,
): ReadonlyArray<T> =>
  A.filter(items, (item) => {
    const pkgName = typeof item === 'string' ? item : item.packageName;
    return !A.includes(ignoredPackages, pkgName);
  });

/**
 * 의존성 분석 실행
 */
export const analyzeDependencies = (
  packageJson: PackageJson,
  allImports: ReadonlyArray<ImportDetails>,
  options: { checkAll: boolean; ignoredPackages: ReadonlyArray<string> },
): AnalysisResult => {
  // 1. 선언된 의존성 추출
  const declaredDeps = extractAllDependencies(packageJson, options.checkAll);

  // 2. 사용된 의존성 분류
  const { runtime: runtimeUsedDeps, typeOnly: typeOnlyUsedDeps } = categorizeImports(allImports);

  // 3. 미사용 의존성 찾기
  const unused = pipe(findUnused(declaredDeps, runtimeUsedDeps, typeOnlyUsedDeps), (deps) =>
    filterIgnored(deps, options.ignoredPackages),
  );

  const finalTypeOnly = pipe(
    declaredDeps,
    A.filter((dep) => typeOnlyUsedDeps.has(dep) && !runtimeUsedDeps.has(dep)),
    (deps) => filterIgnored(deps, options.ignoredPackages),
  );

  // 4. 잘못 배치된 의존성 찾기
  const misplaced = match(options.checkAll)
    .with(true, () => [])
    .otherwise(() =>
      pipe(
        packageJson,
        (pkg) => findMisplaced(pkg, runtimeUsedDeps),
        (deps) => filterIgnored(deps, options.ignoredPackages),
      ),
    );

  return {
    unused,
    misplaced,
    typeOnly: finalTypeOnly,
    totalIssues: A.length(unused) + A.length(misplaced) + A.length(finalTypeOnly),
  };
};

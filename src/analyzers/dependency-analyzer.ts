import { A, pipe } from '@mobily/ts-belt';
import type { AnalysisResult, PackageJson, PackageName } from '../domain/types.js';
import {
  getAllUsedPackages,
  getImportUsageCount,
  getTypeOnlyIgnoredPackages,
  type PackageUsageMap,
} from '../parsers/import-parser.js';
import {
  extractAllDependencies,
  extractDependencies,
  extractProductionDependencies,
} from '../parsers/package-parser.js';

function getDeclaredDependencies(
  packageJson: PackageJson,
  checkAll: boolean,
): ReadonlyArray<PackageName> {
  return checkAll
    ? extractAllDependencies(packageJson)
    : extractProductionDependencies(packageJson);
}

function createAnalysisResult(
  packageJson: PackageJson,
  usedPackages: ReadonlyArray<PackageName>,
  checkAll: boolean,
  ignorePackages: ReadonlyArray<string>,
  typeOnlyIgnoredPackages: ReadonlyArray<PackageName>,
  usageMap: PackageUsageMap,
): AnalysisResult {
  const devDeps = extractDependencies(packageJson, 'devDependencies');
  const declaredDeps = getDeclaredDependencies(packageJson, checkAll);

  const unusedBeforeFilter = findUnusedDependencies(declaredDeps, usedPackages);
  const misplacedBeforeFilter = findMisplacedDependencies(devDeps, usedPackages);

  // Separate ignored packages by reason
  const ignoreSet = new Set(ignorePackages);
  const typeOnlySet = new Set(typeOnlyIgnoredPackages);

  const unused = A.filter(unusedBeforeFilter, (pkg) => !ignoreSet.has(pkg));
  const misplaced = A.filter(misplacedBeforeFilter, (pkg) => !ignoreSet.has(pkg));

  // Track what was ignored
  const ignoredByOption = A.filter(unusedBeforeFilter, (pkg) => ignoreSet.has(pkg));
  const ignoredByTypeOnly = A.filter(unusedBeforeFilter, (pkg) => typeOnlySet.has(pkg));
  const ignoredByDefault = A.filter(
    unusedBeforeFilter,
    (pkg) => !ignoreSet.has(pkg) && !typeOnlySet.has(pkg) && !new Set(unused).has(pkg),
  );

  // Create used packages with usage counts, sorted by count descending
  const used = pipe(
    usedPackages,
    A.map((pkg) => ({
      name: pkg,
      count: usageMap.get(pkg) ?? 0,
    })),
    A.sort((a, b) => b.count - a.count), // Sort by count descending (most used first)
  );

  return {
    used,
    unused,
    misplaced,
    ignored: {
      typeOnly: A.sort(ignoredByTypeOnly, (a, b) => a.localeCompare(b)),
      byDefault: A.sort(ignoredByDefault, (a, b) => a.localeCompare(b)),
      byOption: A.sort(ignoredByOption, (a, b) => a.localeCompare(b)),
    },
  };
}

export async function analyzeDependencies(
  packageJson: PackageJson,
  rootDir: string,
  checkAll: boolean,
  ignorePackages: ReadonlyArray<string> = [],
): Promise<AnalysisResult> {
  const usedPackages = await getAllUsedPackages(rootDir);
  const typeOnlyIgnoredPackages = await getTypeOnlyIgnoredPackages(rootDir);
  const usageMap = await getImportUsageCount(rootDir);
  return createAnalysisResult(
    packageJson,
    usedPackages,
    checkAll,
    ignorePackages,
    typeOnlyIgnoredPackages,
    usageMap,
  );
}

function findUnusedDependencies(
  declared: ReadonlyArray<PackageName>,
  used: ReadonlyArray<PackageName>,
): ReadonlyArray<PackageName> {
  const usedSet = new Set(used);

  return pipe(
    declared,
    A.filter((dep) => !usedSet.has(dep)),
    A.sort((a, b) => a.localeCompare(b)),
  );
}

function findMisplacedDependencies(
  devDeps: ReadonlyArray<PackageName>,
  used: ReadonlyArray<PackageName>,
): ReadonlyArray<PackageName> {
  const usedSet = new Set(used);

  return pipe(
    devDeps,
    A.filter((dep) => usedSet.has(dep)),
    A.sort((a, b) => a.localeCompare(b)),
  );
}

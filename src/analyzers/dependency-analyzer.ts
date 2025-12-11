import { A, pipe } from '@mobily/ts-belt';
import type { AnalysisResult, PackageJson, PackageName } from '../domain/types.js';
import { getAllUsedPackages, getTypeOnlyIgnoredPackages } from '../parsers/import-parser.js';
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

  return {
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
  return createAnalysisResult(
    packageJson,
    usedPackages,
    checkAll,
    ignorePackages,
    typeOnlyIgnoredPackages,
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

import { A, pipe } from '@mobily/ts-belt';
import type { AnalysisResult, PackageJson, PackageName } from '../domain/types.js';
import { getAllUsedPackages } from '../parsers/import-parser.js';
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

function filterIgnoredPackages(
  packages: ReadonlyArray<PackageName>,
  ignorePackages: ReadonlyArray<string>,
): ReadonlyArray<PackageName> {
  if (ignorePackages.length === 0) {
    return packages;
  }
  const ignoreSet = new Set(ignorePackages);
  return A.filter(packages, (pkg) => !ignoreSet.has(pkg));
}

function createAnalysisResult(
  packageJson: PackageJson,
  usedPackages: ReadonlyArray<PackageName>,
  checkAll: boolean,
  ignorePackages: ReadonlyArray<string>,
): AnalysisResult {
  const devDeps = extractDependencies(packageJson, 'devDependencies');
  const declaredDeps = getDeclaredDependencies(packageJson, checkAll);

  const unused = filterIgnoredPackages(
    findUnusedDependencies(declaredDeps, usedPackages),
    ignorePackages,
  );
  const misplaced = filterIgnoredPackages(
    findMisplacedDependencies(devDeps, usedPackages),
    ignorePackages,
  );

  return { unused, misplaced };
}

export async function analyzeDependencies(
  packageJson: PackageJson,
  rootDir: string,
  checkAll: boolean,
  ignorePackages: ReadonlyArray<string> = [],
): Promise<AnalysisResult> {
  const usedPackages = await getAllUsedPackages(rootDir);
  return createAnalysisResult(packageJson, usedPackages, checkAll, ignorePackages);
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

import { A, D, O, R, pipe } from '@mobily/ts-belt';
import type { DependencyType, PackageJson, PackageName } from '../domain/types.js';
import type { FileError } from '../domain/errors.js';
import { readJSONFile } from '../utils/file-reader.js';

type RawPackageJson = {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

export function readPackageJson(path: string): R.Result<PackageJson, FileError> {
  return pipe(
    readJSONFile<RawPackageJson>(path),
    R.map((content) => ({
      name: O.fromNullable(content.name),
      version: O.fromNullable(content.version),
      dependencies: O.fromNullable(content.dependencies),
      devDependencies: O.fromNullable(content.devDependencies),
      peerDependencies: O.fromNullable(content.peerDependencies),
    })),
  );
}

export function extractDependencies(
  packageJson: PackageJson,
  type: DependencyType,
): ReadonlyArray<PackageName> {
  return O.mapWithDefault(packageJson[type], [], D.keys);
}

function mergeDependencyKeys(
  packageJson: PackageJson,
  types: ReadonlyArray<DependencyType>,
): ReadonlyArray<PackageName> {
  return pipe(
    types,
    A.map((type) => extractDependencies(packageJson, type)),
    A.flat,
    A.uniq,
  );
}

export function extractAllDependencies(packageJson: PackageJson): ReadonlyArray<PackageName> {
  return mergeDependencyKeys(packageJson, ['dependencies', 'devDependencies', 'peerDependencies']);
}

export function extractProductionDependencies(
  packageJson: PackageJson,
): ReadonlyArray<PackageName> {
  return mergeDependencyKeys(packageJson, ['dependencies']);
}

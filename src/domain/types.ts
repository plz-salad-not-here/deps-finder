import { O, R } from '@mobily/ts-belt';

export type PackageName = string;
export type FilePath = string;
export type ImportStatement = string;

export const DEPENDENCY_TYPES = ['dependencies', 'devDependencies', 'peerDependencies'] as const;
export type DependencyType = (typeof DEPENDENCY_TYPES)[number];

export type PackageJson = {
  readonly name: O.Option<string>;
  readonly version: O.Option<string>;
  readonly dependencies: O.Option<Record<PackageName, string>>;
  readonly devDependencies: O.Option<Record<PackageName, string>>;
  readonly peerDependencies: O.Option<Record<PackageName, string>>;
};

export type IgnoredDependencies = {
  readonly typeOnly: ReadonlyArray<PackageName>;
  readonly byDefault: ReadonlyArray<PackageName>;
  readonly byOption: ReadonlyArray<PackageName>;
};

export type AnalysisResult = {
  readonly unused: ReadonlyArray<PackageName>;
  readonly misplaced: ReadonlyArray<PackageName>;
  readonly ignored: IgnoredDependencies;
};

export const OUTPUT_FORMATS = ['text', 'json'] as const;
export type OutputFormat = (typeof OUTPUT_FORMATS)[number];

export type CliOptionsWithDefaults = {
  readonly rootDir: string;
  readonly packageJsonPath: string;
};

export type CliOptionsWithoutDefaults = {
  readonly format: OutputFormat;
  readonly checkAll: boolean;
  readonly ignorePackages: ReadonlyArray<string>;
};

export type CliOptions = CliOptionsWithDefaults & CliOptionsWithoutDefaults;

export type AppResult<T> = R.Result<T, string>;

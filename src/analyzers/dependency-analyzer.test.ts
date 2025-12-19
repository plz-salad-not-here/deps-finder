import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { O } from '@mobily/ts-belt';
import { analyzeDependencies } from '@/analyzers/dependency-analyzer';
import { findFiles } from '@/parsers/import-parser';
import type { PackageJson } from '@/domain/types';

describe('dependency-analyzer', () => {
  const testDir = './test-analyze-deps';

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  test('should find unused dependencies', async () => {
    await writeFile(`${testDir}/index.ts`, `import { pipe } from '@mobily/ts-belt';\nconsole.log(pipe);`);

    const packageJson: PackageJson = {
      name: O.Some('test'),
      version: O.Some('1.0.0'),
      dependencies: O.Some({
        '@mobily/ts-belt': '^3.0.0',
        'unused-package': '^1.0.0',
      }),
      devDependencies: O.None,
      peerDependencies: O.None,
    };

    const files = findFiles(testDir);
    const result = analyzeDependencies(packageJson, files, { checkAll: false, ignoredPackages: [] });

    expect(result.unused).toContain('unused-package');
    expect(result.unused).not.toContain('@mobily/ts-belt');
    expect(result.unused.length).toBe(1);
    expect(result.totalIssues).toBe(1);
  });

  test('should find misplaced dependencies in devDependencies', async () => {
    await writeFile(`${testDir}/index.ts`, `import express from 'express';\nconsole.log(express);`);

    const packageJson: PackageJson = {
      name: O.Some('test'),
      version: O.Some('1.0.0'),
      dependencies: O.None,
      devDependencies: O.Some({
        express: '^4.0.0',
        typescript: '^5.0.0',
      }),
      peerDependencies: O.None,
    };

    const files = findFiles(testDir);
    const result = analyzeDependencies(packageJson, files, { checkAll: false, ignoredPackages: [] });

    expect(result.misplaced).toContain('express');
    expect(result.misplaced).not.toContain('typescript');
    expect(result.totalIssues).toBe(1);
  });

  test('should not check devDependencies for unused by default', async () => {
    await writeFile(`${testDir}/index.ts`, `console.log('test');`);

    const packageJson: PackageJson = {
      name: O.Some('test'),
      version: O.Some('1.0.0'),
      dependencies: O.None,
      devDependencies: O.Some({
        typescript: '^5.0.0',
        jest: '^29.0.0',
      }),
      peerDependencies: O.None,
    };

    const files = findFiles(testDir);
    const result = analyzeDependencies(packageJson, files, { checkAll: false, ignoredPackages: [] });

    expect(result.unused).toEqual([]);
    expect(result.totalIssues).toBe(0);
  });

  test('should check devDependencies for unused when checkAll is true', async () => {
    await writeFile(`${testDir}/index.ts`, `console.log('test');`);

    const packageJson: PackageJson = {
      name: O.Some('test'),
      version: O.Some('1.0.0'),
      dependencies: O.None,
      devDependencies: O.Some({
        typescript: '^5.0.0',
        jest: '^29.0.0',
      }),
      peerDependencies: O.None,
    };

    const files = findFiles(testDir);
    const result = analyzeDependencies(packageJson, files, { checkAll: true, ignoredPackages: [] });

    expect(result.unused).toContain('typescript');
    expect(result.unused).toContain('jest');
    expect(result.unused.length).toBe(2);
    expect(result.totalIssues).toBe(2);
  });

  test('should return correctly filtered result when ignoredPackages are provided', async () => {
    await writeFile(`${testDir}/index.ts`, `console.log('test');`);

    const packageJson: PackageJson = {
      name: O.Some('test'),
      version: O.Some('1.0.0'),
      dependencies: O.Some({
        react: '^18.0.0',
        eslint: '^8.0.0',
      }),
      devDependencies: O.None,
      peerDependencies: O.None,
    };

    const files = findFiles(testDir);
    const result = analyzeDependencies(packageJson, files, {
      checkAll: false,
      ignoredPackages: ['eslint'],
    });

    expect(result.unused).toContain('react');
    expect(result.unused).not.toContain('eslint');
    expect(result.totalIssues).toBe(1);
  });

  test('should categorize type-only imports correctly', async () => {
    await writeFile(
      `${testDir}/index.ts`,
      `
      import type { SomeType } from 'type-only-lib';
      import { runtimeFn } from 'runtime-lib';
      import { type MixedType, otherFn } from 'mixed-lib';
      import { onlyRuntime } from 'only-runtime-lib';
    `,
    );

    const packageJson: PackageJson = {
      name: O.Some('test'),
      version: O.Some('1.0.0'),
      dependencies: O.Some({
        'type-only-lib': '^1.0.0',
        'runtime-lib': '^1.0.0',
        'mixed-lib': '^1.0.0',
        'only-runtime-lib': '^1.0.0',
        'unused-lib': '^1.0.0',
      }),
      devDependencies: O.None,
      peerDependencies: O.None,
    };

    const files = findFiles(testDir);
    const result = analyzeDependencies(packageJson, files, { checkAll: false, ignoredPackages: [] });

    expect(result.typeOnly).toContain('type-only-lib');
    expect(result.typeOnly).not.toContain('runtime-lib');
    expect(result.typeOnly).not.toContain('mixed-lib');

    expect(result.unused).toContain('unused-lib');
    expect(result.unused).not.toContain('runtime-lib');
    expect(result.unused).not.toContain('mixed-lib');
    expect(result.unused).not.toContain('only-runtime-lib');

    expect(result.totalIssues).toBe(1); // Only unused-lib
  });

  test('should handle package with both type and runtime usage', async () => {
    await writeFile(
      `${testDir}/index.ts`,
      `
      import type { User } from 'common-lib';
      import { getUser } from 'common-lib';
    `,
    );

    const packageJson: PackageJson = {
      name: O.Some('test'),
      version: O.Some('1.0.0'),
      dependencies: O.Some({
        'common-lib': '^1.0.0',
      }),
      devDependencies: O.None,
      peerDependencies: O.None,
    };

    const files = findFiles(testDir);
    const result = analyzeDependencies(packageJson, files, { checkAll: false, ignoredPackages: [] });

    expect(result.unused).not.toContain('common-lib');
    expect(result.misplaced).not.toContain('common-lib');
    expect(result.typeOnly).not.toContain('common-lib'); // Should not be type-only as it has runtime usage
    expect(result.totalIssues).toBe(0);
  });

  test('should count total issues correctly with typeOnly imports', async () => {
    await writeFile(
      `${testDir}/index.ts`,
      `
      import type { TypeOnly } from 'type-lib';
      import { runtime } from 'runtime-lib';
    `,
    );

    const packageJson: PackageJson = {
      name: O.Some('test'),
      version: O.Some('1.0.0'),
      dependencies: O.Some({
        'type-lib': '^1.0.0',
        'runtime-lib': '^1.0.0',
        'unused-lib': '^1.0.0',
      }),
      devDependencies: O.Some({
        'dev-lib': '^1.0.0',
      }),
      peerDependencies: O.None,
    };

    const files = findFiles(testDir);
    const result = analyzeDependencies(packageJson, files, { checkAll: false, ignoredPackages: [] });

    expect(result.typeOnly).toContain('type-lib');
    expect(result.unused).toContain('unused-lib');
    expect(result.misplaced).not.toContain('dev-lib'); // Not used at runtime
    expect(result.misplaced.length).toBe(0);
    expect(result.totalIssues).toBe(1); // Only unused-lib contributes to total issues
  });
});

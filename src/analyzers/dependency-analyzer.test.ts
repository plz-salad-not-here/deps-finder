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
  });
});

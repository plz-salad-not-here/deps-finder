import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { analyzeDependencies } from '@/analyzers/dependency-analyzer';
import { findFiles } from '@/parsers/import-parser';
import { O } from '@mobily/ts-belt';
import type { PackageJson } from '@/domain/types';

describe('Integration Tests', () => {
  const baseTestDir = './test-integration';
  const getTestDir = () => `${baseTestDir}-${Math.random().toString(36).slice(2)}`;
  let testDir = '';

  beforeEach(async () => {
    testDir = getTestDir();
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    if (testDir) {
      await rm(testDir, { recursive: true, force: true });
    }
  });

  test('should handle a complex project structure correctly', async () => {
    // 1. Setup File Structure
    await mkdir(`${testDir}/src/components`, { recursive: true });
    await mkdir(`${testDir}/src/utils`, { recursive: true });
    await mkdir(`${testDir}/tests`, { recursive: true });

    // src/index.ts
    await writeFile(
      `${testDir}/src/index.ts`,
      `
      import React from 'react';
      import { map } from 'lodash';
      console.log(map([1, 2], x => x * 2));
      `,
    );

    // src/components/Button.tsx
    await writeFile(
      `${testDir}/src/components/Button.tsx`,
      `
      import styled from 'styled-components';
      import type { JsonObject } from 'type-fest'; 
      export const Button = styled.button;
      `,
    );

    // src/utils/helpers.ts
    await writeFile(`${testDir}/src/utils/helpers.ts`, `import { format } from 'date-fns';`);

    // tests/button.test.ts
    await writeFile(`${testDir}/tests/button.test.ts`, `import { describe, it } from 'jest';`);

    // next.config.js
    await writeFile(`${testDir}/next.config.js`, `const compression = require('compression'); module.exports = {};`);

    // 2. Setup Package.json
    const packageJson: PackageJson = {
      name: O.Some('test-project'),
      version: O.Some('1.0.0'),
      dependencies: O.Some({
        react: '^18.0.0',
        lodash: '^4.17.0',
        'styled-components': '^5.3.0',
        'date-fns': '^2.0.0',
        'unused-dep': '^1.0.0',
      }),
      devDependencies: O.Some({
        'type-fest': '^2.0.0',
        jest: '^29.0.0',
        typescript: '^5.0.0',
        compression: '^1.0.0',
      }),
      peerDependencies: O.None,
    };

    // 3. Run Analysis
    const files = findFiles(testDir);
    const result = analyzeDependencies(packageJson, files, { checkAll: false, ignoredPackages: [] });

    // 4. Assertions
    expect(result.unused).toContain('unused-dep');
    expect(result.unused).not.toContain('react');
    expect(result.unused).not.toContain('lodash');

    expect(result.typeOnly).not.toContain('type-fest');

    expect(result.misplaced.some((d) => d.packageName === 'compression')).toBe(false);

    // Add misplaced dependency
    await writeFile(`${testDir}/src/utils/oops.ts`, `import { something } from 'typescript';`);

    const files2 = findFiles(testDir);
    const result2 = analyzeDependencies(packageJson, files2, { checkAll: false, ignoredPackages: [] });

    expect(result2.misplaced.some((d) => d.packageName === 'typescript')).toBe(true);
    const tsUsage = result2.misplaced.find((d) => d.packageName === 'typescript');
    expect(tsUsage?.locations[0]!.file).toContain('src/utils/oops.ts');
  });

  test('should report type-only dependencies correctly', async () => {
    await writeFile(`${testDir}/index.ts`, `import type { A } from 'dep-a';`);

    const packageJson: PackageJson = {
      name: O.Some('test'),
      version: O.Some('1.0.0'),
      dependencies: O.Some({
        'dep-a': '^1.0.0',
      }),
      devDependencies: O.None,
      peerDependencies: O.None,
    };

    const files = findFiles(testDir);
    const result = analyzeDependencies(packageJson, files, { checkAll: false, ignoredPackages: [] });

    expect(result.typeOnly).toContain('dep-a');
    expect(result.unused).not.toContain('dep-a');
  });

  test('should handle circular dependencies gracefully', async () => {
    await writeFile(`${testDir}/a.ts`, `import { b } from './b'; export const a = 1;`);
    await writeFile(`${testDir}/b.ts`, `import { a } from './a'; import { x } from 'pkg-x'; export const b = 2;`);

    const packageJson: PackageJson = {
      name: O.Some('test'),
      version: O.Some('1.0.0'),
      dependencies: O.Some({
        'pkg-x': '^1.0.0',
      }),
      devDependencies: O.None,
      peerDependencies: O.None,
    };

    const files = findFiles(testDir);
    const result = analyzeDependencies(packageJson, files, { checkAll: false, ignoredPackages: [] });

    expect(result.unused).not.toContain('pkg-x');
  });

  test('tailwind.config.js packages should not be misplaced', async () => {
    await writeFile(`${testDir}/tailwind.config.js`, `const colors = require('tailwindcss/colors');`);

    const packageJson: PackageJson = {
      name: O.Some('test'),
      version: O.Some('1.0.0'),
      dependencies: O.None,
      devDependencies: O.Some({
        tailwindcss: '^3.0.0',
      }),
      peerDependencies: O.None,
    };

    const files = findFiles(testDir);
    const result = analyzeDependencies(packageJson, files, { checkAll: false, ignoredPackages: [] });

    expect(result.misplaced.some((d) => d.packageName === 'tailwindcss')).toBe(false);
  });

  test('postcss.config.js packages should not be misplaced', async () => {
    await writeFile(`${testDir}/postcss.config.js`, `module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } };`);
    // Note: postcss config might not explicitly import, but if it did:
    await writeFile(`${testDir}/postcss.config.cjs`, `const autoprefixer = require('autoprefixer');`);

    const packageJson: PackageJson = {
      name: O.Some('test'),
      version: O.Some('1.0.0'),
      dependencies: O.None,
      devDependencies: O.Some({
        autoprefixer: '^10.0.0',
      }),
      peerDependencies: O.None,
    };

    const files = findFiles(testDir);
    const result = analyzeDependencies(packageJson, files, { checkAll: false, ignoredPackages: [] });

    expect(result.misplaced.some((d) => d.packageName === 'autoprefixer')).toBe(false);
  });

  test('happydom.ts packages should not be misplaced', async () => {
    // happydom.ts is often used as test environment setup
    await writeFile(`${testDir}/happydom.ts`, `import { GlobalWindow } from 'happy-dom';`);

    const packageJson: PackageJson = {
      name: O.Some('test'),
      version: O.Some('1.0.0'),
      dependencies: O.None,
      devDependencies: O.Some({
        'happy-dom': '^6.0.0',
      }),
      peerDependencies: O.None,
    };

    // findFiles should probably exclude happydom.ts entirely?
    // Current EXCLUDED_FILENAME_PATTERNS includes 'happydom.'
    // So findFiles should return EMPTY list if only happydom.ts is present.
    // If findFiles returns empty, then no imports are found.
    // If imports are not found, it is not used.
    // So it should be unused?
    // Wait, if checkAll=false, then devDependencies are not checked for unused.
    // So if it's in devDependencies and not found in any file, it's NOT unused (because devDeps aren't checked).
    // And it's NOT misplaced (because not used in production code).
    // So result.misplaced should be empty.

    const files = findFiles(testDir);
    // Expect happydom.ts to be EXCLUDED
    expect(files.length).toBe(0);

    const result = analyzeDependencies(packageJson, files, { checkAll: false, ignoredPackages: [] });
    expect(result.misplaced.some((d) => d.packageName === 'happy-dom')).toBe(false);
  });
});

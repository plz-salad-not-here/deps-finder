import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { O } from '@mobily/ts-belt';
import { analyzeDependencies } from '@/analyzers/dependency-analyzer';
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

    const result = await analyzeDependencies(packageJson, testDir, false);

    expect(result.unused).toContain('unused-package');
    expect(result.unused).not.toContain('@mobily/ts-belt');
    expect(result.unused.length).toBe(1);
    expect(Array.isArray(result.unused)).toBe(true);
    expect(Array.isArray(result.misplaced)).toBe(true);
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

    const result = await analyzeDependencies(packageJson, testDir, false);

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

    const result = await analyzeDependencies(packageJson, testDir, false);

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

    const result = await analyzeDependencies(packageJson, testDir, true);

    expect(result.unused.length).toBe(2);
    expect(result.unused).toContain('typescript');
    expect(result.unused).toContain('jest');
  });

  test('should return empty arrays when no issues found', async () => {
    await writeFile(`${testDir}/index.ts`, `import { pipe } from '@mobily/ts-belt';\nconsole.log(pipe);`);

    const packageJson: PackageJson = {
      name: O.Some('test'),
      version: O.Some('1.0.0'),
      dependencies: O.Some({
        '@mobily/ts-belt': '^3.0.0',
      }),
      devDependencies: O.None,
      peerDependencies: O.None,
    };

    const result = await analyzeDependencies(packageJson, testDir, false);

    expect(result.unused).toEqual([]);
    expect(result.misplaced).toEqual([]);
  });

  test('should handle multiple unused dependencies', async () => {
    await writeFile(`${testDir}/index.ts`, `console.log('no imports');`);

    const packageJson: PackageJson = {
      name: O.Some('test'),
      version: O.Some('1.0.0'),
      dependencies: O.Some({
        react: '^18.0.0',
        lodash: '^4.0.0',
        express: '^4.0.0',
      }),
      devDependencies: O.None,
      peerDependencies: O.None,
    };

    const result = await analyzeDependencies(packageJson, testDir, false);

    expect(result.unused).toContain('react');
    expect(result.unused).toContain('lodash');
    expect(result.unused).toContain('express');
    expect(result.unused.length).toBe(3);
  });

  test('should handle multiple misplaced dependencies', async () => {
    await writeFile(`${testDir}/index.ts`, `import React from 'react';\nimport express from 'express';\nimport lodash from 'lodash';`);

    const packageJson: PackageJson = {
      name: O.Some('test'),
      version: O.Some('1.0.0'),
      dependencies: O.None,
      devDependencies: O.Some({
        react: '^18.0.0',
        express: '^4.0.0',
        lodash: '^4.0.0',
        typescript: '^5.0.0',
      }),
      peerDependencies: O.None,
    };

    const result = await analyzeDependencies(packageJson, testDir, false);

    expect(result.misplaced).toContain('react');
    expect(result.misplaced).toContain('express');
    expect(result.misplaced).toContain('lodash');
    expect(result.misplaced).not.toContain('typescript');
    expect(result.misplaced.length).toBe(3);
  });

  test('should handle mixed dependencies and devDependencies', async () => {
    await writeFile(`${testDir}/index.ts`, `import React from 'react';`);

    const packageJson: PackageJson = {
      name: O.Some('test'),
      version: O.Some('1.0.0'),
      dependencies: O.Some({
        react: '^18.0.0',
        'unused-dep': '^1.0.0',
      }),
      devDependencies: O.Some({
        typescript: '^5.0.0',
        jest: '^29.0.0',
      }),
      peerDependencies: O.None,
    };

    const result = await analyzeDependencies(packageJson, testDir, false);

    expect(result.unused).toContain('unused-dep');
    expect(result.unused).not.toContain('react');
    expect(result.unused).not.toContain('typescript');
    expect(result.unused).not.toContain('jest');
  });

  test('should sort results alphabetically', async () => {
    await writeFile(`${testDir}/index.ts`, `console.log('test');`);

    const packageJson: PackageJson = {
      name: O.Some('test'),
      version: O.Some('1.0.0'),
      dependencies: O.Some({
        zulu: '^1.0.0',
        alpha: '^1.0.0',
        bravo: '^1.0.0',
      }),
      devDependencies: O.None,
      peerDependencies: O.None,
    };

    const result = await analyzeDependencies(packageJson, testDir, false);

    expect(result.unused[0]).toBe('alpha');
    expect(result.unused[1]).toBe('bravo');
    expect(result.unused[2]).toBe('zulu');
  });

  test('should handle scoped packages', async () => {
    await writeFile(`${testDir}/index.ts`, `import { pipe } from '@mobily/ts-belt';`);

    const packageJson: PackageJson = {
      name: O.Some('test'),
      version: O.Some('1.0.0'),
      dependencies: O.Some({
        '@mobily/ts-belt': '^3.0.0',
        '@types/node': '^20.0.0',
        '@unused/package': '^1.0.0',
      }),
      devDependencies: O.None,
      peerDependencies: O.None,
    };

    const result = await analyzeDependencies(packageJson, testDir, false);

    expect(result.unused).toContain('@types/node');
    expect(result.unused).toContain('@unused/package');
    expect(result.unused).not.toContain('@mobily/ts-belt');
  });

  test('should handle deep imports correctly', async () => {
    await writeFile(`${testDir}/index.ts`, `import map from 'lodash/map';`);

    const packageJson: PackageJson = {
      name: O.Some('test'),
      version: O.Some('1.0.0'),
      dependencies: O.Some({
        lodash: '^4.0.0',
      }),
      devDependencies: O.None,
      peerDependencies: O.None,
    };

    const result = await analyzeDependencies(packageJson, testDir, false);

    expect(result.unused).toEqual([]);
    expect(result.misplaced).toEqual([]);
  });

  test('should handle relative imports correctly', async () => {
    await writeFile(`${testDir}/index.ts`, `import { utils } from './utils';\nimport { helper } from '../helper';`);

    const packageJson: PackageJson = {
      name: O.Some('test'),
      version: O.Some('1.0.0'),
      dependencies: O.Some({
        react: '^18.0.0',
      }),
      devDependencies: O.None,
      peerDependencies: O.None,
    };

    const result = await analyzeDependencies(packageJson, testDir, false);

    expect(result.unused).toContain('react');
    expect(result.misplaced).toEqual([]);
  });

  test('should check all dependency types when checkAll is true', async () => {
    await writeFile(`${testDir}/index.ts`, `console.log('test');`);

    const packageJson: PackageJson = {
      name: O.Some('test'),
      version: O.Some('1.0.0'),
      dependencies: O.Some({
        react: '^18.0.0',
      }),
      devDependencies: O.Some({
        typescript: '^5.0.0',
      }),
      peerDependencies: O.Some({
        'react-dom': '^18.0.0',
      }),
    };

    const result = await analyzeDependencies(packageJson, testDir, true);

    expect(result.unused).toContain('react');
    expect(result.unused).toContain('typescript');
    expect(result.unused).toContain('react-dom');
    expect(result.unused.length).toBe(3);
  });

  test('should handle empty package.json', async () => {
    await writeFile(`${testDir}/index.ts`, `import React from 'react';`);

    const packageJson: PackageJson = {
      name: O.Some('test'),
      version: O.Some('1.0.0'),
      dependencies: O.None,
      devDependencies: O.None,
      peerDependencies: O.None,
    };

    const result = await analyzeDependencies(packageJson, testDir, false);

    expect(result.unused).toEqual([]);
    expect(result.misplaced).toEqual([]);
  });

  test('should handle directory with no source files', async () => {
    const packageJson: PackageJson = {
      name: O.Some('test'),
      version: O.Some('1.0.0'),
      dependencies: O.Some({
        react: '^18.0.0',
      }),
      devDependencies: O.None,
      peerDependencies: O.None,
    };

    const result = await analyzeDependencies(packageJson, testDir, false);

    expect(result.unused).toContain('react');
  });

  test('should show used dependencies with counts in analysis result', async () => {
    await writeFile(
      `${testDir}/index.ts`,
      `
import React from 'react';
import { useState } from 'react';
import { useState as useState2 } from 'react';
import lodash from 'lodash';
`,
    );

    const packageJson: PackageJson = {
      name: O.Some('test'),
      version: O.Some('1.0.0'),
      dependencies: O.Some({
        react: '^18.0.0',
        lodash: '^4.0.0',
      }),
      devDependencies: O.None,
      peerDependencies: O.None,
    };

    const result = await analyzeDependencies(packageJson, testDir, false);

    expect(result.used.length).toBe(2);

    const reactUsage = result.used.find((u) => u.name === 'react');
    expect(reactUsage).toBeDefined();
    expect(reactUsage?.count).toBeGreaterThan(0);

    const lodashUsage = result.used.find((u) => u.name === 'lodash');
    expect(lodashUsage).toBeDefined();
    expect(lodashUsage?.count).toBeGreaterThan(0);
  });

  test('should sort used packages by count descending', async () => {
    await writeFile(
      `${testDir}/index.ts`,
      `
import React from 'react';
import { useState } from 'react';
import { useState as useState2 } from 'react';
import lodash from 'lodash';
import express from 'express';
`,
    );

    const packageJson: PackageJson = {
      name: O.Some('test'),
      version: O.Some('1.0.0'),
      dependencies: O.Some({
        react: '^18.0.0',
        lodash: '^4.0.0',
        express: '^4.0.0',
      }),
      devDependencies: O.None,
      peerDependencies: O.None,
    };

    const result = await analyzeDependencies(packageJson, testDir, false);

    expect(result.used.length).toBe(3);
    expect(result.used.length).toBeGreaterThanOrEqual(1);
    if (result.used[0]) {
      expect(result.used[0].name).toBe('react');
      if (result.used[1]) {
        expect(result.used[0].count).toBeGreaterThan(result.used[1].count);
      }
    }
  });

  test('should exclude type-only imports from used packages', async () => {
    await writeFile(`${testDir}/index.ts`, `import type { User } from '@types/express';`);

    const packageJson: PackageJson = {
      name: O.Some('test'),
      version: O.Some('1.0.0'),
      dependencies: O.Some({
        '@types/express': '^4.0.0',
      }),
      devDependencies: O.None,
      peerDependencies: O.None,
    };

    const result = await analyzeDependencies(packageJson, testDir, false);

    expect(result.unused).toContain('@types/express');
    expect(result.ignored.typeOnly).toContain('@types/express');
  });

  test('should correctly count used packages with runtime imports', async () => {
    await writeFile(`${testDir}/index.ts`, `import express from 'express'; import { Router } from 'express';`);

    const packageJson: PackageJson = {
      name: O.Some('test'),
      version: O.Some('1.0.0'),
      dependencies: O.Some({
        express: '^4.0.0',
      }),
      devDependencies: O.None,
      peerDependencies: O.None,
    };

    const result = await analyzeDependencies(packageJson, testDir, false);

    expect(result.unused).not.toContain('express');
    expect(result.used.some((u) => u.name === 'express')).toBe(true);
  });

  test('should correctly track ignored packages by option', async () => {
    await writeFile(`${testDir}/index.ts`, `console.log('no imports');`);

    const packageJson: PackageJson = {
      name: O.Some('test'),
      version: O.Some('1.0.0'),
      dependencies: O.Some({
        eslint: '^8.0.0',
        prettier: '^3.0.0',
        react: '^18.0.0',
      }),
      devDependencies: O.None,
      peerDependencies: O.None,
    };

    const result = await analyzeDependencies(packageJson, testDir, false, ['eslint', 'prettier']);

    expect(result.unused).toContain('react');
    expect(result.unused).not.toContain('eslint');
    expect(result.unused).not.toContain('prettier');

    expect(result.ignored.byOption).toContain('eslint');
    expect(result.ignored.byOption).toContain('prettier');
  });

  test('should check production configs but ignore development configs', async () => {
    // Production config: next.config.js - should be checked
    await writeFile(`${testDir}/next.config.js`, `const next = require('next');`);

    // Development config: jest.config.js - should be ignored
    await writeFile(`${testDir}/jest.config.js`, `const lodash = require('lodash');`);

    const packageJson: PackageJson = {
      name: O.Some('test'),
      version: O.Some('1.0.0'),
      dependencies: O.Some({
        next: '^13.0.0',
        lodash: '^4.0.0',
      }),
      devDependencies: O.None,
      peerDependencies: O.None,
    };

    const result = await analyzeDependencies(packageJson, testDir, false);

    // Next.js (used in next.config.js) should NOT be in unused (it is used)
    expect(result.unused).not.toContain('next');

    // Lodash (used in jest.config.js) SHOULD be in unused (because jest.config.js is ignored)
    expect(result.unused).toContain('lodash');
  });
});

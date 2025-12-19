import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { writeFileSync } from 'node:fs'; // Corrected import
import {
  extractPackageName,
  findFiles,
  isProductionConfigFile,
  parseImports,
  parseImportsWithType,
  shouldAnalyzeFile,
} from '@/parsers/import-parser';

describe('extractPackageName', () => {
  test('should return null for relative imports', () => {
    expect(extractPackageName('./utils')).toBe(null);
    expect(extractPackageName('../helpers')).toBe(null);
    expect(extractPackageName('../../src/index')).toBe(null);
    expect(extractPackageName('./index.js')).toBe(null);
  });

  test('should return null for absolute path imports', () => {
    expect(extractPackageName('/usr/local/lib')).toBe(null);
    expect(extractPackageName('/home/user/project')).toBe(null);
  });

  test('should extract simple package names', () => {
    expect(extractPackageName('react')).toBe('react');
    expect(extractPackageName('lodash')).toBe('lodash');
    expect(extractPackageName('express')).toBe('express');
  });

  test('should extract scoped package names', () => {
    expect(extractPackageName('@mobily/ts-belt')).toBe('@mobily/ts-belt');
    expect(extractPackageName('@types/node')).toBe('@types/node');
    expect(extractPackageName('@testing-library/react')).toBe('@testing-library/react');
  });

  test('should extract package name from deep imports', () => {
    expect(extractPackageName('lodash/map')).toBe('lodash');
    expect(extractPackageName('react-dom/client')).toBe('react-dom');
    expect(extractPackageName('lodash/fp/map')).toBe('lodash');
    expect(extractPackageName('express/lib/router')).toBe('express');
  });

  test('should extract scoped package from deep imports', () => {
    expect(extractPackageName('@mobily/ts-belt/Array')).toBe('@mobily/ts-belt');
    expect(extractPackageName('@babel/core/lib/config')).toBe('@babel/core');
    expect(extractPackageName('@types/node/fs')).toBe('@types/node');
  });
});

describe('findFiles', () => {
  const testDir = './test-find-files';

  beforeEach(async () => {
    await mkdir(`${testDir}/src`, { recursive: true });
    await mkdir(`${testDir}/node_modules`, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  test('should find TypeScript files', async () => {
    await writeFile(`${testDir}/src/index.ts`, 'console.log("test");');
    await writeFile(`${testDir}/src/utils.tsx`, 'export const App = () => {};');

    const files = findFiles(`${testDir}/src`);

    expect(files.length).toBeGreaterThanOrEqual(1);
    expect(files.some((f) => f.includes('index.ts'))).toBe(true);
  });

  test('should find JavaScript files', async () => {
    await writeFile(`${testDir}/src/index.js`, 'console.log("test");');
    await writeFile(`${testDir}/src/component.jsx`, 'export const App = () => {};');

    const files = findFiles(`${testDir}/src`);

    expect(files.length).toBeGreaterThanOrEqual(1);
  });

  test('should exclude test files', async () => {
    await writeFile(`${testDir}/src/index.ts`, 'console.log("test");');
    await writeFile(`${testDir}/src/index.test.ts`, 'test("test", () => {});');
    await writeFile(`${testDir}/src/index.spec.ts`, 'test("spec", () => {});');

    const files = findFiles(`${testDir}/src`);

    expect(files.some((f) => f.includes('.test.'))).toBe(false);
    expect(files.some((f) => f.includes('.spec.'))).toBe(false);
  });

  test('should exclude node_modules', async () => {
    await writeFile(`${testDir}/src/index.ts`, 'console.log("test");');
    await writeFile(`${testDir}/node_modules/package.js`, 'module.exports = {};');

    const files = findFiles(testDir);

    expect(files.some((f) => f.includes('node_modules'))).toBe(false);
  });
});

describe('parseImports', () => {
  const testDir = './test-parse-imports';

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  test('should extract import statements', async () => {
    const content = `
import { pipe } from '@mobily/ts-belt';
import React from 'react';
import { test } from './utils';
`;
    const filePath = `${testDir}/test.ts`;
    await writeFile(filePath, content);

    const imports = parseImports(filePath);

    expect(imports.has('@mobily/ts-belt')).toBe(true);
    expect(imports.has('react')).toBe(true);
    expect(imports.size).toBe(2);
  });

  test('should extract require statements', async () => {
    const content = `
const express = require('express');
const utils = require('./utils');
`;
    const filePath = `${testDir}/test.js`;
    await writeFile(filePath, content);

    const imports = parseImports(filePath);

    expect(imports.has('express')).toBe(true);
    expect(imports.size).toBe(1);
  });

  test('should ignore commented imports', async () => {
    const content = `
// import React from 'react';
/* import { pipe } from '@mobily/ts-belt'; */
import express from 'express';
`;
    const filePath = `${testDir}/test.ts`;
    await writeFile(filePath, content);

    const imports = parseImports(filePath);

    expect(imports.has('express')).toBe(true);
    expect(imports.has('react')).toBe(false);
    expect(imports.has('@mobily/ts-belt')).toBe(false);
  });
});

describe('parseImportsWithType', () => {
  const testDir = './test-parse-imports-with-type';

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  const createTempFile = (content: string, filename = 'test.ts') => {
    const filePath = `${testDir}/${filename}`;
    writeFileSync(filePath, content);
    return filePath;
  };

  test('should distinguish type-only from runtime imports', () => {
    const content = `
      import type { Pipe } from 'hotscript';
      import { pipe } from '@mobily/ts-belt';
      import React from 'react';
    `;

    const testFile = createTempFile(content);
    const imports = parseImportsWithType(testFile);

    expect(Array.from(imports)).toContainEqual({ packageName: 'hotscript', importType: 'type-only' });
    expect(Array.from(imports)).toContainEqual({ packageName: '@mobily/ts-belt', importType: 'runtime' });
    expect(Array.from(imports)).toContainEqual({ packageName: 'react', importType: 'runtime' });
    expect(imports.size).toBe(3);
  });

  test('should treat package as runtime if it has both type and runtime imports', () => {
    const content = `
      import type { User } from 'user-lib';
      import { getUser } from 'user-lib';
    `;

    const testFile = createTempFile(content);
    const imports = parseImportsWithType(testFile);

    const userLibImports = Array.from(imports).filter((i) => i.packageName === 'user-lib');
    expect(userLibImports).toHaveLength(1);
    expect(userLibImports[0]!.importType).toBe('runtime');
  });

  test('should handle only type imports with "import { type X } from"', () => {
    const content = `
      import { type SomeType } from 'some-lib';
    `;
    const testFile = createTempFile(content);
    const imports = parseImportsWithType(testFile);
    expect(Array.from(imports)).toContainEqual({ packageName: 'some-lib', importType: 'type-only' });
    expect(imports.size).toBe(1);
  });

  test('should handle mixed imports with "import { type X, Y } from"', () => {
    const content = `
      import { type SomeType, someValue } from 'some-lib';
    `;
    const testFile = createTempFile(content);
    const imports = parseImportsWithType(testFile);
    expect(Array.from(imports)).toContainEqual({ packageName: 'some-lib', importType: 'runtime' });
    expect(imports.size).toBe(1);
  });
});

describe('Config file detection', () => {
  test('should detect next.config files', () => {
    expect(isProductionConfigFile('next.config.js')).toBe(true);
    expect(isProductionConfigFile('next.config.ts')).toBe(true);
  });

  test('should detect webpack.config files', () => {
    expect(isProductionConfigFile('webpack.config.js')).toBe(true);
  });

  test('should NOT detect dev configs', () => {
    expect(isProductionConfigFile('jest.config.js')).toBe(false);
    expect(isProductionConfigFile('vitest.config.ts')).toBe(false);
  });

  test('should analyze production config files', () => {
    expect(shouldAnalyzeFile('next.config.js')).toBe(true);
  });

  test('should NOT analyze dev config files', () => {
    expect(shouldAnalyzeFile('jest.config.js')).toBe(false);
  });

  test('should NOT analyze test files', () => {
    expect(shouldAnalyzeFile('test/setup.ts')).toBe(false);
  });
});

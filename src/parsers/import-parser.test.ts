import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { writeFileSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { R } from '@mobily/ts-belt';
import {
  extractPackageName,
  findFiles,
  isProductionConfigFile,
  parseFile,
  parseImports,
  parseImportsWithType,
  parseMultipleFiles,
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

  test('should handle edge cases - empty and malformed inputs', () => {
    expect(extractPackageName('')).toBe(null);
    expect(extractPackageName(null)).toBe(null);
    expect(extractPackageName(undefined)).toBe(null);
    expect(extractPackageName('@scope')).toBe(null); // Incomplete scoped package
    expect(extractPackageName('@scope/')).toBe(null); // Malformed scoped package
    expect(extractPackageName('@')).toBe(null);
  });

  test('should reject protocol-based imports', () => {
    expect(extractPackageName('http://example.com/module')).toBe(null);
    expect(extractPackageName('https://unpkg.com/lodash')).toBe(null);
    expect(extractPackageName('file:///path/to/file')).toBe(null);
  });

  test('should handle popular packages with deep imports', () => {
    // Core-js
    expect(extractPackageName('core-js/actual')).toBe('core-js');
    expect(extractPackageName('core-js/stable')).toBe('core-js');
    expect(extractPackageName('core-js/features/array/flat')).toBe('core-js');

    // Next.js ecosystem
    expect(extractPackageName('next-auth/react')).toBe('next-auth');
    expect(extractPackageName('next-auth/providers/google')).toBe('next-auth');
    expect(extractPackageName('next/image')).toBe('next');
    expect(extractPackageName('next/link')).toBe('next');

    // Date manipulation
    expect(extractPackageName('date-fns/format')).toBe('date-fns');
    expect(extractPackageName('date-fns/addDays')).toBe('date-fns');
    expect(extractPackageName('date-fns/locale')).toBe('date-fns');

    // RxJS
    expect(extractPackageName('rxjs/operators')).toBe('rxjs');
    expect(extractPackageName('rxjs/Observable')).toBe('rxjs');

    // Apollo
    expect(extractPackageName('apollo-client/core')).toBe('apollo-client');
  });

  test('should handle scoped packages with deep imports from popular libraries', () => {
    // Material-UI / MUI
    expect(extractPackageName('@mui/material')).toBe('@mui/material');
    expect(extractPackageName('@mui/material/Button')).toBe('@mui/material');
    expect(extractPackageName('@mui/material/styles')).toBe('@mui/material');

    // Radix UI
    expect(extractPackageName('@radix-ui/react-dialog')).toBe('@radix-ui/react-dialog');
    expect(extractPackageName('@radix-ui/react-dialog/dist')).toBe('@radix-ui/react-dialog');
    expect(extractPackageName('@radix-ui/react-select')).toBe('@radix-ui/react-select');

    // Testing Library
    expect(extractPackageName('@testing-library/react')).toBe('@testing-library/react');
    expect(extractPackageName('@testing-library/user-event')).toBe('@testing-library/user-event');

    // Apollo Client
    expect(extractPackageName('@apollo/client')).toBe('@apollo/client');
    expect(extractPackageName('@apollo/client/react')).toBe('@apollo/client');
    expect(extractPackageName('@apollo/client/core')).toBe('@apollo/client');
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

  test('should exclude .d.ts files', async () => {
    await writeFile(`${testDir}/src/index.d.ts`, 'export declare const x: number;');
    await writeFile(`${testDir}/src/types.d.ts`, 'export type T = string;');

    const files = findFiles(`${testDir}/src`);
    expect(files.length).toBe(0);
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

describe('parseFile', () => {
  const testDir = './test-parse-file';

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  test('should return Ok with imports for valid file', async () => {
    const filePath = `${testDir}/test.ts`;
    await writeFile(filePath, "import { a } from 'pkg';");

    const result = parseFile(filePath);
    expect(R.isOk(result)).toBe(true);
    expect(R.getExn(result)[0]!.packageName).toBe('pkg');
  });

  test('should return Error for non-existent file', () => {
    const result = parseFile(`${testDir}/non-existent.ts`);
    expect(R.isError(result)).toBe(true);
  });
});

describe('parseMultipleFiles', () => {
  const testDir = './test-parse-multiple';

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  test('should aggregate imports from multiple files', async () => {
    await writeFile(`${testDir}/a.ts`, "import { a } from 'pkg-a';");
    await writeFile(`${testDir}/b.ts`, "import { b } from 'pkg-b';");

    const result = parseMultipleFiles([`${testDir}/a.ts`, `${testDir}/b.ts`]);
    expect(result).toHaveLength(2);
    const names = result.map((r) => r.packageName);
    expect(names).toContain('pkg-a');
    expect(names).toContain('pkg-b');
  });

  test('should skip failed files', async () => {
    await writeFile(`${testDir}/a.ts`, "import { a } from 'pkg-a';");

    const result = parseMultipleFiles([`${testDir}/a.ts`, `${testDir}/non-existent.ts`]);
    expect(result).toHaveLength(1);
    expect(result[0]!.packageName).toBe('pkg-a');
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
    const importsArray = Array.from(imports);

    expect(importsArray).toContainEqual(expect.objectContaining({ packageName: 'hotscript', importType: 'type-only' }));
    expect(importsArray).toContainEqual(expect.objectContaining({ packageName: '@mobily/ts-belt', importType: 'runtime' }));
    expect(importsArray).toContainEqual(expect.objectContaining({ packageName: 'react', importType: 'runtime' }));
    expect(imports.size).toBe(3);
  });

  test('should treat package as runtime if it has both type and runtime imports', () => {
    const content = `
      import type { User } from 'user-lib';
      import { getUser } from 'user-lib';
    `;

    const testFile = createTempFile(content);
    const imports = parseImportsWithType(testFile);
    const importsArray = Array.from(imports);

    const userLibImports = importsArray.filter((i) => i.packageName === 'user-lib');
    // It should contain TWO entries now, one runtime, one type-only
    expect(userLibImports).toHaveLength(2);
    expect(userLibImports).toContainEqual(expect.objectContaining({ importType: 'type-only' }));
    expect(userLibImports).toContainEqual(expect.objectContaining({ importType: 'runtime' }));
  });

  test('should handle only type imports with "import { type X } from"', () => {
    const content = `
      import { type SomeType } from 'some-lib';
    `;
    const testFile = createTempFile(content);
    const imports = parseImportsWithType(testFile);
    const importsArray = Array.from(imports);
    expect(importsArray).toContainEqual(expect.objectContaining({ packageName: 'some-lib', importType: 'type-only' }));
    expect(imports.size).toBe(1);
  });

  test('should handle mixed imports with "import { type X, Y } from"', () => {
    const content = `
      import { type SomeType, someValue } from 'some-lib';
    `;
    const testFile = createTempFile(content);
    const imports = parseImportsWithType(testFile);
    const importsArray = Array.from(imports);
    expect(importsArray).toContainEqual(expect.objectContaining({ packageName: 'some-lib', importType: 'runtime' }));
    expect(imports.size).toBe(1);
  });

  test('should handle mixed imports with type keyword at the beginning', () => {
    const content = `
      import { type O, F } from '@mobily/ts-belt';
    `;
    const testFile = createTempFile(content);
    const imports = parseImportsWithType(testFile);
    const importsArray = Array.from(imports);
    expect(importsArray).toContainEqual(expect.objectContaining({ packageName: '@mobily/ts-belt', importType: 'runtime' }));
    expect(imports.size).toBe(1);
  });

  test('should correctly parse files with deep imports', () => {
    const content = `
      import 'core-js/actual';
      import { signIn } from 'next-auth/react';
      import map from 'lodash/map';
      import { Button } from '@radix-ui/react-dialog';
      import format from 'date-fns/format';
      import { of } from 'rxjs/operators';
    `;

    const testFile = createTempFile(content);
    const imports = parseImportsWithType(testFile);

    const packageNames = Array.from(imports).map((info) => info.packageName);

    expect(packageNames).toContain('core-js');
    expect(packageNames).toContain('next-auth');
    expect(packageNames).toContain('lodash');
    expect(packageNames).toContain('@radix-ui/react-dialog');
    expect(packageNames).toContain('date-fns');
    expect(packageNames).toContain('rxjs');
    expect(imports.size).toBe(6);
  });

  test('should not confuse deep imports with multiple packages', () => {
    const content = `
      import { map } from 'lodash';
      import map from 'lodash/map';
      import fp from 'lodash/fp';
    `;

    const testFile = createTempFile(content);
    const imports = parseImportsWithType(testFile);

    // All should be recognized as 'lodash'
    const uniquePackages = Array.from(new Set(Array.from(imports).map((info) => info.packageName)));

    expect(uniquePackages).toEqual(['lodash']);
    // imports size should be 3 because each line is an import
    expect(imports.size).toBe(3);
  });

  test('should provide correct location info', () => {
    const content = `import A from 'pkg-a';
import B from 'pkg-b';`;
    const testFile = createTempFile(content);
    const imports = parseImportsWithType(testFile);
    const importsArray = Array.from(imports);

    const importA = importsArray.find((i) => i.packageName === 'pkg-a');
    expect(importA).toBeDefined();
    expect(importA?.line).toBe(1);
    expect(importA?.file).toBe(testFile);
    expect(importA?.importStatement).toContain("import A from 'pkg-a'");

    const importB = importsArray.find((i) => i.packageName === 'pkg-b');
    expect(importB).toBeDefined();
    expect(importB?.line).toBe(2);
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

  test('should NOT analyze .d.ts files', () => {
    expect(shouldAnalyzeFile('src/types.d.ts')).toBe(false);
  });
});

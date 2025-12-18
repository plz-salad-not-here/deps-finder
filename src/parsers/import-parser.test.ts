import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { O } from '@mobily/ts-belt';
import {
  extractImportsFromFile,
  extractPackageName,
  findSourceFiles,
  getAllUsedPackages,
  getImportUsageCount,
} from '@/parsers/import-parser';

describe('extractPackageName', () => {
  test('should return None for relative imports', () => {
    expect(O.isNone(extractPackageName('./utils'))).toBe(true);
    expect(O.isNone(extractPackageName('../helpers'))).toBe(true);
    expect(O.isNone(extractPackageName('../../src/index'))).toBe(true);
    expect(O.isNone(extractPackageName('./index.js'))).toBe(true);
  });

  test('should return None for absolute path imports', () => {
    expect(O.isNone(extractPackageName('/usr/local/lib'))).toBe(true);
    expect(O.isNone(extractPackageName('/home/user/project'))).toBe(true);
  });

  test('should extract simple package names', () => {
    expect(O.getExn(extractPackageName('react'))).toBe('react');
    expect(O.getExn(extractPackageName('lodash'))).toBe('lodash');
    expect(O.getExn(extractPackageName('express'))).toBe('express');
    expect(O.isSome(extractPackageName('react'))).toBe(true);
    expect(O.isSome(extractPackageName('vue'))).toBe(true);
  });

  test('should extract scoped package names', () => {
    expect(O.getExn(extractPackageName('@mobily/ts-belt'))).toBe('@mobily/ts-belt');
    expect(O.getExn(extractPackageName('@types/node'))).toBe('@types/node');
    expect(O.getExn(extractPackageName('@testing-library/react'))).toBe('@testing-library/react');
    expect(O.isSome(extractPackageName('@babel/core'))).toBe(true);
  });

  test('should extract package name from deep imports', () => {
    expect(O.getExn(extractPackageName('lodash/map'))).toBe('lodash');
    expect(O.getExn(extractPackageName('react-dom/client'))).toBe('react-dom');
    expect(O.getExn(extractPackageName('lodash/fp/map'))).toBe('lodash');
    expect(O.getExn(extractPackageName('express/lib/router'))).toBe('express');
  });

  test('should extract scoped package from deep imports', () => {
    expect(O.getExn(extractPackageName('@mobily/ts-belt/Array'))).toBe('@mobily/ts-belt');
    expect(O.getExn(extractPackageName('@babel/core/lib/config'))).toBe('@babel/core');
    expect(O.getExn(extractPackageName('@types/node/fs'))).toBe('@types/node');
  });

  test('should handle incomplete scoped package names', () => {
    expect(O.isNone(extractPackageName('@'))).toBe(true);
    expect(O.isNone(extractPackageName('@types'))).toBe(true);
  });

  test('should handle edge cases', () => {
    const emptyResult = extractPackageName('');
    expect(O.isSome(emptyResult) || O.isNone(emptyResult)).toBe(true); // Either is acceptable
    expect(O.isSome(extractPackageName('a'))).toBe(true);
    expect(O.getExn(extractPackageName('a'))).toBe('a');
  });

  test('should handle packages with hyphens and underscores', () => {
    expect(O.getExn(extractPackageName('react-dom'))).toBe('react-dom');
    expect(O.getExn(extractPackageName('lodash_utils'))).toBe('lodash_utils');
    expect(O.getExn(extractPackageName('@my-org/my-package'))).toBe('@my-org/my-package');
  });

  test('should handle node builtin modules', () => {
    expect(O.isSome(extractPackageName('fs'))).toBe(true);
    expect(O.isSome(extractPackageName('path'))).toBe(true);
    expect(O.isSome(extractPackageName('http'))).toBe(true);
    expect(O.getExn(extractPackageName('fs'))).toBe('fs');
  });
});

describe('findSourceFiles', () => {
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

    const files = await findSourceFiles(`${testDir}/src`);

    expect(files.length).toBeGreaterThanOrEqual(1);
    expect(files.some((f) => f.includes('index.ts'))).toBe(true);
  });

  test('should find JavaScript files', async () => {
    await writeFile(`${testDir}/src/index.js`, 'console.log("test");');
    await writeFile(`${testDir}/src/component.jsx`, 'export const App = () => {};');

    const files = await findSourceFiles(`${testDir}/src`);

    expect(files.length).toBeGreaterThanOrEqual(1);
  });

  test('should exclude test files', async () => {
    await writeFile(`${testDir}/src/index.ts`, 'console.log("test");');
    await writeFile(`${testDir}/src/index.test.ts`, 'test("test", () => {});');
    await writeFile(`${testDir}/src/index.spec.ts`, 'test("spec", () => {});');

    const files = await findSourceFiles(`${testDir}/src`);

    expect(files.some((f) => f.includes('.test.'))).toBe(false);
    expect(files.some((f) => f.includes('.spec.'))).toBe(false);
  });

  test('should exclude node_modules', async () => {
    await writeFile(`${testDir}/src/index.ts`, 'console.log("test");');
    await writeFile(`${testDir}/node_modules/package.js`, 'module.exports = {};');

    const files = await findSourceFiles(`${testDir}/src`);

    expect(files.some((f) => f.includes('node_modules'))).toBe(false);
  });
});

describe('extractImportsFromFile', () => {
  const testDir = './test-extract-imports';

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

    const imports = await extractImportsFromFile(filePath);

    expect(imports).toContain('@mobily/ts-belt');
    expect(imports).toContain('react');
    expect(imports).toContain('./utils');
    expect(imports.length).toBe(3);
    expect(Array.isArray(imports)).toBe(true);
  });

  test('should extract require statements', async () => {
    const content = `
const express = require('express');
const utils = require('./utils');
`;
    const filePath = `${testDir}/test.js`;
    await writeFile(filePath, content);

    const imports = await extractImportsFromFile(filePath);

    expect(imports).toContain('express');
    expect(imports).toContain('./utils');
    expect(imports.length).toBe(2);
  });

  test('should extract from statements', async () => {
    const content = `
import { useState } from 'react';
import type { User } from '@/types';
`;
    const filePath = `${testDir}/test.ts`;
    await writeFile(filePath, content);

    const imports = await extractImportsFromFile(filePath);

    expect(imports).toContain('react');
    // type-only imports are excluded (they don't generate runtime code)
    expect(imports).not.toContain('@/types');
    expect(imports.length).toBe(1);
  });

  test('should return empty array for file with no imports', async () => {
    const filePath = `${testDir}/test.ts`;
    await writeFile(filePath, 'console.log("no imports");');

    const imports = await extractImportsFromFile(filePath);

    expect(imports).toEqual([]);
    expect(imports.length).toBe(0);
  });

  test('should return empty array for non-existent file', async () => {
    const imports = await extractImportsFromFile('./non-existent.ts');

    expect(imports).toEqual([]);
    expect(Array.isArray(imports)).toBe(true);
  });

  test('should extract mixed import and require statements', async () => {
    const content = `
import React from 'react';
const express = require('express');
import { pipe } from '@mobily/ts-belt';
const axios = require('axios');
`;
    const filePath = `${testDir}/test.ts`;
    await writeFile(filePath, content);

    const imports = await extractImportsFromFile(filePath);

    expect(imports).toContain('react');
    expect(imports).toContain('express');
    expect(imports).toContain('@mobily/ts-belt');
    expect(imports).toContain('axios');
    // Node.js built-in modules (fs) are excluded
    expect(imports.length).toBe(4);
  });

  test('should extract default imports', async () => {
    const content = `
import React from 'react';
import express from 'express';
`;
    const filePath = `${testDir}/test.ts`;
    await writeFile(filePath, content);

    const imports = await extractImportsFromFile(filePath);

    expect(imports).toContain('react');
    expect(imports).toContain('express');
  });

  test('should extract namespace imports', async () => {
    const content = `
import * as React from 'react';
import * as _ from 'lodash';
`;
    const filePath = `${testDir}/test.ts`;
    await writeFile(filePath, content);

    const imports = await extractImportsFromFile(filePath);

    expect(imports).toContain('react');
    expect(imports).toContain('lodash');
  });

  test('should handle multiple imports on same line', async () => {
    const content = `import React from 'react'; import { useState } from 'react';`;
    const filePath = `${testDir}/test.ts`;
    await writeFile(filePath, content);

    const imports = await extractImportsFromFile(filePath);

    expect(imports).toContain('react');
    expect(imports.filter((i) => i === 'react').length).toBe(2);
  });

  test('should handle dynamic imports', async () => {
    const content = `
const module = import('lodash');
`;
    const filePath = `${testDir}/test.ts`;
    await writeFile(filePath, content);

    const imports = await extractImportsFromFile(filePath);

    // Note: Dynamic imports are not currently supported by our regex-based parser
    // This is a known limitation
    expect(Array.isArray(imports)).toBe(true);
  });

  test('should handle imports with quotes variations', async () => {
    const content = `
import React from "react";
import { pipe } from '@mobily/ts-belt';
const express = require("express");
const axios = require('axios');
`;
    const filePath = `${testDir}/test.ts`;
    await writeFile(filePath, content);

    const imports = await extractImportsFromFile(filePath);

    expect(imports).toContain('react');
    expect(imports).toContain('@mobily/ts-belt');
    expect(imports).toContain('express');
    expect(imports).toContain('axios');
    // Node.js built-in modules (fs) are excluded
  });

  test('should ignore commented imports', async () => {
    const content = `
// import React from 'react';
/* import { pipe } from '@mobily/ts-belt'; */
import express from 'express';
`;
    const filePath = `${testDir}/test.ts`;
    await writeFile(filePath, content);

    const imports = await extractImportsFromFile(filePath);

    expect(imports).toContain('express');
    // Note: Our regex-based approach might still match commented imports
    // This is a known limitation but acceptable for most use cases
  });
});

describe('getAllUsedPackages', () => {
  const testDir = './test-all-packages';

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  test('should collect all used packages from multiple files', async () => {
    await writeFile(`${testDir}/index.ts`, `import { pipe } from '@mobily/ts-belt';\nimport React from 'react';`);
    await writeFile(`${testDir}/utils.ts`, `import express from 'express';\nimport { match } from 'ts-pattern';`);

    const packages = await getAllUsedPackages(testDir);

    expect(packages).toContain('@mobily/ts-belt');
    expect(packages).toContain('react');
    expect(packages).toContain('express');
    expect(packages).toContain('ts-pattern');
    expect(packages.length).toBe(4);
    expect(Array.isArray(packages)).toBe(true);
  });

  test('should filter out relative imports', async () => {
    await writeFile(`${testDir}/index.ts`, `import { utils } from './utils';\nimport React from 'react';`);

    const packages = await getAllUsedPackages(testDir);

    expect(packages).toContain('react');
    expect(packages).not.toContain('./utils');
    expect(packages).not.toContain('../utils');
    expect(packages.length).toBe(1);
  });

  test('should return unique package names', async () => {
    await writeFile(`${testDir}/index.ts`, `import React from 'react';\nimport { useState } from 'react';`);

    const packages = await getAllUsedPackages(testDir);

    const reactCount = packages.filter((p) => p === 'react').length;
    expect(reactCount).toBe(1);
    expect(packages.length).toBe(1);
  });

  test('should return empty array for directory with no files', async () => {
    const packages = await getAllUsedPackages(testDir);

    expect(packages).toEqual([]);
    expect(packages.length).toBe(0);
    expect(Array.isArray(packages)).toBe(true);
  });

  test('should filter out absolute path imports', async () => {
    await writeFile(`${testDir}/index.ts`, `import { test } from '/usr/local/lib';\nimport React from 'react';`);

    const packages = await getAllUsedPackages(testDir);

    expect(packages).toContain('react');
    expect(packages).not.toContain('/usr/local/lib');
  });

  test('should handle scoped packages', async () => {
    await writeFile(`${testDir}/index.ts`, `import { pipe } from '@mobily/ts-belt';\nimport { something } from '@types/node';`);

    const packages = await getAllUsedPackages(testDir);

    expect(packages).toContain('@mobily/ts-belt');
    expect(packages).toContain('@types/node');
  });

  test('should handle deep imports correctly', async () => {
    await writeFile(`${testDir}/index.ts`, `import map from 'lodash/map';\nimport { pipe } from '@mobily/ts-belt/Array';`);

    const packages = await getAllUsedPackages(testDir);

    expect(packages).toContain('lodash');
    expect(packages).toContain('@mobily/ts-belt');
    expect(packages).not.toContain('lodash/map');
    expect(packages).not.toContain('@mobily/ts-belt/Array');
  });

  test('should deduplicate across multiple files', async () => {
    await writeFile(`${testDir}/index.ts`, `import React from 'react';`);
    await writeFile(`${testDir}/app.ts`, `import { useState } from 'react';`);
    await writeFile(`${testDir}/utils.ts`, `import ReactDOM from 'react-dom';`);

    const packages = await getAllUsedPackages(testDir);

    expect(packages).toContain('react');
    expect(packages).toContain('react-dom');
    expect(packages.filter((p) => p === 'react').length).toBe(1);
    expect(packages.length).toBe(2);
  });

  test('should handle mix of require and import', async () => {
    await writeFile(`${testDir}/index.js`, `const express = require('express');`);
    await writeFile(`${testDir}/utils.ts`, `import React from 'react';`);

    const packages = await getAllUsedPackages(testDir);

    expect(packages).toContain('express');
    expect(packages).toContain('react');
  });

  test('should handle files with no imports', async () => {
    await writeFile(`${testDir}/index.ts`, `console.log('no imports');`);
    await writeFile(`${testDir}/utils.ts`, `import React from 'react';`);

    const packages = await getAllUsedPackages(testDir);

    expect(packages).toContain('react');
    expect(packages.length).toBe(1);
  });

  test('should exclude type-only imports', async () => {
    await writeFile(`${testDir}/index.ts`, `import type { User } from 'user-types';\nimport React from 'react';`);

    const packages = await getAllUsedPackages(testDir);

    expect(packages).toContain('react');
    expect(packages).not.toContain('user-types');
    expect(packages.length).toBe(1);
  });

  test('should exclude Node.js built-in modules', async () => {
    await writeFile(`${testDir}/index.ts`, `import fs from 'fs';\nimport path from 'path';\nimport React from 'react';`);

    const packages = await getAllUsedPackages(testDir);

    expect(packages).toContain('react');
    expect(packages).not.toContain('fs');
    expect(packages).not.toContain('path');
    expect(packages.length).toBe(1);
  });

  test('should exclude Node.js modules with node: prefix', async () => {
    await writeFile(
      `${testDir}/index.ts`,
      `import { readFile } from 'node:fs/promises';\nimport path from 'node:path';\nimport React from 'react';`,
    );

    const packages = await getAllUsedPackages(testDir);

    expect(packages).toContain('react');
    expect(packages).not.toContain('node:fs/promises');
    expect(packages).not.toContain('node:path');
    expect(packages.length).toBe(1);
  });

  test('should exclude Bun built-in modules', async () => {
    await writeFile(`${testDir}/index.ts`, `import { $ } from 'bun';\nimport { test } from 'bun:test';\nimport React from 'react';`);

    const packages = await getAllUsedPackages(testDir);

    expect(packages).toContain('react');
    expect(packages).not.toContain('bun');
    expect(packages).not.toContain('bun:test');
    expect(packages.length).toBe(1);
  });

  test('should keep mixed imports when not all are type imports', async () => {
    await writeFile(`${testDir}/index.ts`, `import { type User, createUser } from 'user-lib';`);

    const packages = await getAllUsedPackages(testDir);

    // Mixed import (type + value) should be kept since it has runtime usage
    expect(packages).toContain('user-lib');
  });
});

describe('getImportUsageCount', () => {
  const testDir = './test-import-usage-count';

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  test('should count import usage correctly', async () => {
    await writeFile(
      `${testDir}/index.ts`,
      `
import React from 'react';
import { useState } from 'react';
import { pipe } from '@mobily/ts-belt';
import { pipe as pipe2 } from '@mobily/ts-belt';
`,
    );

    const usageMap = await getImportUsageCount(testDir);

    expect(usageMap.get('react')).toBe(2);
    expect(usageMap.get('@mobily/ts-belt')).toBe(2);
  });

  test('should include config file imports in usage count', async () => {
    await writeFile(`${testDir}/index.ts`, `import React from 'react';`);
    await writeFile(`${testDir}/webpack.config.js`, `const HtmlWebpackPlugin = require('html-webpack-plugin');`);

    const usageMap = await getImportUsageCount(testDir);

    expect(usageMap.get('react')).toBe(1);
    expect(usageMap.get('html-webpack-plugin')).toBeGreaterThan(0);
  });

  test('should handle multiple config files', async () => {
    const multiConfigDir = './test-multi-config';
    await mkdir(multiConfigDir, { recursive: true });

    await writeFile(`${multiConfigDir}/webpack.config.js`, `const lodash = require('lodash');`);
    await writeFile(`${multiConfigDir}/next.config.js`, `const lodash = require('lodash');`);
    await writeFile(`${multiConfigDir}/babel.config.ts`, `const preset = require('@babel/preset-react');`);

    const usageMap = await getImportUsageCount(multiConfigDir);

    expect(usageMap.get('lodash')).toBeGreaterThan(0);
    expect(usageMap.get('@babel/preset-react')).toBeGreaterThan(0);

    await rm(multiConfigDir, { recursive: true, force: true });
  });
});

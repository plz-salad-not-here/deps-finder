import { A, O, pipe, S } from '@mobily/ts-belt';
import type { Option } from '@mobily/ts-belt/dist/types/Option';
import { readFile } from 'node:fs/promises';
import { glob } from 'glob';
import { match, P } from 'ts-pattern';
import type { FilePath, ImportStatement, PackageName } from '../domain/types.js';

// All imports pattern
const IMPORT_REGEX = /(?:import|from)\s+['"]([^'"]+)['"]|require\s*\(['"]([^'"]+)['"]\)/g;

// Type-only import patterns (import type X from, import { type X } from)
const TYPE_ONLY_IMPORT_REGEX =
  /import\s+type\s+(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/g;

// Pattern for inline type imports: import { type X, Y } from 'pkg' - needs special handling
const MIXED_TYPE_IMPORT_REGEX = /import\s*\{([^}]+)\}\s*from\s+['"]([^'"]+)['"]/g;

// Node.js built-in modules (with and without node: prefix)
const NODE_BUILTIN_MODULES = new Set([
  // Core modules
  'assert',
  'async_hooks',
  'buffer',
  'child_process',
  'cluster',
  'console',
  'constants',
  'crypto',
  'dgram',
  'diagnostics_channel',
  'dns',
  'domain',
  'events',
  'fs',
  'http',
  'http2',
  'https',
  'inspector',
  'module',
  'net',
  'os',
  'path',
  'perf_hooks',
  'process',
  'punycode',
  'querystring',
  'readline',
  'repl',
  'stream',
  'string_decoder',
  'sys',
  'timers',
  'tls',
  'trace_events',
  'tty',
  'url',
  'util',
  'v8',
  'vm',
  'wasi',
  'worker_threads',
  'zlib',
  // Submodules
  'fs/promises',
  'stream/promises',
  'stream/web',
  'stream/consumers',
  'dns/promises',
  'timers/promises',
  'util/types',
  'readline/promises',
  'path/posix',
  'path/win32',
]);

// Bun built-in modules
const BUN_BUILTIN_MODULES = new Set(['bun', 'bun:test', 'bun:sqlite', 'bun:ffi', 'bun:jsc']);

function isBuiltinModule(moduleName: string): boolean {
  // Handle node: prefix
  if (moduleName.startsWith('node:')) {
    const name = moduleName.slice(5);
    return NODE_BUILTIN_MODULES.has(name);
  }
  // Handle bun: prefix
  if (moduleName.startsWith('bun:')) {
    return BUN_BUILTIN_MODULES.has(moduleName);
  }
  // Handle plain module names
  if (moduleName === 'bun') {
    return true;
  }
  return NODE_BUILTIN_MODULES.has(moduleName);
}

const EXCLUDE_PATTERNS = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/out/**',
  '**/*.test.*',
  '**/*.spec.*',
  '**/*.stories.*',
  '**/*.story.*',
  '**/test/**',
  '**/tests/**',
  '**/__tests__/**',
  '**/__mocks__/**',
  '**/stories/**',
  '**/.storybook/**',
  '**/coverage/**',
  '**/*.config.*',
  '**/e2e/**',
  '**/cypress/**',
  '**/playwright/**',
];

async function scanPattern(pattern: string): Promise<ReadonlyArray<FilePath>> {
  const files = await glob(pattern, {
    ignore: EXCLUDE_PATTERNS,
    nodir: true,
  });

  return files;
}

function getSourcePatterns(rootDir: string): ReadonlyArray<string> {
  return [`${rootDir}/**/*.ts`, `${rootDir}/**/*.tsx`, `${rootDir}/**/*.js`, `${rootDir}/**/*.jsx`];
}

export async function findSourceFiles(rootDir: string): Promise<ReadonlyArray<FilePath>> {
  const patterns = getSourcePatterns(rootDir);
  const fileGroups = await Promise.all(A.map(patterns, scanPattern));
  return A.flat(fileGroups);
}

function getTypeOnlyImports(content: string): Set<string> {
  const typeOnlyImports = new Set<string>();

  // Match "import type X from 'pkg'"
  let match: RegExpExecArray | null = TYPE_ONLY_IMPORT_REGEX.exec(content);
  while (match !== null) {
    if (match[1]) {
      typeOnlyImports.add(match[1]);
    }
    match = TYPE_ONLY_IMPORT_REGEX.exec(content);
  }

  // Match "import { type X } from 'pkg'" - only if ALL imports are type imports
  let mixedMatch: RegExpExecArray | null = MIXED_TYPE_IMPORT_REGEX.exec(content);
  while (mixedMatch !== null) {
    const imports = mixedMatch[1];
    const pkg = mixedMatch[2];
    if (imports && pkg) {
      // Split by comma and check if all are type imports
      const importParts = imports.split(',').map((s) => s.trim());
      const allTypeImports = importParts.every((part) => part.startsWith('type '));
      if (allTypeImports) {
        typeOnlyImports.add(pkg);
      }
    }
    mixedMatch = MIXED_TYPE_IMPORT_REGEX.exec(content);
  }

  return typeOnlyImports;
}

function extractImportsFromContent(content: string): ReadonlyArray<ImportStatement> {
  const typeOnlyImports = getTypeOnlyImports(content);
  const imports: ImportStatement[] = [];
  let regexMatch: RegExpExecArray | null = IMPORT_REGEX.exec(content);

  while (regexMatch !== null) {
    const importPath = regexMatch[1] ?? regexMatch[2];
    if (importPath && !typeOnlyImports.has(importPath) && !isBuiltinModule(importPath)) {
      imports.push(importPath);
    }
    regexMatch = IMPORT_REGEX.exec(content);
  }

  return imports;
}

export async function extractImportsFromFile(
  filePath: FilePath,
): Promise<ReadonlyArray<ImportStatement>> {
  try {
    const content = await readFile(filePath, 'utf-8');
    return extractImportsFromContent(content);
  } catch {
    return [];
  }
}

export function extractPackageName(importPath: ImportStatement): Option<PackageName> {
  return match(importPath)
    .with(P.string.startsWith('.'), () => O.None)
    .with(P.string.startsWith('/'), () => O.None)
    .with(P.string.startsWith('@'), () => {
      const parts = S.split(importPath, '/');
      return parts.length >= 2 ? O.Some(`${parts[0]}/${parts[1]}`) : O.None;
    })
    .otherwise(() => {
      const parts = S.split(importPath, '/');
      return O.fromNullable(parts[0]);
    });
}

function extractPackageNames(imports: ReadonlyArray<ImportStatement>): ReadonlyArray<PackageName> {
  return pipe(
    imports,
    A.map(extractPackageName),
    A.map(O.toNullable),
    A.filter((name): name is PackageName => name !== null),
  );
}

function collectUniquePackages(
  allImports: ReadonlyArray<ReadonlyArray<ImportStatement>>,
): ReadonlyArray<PackageName> {
  return pipe(allImports, A.map(extractPackageNames), A.flat, A.uniq);
}

export async function getAllUsedPackages(rootDir: string): Promise<ReadonlyArray<PackageName>> {
  const files = await findSourceFiles(rootDir);
  const allImports = await Promise.all(A.map(files, extractImportsFromFile));
  return collectUniquePackages(allImports);
}

export const ANALYZABLE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'] as const;

export const PRODUCTION_CONFIG_PATTERNS = [
  /^next\.config\.(js|ts|mjs|cjs)$/,
  /^next-[^/]+\.config\.(js|ts|mjs|cjs)$/,
  /^webpack\.config\.(js|ts|mjs|cjs)$/,
  /^vite\.config\.(js|ts|mjs|cjs)$/,
  /^rollup\.config\.(js|ts|mjs|cjs)$/,
  /^postcss\.config\.(js|ts|mjs|cjs)$/,
] as const;

export const DEV_CONFIG_PATTERNS = [
  'jest.config.',
  'vitest.config.',
  'babel.config.',
  'eslint.config.',
  'prettier.config.',
  'tsup.config.',
  'biome.config.',
] as const;

export const EXCLUDED_DIRECTORY_PATTERNS = [
  'node_modules/',
  'dist/',
  'build/',
  'out/',
  '/test/',
  '/tests/',
  '/__tests__/',
  '/__mocks__/',
  '/stories/',
  '/.storybook/',
  '/coverage/',
  '/e2e/',
  '/cypress/',
  '/playwright/',
] as const;

export const EXCLUDED_FILENAME_PATTERNS = [
  '.test.',
  '.spec.',
  '.stories.',
  '.story.',
  'testing-library.',
  'test-utils.',
  'setupTests.',
  'jest.setup.',
  'vitest.setup.',
] as const;

export const NODE_BUILTIN_MODULES = [
  'fs',
  'path',
  'http',
  'https',
  'util',
  'events',
  'stream',
  'crypto',
  'os',
  'child_process',
  'url',
  'querystring',
  'buffer',
  'process',
  'assert',
  'zlib',
  'net',
  'tls',
  'dns',
  'dgram',
  'cluster',
  'vm',
  'v8',
  'timers',
  'readline',
  'repl',
  'module',
] as const;

export const BUN_BUILTIN_MODULES = ['bun', 'bun:test', 'bun:sqlite', 'bun:ffi', 'bun:jsc'] as const;

export const IMPORT_REGEX =
  /(?:import(?!\s+type\b)(?!\s*\{[^}]*?\btype\s+\w+\b[^}]*\}))(?:\s+(?:[\w*\s{},]*)\s+from\s+)?['"]([^'"]+)['"]|require\s*\(\s*['"]([^'"]+)['"]\s*\)/g; // Runtime-only import regex
export const REQUIRE_REGEX = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

// Type-only import patterns
export const TYPE_ONLY_IMPORT_REGEX = /import\s+type\s+[^'"]+from\s+['"]([^'"]+)['"]/g;
export const MIXED_TYPE_IMPORT_REGEX = /import\s*\{([^}]+)\}\s*from\s+['"]([^'"]+)['"]/g;

export const MULTILINE_COMMENT_REGEX = /\/\*[\s\S]*?\*\//g;
export const SINGLE_LINE_COMMENT_REGEX = /\/\/.*$/gm;

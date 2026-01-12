/**
 * File extensions that are analyzed for imports
 */
export const ANALYZABLE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'] as const;

/**
 * Patterns for production configuration files (runtime dependencies)
 */
export const PRODUCTION_CONFIG_PATTERNS = [
  /^next\.config\.(js|ts|mjs|cjs)$/,
  /^next-[^/]+\.config\.(js|ts|mjs|cjs)$/,
  /^webpack\.config\.(js|ts|mjs|cjs)$/,
  /^vite\.config\.(js|ts|mjs|cjs)$/,
  /^rollup\.config\.(js|ts|mjs|cjs)$/,
  /^postcss\.config\.(js|ts|mjs|cjs)$/,
] as const;

/**
 * Patterns for development configuration files (devDependencies)
 */
export const DEV_CONFIG_PATTERNS = [
  'jest.config.',
  'vitest.config.',
  'babel.config.',
  'eslint.config.',
  'prettier.config.',
  'tsup.config.',
  'biome.config.',
] as const;

/**
 * Patterns for directories to exclude from analysis
 */
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

/**
 * Patterns for filenames to exclude from analysis (tests, stories, etc.)
 */
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

/**
 * Glob patterns for files to completely ignore in file search
 */
export const IGNORE_GLOB_PATTERNS = [
  ...EXCLUDED_DIRECTORY_PATTERNS.map((p) => `**${p}**`),
  '**/*.d.ts',
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/out/**',
  '**/coverage/**',
] as const;

/**
 * Node.js built-in modules to ignore
 */
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

/**
 * Bun built-in modules to ignore
 */
export const BUN_BUILTIN_MODULES = ['bun', 'bun:test', 'bun:sqlite', 'bun:ffi', 'bun:jsc'] as const;

/**
 * Regex for matching runtime imports and require statements
 * Captures:
 * 1. ES Import source
 * 2. Require source
 */
export const IMPORT_REGEX =
  /(?:import(?!\s+type\b)(?!\s*\{[^}]*?\btype\s+\w+\b[^}]*\}))(?:\s+(?:[\w*\s{},]*)\s+from\s+)?\s*['"]([^'"]+)['"]|require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

/**
 * Regex for matching require statements specifically
 */
export const REQUIRE_REGEX = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

/**
 * Regex for matching type-only imports
 */
export const TYPE_ONLY_IMPORT_REGEX = /import\s+type\s+[^'"]+from\s+['"]([^'"]+)['"]/g;

/**
 * Regex for matching mixed imports (value and type)
 * Captures:
 * 1. Import specifiers content
 * 2. Package source
 */
export const MIXED_TYPE_IMPORT_REGEX = /import\s*\{([^}]+)\}\s*from\s+['"]([^'"]+)['"]/g;

export const MULTILINE_COMMENT_REGEX = /\/\*[\s\S]*?\*\//g;
export const SINGLE_LINE_COMMENT_REGEX = /\/\/.*$/gm;

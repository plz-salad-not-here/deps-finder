# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.0] - 2026-01-13

### Added
- `--exclude` / `-e` flag to specify additional custom exclude patterns
- `--no-auto-detect` flag to disable automatic build directory detection
- Comprehensive build output directory patterns for major frameworks (Next.js, Nuxt, Vite, Storybook, etc.)
- Automatic detection of custom build directories from `tsconfig.json` (outDir) and `package.json` scripts
- Heuristic-based detection for build directories (patterns like `*-static`, `*-dist`, `*-build`)
- Exclude patterns for cache directories (`.cache`, `node_modules`, etc.) and IDE settings
- Result-based file reading utilities in `src/utils/file-reader.ts`
- AsyncResult utilities for future async operations (currently unused)
- Structured error types in `src/domain/errors.ts` (FileError, AnalysisError)
- Comprehensive tests for Result-based file and configuration reading

### Changed
- Refactored error handling to use ts-belt Result types instead of try-catch
- Improved type safety with explicit error types throughout the codebase
- More composable error handling with Result.map, Result.flatMap, and Result.match
- Migrated file reading utilities to a Result-based synchronous API

### Fixed
- Build output directories (storybook-static, .next, .nuxt, etc.) are now properly excluded from analysis
- False positives from framework build outputs are no longer reported as misplaced dependencies

### Improved
- More predictable and type-safe error handling throughout the codebase
- Better error reporting with structured, typed error objects
- Enhanced code quality by replacing imperative try-catch blocks with functional Result types
- More accurate analysis by strictly excluding build artifacts and temporary files
- Better handling of monorepo and custom build setups

## [0.4.1] - 2026-01-12

### Fixed
- Fixed duplicate location entries for the same file:line
- `tailwind.config.*` files are now properly recognized as build config files
- `postcss.config.*` files are now properly recognized as build config files
- Test setup files (`happydom.*`, `test-utils.*`, etc.) are now properly excluded from misplaced analysis
- Improved deduplication logic to prevent showing same import multiple times

### Added
- `deduplicateLocations` utility function for removing duplicate import locations
- More comprehensive build config and test setup file patterns

### Improved
- Better accuracy in distinguishing build/test configuration from production code

## [0.4.0] - 2026-01-12

### Added
- Detailed file locations and line numbers are now shown by default for misplaced dependencies
- Import statements are displayed for each dependency issue
- Enhanced JSON output with location details in `misplaced` field
- Significantly expanded test coverage with more edge cases and integration tests

### Fixed
- `.d.ts` (TypeScript declaration) files are now properly excluded from analysis
- Build tool config files (vite.config, webpack.config, etc.) no longer trigger false positives for misplaced devDependencies
- Fixed duplication of import reporting for mixed type imports
- Fixed side-effect import detection (e.g., `import 'core-js'`) which was previously failing in some cases

### Changed
- `misplaced` field in JSON output is now an object containing `locations` array instead of simple string array
- Refactored codebase to maximize `ts-belt` utility functions usage
- Optimized pipe usage to avoid unnecessary function overhead
- Replaced nested conditionals with `ts-pattern` match for linear control flow
- Improved code organization with better constant grouping

### Improved
- Better error handling and validation throughout the codebase
- Enhanced code readability and maintainability through functional programming patterns
- Updated all dependencies to latest versions
- Synchronized Korean documentation (README.ko.md) with English version

## [0.3.5] - 2025-12-20

### Changed
- **Code Quality Improvements**: Refactored to functional programming patterns
  - Migrated `extractPackageName` to use ts-pattern for cleaner, more maintainable pattern matching
  - Simplified pipe chains by removing unnecessary wrapper functions (currying improvements)
  - Converted `findMisplaced` and `filterIgnored` to curried functions for better composition
  - Removed redundant pipe wrappers in `isExcludedPath` and import parsing logic

### Fixed
- **IMPORT_REGEX Pattern**: Fixed to properly capture side-effect imports
  - Now correctly parses `import 'core-js/actual'` style imports
  - Maintains exclusion of type-only and inline type imports
  - Improved pattern simplicity while preserving all functionality
- **Test File Pattern**: Updated `happy-dom.` to `happydom.` for consistency in excluded filename patterns

### Technical Details
- All 97 tests pass with improved code readability
- More consistent use of ts-belt and ts-pattern throughout the codebase
- Eliminated imperative forEach loops in favor of functional A.forEach

## [0.3.4] - 2025-12-19

### Added
- Deep import path parsing with robust edge case handling
  - Added validation for empty strings, protocols, and malformed scoped packages
  - Deep import paths now correctly extract package names (e.g., `lodash/map` → `lodash`, `@mui/material/Button` → `@mui/material`)
  - All sub-path imports properly mapped to their root packages
  - Comprehensive test coverage for deep imports from popular packages (lodash, core-js, next-auth, @mui/material, @radix-ui, date-fns, rxjs, etc.)

## [0.3.3] - 2025-12-19

### Added
- Type-only dependency detection: Packages used only for types are now reported separately
- Test setup file patterns (testing-library, test-utils, setupTests, etc.) are now properly excluded
- Type guard utilities for safer type narrowing

### Fixed
- Type-only imports no longer incorrectly flagged as runtime dependencies
- Removed all type assertions (as) in favor of proper type guards
- Replaced imperative loops with functional ts-belt patterns

### Changed
- Improved code quality with consistent functional programming patterns
- Enhanced type safety throughout the codebase

## [0.3.2] - 2025-12-19

### Fixed
- Production config files (next.config.*, next-*.config.*, webpack.config.*, etc.) are now properly detected and analyzed
- Config file exclusion logic improved to prevent production configs from being incorrectly filtered out
- File path handling enhanced to work correctly regardless of absolute or relative paths

### Technical Details
- Refactored `isExcludedPath()` to use explicit dev config patterns instead of generic `.config.` pattern
- Improved `shouldAnalyzeFile()` to check production configs before applying exclusion rules
- Added comprehensive tests for config file detection across various path formats

## [0.3.1] - 2025-12-18

### Changed
- Simplified output by removing usage count display
- All output messages are now in English for consistency

### Added
- Comment-aware parsing: Commented-out imports are now properly ignored
- Smart config file detection: Only production configs are checked
  - Checks: next.config.*, next-*.config.*, webpack.config.*, vite.config.*, rollup.config.*, postcss.config.*
  - Ignores: jest.config.*, vitest.config.*, babel.config.*, eslint.config.*, prettier.config.*, tsup.config.*

### Fixed
- Single-line comments (`// import ...`) are now excluded from analysis
- Multi-line comments (`/* import ... */`) are now excluded from analysis
- JSDoc comments with import examples are now excluded from analysis
- Development tool configs (jest, eslint, etc.) are no longer incorrectly flagged

## [0.3.0] - 2025-12-18

### Added
- **Usage Count Statistics**: Each dependency's import/require count is now tracked and displayed
  - Text output shows count in parentheses (e.g., "react (23회 import)")
  - JSON output includes `count` field in the `used` array
  - Used dependencies are sorted by count in descending order
- **Config File Support**: CommonJS `require()` statements in configuration files are now detected
  - Supported files: `*.config.js`, `*.config.ts`, `*.config.cjs`, `*.config.mjs`
  - Includes webpack, Next.js, Babel, and other build tool configurations
- **Improved Type Import Handling**: Mixed import patterns are now correctly processed
  - Type-only imports: `import type { User } from 'pkg'` (excluded from usage)
  - Mixed imports: `import { type User, getValue } from 'pkg'` (counted as used)
  - Ensures packages with both type and runtime imports are correctly identified

### Enhanced
- **Better --ignore Option Display**: Ignored packages are now categorized and clearly displayed
  - Type-only imports: Packages used only with `import type` syntax
  - By default: Built-in modules and local imports
  - By option: Packages explicitly ignored via `--ignore` flag
- **Documentation**: Both English (README.md) and Korean (README.ko.md) versions updated
  - Added usage count examples
  - Config file support documentation
  - Mixed import pattern examples
  - Enhanced --ignore option explanation

### Fixed
- Type-only imports that were incorrectly excluded from detection during analysis
- Config file imports (require statements) that were not being counted in usage statistics
- --ignore option not showing which packages were explicitly ignored

### Changed
- JSON output now includes `used` field with package names and counts
- Text output now displays all used dependencies with their import counts
- Text output now clearly categorizes ignored dependencies by reason

### Improved
- Overall analysis accuracy for mixed import scenarios
- Performance when scanning configuration files
- User experience with clearer output formatting

## [0.2.0] - 2025-12-11

### Added
- **--ignore option**: Ignore specific packages from analysis (comma-separated)
- **Categorized ignored dependencies**: Different reasons for ignored packages

### Enhanced
- Ignored dependency reporting with categorization
- CLI help text with --ignore option documentation

## [0.1.0] - 2025-11-20

### Added
- Initial release
- **Unused Dependencies Detection**: Identify packages declared but not used
- **Misplaced Dependencies Detection**: Find packages in devDependencies that are used in production code
- **Multiple Import Patterns**: Support for ES6, CommonJS, TypeScript imports
- **Type-only Import Detection**: Exclude TypeScript type-only imports
- **Built-in Module Filtering**: Automatically exclude Node.js and Bun built-in modules
- **Text and JSON Output**: Multiple output format options
- **File Pattern Filtering**: Automatic exclusion of test, build, and configuration files
- **Type Safe Implementation**: Built with TypeScript using ADT patterns
- **Comprehensive Tests**: 100% code coverage

## Notes

### Upgrade from 0.2.0 to 0.3.0
No breaking changes. The new features are fully backward compatible:
- JSON output adds new `used` field while keeping existing fields
- Text output is enhanced but doesn't affect usage
- All existing options and behaviors are preserved

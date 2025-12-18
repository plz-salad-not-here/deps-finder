# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2024-12-18

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

## [0.2.0] - 2024-12-11

### Added
- **--ignore option**: Ignore specific packages from analysis (comma-separated)
- **Categorized ignored dependencies**: Different reasons for ignored packages

### Enhanced
- Ignored dependency reporting with categorization
- CLI help text with --ignore option documentation

## [0.1.0] - 2024-11-20

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

<div align="center">

# deps-finder 🕵️

**A TypeScript dependency analyzer that detects unused and misplaced dependencies in your project**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/deps-finder.svg)](https://www.npmjs.com/package/deps-finder)

[Installation](#installation) • [Usage](#usage) • [Features](#features) • [Architecture](#architecture) • [Contributing](#contributing)

> [한국어](./README.ko.md) | English

---

</div>

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
  - [Options](#options)
  - [Examples](#examples)
  - [Example Output](#example-output)
- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [Technologies](#technologies)
- [Development](#development)
  - [Testing](#testing)
  - [Scripts](#scripts)
- [CI Integration](#ci-integration)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- 🔍 **Unused Dependencies** - Detects packages declared in package.json but not imported in source code
- ⚠️ **Misplaced Dependencies** - Identifies packages in devDependencies but used in production code
- 📊 **Usage Statistics** - Shows how many times each dependency is imported
- 🚀 **Fast** - Powered by Bun for high performance
- 🎨 **Clean Output** - Colorized console output or JSON format
- 📦 **Zero Config** - Works out of the box
- 🔒 **Type Safe** - Built with TypeScript using ADT patterns
- 📝 **Ignore Packages** - Exclude specific packages from analysis

---

## Installation

```bash
npm install -D deps-finder
```

Or use with npx:

```bash
npx deps-finder
```

---

## Usage

Run in your project root:

```bash
npx deps-finder
```

### Options

| Option | Alias | Description |
|--------|-------|-------------|
| `--text` | `-t` | Output as text (default) |
| `--json` | `-j` | Output as JSON |
| `--all` | `-a` | Check all dependencies including devDependencies |
| `--ignore <packages>` | `-i` | Ignore specific packages (comma-separated) |
| `--help` | `-h` | Show help message |

### Examples

```bash
# Text output (default)
npx deps-finder

# JSON output
npx deps-finder -j
npx deps-finder --json

# Check all dependencies including devDependencies
npx deps-finder --all
npx deps-finder -a

# Ignore specific packages
npx deps-finder --ignore storybook,@storybook/nextjs-vite
npx deps-finder -i eslint,prettier --all

# Combine options
npx deps-finder -j --all

# Show help
npx deps-finder -h
```

### Example Output

**Text Format:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Dependency Analysis Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Used Dependencies:

  • react (23회 import)
  • lodash (5회 import)
  • axios (3회 import)

⚠ Unused Dependencies:
  (declared but not imported in source code)

  • moment

⚠ Misplaced Dependencies:
  (in devDependencies but used in source code)

  • zod

───────────────────────────────────────────────────────────
  Ignored Dependencies
───────────────────────────────────────────────────────────

  Type Imports Only (TypeScript)
  (imported via "import type" syntax)

  ○ typescript
  ○ @types/react

  Ignored by --ignore option
  (explicitly ignored via CLI)

  ○ eslint

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Total Issues: 2
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**JSON Format:**
```json
{
  "used": [
    { "name": "react", "count": 23 },
    { "name": "lodash", "count": 5 },
    { "name": "axios", "count": 3 }
  ],
  "unused": ["moment"],
  "misplaced": ["zod"],
  "ignored": {
    "typeOnly": ["typescript", "@types/react"],
    "byDefault": [],
    "byOption": ["eslint"]
  },
  "totalIssues": 2
}
```

---

## How It Works

1. **Parse package.json** - Extracts all declared dependencies
2. **Scan source code** - Parses import statements in TypeScript/JavaScript files
3. **Analyze dependencies**:
   - Detects packages declared but not used
   - Identifies packages in devDependencies but used in production code
4. **Generate report** - Outputs results in text or JSON format

### Scope

- **Default mode**: Checks `dependencies` and `peerDependencies` only
- **All mode (`--all`)**: Includes `devDependencies` in the analysis

### Supported Import Patterns

- ES6 import: `import React from 'react'`
- Named import: `import { useState } from 'react'`
- Namespace import: `import * as React from 'react'`
- CommonJS require: `require('express')`
- Type import: `import type { User } from '@/types'`
- Mixed import: `import { type User, createUser } from 'user-lib'`
- Deep imports: `import map from 'lodash/map'`
- Scoped packages: `import { pipe } from '@mobily/ts-belt'`
- Config files: CommonJS `require()` in `*.config.js`, `*.config.ts`, etc.

### Automatic Exclusions

#### File Patterns
The following files are automatically excluded from analysis:
- `node_modules/**`, `dist/**`, `build/**`, `out/**`
- `**/*.test.*`, `**/*.spec.*`
- `**/*.stories.*`, `**/*.story.*`
- `**/test/**`, `**/tests/**`, `**/__tests__/**`, `**/__mocks__/**`
- `**/stories/**`, `**/.storybook/**`
- `**/coverage/**`
- `**/e2e/**`, `**/cypress/**`, `**/playwright/**`

**Note:** Configuration files like `webpack.config.js`, `next.config.js`, etc. are analyzed separately to detect CommonJS `require()` statements.

#### Import Types
The following imports are automatically excluded:
- **Type-only imports**: `import type { User } from 'user-types'` (no runtime code)
  - **Exception**: If a package is also used with runtime imports (e.g., `import { type User, createUser } from 'user-lib'`), it's counted as used
- **Node.js built-in modules**: `fs`, `path`, `http`, `node:fs`, etc.
- **Bun built-in modules**: `bun`, `bun:test`, `bun:sqlite`, etc.

---

## Architecture

Built with clean architecture principles and Separation of Concerns (SoC):

```
src/
├── domain/          # Type definitions (ADT patterns)
├── parsers/         # Package.json and import parsers
├── analyzers/       # Dependency analysis logic
├── reporters/       # Output formatters
└── cli/            # CLI options and help
```

### Key Principles

- **ADT (Algebraic Data Types)** - Type-safe domain modeling
- **SoC (Separation of Concerns)** - Each module has a single responsibility
- **No Type Assertions** - Proper type inference without `as`
- **Union Types** - Using const arrays for type safety
- **Functional Patterns** - Using ts-pattern and ts-belt

---

## Technologies

- **[Bun](https://bun.sh)** - Fast JavaScript runtime and toolkit
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe development
- **[ts-pattern](https://github.com/gvergnaud/ts-pattern)** - Pattern matching for clean control flow
- **[ts-belt](https://mobily.github.io/ts-belt/)** - Functional programming utilities
- **[Biome](https://biomejs.dev/)** - Fast linter and formatter

---

## Development

```bash
# Install dependencies
bun install

# Run tests
bun test

# Run tests with coverage
bun test --coverage

# Type check
bun run typecheck

# Lint
bun run lint

# Format
bun run format

# Full validation (type check + lint + test)
bun run validate

# Build
bun run build
```

### Testing

The project includes comprehensive tests with 100% code coverage:

```bash
# Run all tests
bun test

# Run with coverage
bun test --coverage
```

Tests include:
- **Unit tests** - Verify individual function behavior
- **Integration tests** - Validate complete workflows
- **Edge case tests** - Handle boundary conditions and exceptions
- **Type tests** - Verify ADT types (Option, Result, etc.)

### Scripts

| Script | Description |
|--------|-------------|
| `bun test` | Run tests |
| `bun test --coverage` | Run tests with coverage |
| `bun run typecheck` | Type check without emitting files |
| `bun run lint` | Lint source code |
| `bun run format` | Format source code |
| `bun run format:check` | Check code formatting |
| `bun run check` | Run Biome checks |
| `bun run validate` | Run all validations (typecheck + lint + test) |
| `bun run build` | Build for production |

---

## CI Integration

Add to your CI pipeline:

```yaml
- name: Check dependencies
  run: npx deps-finder
```

The command exits with code 1 if issues are found, making it perfect for CI/CD workflows.

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

For bugs and feature requests, please [create an issue](https://github.com/plz-salad-not-here/dep-detective/issues).

---

## License

[MIT](./LICENSE)

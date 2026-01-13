<div align="center">

# deps-finder 🕵️

**프로젝트에서 사용되지 않거나 잘못 배치된 의존성을 감지하는 TypeScript 의존성 분석 도구**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/deps-finder.svg)](https://www.npmjs.com/package/deps-finder)

[설치](#설치) • [사용법](#사용법) • [주요 기능](#주요-기능) • [아키텍처](#아키텍처) • [기여하기](#기여하기)

> 한국어 | [English](./README.md)

---

</div>

## 목차

- [주요 기능](#주요-기능)
- [설치](#설치)
- [사용법](#사용법)
  - [옵션](#옵션)
  - [사용 예제](#사용-예제)
  - [출력 예시](#출력-예시)
- [동작 원리](#동작-원리)
- [아키텍처](#아키텍처)
- [기술 스택](#기술-스택)
- [개발](#개발)
  - [테스트](#테스트)
  - [스크립트](#스크립트)
- [CI 통합](#ci-통합)
- [기여하기](#기여하기)
- [라이선스](#라이선스)

---

## 주요 기능

- 🔍 **미사용 의존성 감지** - package.json에 선언되었지만 소스 코드에서 import하지 않는 패키지 탐지
- ⚠️ **잘못 배치된 의존성 감지** - devDependencies에 있지만 프로덕션 코드에서 사용하는 패키지 식별
- 🚀 **빠른 성능** - Bun 기반으로 높은 성능 제공
- 🎨 **깔끔한 출력** - 컬러풀한 콘솔 출력 또는 JSON 형식 지원
- 📦 **별도 설정 불필요** - 바로 사용 가능
- 🔒 **타입 안전성** - ADT 패턴을 활용한 TypeScript 기반 구현
- 💬 **주석 처리** - 주석 처리된 import는 무시
- ⚙️ **스마트한 설정 파일 감지** - 프로덕션 설정 파일만 자동으로 검사

---

## 설치

```bash
npm install -D deps-finder
```

또는 npx로 바로 실행:

```bash
npx deps-finder
```

---

## 사용법

프로젝트 루트에서 실행:

```bash
npx deps-finder
```

### 옵션

| 옵션 | 축약 | 설명 |
|------|------|------|
| `--text` | `-t` | 텍스트 형식으로 출력 (기본값) |
| `--json` | `-j` | JSON 형식으로 출력 |
| `--all` | `-a` | devDependencies를 포함한 모든 의존성 검사 |
| `--ignore <packages>` | `-i` | 특정 패키지 무시 (쉼표로 구분) |
| `--exclude <globs>` | `-e` | 특정 파일/디렉토리 제외 (쉼표로 구분된 glob 패턴) |
| `--no-auto-detect` | | 빌드 디렉토리 자동 감지 기능 비활성화 |
| `--help` | `-h` | 도움말 표시 |

### 사용 예제

```bash
# 텍스트 출력 (기본값)
npx deps-finder

# JSON 출력
npx deps-finder -j
npx deps-finder --json

# devDependencies 포함 모든 의존성 검사
npx deps-finder --all
npx deps-finder -a

# 특정 패키지 무시
npx deps-finder --ignore storybook,@storybook/nextjs-vite
npx deps-finder -i eslint,prettier --all

# 특정 디렉토리 제외
npx deps-finder --exclude "custom-dist/**,.cache/**"

# 옵션 조합
npx deps-finder -j --all

# 도움말 표시
npx deps-finder -h
```

### 출력 예시

**텍스트 형식:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  의존성 분석 보고서
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ 사용 중인 의존성:

  • react
  • lodash
  • axios

⚠ 미사용 의존성:
  (선언되었지만 소스 코드에서 import되지 않음)

  • moment

⚠ 잘못 배치된 의존성:
  (devDependencies에 있지만 소스 코드에서 사용됨)

  • zod (1개 파일에서 사용됨)
    └─ src/api/schema.ts:5
       import { z } from 'zod'

───────────────────────────────────────────────────────────
  무시된 의존성
───────────────────────────────────────────────────────────

  Type Import만 사용됨 (TypeScript)
  ("import type" 문법으로 import됨)

  ○ typescript
  ○ @types/react

  --ignore 옵션으로 무시됨
  (CLI를 통해 명시적으로 무시됨)

  ○ eslint

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  총 문제: 2
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**JSON 형식:**
```json
{
  "used": [
    { "name": "react", "count": 23 },
    { "name": "lodash", "count": 5 },
    { "name": "axios", "count": 3 }
  ],
  "unused": ["moment"],
  "misplaced": [
    {
      "packageName": "zod",
      "locations": [
        {
          "file": "/absolute/path/to/src/api/schema.ts",
          "line": 5,
          "importStatement": "import { z } from 'zod'"
        }
      ]
    }
  ],
  "ignored": {
    "typeOnly": ["typescript", "@types/react"],
    "byDefault": [],
    "byOption": ["eslint"]
  },
  "totalIssues": 2
}
```

---

## 동작 원리

1. **package.json 파싱** - 선언된 모든 의존성 추출
2. **소스 코드 스캔** - TypeScript/JavaScript 파일에서 import 문 파싱
3. **의존성 분석**:
   - 선언되었지만 사용되지 않는 패키지 탐지
   - devDependencies에 있지만 프로덕션 코드에서 사용되는 패키지 탐지
4. **결과 출력** - 텍스트 또는 JSON 형식으로 보고서 생성

### 검사 범위

- **기본 모드**: `dependencies`와 `peerDependencies`만 검사
- **전체 모드 (`--all`)**: `devDependencies`를 포함한 모든 의존성 검사

### 지원하는 import 형식

모든 import 스타일이 올바르게 파싱되며, 서브 경로(sub-path)를 포함한 deep import도 지원합니다:

- ES6 import: `import React from 'react'`
- Named import: `import { useState } from 'react'`
- Namespace import: `import * as React from 'react'`
- CommonJS require: `require('express')`
- Type import: `import type { User } from '@/types'`
- 혼합 import: `import { type User, createUser } from 'user-lib'`
- **Deep imports**: `import map from 'lodash/map'` → `lodash`로 감지
- **Side-effect imports**: `import 'core-js/actual'` → `core-js`로 감지
- **Sub-path exports**: `import { signIn } from 'next-auth/react'` → `next-auth`로 감지
- **Scoped packages**: `import { pipe } from '@mobily/ts-belt'` → `@mobily/ts-belt`로 감지
- **Scoped deep imports**: `import { Button } from '@mui/material/Button'` → `@mui/material`로 감지
- 설정 파일: `*.config.js`, `*.config.ts` 등에서 CommonJS `require()`

### 주석 처리 (Comment Handling)

분석 시 주석은 적절히 무시됩니다:
- 한 줄 주석: `// import React from 'react'`
- 여러 줄 주석: `/* import axios from 'axios' */`
- JSDoc 주석: `/** @example import { test } from 'test' */`

예시:
```javascript
// import unused from 'unused-package';  // ← 무시됨
/* 
import also from 'also-unused';  // ← 무시됨
*/
import axios from 'axios';  // ← 감지됨
```

### 설정 파일 (Configuration Files)

프로덕션 관련 설정 파일만 의존성 검사 대상이 됩니다:

**검사 대상 (프로덕션 설정)**:
- `next.config.*` - Next.js 런타임 설정
- `next-*.config.*` - Next.js 플러그인 (next-logger, next-pwa, next-auth 등)
- `webpack.config.*` - Webpack 빌드 설정
- `vite.config.*` - Vite 빌드 설정
- `rollup.config.*` - Rollup 빌드 설정
- `postcss.config.*` - PostCSS 빌드 설정

**참고**: 프로덕션 설정 파일은 프로젝트 내 위치(루트, 하위 디렉토리 등)에 상관없이 감지됩니다. 이 파일들에서 사용되는 의존성은 `devDependencies`에 있더라도 '잘못 배치된 의존성'으로 표시되지 않습니다.

**검사 제외 (개발 도구 설정)**:
- `jest.config.*` - 테스트 설정 (devDependencies)
- `vitest.config.*` - 테스트 설정 (devDependencies)
- `babel.config.*` - 빌드 도구 (devDependencies)
- `eslint.config.*` - 린터 (devDependencies)
- `prettier.config.*` - 포맷터 (devDependencies)
- `tsup.config.*` - 빌드 도구 (devDependencies)

예시:
```javascript
// ✓ 감지됨: next.config.js
const withBundleAnalyzer = require(' @next/bundle-analyzer')

// ✓ 감지됨: next-logger.config.js (루트 또는 하위 디렉토리)
const winston = require('winston')

// ✓ 감지됨: webpack.config.js
const HtmlWebpackPlugin = require('html-webpack-plugin')

// ✗ 제외됨: jest.config.js (개발 도구)
const nextJest = require('next/jest')
```

### 자동 제외 (Automatic Exclusions)

#### 파일 패턴
다음 파일들은 분석에서 자동으로 제외됩니다:
- `**/*.d.ts` (TypeScript 선언 파일)
- `node_modules/**`, `dist/**`, `build/**`, `out/**`
- `**/*.test.*`, `**/*.spec.*`
- `**/*.stories.*`, `**/*.story.*`
- `**/test/**`, `**/tests/**`, `**/__tests__/**`, `**/__mocks__/**`
- `**/stories/**`, `**/.storybook/**`
- `**/coverage/**`
- `**/e2e/**`, `**/cypress/**`, `**/playwright/**`

**참고:** `webpack.config.js`, `next.config.js` 등의 설정 파일은 CommonJS `require()` 문을 감지하기 위해 별도로 분석됩니다.

#### 빌드 출력 디렉토리 (자동 감지)
다음 기준에 따라 빌드 결과물 디렉토리를 자동으로 감지하고 제외합니다:
- 프레임워크 기본 경로 (`.next`, `.nuxt`, `storybook-static`, `dist`, `build` 등)
- `tsconfig.json`의 `compilerOptions.outDir` 설정
- `package.json` 스크립트의 `--outDir` 플래그
- 디렉토리 이름 휴리스틱 (`*-static`, `*-dist`, `*-build`)

`--no-auto-detect` 옵션으로 이 기능을 비활성화하거나, `--exclude` 옵션으로 직접 제어할 수 있습니다.

#### Import 타입
다음 import들은 자동으로 제외됩니다:
- **Type-only imports**: `import type { User } from 'user-types'` (런타임 코드 없음)
  - **예외**: 런타임 import와 함께 사용되는 경우 (예: `import { type User, createUser } from 'user-lib'`), 사용된 것으로 간주됩니다.
- **Node.js 내장 모듈**: `fs`, `path`, `http`, `node:fs` 등
- **Bun 내장 모듈**: `bun`, `bun:test`, `bun:sqlite` 등

---

## 아키텍처

클린 아키텍처 원칙과 관심사의 분리(SoC)를 기반으로 구현:

```
src/
├── domain/          # 타입 정의 (ADT 패턴)
├── parsers/         # Package.json 및 import 파서
├── analyzers/       # 의존성 분석 로직
├── reporters/       # 출력 포맷터
└── cli/            # CLI 옵션 및 도움말
```

### 핵심 원칙

- **ADT (대수적 데이터 타입)** - 타입 안전한 도메인 모델링
- **SoC (관심사의 분리)** - 각 모듈은 단일 책임을 가짐
- **타입 단언 배제** - `as` 없이 적절한 타입 추론 사용
- **유니온 타입** - const 배열을 활용한 타입 안전성
- **함수형 패턴** - ts-pattern과 ts-belt 활용

---

## 기술 스택

- **[Bun](https://bun.sh)** - 빠른 JavaScript 런타임 및 툴킷
- **[TypeScript](https://www.typescriptlang.org/)** - 타입 안전한 개발
- **[ts-pattern](https://github.com/gvergnaud/ts-pattern)** - 깔끔한 제어 흐름을 위한 패턴 매칭
- **[ts-belt](https://mobily.github.io/ts-belt/)** - 함수형 프로그래밍 유틸리티
- **[Biome](https://biomejs.dev/)** - 빠른 린터 및 포맷터

---

## 개발

```bash
# 의존성 설치
bun install

# 테스트 실행
bun test

# 테스트 커버리지
bun test --coverage

# 타입 체크
bun run typecheck

# 린트
bun run lint

# 포맷팅
bun run format

# 전체 검증 (타입 체크 + 린트 + 테스트)
bun run validate

# 빌드
bun run build
```

### 테스트

프로젝트는 100% 코드 커버리지를 달성한 포괄적인 테스트를 포함합니다:

```bash
# 모든 테스트 실행
bun test

# 커버리지와 함께 실행
bun test --coverage
```

테스트는 다음을 포함합니다:
- **유닛 테스트** - 각 함수의 동작 검증
- **통합 테스트** - 전체 워크플로우 검증
- **Edge case 테스트** - 경계값 및 예외 상황 처리
- **타입 테스트** - Option, Result 등 ADT 타입 검증

### 스크립트

| 스크립트 | 설명 |
|---------|------|
| `bun test` | 테스트 실행 |
| `bun test --coverage` | 커버리지와 함께 테스트 실행 |
| `bun run typecheck` | 파일 생성 없이 타입 체크 |
| `bun run lint` | 소스 코드 린트 |
| `bun run format` | 소스 코드 포맷팅 |
| `bun run format:check` | 코드 포맷 검사 |
| `bun run check` | Biome 검사 실행 |
| `bun run validate` | 모든 검증 실행 (typecheck + lint + test) |
| `bun run build` | 프로덕션 빌드 |

---

## CI 통합

CI 파이프라인에 추가:

```yaml
- name: 의존성 검사
  run: npx deps-finder
```

문제가 발견되면 종료 코드 1을 반환하므로 CI/CD 워크플로우에 적합합니다.

---

## 기여하기

기여를 환영합니다! Pull Request를 자유롭게 제출해 주세요.

버그 및 기능 요청은 [이슈를 생성](https://github.com/plz-salad-not-here/dep-detective/issues)해 주세요.

---

## 라이선스

[MIT](./LICENSE)

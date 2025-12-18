import { match } from 'ts-pattern';
import type { AnalysisResult, OutputFormat } from '../domain/types.js';

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  gray: '\x1b[90m',
  blue: '\x1b[34m',
} as const;

type ColorName = keyof typeof COLORS;

function colorize(text: string, color: ColorName): string {
  return `${COLORS[color]}${text}${COLORS.reset}`;
}

function reportAsText(result: AnalysisResult): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(colorize('━'.repeat(60), 'cyan'));
  lines.push(colorize('  Dependency Analysis Report', 'bold'));
  lines.push(colorize('━'.repeat(60), 'cyan'));
  lines.push('');

  // Show used dependencies
  if (result.used.length > 0) {
    lines.push(colorize('✓ Used Dependencies:', 'green'));
    lines.push('');

    for (const dep of result.used) {
      const countText = dep.count === 1 ? '1회 import' : `${dep.count}회 import`;
      lines.push(`  ${colorize('•', 'green')} ${dep.name} ${colorize(`(${countText})`, 'gray')}`);
    }
    lines.push('');
  }

  if (result.unused.length === 0 && result.misplaced.length === 0) {
    lines.push(colorize('✓ All dependencies are properly used and placed!', 'green'));
  } else {
    if (result.unused.length > 0) {
      lines.push(colorize('⚠ Unused Dependencies:', 'yellow'));
      lines.push(colorize('  (declared but not imported in source code)', 'yellow'));
      lines.push('');

      for (const dep of result.unused) {
        lines.push(`  ${colorize('•', 'yellow')} ${dep}`);
      }
      lines.push('');
    }

    if (result.misplaced.length > 0) {
      lines.push(colorize('⚠ Misplaced Dependencies:', 'red'));
      lines.push(colorize('  (in devDependencies but used in source code)', 'red'));
      lines.push('');

      for (const dep of result.misplaced) {
        lines.push(`  ${colorize('•', 'red')} ${dep}`);
      }
      lines.push('');
    }
  }

  // Show ignored dependencies
  const hasIgnoredPackages =
    result.ignored.typeOnly.length > 0 ||
    result.ignored.byDefault.length > 0 ||
    result.ignored.byOption.length > 0;

  if (hasIgnoredPackages) {
    lines.push('');
    lines.push(colorize('─────────────────────────────────────────────────────────', 'gray'));
    lines.push(colorize('  Ignored Dependencies', 'bold'));
    lines.push(colorize('─────────────────────────────────────────────────────────', 'gray'));
    lines.push('');

    if (result.ignored.typeOnly.length > 0) {
      lines.push(colorize('  Type Imports Only (TypeScript)', 'blue'));
      lines.push(colorize('  (imported via "import type" syntax)', 'gray'));
      lines.push('');
      for (const dep of result.ignored.typeOnly) {
        lines.push(`  ${colorize('○', 'blue')} ${dep}`);
      }
      lines.push('');
    }

    if (result.ignored.byDefault.length > 0) {
      lines.push(colorize('  Default Ignores', 'blue'));
      lines.push(colorize('  (built-in modules, local imports, etc.)', 'gray'));
      lines.push('');
      for (const dep of result.ignored.byDefault) {
        lines.push(`  ${colorize('○', 'blue')} ${dep}`);
      }
      lines.push('');
    }

    if (result.ignored.byOption.length > 0) {
      lines.push(colorize('  Ignored by --ignore option', 'blue'));
      lines.push(colorize('  (explicitly ignored via CLI)', 'gray'));
      lines.push('');
      for (const dep of result.ignored.byOption) {
        lines.push(`  ${colorize('○', 'blue')} ${dep}`);
      }
      lines.push('');
    }
  }

  const totalIssues = result.unused.length + result.misplaced.length;
  lines.push(colorize('━'.repeat(60), 'cyan'));
  lines.push(colorize(`  Total Issues: ${totalIssues}`, 'bold'));
  lines.push(colorize('━'.repeat(60), 'cyan'));
  lines.push('');

  return lines.join('\n');
}

function reportAsJson(result: AnalysisResult): string {
  const totalIssues = result.unused.length + result.misplaced.length;
  return JSON.stringify(
    {
      used: result.used,
      unused: result.unused,
      misplaced: result.misplaced,
      ignored: {
        typeOnly: result.ignored.typeOnly,
        byDefault: result.ignored.byDefault,
        byOption: result.ignored.byOption,
      },
      totalIssues,
    },
    null,
    2,
  );
}

export function report(result: AnalysisResult, format: OutputFormat): string {
  return match(format)
    .with('text', () => reportAsText(result))
    .with('json', () => reportAsJson(result))
    .exhaustive();
}

export function hasIssues(result: AnalysisResult): boolean {
  return result.unused.length > 0 || result.misplaced.length > 0;
}

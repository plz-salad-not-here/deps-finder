import { A, pipe } from '@mobily/ts-belt';
import type { AnalysisResult, OutputFormat } from '../domain/types.js';
import { MESSAGES } from '../constants/messages.js';
import { match } from 'ts-pattern';

/**
 * 색상 코드
 */
const colors = {
  reset: '\x1b[0m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  gray: '\x1b[90m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  blue: '\x1b[34m', // Added blue for type-only
} as const;

/**
 * 색상 적용
 */
const colorize = (text: string, color: keyof typeof colors): string =>
  `${colors[color]}${text}${colors.reset}`;

/**
 * 섹션 헤더 출력 (for Unused/Misplaced)
 */
const formatIssueSection = (
  title: string,
  subtitle: string,
  items: ReadonlyArray<string>,
): string[] => {
  if (A.isEmpty(items)) return [];

  const lines = [
    '',
    `${colorize('⚠', 'yellow')}  ${colorize(title, 'yellow')}`,
    `  ${colorize(subtitle, 'gray')}`,
    '',
  ];

  pipe(
    items,
    A.forEach((item) => lines.push(`  ${colorize('•', 'yellow')} ${item}`)),
  );

  return lines;
};

/**
 * 섹션 헤더 출력 (for Type-Only)
 */
const formatTypeOnlySection = (
  title: string,
  subtitle: string,
  items: ReadonlyArray<string>,
): string[] => {
  if (A.isEmpty(items)) return [];

  const lines = [
    '',
    `${colorize('ℹ️', 'blue')}  ${colorize(title, 'blue')}`,
    `  ${colorize(subtitle, 'gray')}`,
    '',
  ];

  pipe(
    items,
    A.forEach((item) => lines.push(`  ${colorize('○', 'blue')} ${item}`)),
  );

  return lines;
};

/**
 * 무시된 패키지 출력
 */
const formatIgnored = (packages: ReadonlyArray<string>): string[] => {
  if (A.isEmpty(packages)) return [];

  const packageList = A.join(packages, ', ');
  return ['', `ℹ️  ${MESSAGES.IGNORED_PACKAGES} ${colorize(packageList, 'cyan')}`];
};

/**
 * 구분선 출력
 */
const formatSeparator = (): string => colorize(MESSAGES.SEPARATOR, 'gray');

/**
 * 이슈 없음 메시지 출력
 */
const formatNoIssues = (): string[] => [
  formatSeparator(),
  '',
  `  ${colorize(MESSAGES.NO_ISSUES, 'green')}`,
  '',
  formatSeparator(),
];

/**
 * 이슈 요약 출력
 */
const formatSummary = (totalIssues: number): string[] => [
  '',
  formatSeparator(),
  `  ${MESSAGES.TOTAL_ISSUES} ${colorize(String(totalIssues), 'yellow')}`,
  formatSeparator(),
];

export const reportToConsole = (
  result: AnalysisResult,
  ignoredPackages: ReadonlyArray<string> = [],
): void => {
  console.log(report(result, 'text', ignoredPackages));
};

export const report = (
  result: AnalysisResult,
  format: OutputFormat,
  ignoredPackages: ReadonlyArray<string> = [],
): string => {
  return match(format)
    .with('json', () =>
      JSON.stringify(
        {
          unused: result.unused,
          misplaced: result.misplaced,
          typeOnly: result.typeOnly, // Include typeOnly in JSON
          ignored: ignoredPackages,
          totalIssues: result.totalIssues,
        },
        null,
        2,
      ),
    )
    .with('text', () => {
      // 헤더
      const lines: string[] = [
        '',
        formatSeparator(),
        `  ${colorize(MESSAGES.REPORT_TITLE, 'cyan')}`,
        formatSeparator(),
      ];

      // 무시된 패키지 표시
      lines.push(...formatIgnored(ignoredPackages));

      // 이슈가 없는 경우, but typeOnly exists, still show typeOnly
      if (result.totalIssues === 0 && A.isEmpty(result.typeOnly)) {
        lines.push(...formatNoIssues());
        return lines.join('\n');
      }

      // 미사용 의존성
      lines.push(
        ...formatIssueSection(MESSAGES.UNUSED_TITLE, MESSAGES.UNUSED_SUBTITLE, result.unused),
      );

      // 잘못 배치된 의존성
      lines.push(
        ...formatIssueSection(
          MESSAGES.MISPLACED_TITLE,
          MESSAGES.MISPLACED_SUBTITLE,
          result.misplaced,
        ),
      );

      // 타입 전용 의존성
      lines.push(
        ...formatTypeOnlySection(
          MESSAGES.TYPE_ONLY_TITLE,
          MESSAGES.TYPE_ONLY_SUBTITLE,
          result.typeOnly,
        ),
      );

      // 요약
      lines.push(...formatSummary(result.totalIssues));

      return lines.join('\n');
    })
    .exhaustive();
};

export function hasIssues(result: AnalysisResult): boolean {
  return result.totalIssues > 0;
}

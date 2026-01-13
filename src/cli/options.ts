import { A, pipe, S } from '@mobily/ts-belt';
import { match } from 'ts-pattern';
import { HELP_TEXT } from '../constants/messages.js';
import type { CliOptions } from '../domain/types.js';
import { isString } from '../utils/type-guards.js';

const isOption = (arg: string | undefined): boolean => isString(arg) && S.startsWith(arg, '-');

/**
 * 인자를 옵션으로 파싱
 */
const parseArgument = (
  allArgs: ReadonlyArray<string>,
  index: number,
  options: CliOptions,
): { options: CliOptions; skipCount: number } => {
  const arg = allArgs[index];
  const nextArg = allArgs[index + 1];

  return match(arg)
    .with('-t', '--text', () => ({
      options: { ...options, format: 'text' as const },
      skipCount: 0,
    }))
    .with('-j', '--json', () => ({
      options: { ...options, format: 'json' as const },
      skipCount: 0,
    }))
    .with('-a', '--all', () => ({
      options: { ...options, checkAll: true },
      skipCount: 0,
    }))
    .with('-h', '--help', () => ({
      options: { ...options, showHelp: true },
      skipCount: 0,
    }))
    .with('-i', '--ignore', () => {
      if (!isString(nextArg) || isOption(nextArg)) {
        return { options, skipCount: 0 };
      }
      const newIgnored = pipe(nextArg, S.split(','), A.map(S.trim));
      return {
        options: {
          ...options,
          ignoredPackages: [...options.ignoredPackages, ...newIgnored],
        },
        skipCount: 1, // Skip next argument
      };
    })
    .with('-e', '--exclude', () => {
      if (!isString(nextArg) || isOption(nextArg)) {
        return { options, skipCount: 0 };
      }
      const newExcluded = pipe(nextArg, S.split(','), A.map(S.trim));
      return {
        options: {
          ...options,
          excludePatterns: [...options.excludePatterns, ...newExcluded],
        },
        skipCount: 1,
      };
    })
    .with('--no-auto-detect', () => ({
      options: { ...options, noAutoDetect: true },
      skipCount: 0,
    }))
    .otherwise(() => ({ options, skipCount: 0 }));
};

/**
 * CLI 인자 파싱
 */
export const parseCliOptions = (args: string[]): CliOptions => {
  const defaultOptions: CliOptions = {
    format: 'text',
    checkAll: false,
    ignoredPackages: [],
    excludePatterns: [],
    noAutoDetect: false,
    showHelp: false,
    rootDir: '.',
    packageJsonPath: './package.json',
  };

  const finalOptions = pipe(
    args,
    A.reduceWithIndex({ options: defaultOptions, skippedUntil: -1 }, (acc, _arg, index) => {
      if (index <= acc.skippedUntil) {
        return acc;
      }

      const result = parseArgument(args, index, acc.options);
      return {
        options: result.options,
        skippedUntil: index + result.skipCount,
      };
    }),
    (finalAcc) => finalAcc.options,
  );

  return finalOptions;
};

/**
 * 도움말 출력
 */
export const printHelp = (): void => {
  console.log(HELP_TEXT);
};

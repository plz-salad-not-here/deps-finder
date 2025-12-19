import { match, P } from 'ts-pattern';
import { A, S, pipe } from '@mobily/ts-belt';
import { HELP_TEXT } from '../constants/messages.js';
import { isString } from '../utils/type-guards.js';

export type OutputFormat = 'text' | 'json';

export type CliOptions = {
  format: OutputFormat;
  checkAll: boolean;
  ignoredPackages: string[];
  showHelp: boolean;
  rootDir: string;
  packageJsonPath: string;
};

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
    .with(P.union('-t', '--text'), () => ({
      options: { ...options, format: 'text' as const },
      skipCount: 0,
    }))
    .with(P.union('-j', '--json'), () => ({
      options: { ...options, format: 'json' as const },
      skipCount: 0,
    }))
    .with(P.union('-a', '--all'), () => ({
      options: { ...options, checkAll: true },
      skipCount: 0,
    }))
    .with(P.union('-h', '--help'), () => ({
      options: { ...options, showHelp: true },
      skipCount: 0,
    }))
    .with(P.union('-i', '--ignore'), () => {
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
    showHelp: false,
    rootDir: '.',
    packageJsonPath: './package.json',
  };

  const finalOptions = pipe(
    args,
    A.reduceWithIndex({ options: defaultOptions, skippedUntil: -1 }, (acc, _arg, index) => {
      // _arg is not used, access via args[index]
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

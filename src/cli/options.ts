import { match, P } from 'ts-pattern';
import { A, S, pipe } from '@mobily/ts-belt';
import { HELP_TEXT } from '../constants/messages.js';

export type OutputFormat = 'text' | 'json';

export type CliOptions = {
  format: OutputFormat;
  checkAll: boolean;
  ignoredPackages: string[];
  showHelp: boolean;
  rootDir: string;
  packageJsonPath: string;
};

const isOption = (arg: string | undefined): boolean => !!arg && S.startsWith(arg, '-');

/**
 * 인자를 옵션으로 파싱
 */
const parseArgument = (
  arg: string,
  nextArg: string | undefined,
  options: CliOptions,
): { options: CliOptions; skipNext: boolean } =>
  match(arg)
    .with(P.union('-t', '--text'), () => ({
      options: { ...options, format: 'text' as const },
      skipNext: false,
    }))
    .with(P.union('-j', '--json'), () => ({
      options: { ...options, format: 'json' as const },
      skipNext: false,
    }))
    .with(P.union('-a', '--all'), () => ({
      options: { ...options, checkAll: true },
      skipNext: false,
    }))
    .with(P.union('-h', '--help'), () => ({
      options: { ...options, showHelp: true },
      skipNext: false,
    }))
    .with(P.union('-i', '--ignore'), () => {
      // Check if nextArg is a valid value (not an option and not undefined)
      if (!nextArg || isOption(nextArg)) {
        return {
          options,
          skipNext: false, // Don't skip if we didn't consume it
        };
      }

      const newIgnored = pipe(nextArg, S.split(','), A.map(S.trim));
      return {
        options: {
          ...options,
          ignoredPackages: [...options.ignoredPackages, ...newIgnored],
        },
        skipNext: true,
      };
    })
    .otherwise(() => ({
      options,
      skipNext: false,
    }));

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

  let options = defaultOptions;
  let skipNext = false;

  for (let i = 0; i < A.length(args); i++) {
    if (skipNext) {
      skipNext = false;
      continue;
    }

    const result = parseArgument(args[i]!, args[i + 1], options);
    options = result.options;
    skipNext = result.skipNext;
  }

  return options;
};

/**
 * 도움말 출력
 */
export const printHelp = (): void => {
  console.log(HELP_TEXT);
};

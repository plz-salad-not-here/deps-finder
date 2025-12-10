import { A, F, O, pipe, R, S } from '@mobily/ts-belt';
import { match, P } from 'ts-pattern';
import type {
  AppResult,
  CliOptions,
  CliOptionsWithoutDefaults,
  OutputFormat,
} from '../domain/types.js';

const DEFAULT_OPTIONS: CliOptions = {
  format: 'text',
  rootDir: './src',
  packageJsonPath: './package.json',
  checkAll: false,
  ignorePackages: [],
};

type ParsedArg =
  | { type: 'format'; value: OutputFormat }
  | { type: 'checkAll' }
  | { type: 'ignore'; packages: ReadonlyArray<string> }
  | { type: 'help' }
  | { type: 'skip' }
  | { type: 'unknown' };

const isOptionArg = (arg: string): boolean => arg.startsWith('-');

const parseIgnoreValue = (value: string): ReadonlyArray<string> =>
  pipe(value, S.split(','), A.map(S.trim), A.filter<string>(Boolean));

const getNextArg = (args: ReadonlyArray<string>, index: number): O.Option<string> =>
  pipe(
    O.fromNullable(args[index + 1]),
    O.filter((arg) => !isOptionArg(arg)),
  );

const parseArg = (arg: string, nextArg: O.Option<string>) =>
  match(arg)
    .returnType<ParsedArg>()
    .with(P.union('-t', '--text'), F.always({ type: 'format', value: 'text' }))
    .with(P.union('-j', '--json'), F.always({ type: 'format', value: 'json' }))
    .with(P.union('-a', '--all'), F.always({ type: 'checkAll' }))
    .with(P.union('-h', '--help'), F.always({ type: 'help' }))
    .with(P.union('-i', '--ignore'), () =>
      pipe(
        nextArg,
        O.map(parseIgnoreValue),
        O.match<ReadonlyArray<string>, ParsedArg>(
          (packages) => ({ type: 'ignore', packages }) as const,
          F.always({ type: 'unknown' }),
        ),
      ),
    )
    .otherwise(F.always({ type: 'unknown' }));

const shouldSkipArg = (args: ReadonlyArray<string>, index: number): boolean => {
  const prevArg = args[index - 1];
  return (
    prevArg !== undefined &&
    (prevArg === '-i' || prevArg === '--ignore') &&
    !isOptionArg(args?.[index] ?? '')
  );
};

const buildParsedArgs = (args: ReadonlyArray<string>): ReadonlyArray<ParsedArg> =>
  pipe(
    args,
    A.mapWithIndex((index, arg) =>
      shouldSkipArg(args, index)
        ? ({ type: 'skip' } as const)
        : parseArg(arg, getNextArg(args, index)),
    ),
    A.filter((parsed) => parsed.type !== 'skip'),
  );

const applyParsedArg = (options: CliOptionsWithoutDefaults, parsed: ParsedArg) =>
  match(parsed)
    .returnType<R.Result<CliOptionsWithoutDefaults, 'help'>>()
    .with({ type: 'format' }, ({ value }) => R.Ok({ ...options, format: value }))
    .with({ type: 'checkAll' }, () => R.Ok({ ...options, checkAll: true }))
    .with({ type: 'ignore' }, ({ packages }) =>
      R.Ok({
        ...options,
        ignorePackages: [...options.ignorePackages, ...packages],
      }),
    )
    .with({ type: 'help' }, () => R.Error('help'))
    .with({ type: 'unknown' }, { type: 'skip' }, () => R.Ok(options))
    .exhaustive();

const reduceOptions = (
  parsedArgs: ReadonlyArray<ParsedArg>,
): R.Result<CliOptionsWithoutDefaults, 'help'> =>
  A.reduce(
    parsedArgs,
    R.makeOk<CliOptionsWithoutDefaults, 'help'>({
      format: 'text',
      checkAll: false,
      ignorePackages: [],
    }),
    (acc, parsed) => R.flatMap(acc, (options) => applyParsedArg(options, parsed)),
  );

export const parseArgs = (args: ReadonlyArray<string>): AppResult<CliOptions> =>
  pipe(
    args,
    buildParsedArgs,
    reduceOptions,
    R.map((options) => ({ ...DEFAULT_OPTIONS, ...options })),
  );

export const showHelp = (): string => `
deps-finder - Dependency analyzer for TypeScript projects

Usage:
  deps-finder [options]

Options:
  -t, --text              Output as text (default)
  -j, --json              Output as JSON
  -a, --all               Check all dependencies including devDependencies
  -i, --ignore <packages> Ignore specific packages (comma-separated)
  -h, --help              Show this help message

Examples:
  deps-finder
  deps-finder -j
  deps-finder --all
  deps-finder -j --all
  deps-finder --ignore storybook,@storybook/nextjs-vite
  deps-finder -i eslint,prettier --all
`;

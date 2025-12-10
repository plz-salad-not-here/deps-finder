import { AR, pipe, R } from '@mobily/ts-belt';
import { match } from 'ts-pattern';
import { analyzeDependencies } from './analyzers/dependency-analyzer.js';
import { parseArgs, showHelp } from './cli/options.js';
import { readPackageJson } from './parsers/package-parser.js';
import { hasIssues, report } from './reporters/console-reporter.js';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const optionsResult = parseArgs(args);

  if (R.isError(optionsResult)) {
    const errorMsg = optionsResult._0;
    const message = match(errorMsg)
      .with('help', () => showHelp())
      .otherwise((err) => `Error: ${err}`);

    console.log(message);
    process.exit(errorMsg === 'help' ? 0 : 1);
  }

  const options = R.getExn(optionsResult);

  const result = await pipe(
    readPackageJson(options.packageJsonPath),
    AR.flatMap((packageJson) =>
      pipe(
        analyzeDependencies(packageJson, options.rootDir, options.checkAll, options.ignorePackages),
        AR.make,
        AR.map((analysisResult) => ({ packageJson, analysisResult })),
      ),
    ),
  );

  if (R.isError(result)) {
    console.error(R.getExn(result));
    process.exit(1);
  }

  const data = R.getExn(result);
  const output = report(data.analysisResult, options.format);
  console.log(output);

  if (hasIssues(data.analysisResult)) {
    process.exit(1);
  }
}

// Run main if this is the entry point
await main();

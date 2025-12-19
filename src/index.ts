import { R } from '@mobily/ts-belt';
import { analyzeDependencies } from './analyzers/dependency-analyzer.js';
import { parseCliOptions, printHelp } from './cli/options.js';
import { findFiles } from './parsers/import-parser.js';
import { readPackageJson } from './parsers/package-parser.js';
import { hasIssues, report } from './reporters/console-reporter.js';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const options = parseCliOptions(args);

  if (options.showHelp) {
    printHelp();
    process.exit(0);
  }

  // 1. Read package.json (Async)
  const packageJsonResult = await readPackageJson(options.packageJsonPath);

  if (R.isError(packageJsonResult)) {
    console.error(`Error: ${R.getExn(packageJsonResult)}`);
    process.exit(1);
  }

  const packageJson = R.getExn(packageJsonResult);

  // 2. Find files (Sync)
  const files = findFiles(options.rootDir);

  // 3. Analyze dependencies (Sync)
  const analysisResult = analyzeDependencies(packageJson, files, {
    checkAll: options.checkAll,
    ignoredPackages: options.ignoredPackages,
  });

  // 4. Report
  const output = report(analysisResult, options.format, options.ignoredPackages);
  console.log(output);

  if (hasIssues(analysisResult)) {
    process.exit(1);
  }
}

await main();

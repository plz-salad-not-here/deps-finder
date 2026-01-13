import { R } from '@mobily/ts-belt';
import { analyzeDependencies } from './analyzers/dependency-analyzer.js';
import { parseCliOptions, printHelp } from './cli/options.js';
import { findFiles, parseMultipleFiles } from './parsers/import-parser.js';
import { readPackageJson } from './parsers/package-parser.js';
import { hasIssues, report } from './reporters/console-reporter.js';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const options = parseCliOptions(args);

  if (options.showHelp) {
    printHelp();
    process.exit(0);
  }

  // 1. Read package.json (Sync)
  const packageJson = R.match(
    readPackageJson(options.packageJsonPath),
    (data) => data,
    (error) => {
      console.error('Error reading package.json:', error);
      process.exit(1);
    },
  );

  // 2. Find files (Sync)
  const files = findFiles(options.rootDir, {
    excludePatterns: options.excludePatterns,
    noAutoDetect: options.noAutoDetect,
  });

  // 3. Parse imports (Sync)
  const allImports = parseMultipleFiles(files);

  // 4. Analyze dependencies (Sync)
  const analysisResult = analyzeDependencies(packageJson, allImports, {
    checkAll: options.checkAll,
    ignoredPackages: options.ignoredPackages,
  });

  // 5. Report
  const output = report(analysisResult, options.format, options.ignoredPackages);
  console.log(output);

  if (hasIssues(analysisResult)) {
    process.exit(1);
  }
}

await main();

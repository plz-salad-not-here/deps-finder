export const MESSAGES = {
  REPORT_TITLE: 'Dependency Analysis Report',
  UNUSED_TITLE: 'Unused Dependencies:',
  UNUSED_SUBTITLE: '(declared but not imported in source code)',
  MISPLACED_TITLE: 'Misplaced Dependencies:',
  MISPLACED_SUBTITLE: '(in devDependencies but used in source code)',
  TYPE_ONLY_TITLE: 'Type-Only Imports:', // New
  TYPE_ONLY_SUBTITLE: '(used only for type definitions)', // New
  TOTAL_ISSUES: 'Total Issues:',
  NO_ISSUES: '✓ No issues found! All dependencies are properly used.',
  IGNORED_PACKAGES: 'Ignored packages:',
  SEPARATOR: '━'.repeat(60),
} as const;

export const HELP_TEXT = `
Usage: deps-finder [options]

Options:
  -t, --text          Output as text (default)
  -j, --json          Output as JSON
  -a, --all           Check all dependencies including devDependencies
  -i, --ignore <pkg>  Ignore specific packages (comma-separated)
  -h, --help          Show this help message

Examples:
  deps-finder
  deps-finder --json
  deps-finder --all
  deps-finder --ignore eslint,prettier
  deps-finder -j --all
` as const;

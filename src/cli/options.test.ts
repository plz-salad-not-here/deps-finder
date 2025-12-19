import { describe, expect, test } from 'bun:test';
import { parseCliOptions } from '@/cli/options';
import { HELP_TEXT } from '@/constants/messages';

describe('parseCliOptions', () => {
  test('should parse text format option', () => {
    const options = parseCliOptions(['-t']);
    expect(options.format).toBe('text');
    expect(options.checkAll).toBe(false);
    expect(options.rootDir).toBe('.');
    expect(options.packageJsonPath).toBe('./package.json');
  });

  test('should parse json format option', () => {
    const options = parseCliOptions(['-j']);
    expect(options.format).toBe('json');
    expect(options.checkAll).toBe(false);
  });

  test('should parse long format options', () => {
    const textOptions = parseCliOptions(['--text']);
    expect(textOptions.format).toBe('text');

    const jsonOptions = parseCliOptions(['--json']);
    expect(jsonOptions.format).toBe('json');
  });

  test('should parse checkAll option', () => {
    const options = parseCliOptions(['-a']);
    expect(options.checkAll).toBe(true);

    const longOptions = parseCliOptions(['--all']);
    expect(longOptions.checkAll).toBe(true);
  });

  test('should parse help option', () => {
    const options = parseCliOptions(['-h']);
    expect(options.showHelp).toBe(true);
  });

  test('should use default options when no args provided', () => {
    const options = parseCliOptions([]);
    expect(options.format).toBe('text');
    expect(options.rootDir).toBe('.');
    expect(options.packageJsonPath).toBe('./package.json');
    expect(options.checkAll).toBe(false);
    expect(options.showHelp).toBe(false);
  });

  test('should parse multiple options together', () => {
    const options = parseCliOptions(['-j', '-a']);
    expect(options.format).toBe('json');
    expect(options.checkAll).toBe(true);
  });

  test('should handle long help option', () => {
    const options = parseCliOptions(['--help']);
    expect(options.showHelp).toBe(true);
  });

  test('should handle invalid options', () => {
    const options = parseCliOptions(['--invalid']);
    expect(options.format).toBe('text');
  });

  test('should parse mixed short and long options', () => {
    const options = parseCliOptions(['-t', '--all']);
    expect(options.format).toBe('text');
    expect(options.checkAll).toBe(true);
  });

  test('should prioritize last format option', () => {
    const options = parseCliOptions(['-t', '-j']);
    expect(options.format).toBe('json');
  });

  test('should have correct default values', () => {
    const options = parseCliOptions([]);
    expect(typeof options.format).toBe('string');
    expect(typeof options.rootDir).toBe('string');
    expect(typeof options.packageJsonPath).toBe('string');
    expect(typeof options.checkAll).toBe('boolean');
  });

  test('should handle multiple checkAll flags', () => {
    const options = parseCliOptions(['-a', '--all']);
    expect(options.checkAll).toBe(true);
  });
});

describe('parseCliOptions with ignore option', () => {
  test('should parse ignore option with single package', () => {
    const options = parseCliOptions(['--ignore', 'storybook']);
    expect(options.ignoredPackages).toEqual(['storybook']);
  });

  test('should parse ignore option with comma-separated packages', () => {
    const options = parseCliOptions(['--ignore', 'storybook,eslint,prettier']);
    expect(options.ignoredPackages).toEqual(['storybook', 'eslint', 'prettier']);
  });

  test('should parse short ignore option', () => {
    const options = parseCliOptions(['-i', '@storybook/nextjs-vite']);
    expect(options.ignoredPackages).toEqual(['@storybook/nextjs-vite']);
  });

  test('should parse multiple ignore options', () => {
    const options = parseCliOptions(['--ignore', 'storybook', '-i', 'eslint']);
    expect(options.ignoredPackages).toContain('storybook');
    expect(options.ignoredPackages).toContain('eslint');
  });

  test('should have empty ignorePackages by default', () => {
    const options = parseCliOptions([]);
    expect(options.ignoredPackages).toEqual([]);
  });

  test('should ignore --ignore without value', () => {
    const options = parseCliOptions(['--ignore', '-j']);
    expect(options.ignoredPackages).toEqual([]);
    expect(options.format).toBe('json');
  });

  test('should combine ignore with other options', () => {
    const options = parseCliOptions(['-j', '--all', '--ignore', 'storybook,eslint']);
    expect(options.format).toBe('json');
    expect(options.checkAll).toBe(true);
    expect(options.ignoredPackages).toEqual(['storybook', 'eslint']);
  });
});

describe('HELP_TEXT', () => {
  test('should contain usage info', () => {
    expect(HELP_TEXT).toContain('deps-finder');
    expect(HELP_TEXT).toContain('Usage:');
    expect(HELP_TEXT).toContain('-t, --text');
  });
});

import { describe, expect, test } from 'bun:test';
import type { AnalysisResult } from '@/domain/types';
import { hasIssues, report } from '@/reporters/console-reporter';

describe('console-reporter', () => {
  describe('hasIssues', () => {
    test('should return true when there are unused dependencies', () => {
      const result: AnalysisResult = {
        unused: ['react'],
        misplaced: [],
        typeOnly: [],
        totalIssues: 1,
      };
      expect(hasIssues(result)).toBe(true);
    });

    test('should return true when there are misplaced dependencies', () => {
      const result: AnalysisResult = {
        unused: [],
        misplaced: [{ packageName: 'lodash', locations: [] }],
        typeOnly: [],
        totalIssues: 1,
      };
      expect(hasIssues(result)).toBe(true);
    });

    test('should return true when there are both unused and misplaced', () => {
      const result: AnalysisResult = {
        unused: ['react'],
        misplaced: [{ packageName: 'lodash', locations: [] }],
        typeOnly: [],
        totalIssues: 2,
      };
      expect(hasIssues(result)).toBe(true);
    });

    test('should return false when there are no issues', () => {
      const result: AnalysisResult = {
        unused: [],
        misplaced: [],
        typeOnly: [],
        totalIssues: 0,
      };
      expect(hasIssues(result)).toBe(false);
    });
  });

  describe('report', () => {
    test('should generate text report with no issues', () => {
      const result: AnalysisResult = {
        unused: [],
        misplaced: [],
        typeOnly: [],
        totalIssues: 0,
      };
      const output = report(result, 'text');
      expect(output).toContain('No issues found');
    });

    test('should generate text report with unused dependencies', () => {
      const result: AnalysisResult = {
        unused: ['react', 'lodash'],
        misplaced: [],
        typeOnly: [],
        totalIssues: 2,
      };
      const output = report(result, 'text');
      expect(output).toContain('Unused Dependencies');
      expect(output).toContain('react');
      expect(output).toContain('lodash');
    });

    test('should generate text report with misplaced dependencies', () => {
      const result: AnalysisResult = {
        unused: [],
        misplaced: [
          { packageName: 'express', locations: [{ file: 'src/index.ts', line: 1, importStatement: "import express from 'express'" }] },
          { packageName: 'axios', locations: [{ file: 'src/api.ts', line: 5, importStatement: "import axios from 'axios'" }] },
        ],
        typeOnly: [],
        totalIssues: 2,
      };
      const output = report(result, 'text');
      expect(output).toContain('Misplaced Dependencies');
      expect(output).toContain('express');
      expect(output).toContain('axios');
      expect(output).toContain('src/index.ts:1');
      expect(output).toContain('src/api.ts:5');
    });

    test('should generate JSON report', () => {
      const result: AnalysisResult = {
        unused: ['react'],
        misplaced: [{ packageName: 'express', locations: [] }],
        typeOnly: [],
        totalIssues: 2,
      };
      const output = report(result, 'json');
      const parsed = JSON.parse(output);

      expect(parsed.unused).toEqual(['react']);
      expect(parsed.misplaced[0].packageName).toBe('express');
      expect(parsed.totalIssues).toBe(2);
      expect(parsed.typeOnly).toEqual([]);
    });

    test('should display ignored dependencies in text report', () => {
      const result: AnalysisResult = {
        unused: [],
        misplaced: [],
        typeOnly: [],
        totalIssues: 0,
      };
      const output = report(result, 'text', ['eslint']);
      expect(output).toContain('Ignored packages');
      expect(output).toContain('eslint');
    });

    test('should include ignored dependencies in JSON report', () => {
      const result: AnalysisResult = {
        unused: [],
        misplaced: [],
        typeOnly: [],
        totalIssues: 0,
      };
      const output = report(result, 'json', ['eslint']);
      const parsed = JSON.parse(output);

      expect(parsed.ignored).toEqual(['eslint']);
    });

    test('should display type-only imports in text report', () => {
      const result: AnalysisResult = {
        unused: [],
        misplaced: [],
        typeOnly: ['hotscript', 'type-fest'],
        totalIssues: 0,
      };
      const output = report(result, 'text');
      expect(output).toContain('Type-Only Imports:');
      expect(output).toContain('hotscript');
      expect(output).toContain('type-fest');
    });

    test('should include type-only imports in JSON report', () => {
      const result: AnalysisResult = {
        unused: [],
        misplaced: [],
        typeOnly: ['hotscript', 'type-fest'],
        totalIssues: 0,
      };
      const output = report(result, 'json');
      const parsed = JSON.parse(output);
      expect(parsed.typeOnly).toEqual(['hotscript', 'type-fest']);
    });
  });
});

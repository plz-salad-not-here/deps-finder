/**
 * 타입 가드 유틸리티
 */

export const isString = (value: unknown): value is string => typeof value === 'string';

export const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && !Number.isNaN(value);

export const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';

export const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const isArray = <T = unknown>(value: unknown): value is T[] => Array.isArray(value);

export const isNotNullable = <T>(value: T | null | undefined): value is T =>
  value !== null && value !== undefined;

export const isNonEmptyString = (value: unknown): value is string =>
  isString(value) && value.length > 0;

export const isRecord = <K extends string | number | symbol, V>(
  value: unknown,
): value is Record<K, V> => isObject(value);

export const hasProperty = <K extends string>(obj: unknown, key: K): obj is Record<K, unknown> =>
  isObject(obj) && key in obj;

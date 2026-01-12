import { A } from '@mobily/ts-belt';
import type { ImportLocation } from '../domain/types.js';

/**
 * 같은 파일의 같은 라인에서 발생한 중복 import를 제거
 */
export const deduplicateLocations = (
  locations: ReadonlyArray<ImportLocation>,
): ReadonlyArray<ImportLocation> => {
  const seen = new Set<string>();

  return A.filter(locations, (loc) => {
    const key = `${loc.file}:${loc.line}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

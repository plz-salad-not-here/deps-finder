export type FileError =
  | { type: 'FILE_NOT_FOUND'; path: string }
  | { type: 'READ_ERROR'; path: string; error: Error }
  | { type: 'PARSE_ERROR'; path: string; error: Error };

export type AnalysisError =
  | { type: 'PACKAGE_JSON_NOT_FOUND'; error: FileError }
  | { type: 'SOURCE_FILES_NOT_FOUND' }
  | { type: 'ANALYSIS_FAILED'; error: unknown };

export type AppError = FileError | AnalysisError | { type: 'UNKNOWN_ERROR'; error: unknown };

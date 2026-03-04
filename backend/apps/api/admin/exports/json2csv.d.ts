// Minimal type declarations for json2csv (v6 alpha does not ship .d.ts files)
declare module 'json2csv' {
  /**
   * Converts an array of objects to a CSV string.
   * @param data   Array of records to convert
   * @param opts   Optional configuration (fields, delimiter, etc.)
   * @returns CSV string
   */
  export function parse<T = Record<string, unknown>>(
    data: T[],
    opts?: {
      fields?: string[]
      delimiter?: string
      header?: boolean
      [key: string]: unknown
    },
  ): string
}

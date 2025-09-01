/**
 * Array utility functions
 */

/**
 * Converts various input types to a string array.
 * - Returns empty array if value is null/undefined/"".
 * - Converts single string to [string].
 * - Filters empty/spaces, applies trim().
 * - If stripPrefix is provided, removes that prefix if it exists.
 *
 * @param value The value to convert to string array
 * @param options Optional configuration
 * @param options.stripPrefix String or array of string prefixes to remove (e.g. "#" or "@")
 * @returns Array of strings
 */
export function toStringArray(
  value: unknown,
  options?: { stripPrefix?: string | string[] },
): string[] {
  // Return empty array if value is null/undefined/"" or an empty array
  if (value === null || value === undefined || value === "") {
    return [];
  }

  if (Array.isArray(value) && value.length === 0) {
    return [];
  }

  // Convert to array if it's a string
  const array = Array.isArray(value) ? value : [value];

  // Filter out empty/null/undefined values, convert to strings, and trim
  const strArray = array
    .filter(
      (item) =>
        item !== null && item !== undefined && String(item).trim() !== "",
    )
    .map((item) => String(item).trim());

  // If stripPrefix is specified, remove the prefix from each string
  if (options?.stripPrefix) {
    const prefixes = Array.isArray(options.stripPrefix)
      ? options.stripPrefix
      : [options.stripPrefix];

    return strArray.map((str) => {
      let result = str;
      for (const prefix of prefixes) {
        if (str.startsWith(prefix)) {
          result = str.substring(prefix.length);
          break;
        }
      }
      return result;
    });
  }

  return strArray;
}

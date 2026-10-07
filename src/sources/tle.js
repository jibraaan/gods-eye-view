const isLine1 = (line) => line.startsWith('1 ');
const isLine2 = (line) => line.startsWith('2 ');

/**
 * Parse three-line TLE catalog text into `{ name, line1, line2 }` entries.
 * Each set is read from a line 1 directly followed by a line 2 for the same
 * catalog number, so a set missing a line costs only itself, not every set
 * after it. The name is the line before line 1; a set without one is named
 * by its catalog number.
 */
export function parseTleText(text) {
  const lines = String(text)
    .trim()
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const result = [];
  for (let i = 0; i < lines.length - 1; i += 1) {
    const line1 = lines[i];
    const line2 = lines[i + 1];
    if (!isLine1(line1) || !isLine2(line2)) continue;
    const number = tleCatalogNumber(line1);
    if (number === null || number !== tleCatalogNumber(line2)) continue;
    const previous = i > 0 ? lines[i - 1] : '';
    const name =
      previous && !isLine1(previous) && !isLine2(previous)
        ? previous
        : String(number);
    result.push({ name, line1, line2 });
    i += 1;
  }
  return result;
}

/** The NORAD catalog number from TLE line 1, or null. */
export function tleCatalogNumber(line1) {
  const number = Number.parseInt(String(line1).slice(2, 7), 10);
  return Number.isInteger(number) ? number : null;
}

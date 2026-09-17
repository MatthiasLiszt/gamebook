/**
 * Transforms text based on a script mapping dictionary.
 * @param {string} text - The input string (e.g. Lasina text)
 * @param {Record<string, string>} scriptMap - Mapping dictionary (e.g. ucsur.json)
 * @returns {string} Transformed text
 */
export function convertScript(text, scriptMap) {
  if(!scriptMap) {console.log("no script map")}
  if (!text || !scriptMap) return text;

  // Matches words (alphabetical) while preserving punctuation, spacing, and symbols
  return text.replace(/[a-z]+/g, (word) => {
    const lower = word.toLowerCase();
    return scriptMap[lower] ?? word;
  });
}
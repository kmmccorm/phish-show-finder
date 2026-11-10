/**
 * Repair of mis-encoded text (mojibake) coming from the API
 */

// Characters that Windows-1252 maps to bytes 0x80-0x9F. Everything else in
// that encoding has the same code point as its byte value.
const CP1252_BYTES: Record<number, number> = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85,
  0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a,
  0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92,
  0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c,
  0x017e: 0x9e, 0x0178: 0x9f,
};

/** The byte a character would have been before being mis-decoded, or -1. */
function originalByte(char: string): number {
  const code = char.charCodeAt(0);
  if (code <= 0xff) return code;
  return CP1252_BYTES[code] ?? -1;
}

/**
 * Reverse mojibake exactly: wherever a run of characters is what a valid
 * multi-byte UTF-8 sequence looks like when read as Windows-1252/Latin-1,
 * decode it back to the character it was meant to be ("â€™" -> "’",
 * "Ã©" -> "é"). Text that isn't such a sequence is left untouched.
 */
function decodeMojibake(text: string): string {
  // Fast path: every UTF-8 lead byte shows up as a character in U+00C2-U+00F4.
  if (!/[\u00c2-\u00f4]/.test(text)) return text;

  const decoder = new TextDecoder("utf-8", { fatal: true });
  let result = "";

  for (let i = 0; i < text.length; i++) {
    const lead = originalByte(text[i]);
    const continuationCount = lead >= 0xf0 && lead <= 0xf4 ? 3 : lead >= 0xe0 ? 2 : lead >= 0xc2 ? 1 : 0;

    if (continuationCount > 0 && lead <= 0xf4 && i + continuationCount < text.length) {
      const bytes = [lead];
      for (let j = 1; j <= continuationCount; j++) {
        const byte = originalByte(text[i + j]);
        if (byte < 0x80 || byte > 0xbf) break;
        bytes.push(byte);
      }

      if (bytes.length === continuationCount + 1) {
        try {
          result += decoder.decode(new Uint8Array(bytes));
          i += continuationCount;
          continue;
        } catch {
          // Not valid UTF-8 after all; keep the original characters.
        }
      }
    }

    result += text[i];
  }

  return result;
}

/**
 * Fix encoding issues (mojibake) in text. These occur when UTF-8 text is
 * incorrectly decoded as Windows-1252/ISO-8859-1 somewhere upstream.
 *
 * Intact sequences are decoded exactly. Sequences that lost their trailing
 * bytes along the way can't be recovered, so the unambiguous cases fall
 * back to a best guess and anything else is left as it is.
 *
 * @param text Text with potential encoding issues
 * @returns Cleaned text with proper characters
 */
export function fixEncodingIssues(text: string): string {
  if (!text) return '';

  let result = decodeMojibake(text);

  // Best-effort cleanup for damaged sequences. Order matters: the longer
  // patterns must run before the lone-character ones.
  const replacements: [RegExp, string][] = [
    // Right double quote whose last byte (0x9D, unmapped in Windows-1252) was dropped
    [/â€/g, '"'],

    // "Ã " is "à" whose second byte (a non-breaking space) became a plain space
    [/Ã (?=\w)/g, 'à '],

    // Lone â in an English contraction or possessive ("didnât", "clockâs").
    // Any other â is left alone: it may be a real one ("Théâtre").
    [/(\p{L})â(s|t|d|ll|re|ve|m)(?!\p{L})/gu, "$1'$2"],

    // Lone Â is the remains of a non-breaking space
    [/Â/g, ' '],

    // C1 control characters left over from partially decoded sequences
    [/[\u0080-\u009f]/g, ''],
  ];

  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, replacement);
  }

  // Normalise non-breaking and repeated spaces
  return result.replace(/[ \u00a0]{2,}/g, ' ').trim();
}

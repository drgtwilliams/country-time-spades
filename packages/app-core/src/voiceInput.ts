/**
 * Voice input utilities — parse spoken bid text into numeric bids.
 *
 * Maps common English number words to their numeric equivalents
 * for STT recognition results. Handles "zero", "oh", "oh oh", "zero zero", etc.
 */

/** Map of number words → digits. */
const WORD_TO_DIGIT: Record<string, string> = {
  zero: '0', one: '1', two: '2', three: '3', four: '4',
  five: '5', six: '6', seven: '7', eight: '8', nine: '9',
};

/** Words that signal a nil bid. */
const NIL_WORDS = ['nil', 'blind', 'blind nil'];

/**
 * Try to parse a spoken phrase into a bid.
 * Returns the bid number, 'nil', or null if unparseable.
 */
export function parseVoiceBid(text: string): number | 'nil' | null {
  const clean = text.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '');
  const words = clean.split(/\s+/);
  const joined = words.join('');

  // Check for nil
  if (NIL_WORDS.some((n) => clean.includes(n))) {
    return 'nil';
  }

  // Try to extract digits from words
  let digits = '';
  for (const word of words) {
    if (WORD_TO_DIGIT[word]) {
      digits += WORD_TO_DIGIT[word];
    } else if (/^\d+$/.test(word)) {
      digits += word;
    }
  }

  if (!digits) return null;

  // Handle "0" and "00"
  if (digits === '0') return 0;
  if (digits === '00' || digits === '000') return 10;

  const num = parseInt(digits, 10);
  if (num >= 1 && num <= 9) return num;
  return null;
}

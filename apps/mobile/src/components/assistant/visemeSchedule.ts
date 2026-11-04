export type Viseme = "closed" | "wide" | "narrow" | "open";

export type VisemeFrame = {
  viseme: Viseme;
  durationMs: number;
};

const DEFAULT_SLOT_MS = 100;

const VOWEL_WIDE = /[eiEIyY]/;
const VOWEL_NARROW = /[ouOUwW]/;
const VOWEL_OPEN = /[aA]/;
const CLOSED_CONSONANT = /[bmpBMP]/;

export function vowelToViseme(vowel: string): Viseme {
  if (VOWEL_WIDE.test(vowel)) {
    return "wide";
  }
  if (VOWEL_NARROW.test(vowel)) {
    return "narrow";
  }
  if (VOWEL_OPEN.test(vowel)) {
    return "open";
  }
  return "open";
}

export function charToViseme(char: string): Viseme {
  if (!/[a-zA-Z]/.test(char)) {
    return "closed";
  }
  if (CLOSED_CONSONANT.test(char)) {
    return "closed";
  }
  if (VOWEL_WIDE.test(char)) {
    return "wide";
  }
  if (VOWEL_NARROW.test(char)) {
    return "narrow";
  }
  if (VOWEL_OPEN.test(char)) {
    return "open";
  }
  return "narrow";
}

/** Split a word into rough syllable chunks (consonants + vowel run). */
function syllableChunks(word: string): string[] {
  const chunks = word.match(/[bcdfghjklmnpqrstvwxyz]*[aeiouy]+[bcdfghjklmnpqrstvwxyz]*/gi);
  if (!chunks || chunks.length === 0) {
    return word.split("");
  }
  return chunks;
}

function dominantVisemeForChunk(chunk: string): Viseme {
  const vowelMatch = chunk.match(/[aeiouy]+/i);
  if (vowelMatch) {
    return vowelToViseme(vowelMatch[0][0] ?? "a");
  }
  return charToViseme(chunk[0] ?? " ");
}

/**
 * Heuristic timeline: one mouth frame per syllable chunk or punctuation pause (~100ms).
 * Not phoneme-accurate; tuned for expo-speech without audio analysis.
 */
export function buildVisemeTimeline(
  text: string,
  slotMs: number = DEFAULT_SLOT_MS,
): VisemeFrame[] {
  const frames: VisemeFrame[] = [];
  const tokens = text.match(/[\p{L}\p{N}']+|[^\p{L}\p{N}\s]+|\s+/gu) ?? [text];

  for (const token of tokens) {
    if (/^\s+$/.test(token)) {
      frames.push({ viseme: "closed", durationMs: slotMs });
      continue;
    }
    if (/^[^\p{L}\p{N}']+$/u.test(token)) {
      frames.push({ viseme: "closed", durationMs: slotMs * 2 });
      continue;
    }

    const syllables = syllableChunks(token);
    for (const chunk of syllables) {
      frames.push({
        viseme: dominantVisemeForChunk(chunk),
        durationMs: slotMs + Math.min(chunk.length * 8, 40),
      });
    }
    frames.push({ viseme: "closed", durationMs: Math.round(slotMs * 0.6) });
  }

  if (frames.length === 0) {
    frames.push({ viseme: "closed", durationMs: slotMs });
  }

  return frames;
}

export function visemeAtCharIndex(text: string, charIndex: number): Viseme {
  const safeIndex = Math.max(0, Math.min(charIndex, text.length - 1));
  let i = safeIndex;
  while (i >= 0 && !/[a-zA-Z]/.test(text[i] ?? "")) {
    i -= 1;
  }
  if (i < 0) {
    return "closed";
  }
  return charToViseme(text[i] ?? " ");
}

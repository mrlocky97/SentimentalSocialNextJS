/**
 * Modern Slang and Internet Vocabulary for Sentiment Analysis
 * Mapea expresiones modernas a sentimientos estándar
 */

export interface SlangMapping {
  term: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  weight: number; // 1.0 = normal, 1.5 = strong sentiment
  contexts?: string[]; // contextos donde aplica
}

export const modernSlangVocabulary: SlangMapping[] = [
  // Expresiones positivas modernas
  { term: "fire", sentiment: "positive", weight: 1.5, contexts: ["product", "experience"] },
  { term: "slaps", sentiment: "positive", weight: 1.5 },
  { term: "no cap", sentiment: "positive", weight: 1.2 }, // "no lie" = verdad/honesto
  { term: "cap", sentiment: "negative", weight: 1.2 }, // "lie"
  { term: "bussin", sentiment: "positive", weight: 1.5 },
  { term: "hits different", sentiment: "positive", weight: 1.3 },
  { term: "vibes", sentiment: "positive", weight: 1.0 },
  { term: "chef's kiss", sentiment: "positive", weight: 1.5 },
  { term: "living for", sentiment: "positive", weight: 1.3 },
  { term: "main character energy", sentiment: "positive", weight: 1.2 },
  { term: "understood the assignment", sentiment: "positive", weight: 1.4 },
  { term: "periodt", sentiment: "positive", weight: 1.1 },
  { term: "facts", sentiment: "positive", weight: 1.1 },
  { term: "bet", sentiment: "positive", weight: 1.0 },
  { term: "say less", sentiment: "positive", weight: 1.1 },
  { term: "valid", sentiment: "positive", weight: 1.2 },
  { term: "based", sentiment: "positive", weight: 1.3 },
  { term: "goated", sentiment: "positive", weight: 1.5 }, // GOAT (Greatest Of All Time)
  { term: "lowkey goated", sentiment: "positive", weight: 1.4 },
  { term: "highkey goated", sentiment: "positive", weight: 1.5 },
  { term: "sick", sentiment: "positive", weight: 1.4 }, // cool/awesome context
  { term: "lit", sentiment: "positive", weight: 1.4 },
  { term: "dope", sentiment: "positive", weight: 1.3 },
  { term: "W", sentiment: "positive", weight: 1.3 }, // Win
  { term: "massive W", sentiment: "positive", weight: 1.5 },
  { term: "big W", sentiment: "positive", weight: 1.4 },
  { term: "absolute W", sentiment: "positive", weight: 1.5 },
  { term: "clean", sentiment: "positive", weight: 1.2 },
  { term: "crisp", sentiment: "positive", weight: 1.2 },
  { term: "smooth", sentiment: "positive", weight: 1.2 },
  { term: "immaculate", sentiment: "positive", weight: 1.5 },
  { term: "fr fr", sentiment: "positive", weight: 1.1 }, // for real for real (emphasis)
  
  // Expresiones negativas modernas
  { term: "mid", sentiment: "negative", weight: 1.3 }, // mediocre
  { term: "ain't it", sentiment: "negative", weight: 1.2 }, // "this ain't it"
  { term: "not it", sentiment: "negative", weight: 1.4 },
  { term: "ick", sentiment: "negative", weight: 1.5 },
  { term: "cringe", sentiment: "negative", weight: 1.4 },
  { term: "toxic", sentiment: "negative", weight: 1.5 },
  { term: "sus", sentiment: "negative", weight: 1.2 }, // suspicious
  { term: "pressed", sentiment: "negative", weight: 1.3 }, // angry/bothered
  { term: "salty", sentiment: "negative", weight: 1.2 },
  { term: "ratio", sentiment: "negative", weight: 1.3 },
  { term: "cope", sentiment: "negative", weight: 1.2 },
  { term: "L take", sentiment: "negative", weight: 1.4 },
  { term: "took an L", sentiment: "negative", weight: 1.3 },
  { term: "massive L", sentiment: "negative", weight: 1.5 },
  { term: "down bad", sentiment: "negative", weight: 1.4 },
  { term: "fell off", sentiment: "negative", weight: 1.3 },
  { term: "trash", sentiment: "negative", weight: 1.4 },
  { term: "garbage", sentiment: "negative", weight: 1.4 },
  { term: "wack", sentiment: "negative", weight: 1.3 },
  { term: "whack", sentiment: "negative", weight: 1.3 },
  { term: "fumbled the bag", sentiment: "negative", weight: 1.4 },
  { term: "fumbled", sentiment: "negative", weight: 1.2 },
  { term: "straight up broken", sentiment: "negative", weight: 1.5 },
  { term: "L", sentiment: "negative", weight: 1.2 }, // Loss
  { term: "big L", sentiment: "negative", weight: 1.4 },
  { term: "yikes", sentiment: "negative", weight: 1.3 },
  { term: "oof", sentiment: "negative", weight: 1.2 },
  { term: "rip", sentiment: "negative", weight: 1.2 }, // Rest In Peace (context dependent)
  { term: "rekt", sentiment: "negative", weight: 1.3 },
  { term: "broken", sentiment: "negative", weight: 1.3 },
  
  // Expresiones neutrales modernas
  { term: "periodt", sentiment: "neutral", weight: 1.0, contexts: ["statement"] },
  { term: "lowkey", sentiment: "neutral", weight: 0.8 },
  { term: "highkey", sentiment: "neutral", weight: 1.1 },
  { term: "ngl", sentiment: "neutral", weight: 1.0 }, // not gonna lie
  { term: "tbh", sentiment: "neutral", weight: 1.0 }, // to be honest
  { term: "fr", sentiment: "neutral", weight: 1.0 }, // for real
  { term: "deadass", sentiment: "neutral", weight: 1.0 },
  { term: "on god", sentiment: "neutral", weight: 1.0 },
  { term: "respectfully", sentiment: "neutral", weight: 1.0 },
];

// Patrones de frases complejas
export const phrasePatterns: { pattern: RegExp; sentiment: 'positive' | 'negative' | 'neutral'; weight: number }[] = [
  { pattern: /this\s+ain't\s+it/i, sentiment: "negative", weight: 1.4 },
  { pattern: /not\s+it\s+chief/i, sentiment: "negative", weight: 1.3 },
  { pattern: /major\s+disappointment/i, sentiment: "negative", weight: 1.5 },
  { pattern: /straight\s+up\s+trash/i, sentiment: "negative", weight: 1.5 },
  { pattern: /straight\s+up\s+fire/i, sentiment: "positive", weight: 1.5 },
  { pattern: /straight\s+up\s+broken/i, sentiment: "negative", weight: 1.5 },
  { pattern: /no\s+cap/i, sentiment: "positive", weight: 1.2 },
  { pattern: /hits\s+different/i, sentiment: "positive", weight: 1.3 },
  { pattern: /chef's\s+kiss/i, sentiment: "positive", weight: 1.5 },
  { pattern: /lowkey\s+goated/i, sentiment: "positive", weight: 1.4 },
  { pattern: /highkey\s+goated/i, sentiment: "positive", weight: 1.5 },
  { pattern: /not\s+gonna\s+lie/i, sentiment: "positive", weight: 1.1 },
  { pattern: /fr\s+fr/i, sentiment: "positive", weight: 1.1 },
  { pattern: /fumbled\s+the\s+bag/i, sentiment: "negative", weight: 1.4 },
  { pattern: /absolutely\s+fire/i, sentiment: "positive", weight: 1.5 },
  { pattern: /it's\s+bussin/i, sentiment: "positive", weight: 1.4 },
  { pattern: /that's\s+cap/i, sentiment: "negative", weight: 1.3 },
  { pattern: /lowkey\s+(fire|sick|good|amazing)/i, sentiment: "positive", weight: 1.3 },
  { pattern: /highkey\s+(fire|sick|good|amazing)/i, sentiment: "positive", weight: 1.4 },
];

// Emojis y su peso sentimental
export const emojiSentiment: { emoji: string; sentiment: 'positive' | 'negative' | 'neutral'; weight: number }[] = [
  { emoji: "🔥", sentiment: "positive", weight: 1.3 },
  { emoji: "💯", sentiment: "positive", weight: 1.4 },
  { emoji: "✨", sentiment: "positive", weight: 1.2 },
  { emoji: "🙌", sentiment: "positive", weight: 1.3 },
  { emoji: "👏", sentiment: "positive", weight: 1.2 },
  { emoji: "😍", sentiment: "positive", weight: 1.4 },
  { emoji: "🥳", sentiment: "positive", weight: 1.5 },
  { emoji: "💀", sentiment: "negative", weight: 1.3 }, // usado irónicamente
  { emoji: "😤", sentiment: "negative", weight: 1.4 },
  { emoji: "🤬", sentiment: "negative", weight: 1.5 },
  { emoji: "😠", sentiment: "negative", weight: 1.4 },
  { emoji: "🤦‍♀️", sentiment: "negative", weight: 1.3 },
  { emoji: "🤦‍♂️", sentiment: "negative", weight: 1.3 },
  { emoji: "🙄", sentiment: "negative", weight: 1.2 },
];
/**
 * Basic English Sentiment Vocabulary Dataset
 * Complement to enhance the multilingual dataset with essential English words
 */

export interface BasicEnglishSentimentItem {
  text: string;
  label: 'positive' | 'negative' | 'neutral';
}

// Essential English vocabulary for sentiment analysis
export const basicEnglishSentimentDataset: BasicEnglishSentimentItem[] = [
  // === POSITIVE VOCABULARY ===
  { text: "I love this product", label: "positive" },
  { text: "This is amazing", label: "positive" },
  { text: "Absolutely wonderful experience", label: "positive" },
  { text: "Fantastic quality", label: "positive" },
  { text: "Excellent service", label: "positive" },
  { text: "Perfect solution", label: "positive" },
  { text: "Outstanding performance", label: "positive" },
  { text: "Brilliant design", label: "positive" },
  { text: "Superb functionality", label: "positive" },
  { text: "Incredible value", label: "positive" },
  { text: "Awesome features", label: "positive" },
  { text: "Beautiful interface", label: "positive" },
  { text: "Impressive results", label: "positive" },
  { text: "Delightful experience", label: "positive" },
  { text: "Remarkable improvement", label: "positive" },
  { text: "Gorgeous aesthetics", label: "positive" },
  { text: "Spectacular outcome", label: "positive" },
  { text: "Magnificent quality", label: "positive" },
  { text: "Marvelous creation", label: "positive" },
  { text: "Phenomenal service", label: "positive" },
  
  // === NEGATIVE VOCABULARY ===
  { text: "I hate this app", label: "negative" },
  { text: "This is terrible", label: "negative" },
  { text: "Absolutely awful experience", label: "negative" },
  { text: "Horrible quality", label: "negative" },
  { text: "Disgusting service", label: "negative" },
  { text: "Worst purchase ever", label: "negative" },
  { text: "Dreadful performance", label: "negative" },
  { text: "Pathetic design", label: "negative" },
  { text: "Useless functionality", label: "negative" },
  { text: "Disappointing value", label: "negative" },
  { text: "Annoying bugs", label: "negative" },
  { text: "Ugly interface", label: "negative" },
  { text: "Failed expectations", label: "negative" },
  { text: "Frustrating experience", label: "negative" },
  { text: "Broken features", label: "negative" },
  { text: "Garbage product", label: "negative" },
  { text: "Nightmare to use", label: "negative" },
  { text: "Ridiculous pricing", label: "negative" },
  { text: "Appalling customer service", label: "negative" },
  { text: "Catastrophic failure", label: "negative" },
  
  // === NEUTRAL VOCABULARY ===
  { text: "This is okay", label: "neutral" },
  { text: "It works fine", label: "neutral" },
  { text: "Average quality", label: "neutral" },
  { text: "Standard service", label: "neutral" },
  { text: "Nothing special", label: "neutral" },
  { text: "Acceptable performance", label: "neutral" },
  { text: "Basic functionality", label: "neutral" },
  { text: "Regular features", label: "neutral" },
  { text: "Typical interface", label: "neutral" },
  { text: "Normal experience", label: "neutral" },
  { text: "Ordinary design", label: "neutral" },
  { text: "Common issues", label: "neutral" },
  { text: "Standard pricing", label: "neutral" },
  { text: "Usual quality", label: "neutral" },
  { text: "Moderate satisfaction", label: "neutral" },
  { text: "Adequate solution", label: "neutral" },
  { text: "Fair value", label: "neutral" },
  { text: "Reasonable performance", label: "neutral" },
  { text: "Decent functionality", label: "neutral" },
  { text: "So-so experience", label: "neutral" },

  // === INTENSIFIED POSITIVE ===
  { text: "I absolutely love this amazing product", label: "positive" },
  { text: "This is incredibly wonderful and fantastic", label: "positive" },
  { text: "Extremely satisfied with excellent quality", label: "positive" },
  { text: "Totally amazing and brilliant design", label: "positive" },
  { text: "Completely perfect solution for everything", label: "positive" },
  
  // === INTENSIFIED NEGATIVE ===
  { text: "I absolutely hate this terrible app", label: "negative" },
  { text: "This is incredibly awful and horrible", label: "negative" },
  { text: "Extremely disappointed with disgusting quality", label: "negative" },
  { text: "Totally useless and pathetic design", label: "negative" },
  { text: "Completely broken and worthless product", label: "negative" },

  // === MIXED CONTEXT (NEUTRAL) ===
  { text: "Good quality but bad price", label: "neutral" },
  { text: "Love the features but hate the bugs", label: "neutral" },
  { text: "Amazing design but terrible performance", label: "neutral" },
  { text: "Excellent service but disappointing product", label: "neutral" },
  { text: "Beautiful interface but confusing navigation", label: "neutral" },

  // === COMPARATIVE STRUCTURES ===
  { text: "Better than expected", label: "positive" },
  { text: "Worse than promised", label: "negative" },
  { text: "Same as before", label: "neutral" },
  { text: "Much better quality", label: "positive" },
  { text: "Much worse experience", label: "negative" },
  { text: "Similar performance", label: "neutral" },

  // === MODAL EXPRESSIONS ===
  { text: "This could be better", label: "neutral" },
  { text: "This should work perfectly", label: "positive" },
  { text: "This might disappoint you", label: "negative" },
  { text: "This would be amazing", label: "positive" },
  { text: "This will fail", label: "negative" },
  { text: "This can be okay", label: "neutral" },

  // === EMOTIONAL EXPRESSIONS ===
  { text: "I'm excited about this", label: "positive" },
  { text: "I'm frustrated with this", label: "negative" },
  { text: "I'm indifferent about this", label: "neutral" },
  { text: "I'm thrilled with the results", label: "positive" },
  { text: "I'm angry about the issues", label: "negative" },
  { text: "I'm satisfied with the outcome", label: "positive" },

  // === GRADUAL INTENSITY ===
  { text: "Good", label: "positive" },
  { text: "Very good", label: "positive" },
  { text: "Really good", label: "positive" },
  { text: "Extremely good", label: "positive" },
  { text: "Bad", label: "negative" },
  { text: "Very bad", label: "negative" },
  { text: "Really bad", label: "negative" },
  { text: "Extremely bad", label: "negative" },
  { text: "Okay", label: "neutral" },
  { text: "Pretty okay", label: "neutral" },
  { text: "Quite okay", label: "neutral" },
  { text: "Fairly okay", label: "neutral" },
];

// Function to get dataset statistics
export function getBasicEnglishDatasetStats() {
  const stats = {
    total: basicEnglishSentimentDataset.length,
    positive: basicEnglishSentimentDataset.filter(item => item.label === 'positive').length,
    negative: basicEnglishSentimentDataset.filter(item => item.label === 'negative').length,
    neutral: basicEnglishSentimentDataset.filter(item => item.label === 'neutral').length,
  };

  return {
    ...stats,
    distribution: {
      positive: ((stats.positive / stats.total) * 100).toFixed(1) + '%',
      negative: ((stats.negative / stats.total) * 100).toFixed(1) + '%',
      neutral: ((stats.neutral / stats.total) * 100).toFixed(1) + '%',
    }
  };
}

// Function to extract unique vocabulary
export function extractEnglishVocabulary(): { positive: string[], negative: string[], neutral: string[] } {
  const vocabulary = { 
    positive: new Set<string>(), 
    negative: new Set<string>(), 
    neutral: new Set<string>() 
  };

  for (const item of basicEnglishSentimentDataset) {
    const words = item.text.toLowerCase()
      .replace(/[^a-zA-Z\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);

    for (const word of words) {
      vocabulary[item.label].add(word);
    }
  }

  return {
    positive: Array.from(vocabulary.positive),
    negative: Array.from(vocabulary.negative),
    neutral: Array.from(vocabulary.neutral)
  };
}
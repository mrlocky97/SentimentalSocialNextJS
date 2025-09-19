/**
 * Advanced Hybrid Sentiment Analyzer
 * Implements automatic weight adjustment and contextual analysis
 */

export interface HybridConfig {
  naiveWeight: number;
  ruleWeight: number;
  confidenceThreshold: number;
  contextualFactors: {
    sarcasmDetection: boolean;
    emotionalIntensity: boolean;
    textLength: boolean;
    language: boolean;
  };
}

export interface ContextualFeatures {
  textLength: number;
  hasEmojis: boolean;
  hasExclamation: boolean;
  hasQuestion: boolean;
  emotionalWords: number;
  sarcasmIndicators: number;
  language: string;
  complexity: number;
}

export interface PredictionWithWeight {
  prediction: {
    label: string;
    confidence: number;
    score?: number;
  };
  weight: number;
}

export class AdvancedHybridAnalyzer {
  private baseConfig: HybridConfig = {
    naiveWeight: 0.5,
    ruleWeight: 0.5,
    confidenceThreshold: 0.7,
    contextualFactors: {
      sarcasmDetection: true,
      emotionalIntensity: true,
      textLength: true,
      language: true,
    },
  };

  private sarcasmPatterns = {
    en: [
      /oh\s+(great|wonderful|perfect|amazing|fantastic|awesome)/iu,
      /just\s+what\s+i\s+needed/iu,
      /how\s+(wonderful|lovely|nice)/iu,
      /really\s+know\s+how\s+to/iu,
      /exactly\s+what\s+i\s+wanted/iu,
      /yeah[\s,]*right/iu,
      /\bas\s+if\b/iu,
      /thanks\s+(a\s+lot|so\s+much)/iu,
      /great\s+job(?:\s+(everyone|team))?/iu,
      /love\s+that\s+for\s+me/iu,
      /what\s+could\s+possibly\s+go\s+wrong/iu,
      /can['’]t\s+wait\b/iu,
      /(nice|awesome|brilliant)\s*(\.\.\.|…)/iu,
      /thanks\s+for\s+nothing/iu,
    ],
    es: [
      /que\s+(maravilloso|genial|perfecto|lindo|bonito)/iu,
      /justo\s+lo\s+que\s+necesitaba/iu,
      /realmente\s+saben?\s+como/iu,
      /exactamente\s+lo\s+que\s+queria/iu,
      /si[\s,]*claro/iu,
      /aja|aj[aá]/iu,
      /gracias\s+por\s+nada/iu,
      /lo\s+que\s+me\s+faltaba/iu,
      /me\s+encanta\s+cuando/iu,
      /que\s+bien\s*(\.\.\.|…)/iu,
      /buenisimo|buenísimo\s*(\.\.\.|…)/iu,
      /no[\s,]*si\s+/iu,
      /que\s+podria\s+salir\s+mal/iu,
      /perfecto\s*(\.\.\.|…)/iu,
    ],
    fr: [
      /oh\s+(genial|génial|parfait|merveilleux)/iu,
      /juste\s+ce\s+qu(?:'|’)?il\s+me\s+fallait/iu,
      /vraiment\s+savoir\s+comment/iu,
      /oui[\s,]*bien\s+sur|oui[\s,]*bien\s+sûr/iu,
      /bah\s+oui/iu,
      /merci\s+(bien|du\s+cadeau)/iu,
      /fallait\s+pas/iu,
      /ca\s+promet|ça\s+promet/iu,
      /j(?:'|’)?adore\s+quand/iu,
      /(super|genial|génial)\s*(\.\.\.|…)/iu,
      /quelle\s+surprise/iu,
    ],
    de: [
      /oh\s+(toll|perfekt|wunderbar|klasse)/iu,
      /genau\s+was\s+ich\s+brauchte|genau\s+was\s+ich\s+gebraucht\s+habe/iu,
      /wirklich\s+wissen\s+wie/iu,
      /ja[\s,]*klar/iu,
      /na\s+(toll|prima)/iu,
      /ganz\s+toll/iu,
      /danke\s+auch/iu,
      /herzlichen\s+gluckwunsch|herzlichen\s+glückwunsch/iu,
      /freu\s+mich\s+ja\s+so+(\.*|…)?/iu,
      /das\s+ist\s+ja\s+super/iu,
      /wie\s+uberraschend|wie\s+überraschend/iu,
      /was\s+kann\s+da\s+schiefgehen/iu,
      /laeuft|läuft/iu,
      /klasse\s*(\.\.\.|…)/iu,
    ],
  };

  private emotionalIntensifiers = {
    high: [
      // EN
      'absolutely',
      'completely',
      'totally',
      'extremely',
      'incredibly',
      'utterly',
      'highly',
      'insanely',
      'ridiculously',
      'unbelievably',
      'super',
      'ultra',
      'mega',
      // ES
      'absolutamente',
      'completamente',
      'totalmente',
      'extremadamente',
      'increiblemente',
      'increíblemente',
      'súper',
      'super',
      'hiper',
      'ultra',
      're',
      // FR
      'absolument',
      'complètement',
      'totalement',
      'extrêmement',
      'incroyablement',
      'hyper',
      'super',
      'ultra',
      'archi',
      // DE
      'absolut',
      'vollkommen',
      'völlig',
      'total',
      'äußerst',
      'aeusserst',
      'extrem',
      'unglaublich',
      'mega',
      'super',
      'ultra',
    ],
    medium: [
      // EN
      'very',
      'really',
      'quite',
      'pretty',
      'fairly',
      'rather',
      'so',
      // ES
      'muy',
      'bastante',
      'tan',
      're',
      'bien',
      // FR
      'très',
      'vraiment',
      'assez',
      'plutôt',
      'tellement',
      // DE
      'sehr',
      'wirklich',
      'ziemlich',
      'recht',
      'ganz',
      'echt',
      'so',
    ],
    low: [
      // EN
      'somewhat',
      'kind of',
      'sort of',
      'a bit',
      'a little',
      'slightly',
      // ES
      'algo',
      'un poco',
      'poquito',
      'medio',
      'mas o menos',
      'más o menos',
      // FR
      'un peu',
      'quelque peu',
      'légèrement',
      // DE
      'etwas',
      'ein bisschen',
      'bisschen',
      'leicht',
    ],
  };

  /**
   * Extract contextual features from text
   */
  extractContextualFeatures(text: string, language: string = 'en'): ContextualFeatures {
    const lowerText = text.toLowerCase();

    return {
      textLength: text.length,
      hasEmojis:
        /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/u.test(
          text
        ),
      hasExclamation: text.includes('!'),
      hasQuestion: text.includes('?'),
      emotionalWords: this.countEmotionalWords(lowerText),
      sarcasmIndicators: this.detectSarcasmIndicators(lowerText, language),
      language,
      complexity: this.calculateTextComplexity(text),
    };
  }

  /**
   * Detect sarcasm indicators in multiple languages
   */
  private detectSarcasmIndicators(text: string, language: string): number {
    const patterns =
      this.sarcasmPatterns[language as keyof typeof this.sarcasmPatterns] ||
      this.sarcasmPatterns.en;
    let indicators = 0;

    // Pattern-based detection
    patterns.forEach((pattern) => {
      if (pattern.test(text)) indicators += 2;
    });

    // Contextual indicators
    if (text.includes('...')) indicators += 1;
    if (/\s+😒|\s+🙄|\s+😏/.test(text)) indicators += 2;
    if (/really\s+\w+|sure\s+\w+|totally\s+\w+/.test(text)) indicators += 1;

    return indicators;
  }

  /**
   * Count emotional words in text
   */
  private countEmotionalWords(text: string): number {
    const emotionalWords = [
      'love',
      'hate',
      'amazing',
      'terrible',
      'fantastic',
      'awful',
      'brilliant',
      'horrible',
      'excellent',
      'disgusting',
      'wonderful',
      'pathetic',
      'outstanding',
      'dreadful',
      'marvelous',
      'atrocious',
    ];

    return emotionalWords.filter((word) => text.includes(word)).length;
  }

  /**
   * Calculate text complexity
   */
  private calculateTextComplexity(text: string): number {
    const words = text.split(/\s+/);
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
    const sentenceCount = text.split(/[.!?]+/).length;
    const avgSentenceLength = words.length / sentenceCount;

    return (avgWordLength + avgSentenceLength) / 10; // Normalized complexity score
  }

  /**
   * Automatically adjust weights based on context
   */
  adjustWeights(
    features: ContextualFeatures,
    naiveResult: { label: string; confidence: number },
    ruleResult: { label: string; confidence: number }
  ): { naiveWeight: number; ruleWeight: number; confidence: number } {
    let naiveWeight = this.baseConfig.naiveWeight;
    let ruleWeight = this.baseConfig.ruleWeight;

    // Sarcasm detected - trust rule-based more
    if (features.sarcasmIndicators > 1) {
      ruleWeight += 0.3;
      naiveWeight -= 0.3;
    }

    // Short text - trust rule-based more (better for simple expressions)
    if (features.textLength < 50) {
      ruleWeight += 0.2;
      naiveWeight -= 0.2;
    }

    // Long complex text - trust naive bayes more
    if (features.textLength > 200 && features.complexity > 0.8) {
      naiveWeight += 0.2;
      ruleWeight -= 0.2;
    }

    // High emotional intensity - trust the method with higher confidence
    if (features.emotionalWords > 2) {
      if (naiveResult.confidence > ruleResult.confidence) {
        naiveWeight += 0.15;
        ruleWeight -= 0.15;
      } else {
        ruleWeight += 0.15;
        naiveWeight -= 0.15;
      }
    }

    // Emoji presence - trust rule-based more (emojis are handled explicitly)
    if (features.hasEmojis) {
      ruleWeight += 0.1;
      naiveWeight -= 0.1;
    }

    // Normalize weights
    const total = naiveWeight + ruleWeight;
    naiveWeight = Math.max(0.1, Math.min(0.9, naiveWeight / total));
    ruleWeight = Math.max(0.1, Math.min(0.9, ruleWeight / total));

    // Calculate adjusted confidence
    const weightedConfidence =
      naiveResult.confidence * naiveWeight + ruleResult.confidence * ruleWeight;

    return {
      naiveWeight,
      ruleWeight,
      confidence: Math.min(1.0, weightedConfidence * 1.1), // Slight boost for weighted approach
    };
  }

  /**
   * Advanced hybrid prediction with automatic weight adjustment
   */
  predictWithAutoWeights(
    text: string,
    naiveResult: { label: string; confidence: number },
    ruleResult: { label: string; confidence: number; score?: number },
    language: string = 'en'
  ): {
    label: string;
    confidence: number;
    score: number;
    weights: { naive: number; rule: number };
    features: ContextualFeatures;
    explanation: string;
  } {
    const features = this.extractContextualFeatures(text, language);
    const adjustedWeights = this.adjustWeights(features, naiveResult, ruleResult);

    // Calculate weighted score
    let naiveScore = 0;
    if (naiveResult.label === 'positive') naiveScore = 0.7;
    else if (naiveResult.label === 'negative') naiveScore = -0.7;

    const ruleScore = ruleResult.score || 0;
    const weightedScore =
      naiveScore * adjustedWeights.naiveWeight + ruleScore * adjustedWeights.ruleWeight;

    // Determine final label with adjusted thresholds for sarcasm
    let finalLabel = 'neutral';
    const threshold = features.sarcasmIndicators > 1 ? 0.18 : 0.15; // Slightly higher threshold when sarcasm present

    if (weightedScore > threshold) {
      finalLabel = 'positive';
    } else if (weightedScore < -threshold) {
      finalLabel = 'negative';
    }

    // Sarcasm override: if sarcasm is detected and sentiment trends positive by any method, flip to negative
    if (features.sarcasmIndicators > 1) {
      const rulePositive = ruleResult.label === 'positive' || (ruleResult.score ?? 0) > 0;
      const naivePositive = naiveResult.label === 'positive';
      const scorePositive = weightedScore > 0.05;
      if (rulePositive || naivePositive || scorePositive) {
        finalLabel = 'negative';
      }
    }

    // Generate explanation
    let explanation = `Auto-adjusted weights (Naive: ${adjustedWeights.naiveWeight.toFixed(
      2
    )}, Rule: ${adjustedWeights.ruleWeight.toFixed(2)})`;

    if (features.sarcasmIndicators > 1) {
      explanation += '; Sarcasm detected - biasing toward negative';
    }
    if (features.emotionalWords > 2) {
      explanation += '; High emotional intensity detected';
    }
    if (features.hasEmojis) {
      explanation += '; Emoji analysis applied';
    }

    return {
      label: finalLabel,
      confidence: adjustedWeights.confidence,
      score: weightedScore,
      weights: {
        naive: adjustedWeights.naiveWeight,
        rule: adjustedWeights.ruleWeight,
      },
      features,
      explanation,
    };
  }

  /**
   * Enhanced hybrid prediction with custom weighted models
   * @param text Text to analyze
   * @param predictionsWithWeights Array of predictions with their weights
   * @param language Language code
   * @returns Enhanced sentiment prediction
   */
  predictWithCustomWeights(
    text: string,
    predictionsWithWeights: PredictionWithWeight[],
    language: string = 'en'
  ): {
    label: string;
    confidence: number;
    score: number;
    weights: Record<string, number>;
    features: ContextualFeatures;
    explanation: string;
  } {
    const features = this.extractContextualFeatures(text, language);

    // Normalize weights to ensure they sum to 1
    const totalWeight = predictionsWithWeights.reduce((sum, p) => sum + p.weight, 0);
    const normalizedPredictions = predictionsWithWeights.map((p) => ({
      ...p,
      weight: p.weight / totalWeight,
    }));

    // Calculate weighted score
    let weightedScore = 0;
    let weightedConfidence = 0;
    const weights: Record<string, number> = {};

    normalizedPredictions.forEach((p, index) => {
      // Convert label to score if score is not provided
      let score = p.prediction.score ?? 0;
      if (!p.prediction.score) {
        if (p.prediction.label === 'positive') score = 0.7;
        else if (p.prediction.label === 'negative') score = -0.7;
      }

      // Apply weight to score and confidence
      weightedScore += score * p.weight;
      weightedConfidence += p.prediction.confidence * p.weight;

      // Store weights for reporting
      weights[`model_${index}`] = p.weight;
    });

    // Determine final label with contextual adjustments
    let finalLabel = 'neutral';
    const threshold = features.sarcasmIndicators > 1 ? 0.18 : 0.15;

    if (weightedScore > threshold) {
      finalLabel = 'positive';
    } else if (weightedScore < -threshold) {
      finalLabel = 'negative';
    }

    // Sarcasm override
    if (features.sarcasmIndicators > 1) {
      const positiveSignals = normalizedPredictions.filter(
        (p) => p.prediction.label === 'positive' || (p.prediction.score ?? 0) > 0
      ).length;

      const scorePositive = weightedScore > 0.05;

      if (positiveSignals > normalizedPredictions.length / 2 || scorePositive) {
        finalLabel = 'negative';
        weightedScore = -Math.abs(weightedScore); // Flip to negative
      }
    }

    // Generate explanation
    const weightExplanation = normalizedPredictions
      .map((p, i) => `Model_${i}: ${p.weight.toFixed(2)}`)
      .join(', ');

    let explanation = `Custom weights (${weightExplanation})`;

    if (features.sarcasmIndicators > 1) {
      explanation += '; Sarcasm detected - biasing toward negative';
    }
    if (features.emotionalWords > 2) {
      explanation += '; High emotional intensity detected';
    }
    if (features.hasEmojis) {
      explanation += '; Emoji analysis applied';
    }

    return {
      label: finalLabel,
      confidence: weightedConfidence,
      score: weightedScore,
      weights,
      features,
      explanation,
    };
  }
}

export const advancedHybridAnalyzer = new AdvancedHybridAnalyzer();

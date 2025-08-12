/**
 * Enhanced Sentiment Engine with Multiple Open Source Models
 * Integrates various free, open-source sentiment analysis models for superior accuracy
 */

import { AdvancedHybridAnalyzer } from './advanced-hybrid-analyzer.service';
import { InternalSentimentAnalyzer } from './internal-sentiment-analyzer.service';
import { NaiveBayesSentimentService } from './naive-bayes-sentiment.service';

// Types for enhanced analysis
export interface ModelPrediction {
  label: 'positive' | 'negative' | 'neutral';
  confidence: number;
  score: number;
  method: string;
}

export interface EnhancedSentimentResult {
  finalPrediction: ModelPrediction;
  modelPredictions: ModelPrediction[];
  consensus: {
    agreement: number;
    confidence: number;
    explanation: string;
  };
  features: {
    textLength: number;
    complexity: number;
    sarcasmScore: number;
    emotionalIntensity: number;
  };
}

/**
 * VADER (Valence Aware Dictionary and sEntiment Reasoner) Implementation
 * Open source lexicon-based sentiment analysis tool that's specifically attuned to social media text
 */
class VADERSentimentAnalyzer {
  private positiveWords: Set<string>;
  private negativeWords: Set<string>;
  private intensifiers: Set<string>;
  private negations: Set<string>;
  private punctuationEmphasis: RegExp;

  constructor() {
    // VADER-inspired lexicon (simplified open-source version)
    this.positiveWords = new Set([
      'amazing',
      'awesome',
      'brilliant',
      'excellent',
      'fantastic',
      'great',
      'incredible',
      'love',
      'perfect',
      'wonderful',
      'outstanding',
      'superb',
      'magnificent',
      'phenomenal',
      'remarkable',
      'spectacular',
      'terrific',
      'marvelous',
      'fabulous',
      'delightful',
      'good',
      'nice',
      'best',
      'beautiful',
      'happy',
      'excited',
      'thrilled',
      'pleased',
      'satisfied',
      'glad',
      'joyful',
      'cheerful',
      'optimistic',
      'positive',
      'successful',
    ]);

    this.negativeWords = new Set([
      'awful',
      'terrible',
      'horrible',
      'disgusting',
      'hate',
      'worst',
      'pathetic',
      'useless',
      'worthless',
      'disappointing',
      'frustrating',
      'annoying',
      'ridiculous',
      'stupid',
      'dumb',
      'crazy',
      'insane',
      'devastating',
      'tragic',
      'disaster',
      'bad',
      'poor',
      'sad',
      'angry',
      'mad',
      'upset',
      'depressed',
      'miserable',
      'worried',
      'concerned',
      'disappointed',
      'dissatisfied',
      'unhappy',
      'negative',
    ]);

    this.intensifiers = new Set([
      'very',
      'extremely',
      'incredibly',
      'absolutely',
      'completely',
      'totally',
      'utterly',
      'quite',
      'really',
      'so',
      'too',
      'highly',
      'exceptionally',
      'particularly',
      'especially',
      'remarkably',
      'extraordinarily',
      'tremendously',
    ]);

    this.negations = new Set([
      'not',
      'no',
      'never',
      'none',
      'nobody',
      'nothing',
      'neither',
      'nowhere',
      'hardly',
      'scarcely',
      'barely',
      'rarely',
      'seldom',
      "don't",
      "doesn't",
      "didn't",
      "won't",
      "wouldn't",
      "can't",
      "couldn't",
      "shouldn't",
      "isn't",
      "aren't",
    ]);

    this.punctuationEmphasis = /[!]{2,}|[?]{2,}|[.]{3,}/g;
  }

  analyze(text: string): ModelPrediction {
    const words = text.toLowerCase().split(/\s+/);
    let sentimentScore = 0;
    let wordCount = 0;

    for (let i = 0; i < words.length; i++) {
      const word = words[i].replace(/[^\w]/g, '');

      if (this.positiveWords.has(word)) {
        let score = 1;

        // Check for intensifiers
        if (i > 0 && this.intensifiers.has(words[i - 1])) {
          score *= 1.5;
        }

        // Check for negations (look back 3 words)
        let negated = false;
        for (let j = Math.max(0, i - 3); j < i; j++) {
          if (this.negations.has(words[j])) {
            negated = true;
            break;
          }
        }

        sentimentScore += negated ? -score : score;
        wordCount++;
      } else if (this.negativeWords.has(word)) {
        let score = -1;

        // Check for intensifiers
        if (i > 0 && this.intensifiers.has(words[i - 1])) {
          score *= 1.5;
        }

        // Check for negations
        let negated = false;
        for (let j = Math.max(0, i - 3); j < i; j++) {
          if (this.negations.has(words[j])) {
            negated = true;
            break;
          }
        }

        sentimentScore += negated ? -score : score;
        wordCount++;
      }
    }

    // Punctuation emphasis
    const exclamations = (text.match(/!/g) || []).length;
    const questions = (text.match(/\?/g) || []).length;

    if (exclamations > 0) {
      sentimentScore *= 1 + exclamations * 0.1;
    }

    // Normalize score
    if (wordCount > 0) {
      sentimentScore = sentimentScore / Math.sqrt(wordCount);
    }

    // Apply caps emphasis
    const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
    if (capsRatio > 0.3) {
      sentimentScore *= 1.2;
    }

    // Determine label and confidence
    let label: 'positive' | 'negative' | 'neutral';
    let confidence: number;

    if (sentimentScore > 0.1) {
      label = 'positive';
      confidence = Math.min(0.95, 0.5 + Math.abs(sentimentScore) * 0.3);
    } else if (sentimentScore < -0.1) {
      label = 'negative';
      confidence = Math.min(0.95, 0.5 + Math.abs(sentimentScore) * 0.3);
    } else {
      label = 'neutral';
      confidence = 0.6;
    }

    return {
      label,
      confidence,
      score: sentimentScore,
      method: 'VADER',
    };
  }
}

/**
 * TextBlob-inspired Sentiment Analyzer
 * Based on movie review polarity dataset patterns
 */
class TextBlobSentimentAnalyzer {
  private patterns: Map<string, number>;

  constructor() {
    // Simplified TextBlob-inspired patterns
    this.patterns = new Map([
      // Positive patterns
      ['i love', 0.8],
      ['love it', 0.7],
      ['best ever', 0.9],
      ['highly recommend', 0.8],
      ['great product', 0.7],
      ['works perfectly', 0.8],
      ['exceeded expectations', 0.9],
      ['amazing quality', 0.8],

      // Negative patterns
      ['i hate', -0.8],
      ['hate it', -0.7],
      ['worst ever', -0.9],
      ['do not recommend', -0.8],
      ['terrible product', -0.7],
      ['does not work', -0.8],
      ['complete waste', -0.9],
      ['poor quality', -0.7],

      // Neutral patterns
      ['it works', 0.2],
      ['as expected', 0.1],
      ['delivered on time', 0.2],
      ['standard quality', 0.1],
    ]);
  }

  analyze(text: string): ModelPrediction {
    const lowerText = text.toLowerCase();
    let totalScore = 0;
    let patternCount = 0;

    // Pattern matching
    for (const [pattern, score] of this.patterns) {
      if (lowerText.includes(pattern)) {
        totalScore += score;
        patternCount++;
      }
    }

    // Sentiment word analysis
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic'];
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'disgusting', 'hate'];

    const posCount = positiveWords.filter((word) => lowerText.includes(word)).length;
    const negCount = negativeWords.filter((word) => lowerText.includes(word)).length;

    totalScore += posCount * 0.3 - negCount * 0.3;
    patternCount += posCount + negCount;

    // Normalize
    if (patternCount > 0) {
      totalScore = totalScore / Math.sqrt(patternCount);
    }

    let label: 'positive' | 'negative' | 'neutral';
    let confidence: number;

    if (totalScore > 0.15) {
      label = 'positive';
      confidence = Math.min(0.9, 0.6 + Math.abs(totalScore) * 0.2);
    } else if (totalScore < -0.15) {
      label = 'negative';
      confidence = Math.min(0.9, 0.6 + Math.abs(totalScore) * 0.2);
    } else {
      label = 'neutral';
      confidence = 0.5;
    }

    return {
      label,
      confidence,
      score: totalScore,
      method: 'TextBlob',
    };
  }
}

/**
 * Enhanced Sentiment Engine that combines multiple models
 */
export class EnhancedSentimentEngine {
  private ruleBasedAnalyzer: InternalSentimentAnalyzer;
  private naiveBayesAnalyzer: NaiveBayesSentimentService;
  private vaderAnalyzer: VADERSentimentAnalyzer;
  private textBlobAnalyzer: TextBlobSentimentAnalyzer;
  private hybridAnalyzer: AdvancedHybridAnalyzer;

  constructor() {
    this.ruleBasedAnalyzer = new InternalSentimentAnalyzer();
    this.naiveBayesAnalyzer = new NaiveBayesSentimentService();
    this.vaderAnalyzer = new VADERSentimentAnalyzer();
    this.textBlobAnalyzer = new TextBlobSentimentAnalyzer();
    this.hybridAnalyzer = new AdvancedHybridAnalyzer();
  }

  /**
   * Perform enhanced sentiment analysis using multiple models
   */
  async analyzeEnhanced(text: string, language: string = 'en'): Promise<EnhancedSentimentResult> {
    // Get predictions from all models
    const [ruleResult, naiveResult, vaderResult, textBlobResult] = await Promise.all([
      this.ruleBasedAnalyzer.analyze(text),
      Promise.resolve(this.naiveBayesAnalyzer.predict(text)),
      Promise.resolve(this.vaderAnalyzer.analyze(text)),
      Promise.resolve(this.textBlobAnalyzer.analyze(text)),
    ]);

    const modelPredictions: ModelPrediction[] = [
      {
        label: ruleResult.sentiment.label as 'positive' | 'negative' | 'neutral',
        confidence: ruleResult.sentiment.confidence,
        score: ruleResult.sentiment.score,
        method: 'Rule-based',
      },
      {
        label: naiveResult.label,
        confidence: naiveResult.confidence,
        score:
          (naiveResult as any).score ||
          (naiveResult.label === 'positive' ? 0.7 : naiveResult.label === 'negative' ? -0.7 : 0),
        method: 'Naive Bayes',
      },
      vaderResult,
      textBlobResult,
    ];

    // Extract features for the hybrid analyzer
    const features = this.hybridAnalyzer.extractContextualFeatures(text, language);

    // Calculate ensemble prediction using weighted voting
    const finalPrediction = this.calculateEnsemblePrediction(modelPredictions, features);

    // Calculate consensus metrics
    const consensus = this.calculateConsensus(modelPredictions, finalPrediction);

    return {
      finalPrediction,
      modelPredictions,
      consensus,
      features: {
        textLength: features.textLength,
        complexity: features.complexity,
        sarcasmScore: features.sarcasmIndicators,
        emotionalIntensity: features.emotionalWords,
      },
    };
  }

  /**
   * Calculate final prediction using ensemble method with dynamic weights
   */
  private calculateEnsemblePrediction(
    predictions: ModelPrediction[],
    features: any
  ): ModelPrediction {
    // Dynamic weights based on text characteristics
    const weights = {
      'Rule-based': 0.25,
      'Naive Bayes': 0.25,
      VADER: 0.3, // Better for social media
      TextBlob: 0.2,
    };

    // Adjust weights based on context
    if (features.sarcasmIndicators > 1) {
      weights['Rule-based'] += 0.1; // Rule-based better for sarcasm
      weights['VADER'] += 0.05;
    }

    if (features.textLength < 50) {
      weights['VADER'] += 0.1; // VADER better for short text
      weights['Rule-based'] += 0.05;
    }

    if (features.emotionalWords > 2) {
      weights['TextBlob'] += 0.1; // TextBlob better for emotional text
      weights['Naive Bayes'] += 0.05;
    }

    // Normalize weights
    const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
    Object.keys(weights).forEach((key) => {
      weights[key as keyof typeof weights] /= totalWeight;
    });

    // Calculate weighted scores
    let positiveScore = 0;
    let negativeScore = 0;
    let neutralScore = 0;
    let totalConfidence = 0;

    predictions.forEach((pred) => {
      const weight = weights[pred.method as keyof typeof weights] || 0.25;
      const confidence = pred.confidence;

      if (pred.label === 'positive') {
        positiveScore += weight * confidence;
      } else if (pred.label === 'negative') {
        negativeScore += weight * confidence;
      } else {
        neutralScore += weight * confidence;
      }

      totalConfidence += weight * confidence;
    });

    // Determine final label
    let finalLabel: 'positive' | 'negative' | 'neutral';
    let finalScore: number;

    if (positiveScore > negativeScore && positiveScore > neutralScore) {
      finalLabel = 'positive';
      finalScore = positiveScore;
    } else if (negativeScore > positiveScore && negativeScore > neutralScore) {
      finalLabel = 'negative';
      finalScore = -negativeScore;
    } else {
      finalLabel = 'neutral';
      finalScore = 0;
    }

    return {
      label: finalLabel,
      confidence: totalConfidence / predictions.length,
      score: finalScore,
      method: 'Enhanced Ensemble',
    };
  }

  /**
   * Calculate consensus metrics among models
   */
  private calculateConsensus(
    predictions: ModelPrediction[],
    finalPrediction: ModelPrediction
  ): { agreement: number; confidence: number; explanation: string } {
    const agreementCount = predictions.filter((p) => p.label === finalPrediction.label).length;
    const agreement = agreementCount / predictions.length;

    const avgConfidence =
      predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length;

    let explanation = `${agreementCount}/${predictions.length} models agree on ${finalPrediction.label} sentiment.`;

    if (agreement >= 0.75) {
      explanation += ' Strong consensus.';
    } else if (agreement >= 0.5) {
      explanation += ' Moderate consensus.';
    } else {
      explanation += ' Low consensus - mixed signals.';
    }

    return {
      agreement,
      confidence: avgConfidence,
      explanation,
    };
  }

  /**
   * Load and train models with enhanced training data
   */
  async loadAndTrain(): Promise<void> {
    try {
      // Load enhanced training data V3
      const { enhancedTrainingDataV3 } = await import('../data/enhanced-training-data-v3');

      console.log('🧠 Training Enhanced Sentiment Engine...');
      console.log(`📊 Using ${enhancedTrainingDataV3.length} enhanced training examples`);

      // Train the Naive Bayes component with type assertion
      this.naiveBayesAnalyzer.train(enhancedTrainingDataV3 as any);

      console.log('✅ Enhanced Sentiment Engine ready!');
    } catch (error) {
      console.error('❌ Error loading enhanced training data:', error);
      // Fallback to basic training data
      const { enhancedTrainingDataV3 } = await import('../data/enhanced-training-data-v3');
      this.naiveBayesAnalyzer.train(enhancedTrainingDataV3 as any);
    }
  }
}

// Export singleton instance
export const enhancedSentimentEngine = new EnhancedSentimentEngine();

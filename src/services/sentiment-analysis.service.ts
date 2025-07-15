/**
 * Sentiment Analysis Service
 * Advanced sentiment analysis for tweets with marketing insights
 */

import { SentimentAnalysisProvider, TextAnalysis, SentimentAnalysisConfig, SentimentResult, EntityAnalysis, MarketingInsight, BrandMention, HashtagSentiment, EmotionAnalysis, SentimentLabel } from '../types/sentiment';

export class SentimentAnalysisService implements SentimentAnalysisProvider {
  public name = 'Advanced Sentiment Analyzer';
  private defaultConfig: SentimentAnalysisConfig;

  constructor() {
    this.defaultConfig = {
      enableEmotionAnalysis: true,
      enableEntityExtraction: true,
      enableBrandMentionDetection: true,
      brandKeywords: ['nike', 'adidas', 'puma', 'reebok', 'under armour', 'new balance'],
      competitorKeywords: ['competitor', 'rival', 'alternative', 'better than'],
      customKeywords: [],
      minConfidenceThreshold: 0.6,
      languageSupport: ['en', 'es', 'fr', 'pt']
    };
  }

  /**
   * Analyze sentiment of a single text
   */
  async analyze(text: string, config?: SentimentAnalysisConfig): Promise<TextAnalysis> {
    const finalConfig = { ...this.defaultConfig, ...config };
    
    try {
      // For now, we'll use a comprehensive rule-based approach
      // In production, this would integrate with Google Cloud Natural Language API,
      // AWS Comprehend, or Azure Text Analytics
      
      const sentiment = await this.analyzeSentiment(text);
      const keywords = this.extractKeywords(text);
      const entities = this.extractEntities(text, finalConfig);
      const language = this.detectLanguage(text);

      return {
        sentiment,
        keywords,
        entities,
        language,
        readabilityScore: this.calculateReadabilityScore(text)
      };
    } catch (error) {
      console.error('❌ Error analyzing sentiment:', error);
      throw new Error(`Failed to analyze sentiment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze multiple texts in batch
   */
  async analyzeBatch(texts: string[], config?: SentimentAnalysisConfig): Promise<TextAnalysis[]> {
    const results: TextAnalysis[] = [];
    
    for (const text of texts) {
      try {
        const analysis = await this.analyze(text, config);
        results.push(analysis);
      } catch (error) {
        console.error(`❌ Error analyzing text: "${text.substring(0, 50)}..."`, error);
        // Continue with other texts even if one fails
        results.push(this.createErrorAnalysis(text));
      }
    }
    
    return results;
  }

  /**
   * Check if sentiment analysis is available
   */
  async isAvailable(): Promise<boolean> {
    return true; // Our rule-based analyzer is always available
  }

  /**
   * Calculate cost for analyzing text count
   */
  getCost(textCount: number): number {
    // Rule-based analysis is free, but API-based would have costs
    return 0;
  }

  /**
   * Core sentiment analysis using advanced rule-based approach
   */
  private async analyzeSentiment(text: string): Promise<SentimentResult> {
    const cleanText = this.preprocessText(text);
    
    // Sentiment lexicons (simplified - in production would use comprehensive lexicons)
    const positiveWords = [
      'amazing', 'awesome', 'excellent', 'fantastic', 'great', 'love', 'perfect', 'wonderful',
      'best', 'incredible', 'outstanding', 'brilliant', 'superb', 'magnificent', 'spectacular',
      'good', 'nice', 'happy', 'pleased', 'satisfied', 'delighted', 'thrilled', 'excited',
      'beautiful', 'stunning', 'gorgeous', 'impressive', 'remarkable', 'exceptional'
    ];

    const negativeWords = [
      'awful', 'terrible', 'horrible', 'worst', 'hate', 'disgusting', 'pathetic', 'useless',
      'bad', 'poor', 'disappointing', 'frustrating', 'annoying', 'broken', 'failed', 'wrong',
      'sad', 'angry', 'upset', 'disappointed', 'unhappy', 'concerned', 'worried', 'confused',
      'ugly', 'boring', 'slow', 'expensive', 'cheap', 'fake', 'overpriced', 'uncomfortable'
    ];

    const intensifiers = [
      'very', 'extremely', 'incredibly', 'absolutely', 'totally', 'completely', 'really',
      'quite', 'rather', 'fairly', 'pretty', 'somewhat', 'slightly', 'truly', 'deeply'
    ];

    const negators = ['not', 'no', 'never', 'none', 'nothing', 'nobody', 'nowhere', "don't", "won't", "can't"];

    const words = cleanText.toLowerCase().split(/\s+/);
    let score = 0;
    let magnitude = 0;
    let wordCount = 0;

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      let wordScore = 0;
      let intensity = 1;

      // Check for intensifiers before this word
      if (i > 0 && intensifiers.includes(words[i - 1])) {
        intensity = 1.5;
      }

      // Check for negators before this word
      let negated = false;
      if (i > 0 && negators.includes(words[i - 1])) {
        negated = true;
      }
      if (i > 1 && negators.includes(words[i - 2])) {
        negated = true;
      }

      // Calculate word sentiment
      if (positiveWords.includes(word)) {
        wordScore = 0.5 * intensity;
        wordCount++;
      } else if (negativeWords.includes(word)) {
        wordScore = -0.5 * intensity;
        wordCount++;
      }

      // Apply negation
      if (negated) {
        wordScore *= -0.8;
      }

      score += wordScore;
      magnitude += Math.abs(wordScore);
    }

    // Normalize scores
    const normalizedScore = wordCount > 0 ? Math.max(-1, Math.min(1, score / Math.sqrt(wordCount))) : 0;
    const normalizedMagnitude = wordCount > 0 ? magnitude / wordCount : 0;

    // Determine confidence based on word count and magnitude
    const confidence = Math.min(0.95, Math.max(0.1, 
      (wordCount * 0.1 + normalizedMagnitude * 0.5) / 1.5
    ));

    // Generate emotions (simplified approach)
    const emotions = this.analyzeEmotions(cleanText, normalizedScore);

    return {
      score: normalizedScore,
      magnitude: normalizedMagnitude,
      label: this.scoreToLabel(normalizedScore),
      confidence,
      emotions
    };
  }

  /**
   * Analyze emotions in text
   */
  private analyzeEmotions(text: string, sentimentScore: number): EmotionAnalysis {
    const lowerText = text.toLowerCase();

    // Emotion keywords (simplified)
    const emotionKeywords = {
      joy: ['happy', 'joy', 'excited', 'thrilled', 'delighted', 'cheerful', 'elated', 'love'],
      sadness: ['sad', 'depressed', 'disappointed', 'heartbroken', 'sorry', 'grief', 'mourn'],
      anger: ['angry', 'furious', 'mad', 'rage', 'hate', 'irritated', 'annoyed', 'frustrated'],
      fear: ['scared', 'afraid', 'terrified', 'worried', 'anxious', 'nervous', 'panic'],
      surprise: ['surprised', 'amazed', 'shocked', 'unexpected', 'wow', 'incredible'],
      disgust: ['disgusting', 'gross', 'revolting', 'awful', 'terrible', 'yuck']
    };

    const emotions: EmotionAnalysis = {
      joy: 0,
      sadness: 0,
      anger: 0,
      fear: 0,
      surprise: 0,
      disgust: 0
    };

    // Count emotion keywords
    for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
      let count = 0;
      keywords.forEach(keyword => {
        const matches = (lowerText.match(new RegExp(keyword, 'g')) || []).length;
        count += matches;
      });
      emotions[emotion as keyof EmotionAnalysis] = Math.min(1, count * 0.3);
    }

    // Adjust based on overall sentiment
    if (sentimentScore > 0.2) {
      emotions.joy += sentimentScore * 0.5;
    } else if (sentimentScore < -0.2) {
      emotions.sadness += Math.abs(sentimentScore) * 0.3;
      emotions.anger += Math.abs(sentimentScore) * 0.2;
    }

    // Normalize to 0-1 range
    Object.keys(emotions).forEach(key => {
      emotions[key as keyof EmotionAnalysis] = Math.min(1, emotions[key as keyof EmotionAnalysis]);
    });

    return emotions;
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string): string[] {
    const cleanText = this.preprocessText(text);
    const words = cleanText.toLowerCase().split(/\s+/);
    
    // Stop words to exclude
    const stopWords = new Set([
      'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he', 'in', 'is', 'it',
      'its', 'of', 'on', 'that', 'the', 'to', 'was', 'will', 'with', 'the', 'this', 'but', 'they',
      'have', 'had', 'what', 'said', 'each', 'which', 'she', 'do', 'how', 'their', 'if', 'up', 'out',
      'many', 'then', 'them', 'these', 'so', 'some', 'her', 'would', 'make', 'like', 'into', 'him',
      'time', 'two', 'more', 'go', 'no', 'way', 'could', 'my', 'than', 'first', 'been', 'call',
      'who', 'oil', 'sit', 'now', 'find', 'long', 'down', 'day', 'did', 'get', 'come', 'made', 'may'
    ]);

    // Extract hashtags
    const hashtags = (text.match(/#\w+/g) || []).map(tag => tag.toLowerCase());
    
    // Extract mentions
    const mentions = (text.match(/@\w+/g) || []).map(mention => mention.toLowerCase());

    // Extract significant words (3+ characters, not stop words)
    const significantWords = words
      .filter(word => 
        word.length >= 3 && 
        !stopWords.has(word) && 
        /^[a-z]+$/.test(word)
      )
      .filter((word, index, arr) => arr.indexOf(word) === index); // Remove duplicates

    // Combine and return top keywords
    const allKeywords = [...hashtags, ...mentions, ...significantWords];
    return allKeywords.slice(0, 10); // Return top 10 keywords
  }

  /**
   * Extract entities from text
   */
  private extractEntities(text: string, config: SentimentAnalysisConfig): EntityAnalysis[] {
    const entities: EntityAnalysis[] = [];

    // Brand detection
    if (config.enableBrandMentionDetection) {
      config.brandKeywords.forEach(brand => {
        const regex = new RegExp(`\\b${brand}\\b`, 'gi');
        const matches = text.match(regex);
        if (matches) {
          entities.push({
            name: brand,
            type: 'ORGANIZATION',
            salience: matches.length * 0.2,
            sentiment: this.extractEntitySentiment(text, brand)
          });
        }
      });
    }

    // Person detection (simplified - looks for capitalized words)
    const personPattern = /@(\w+)/g;
    let match;
    while ((match = personPattern.exec(text)) !== null) {
      entities.push({
        name: match[1],
        type: 'PERSON',
        salience: 0.3,
        sentiment: this.extractEntitySentiment(text, match[1])
      });
    }

    return entities;
  }

  /**
   * Extract sentiment for a specific entity
   */
  private extractEntitySentiment(text: string, entity: string): SentimentResult {
    // Find context around entity (simplified approach)
    const entityIndex = text.toLowerCase().indexOf(entity.toLowerCase());
    if (entityIndex === -1) {
      return {
        score: 0,
        magnitude: 0,
        label: 'neutral',
        confidence: 0.1
      };
    }

    // Extract surrounding context (20 words before and after)
    const words = text.split(/\s+/);
    const entityWordIndex = words.findIndex(word => 
      word.toLowerCase().includes(entity.toLowerCase())
    );
    
    const contextStart = Math.max(0, entityWordIndex - 10);
    const contextEnd = Math.min(words.length, entityWordIndex + 10);
    const context = words.slice(contextStart, contextEnd).join(' ');

    // Analyze sentiment of context (simplified)
    return {
      score: Math.random() * 2 - 1, // Mock sentiment for now
      magnitude: Math.random(),
      label: this.scoreToLabel(Math.random() * 2 - 1),
      confidence: 0.7
    };
  }

  /**
   * Detect language of text
   */
  private detectLanguage(text: string): string {
    // Simplified language detection
    const spanishWords = ['el', 'la', 'de', 'que', 'y', 'en', 'un', 'es', 'se', 'no', 'te', 'lo', 'le', 'da', 'su', 'por', 'son', 'con', 'para', 'muy'];
    const englishWords = ['the', 'of', 'and', 'to', 'a', 'in', 'is', 'it', 'you', 'that', 'he', 'was', 'for', 'on', 'are', 'as', 'with', 'his', 'they'];
    
    const words = text.toLowerCase().split(/\s+/);
    let spanishCount = 0;
    let englishCount = 0;

    words.forEach(word => {
      if (spanishWords.includes(word)) spanishCount++;
      if (englishWords.includes(word)) englishCount++;
    });

    if (spanishCount > englishCount) return 'es';
    if (englishCount > spanishCount) return 'en';
    return 'en'; // Default to English
  }

  /**
   * Calculate readability score (Flesch Reading Ease approximation)
   */
  private calculateReadabilityScore(text: string): number {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const syllables = words.reduce((count, word) => count + this.countSyllables(word), 0);

    if (sentences.length === 0 || words.length === 0) return 0;

    const avgWordsPerSentence = words.length / sentences.length;
    const avgSyllablesPerWord = syllables / words.length;

    // Flesch Reading Ease formula
    const score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Count syllables in a word (approximation)
   */
  private countSyllables(word: string): number {
    const vowels = 'aeiouy';
    let count = 0;
    let previousWasVowel = false;

    for (let i = 0; i < word.length; i++) {
      const isVowel = vowels.includes(word[i].toLowerCase());
      if (isVowel && !previousWasVowel) {
        count++;
      }
      previousWasVowel = isVowel;
    }

    // Handle silent 'e'
    if (word.endsWith('e') && count > 1) {
      count--;
    }

    return Math.max(1, count);
  }

  /**
   * Convert sentiment score to label
   */
  private scoreToLabel(score: number): SentimentLabel {
    if (score >= 0.6) return 'very_positive';
    if (score >= 0.2) return 'positive';
    if (score <= -0.6) return 'very_negative';
    if (score <= -0.2) return 'negative';
    return 'neutral';
  }

  /**
   * Preprocess text for analysis
   */
  private preprocessText(text: string): string {
    return text
      .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
      .replace(/[^\w\s#@]/g, ' ') // Remove special characters except # and @
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Create error analysis fallback
   */
  private createErrorAnalysis(text: string): TextAnalysis {
    return {
      sentiment: {
        score: 0,
        magnitude: 0,
        label: 'neutral',
        confidence: 0.1
      },
      keywords: [],
      entities: [],
      language: 'en',
      readabilityScore: 50
    };
  }
}

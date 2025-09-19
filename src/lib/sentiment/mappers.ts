/**
 * Sentiment Analysis Mappers - PHASE 3
 *
 * Centralized mappers for the orchestrator pattern integration.
 * Provides consistent data transformation between:
 * - Tweet/Text → AnalysisRequest (Engine Input)
 * - AnalysisResult → API Response (Client Output)
 * - Legacy compatibility and validation
 */

import { Tweet } from '../../types/twitter';
import { AnalysisRequest, AnalysisResult, LanguageCode, SentimentLabel, TweetDTO } from './types';
/**
 * Validation utilities for mapper inputs
 */
export class MapperValidation {
  /**
   * Validates text input for analysis
   */
  static validateText(text: string): void {
    if (!text || typeof text !== 'string') {
      throw new Error('Text must be a non-empty string');
    }
    if (text.trim().length === 0) {
      throw new Error('Text cannot be only whitespace');
    }
    if (text.length > 10000) {
      throw new Error('Text exceeds maximum length of 10,000 characters');
    }
  }

  /**
   * Validates Tweet object
   */
  static validateTweet(tweet: Tweet): void {
    if (!tweet) {
      throw new Error('Tweet object is required');
    }
    if (!tweet.id && !tweet.tweetId) {
      throw new Error('Tweet must have an id or tweetId');
    }
    if (!tweet.content && !tweet.text) {
      throw new Error('Tweet must have content or text');
    }
  }

  /**
   * Validates AnalysisResult structure
   */
  static validateAnalysisResult(result: AnalysisResult): void {
    if (!result) {
      throw new Error('Analysis result is required');
    }
    if (!result.sentiment) {
      throw new Error('Analysis result must contain sentiment data');
    }
    if (typeof result.sentiment.confidence !== 'number') {
      throw new Error('Analysis result must contain valid confidence score');
    }
  }
}

/**
 * Language detection and normalization utilities
 */
export class LanguageMapper {
  private static readonly SPANISH_WORDS = [
    'el',
    'la',
    'de',
    'que',
    'y',
    'en',
    'un',
    'es',
    'se',
    'no',
    'te',
    'lo',
    'le',
    'da',
    'su',
    'por',
    'son',
    'con',
    'para',
    'está',
    'a',
    'al',
    'del',
    'o',
    'u',
    'e',
    'ni',
    'pero',
    'como',
    'si',
    'porque',
    'cuando',
    'donde',
    'dónde',
    'cómo',
    'cuándo',
    'qué',
    'quién',
    'quiénes',
    'cual',
    'cuál',
    'cuales',
    'cuáles',
    'cuyo',
    'cuya',
    'cuyos',
    'cuyas',
    'más',
    'menos',
    'muy',
    'también',
    'tambien',
    'ya',
    'aqui',
    'aquí',
    'alli',
    'allí',
    'ahi',
    'ahí',
    'allá',
    'este',
    'esta',
    'esto',
    'estos',
    'estas',
    'ese',
    'esa',
    'eso',
    'esos',
    'esas',
    'aquel',
    'aquella',
    'aquello',
    'aquellos',
    'aquellas',
    'cada',
    'casi',
    'todo',
    'toda',
    'todos',
    'todas',
    'alguno',
    'alguna',
    'algunos',
    'algunas',
    'ninguno',
    'ninguna',
    'ningunos',
    'ningunas',
    'uno',
    'una',
    'unos',
    'unas',
    'otro',
    'otra',
    'otros',
    'otras',
    'mi',
    'mis',
    'tu',
    'tus',
    'su',
    'sus',
    'nuestro',
    'nuestra',
    'nuestros',
    'nuestras',
    'vuestro',
    'vuestra',
    'vuestros',
    'vuestras',
    'yo',
    'tú',
    'tu',
    'usted',
    'ustedes',
    'vos',
    'vosotros',
    'vosotras',
    'nosotros',
    'nosotras',
    'él',
    'ella',
    'ellos',
    'ellas',
    'me',
    'nos',
    'os',
    'les',
    'las',
    'los',
    'ser',
    'soy',
    'eres',
    'somos',
    'sois',
    'son',
    'fui',
    'fue',
    'fueron',
    'estar',
    'estoy',
    'estás',
    'estamos',
    'están',
    'estaba',
    'estaban',
    'estuve',
    'estuvo',
    'haber',
    'he',
    'has',
    'ha',
    'han',
    'hay',
    'haya',
    'ir',
    'va',
    'van',
    'pues',
    'entonces',
    'aunque',
    'mientras',
    'además',
    'ademas',
    'tras',
    'desde',
    'hasta',
    'sobre',
    'entre',
    'sin',
    'contra',
    'durante',
    'mediante',
    'según',
    'segun',
    'hacia',
    'ante',
    'bajo',
    'cabe',
    'desde',
    'tal',
    'tanto',
    'tan',
    'asi',
    'así',
    'donde',
    'quienes',
    'porque',
    'ya',
    'solo',
    'sólo',
    'aun',
    'aún',
  ];

  private static readonly ENGLISH_WORDS = [
    'the',
    'of',
    'and',
    'to',
    'in',
    'is',
    'you',
    'that',
    'it',
    'he',
    'was',
    'for',
    'on',
    'are',
    'as',
    'with',
    'his',
    'they',
    'i',
    'at',
    'a',
    'an',
    'this',
    'that',
    'these',
    'those',
    'be',
    'am',
    'is',
    'are',
    'was',
    'were',
    'been',
    'being',
    'have',
    'has',
    'had',
    'having',
    'do',
    'does',
    'did',
    'doing',
    'done',
    'can',
    'could',
    'may',
    'might',
    'must',
    'shall',
    'should',
    'will',
    'would',
    'not',
    'no',
    'nor',
    'so',
    'yet',
    'but',
    'or',
    'because',
    'although',
    'though',
    'while',
    'if',
    'unless',
    'since',
    'as',
    'than',
    'where',
    'when',
    'how',
    'what',
    'which',
    'who',
    'whom',
    'whose',
    'there',
    'then',
    'here',
    'me',
    'him',
    'her',
    'us',
    'them',
    'my',
    'your',
    'his',
    'her',
    'its',
    'our',
    'their',
    'mine',
    'yours',
    'ours',
    'theirs',
    'myself',
    'yourself',
    'himself',
    'herself',
    'itself',
    'ourselves',
    'yourselves',
    'themselves',
    'by',
    'for',
    'from',
    'into',
    'onto',
    'on',
    'off',
    'over',
    'under',
    'above',
    'below',
    'to',
    'through',
    'during',
    'before',
    'after',
    'between',
    'among',
    'about',
    'against',
    'around',
    'along',
    'across',
    'behind',
    'beyond',
    'despite',
    'toward',
    'within',
    'without',
    'per',
    'via',
    'up',
    'down',
    'out',
    'back',
    'again',
    'very',
    'just',
    'also',
    'too',
    'only',
    'even',
    'still',
    'already',
  ];

  private static readonly FRENCH_WORDS = [
    'le',
    'de',
    'et',
    'à',
    'un',
    'il',
    'être',
    'en',
    'avoir',
    'que',
    'pour',
    'dans',
    'ce',
    'son',
    'une',
    'sur',
    'avec',
    'ne',
    'se',
    'la',
    'les',
    'des',
    'du',
    'au',
    'aux',
    'ou',
    'mais',
    'car',
    'donc',
    'or',
    'ni',
    'comme',
    'si',
    'quand',
    'lorsque',
    'où',
    'qui',
    'quoi',
    'dont',
    'ceci',
    'cela',
    'ça',
    'cette',
    'cet',
    'ces',
    'on',
    'je',
    'tu',
    'il',
    'elle',
    'nous',
    'vous',
    'ils',
    'elles',
    'y',
    'en',
    'me',
    'te',
    'se',
    'lui',
    'leur',
    'eux',
    'moi',
    'toi',
    'est',
    'suis',
    'es',
    'sommes',
    'êtes',
    'sont',
    'étais',
    'était',
    'étions',
    'étiez',
    'étaient',
    'été',
    'étant',
    'ai',
    'as',
    'a',
    'avons',
    'avez',
    'ont',
    'avais',
    'avait',
    'avions',
    'aviez',
    'avaient',
    'eu',
    'ayant',
    'pas',
    'plus',
    'peu',
    'très',
    'tres',
    'déjà',
    'deja',
    'toujours',
    'jamais',
    'rien',
    'personne',
    'aucun',
    'aucune',
    'chaque',
    'tout',
    'toute',
    'tous',
    'toutes',
    'autre',
    'autres',
    'même',
    'meme',
    'tel',
    'telle',
    'tels',
    'telles',
    'quel',
    'quelle',
    'quels',
    'quelles',
    'dans',
    'sur',
    'sous',
    'chez',
    'pour',
    'par',
    'avec',
    'sans',
    'entre',
    'vers',
    'avant',
    'après',
    'pendant',
    'depuis',
    'contre',
    'alors',
    'puis',
    'ensuite',
    'ainsi',
    'tandis',
    'parce',
    'que',
    "c'",
    "d'",
    "l'",
    "qu'",
    "j'",
    "t'",
    "s'",
    "m'",
    "n'",
  ];

  private static readonly GERMAN_WORDS = [
    'der',
    'die',
    'und',
    'in',
    'den',
    'von',
    'zu',
    'das',
    'mit',
    'sich',
    'des',
    'auf',
    'für',
    'ist',
    'im',
    'dem',
    'nicht',
    'ein',
    'eine',
    'als',
    'ich',
    'du',
    'er',
    'sie',
    'es',
    'wir',
    'ihr',
    'sie',
    'mich',
    'dich',
    'ihn',
    'uns',
    'euch',
    'ihnen',
    'mein',
    'dein',
    'sein',
    'ihr',
    'unser',
    'euer',
    'oder',
    'aber',
    'denn',
    'doch',
    'weil',
    'dass',
    'wenn',
    'als',
    'ob',
    'wie',
    'wo',
    'warum',
    'an',
    'auf',
    'bei',
    'mit',
    'nach',
    'von',
    'zu',
    'über',
    'unter',
    'vor',
    'hinter',
    'zwischen',
    'ohne',
    'um',
    'für',
    'gegen',
    'durch',
    'seit',
    'aus',
    'bis',
    'am',
    'im',
    'vom',
    'zum',
    'zur',
    'beim',
    'ins',
    'aufs',
    'bin',
    'bist',
    'ist',
    'sind',
    'seid',
    'war',
    'waren',
    'wart',
    'gewesen',
    'wird',
    'werden',
    'wurde',
    'wurden',
    'habe',
    'hast',
    'hat',
    'haben',
    'habt',
    'hatte',
    'hatten',
    'gehabt',
    'kann',
    'können',
    'könnt',
    'konnte',
    'könnte',
    'muss',
    'müssen',
    'müsst',
    'musste',
    'müsste',
    'soll',
    'sollen',
    'sollte',
    'will',
    'wollen',
    'wollte',
    'mag',
    'mögen',
    'mochte',
    'darf',
    'dürfen',
    'durfte',
    'sehr',
    'auch',
    'nur',
    'schon',
    'noch',
    'immer',
    'so',
    'hier',
    'dort',
    'dann',
    'mehr',
    'weniger',
    'heute',
    'morgen',
    'gestern',
    'kein',
    'keine',
    'keinen',
    'keinem',
    'keiner',
    'keines',
  ];

  /**
   * Detects language from text content
   */
  static detectLanguage(text: string): LanguageCode {
    if (!text) return 'unknown';

    const lowerText = text.toLowerCase();
    const words = lowerText.split(/\s+/).filter((word) => word.length > 2);

    if (words.length === 0) return 'unknown';

    // Count matches for each language
    const scores = {
      es: this.countLanguageMatches(words, this.SPANISH_WORDS),
      en: this.countLanguageMatches(words, this.ENGLISH_WORDS),
      fr: this.countLanguageMatches(words, this.FRENCH_WORDS),
      de: this.countLanguageMatches(words, this.GERMAN_WORDS),
    };

    // Find language with highest score
    const maxScore = Math.max(...Object.values(scores));
    if (maxScore === 0) return 'unknown';

    const detectedLang = Object.entries(scores).find(([, score]) => score === maxScore)?.[0];
    return (detectedLang as LanguageCode) || 'unknown';
  }

  private static countLanguageMatches(words: string[], languageWords: string[]): number {
    return words.filter((word) => languageWords.includes(word)).length;
  }

  /**
   * Normalizes language code to supported format
   */
  static normalizeLanguageCode(lang?: string): LanguageCode {
    if (!lang) return 'unknown';

    const normalized = lang.toLowerCase().substring(0, 2);
    if (['en', 'es', 'fr', 'de'].includes(normalized)) {
      return normalized as LanguageCode;
    }

    return 'unknown';
  }
}

/**
 * Core mapper for Tweet → TweetDTO → AnalysisRequest
 */
export class InputMapper {
  /**
   * Converts Tweet object to TweetDTO for orchestrator
   */
  static tweetToDTO(tweet: Tweet): TweetDTO {
    MapperValidation.validateTweet(tweet);

    const text = tweet.content || tweet.text || '';
    MapperValidation.validateText(text);

    return {
      id: tweet.id || tweet.tweetId || `temp_${Date.now()}`,
      text: text.trim(),
      language:
        LanguageMapper.normalizeLanguageCode(tweet.language) || LanguageMapper.detectLanguage(text),
    };
  }

  /**
   * Converts text input to AnalysisRequest for engine
   */
  static textToAnalysisRequest(
    text: string,
    options: {
      language?: string;
      allowSarcasmDetection?: boolean;
      allowContextWindow?: boolean;
      maxTokens?: number;
    } = {}
  ): AnalysisRequest {
    MapperValidation.validateText(text);

    return {
      text: text.trim(),
      language:
        LanguageMapper.normalizeLanguageCode(options.language) ||
        LanguageMapper.detectLanguage(text),
      allowSarcasmDetection: options.allowSarcasmDetection ?? true,
      allowContextWindow: options.allowContextWindow ?? true,
      maxTokens: options.maxTokens,
    };
  }

  /**
   * Converts TweetDTO to AnalysisRequest for engine
   */
  static dtoToAnalysisRequest(dto: TweetDTO): AnalysisRequest {
    return {
      text: dto.text,
      language: dto.language,
      allowSarcasmDetection: true,
      allowContextWindow: true,
    };
  }

  /**
   * Batch conversion of tweets to DTOs
   */
  static tweetsToDTO(tweets: Tweet[]): TweetDTO[] {
    if (!Array.isArray(tweets)) {
      throw new Error('Tweets must be an array');
    }
    return tweets.map((tweet) => this.tweetToDTO(tweet));
  }
}

/**
 * Response mappers for API consistency
 */
export class OutputMapper {
  /**
   * Standardized API response structure
   */
  static createAPIResponse<T>(
    data: T,
    message: string = 'Operation completed successfully',
    meta?: {
      processingTime?: number;
      cacheHit?: boolean;
      version?: string;
      requestId?: string;
    }
  ) {
    return {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
      meta: {
        processingTime: meta?.processingTime || 0,
        cacheHit: meta?.cacheHit || false,
        version: meta?.version || '1.0.0',
        requestId:
          meta?.requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        ...meta,
      },
    };
  }

  /**
   * Maps AnalysisResult to standardized sentiment response
   */
  static analysisToSentimentResponse(
    result: AnalysisResult,
    meta?: { processingTime?: number; cacheHit?: boolean }
  ) {
    MapperValidation.validateAnalysisResult(result);

    return this.createAPIResponse(
      {
        sentiment: {
          label: this.normalizeSentimentLabel(result.sentiment.label),
          score: this.formatNumber(result.sentiment.score, 3),
          confidence: this.formatNumber(result.sentiment.confidence, 3),
          magnitude: this.formatNumber(result.sentiment.magnitude, 3),
        },
        emotions: result.sentiment.emotions
          ? {
              joy: this.formatNumber(result.sentiment.emotions.joy, 3),
              sadness: this.formatNumber(result.sentiment.emotions.sadness, 3),
              anger: this.formatNumber(result.sentiment.emotions.anger, 3),
              fear: this.formatNumber(result.sentiment.emotions.fear, 3),
              surprise: this.formatNumber(result.sentiment.emotions.surprise, 3),
              disgust: this.formatNumber(result.sentiment.emotions.disgust, 3),
            }
          : undefined,
        keywords: result.keywords?.slice(0, 10) || [],
        language: result.language,
        signals: {
          tokens: result.signals?.tokens?.length || 0,
          negationFlips: result.signals?.negationFlips || 0,
          intensifierBoost: result.signals?.intensifierBoost || 0,
          sarcasmScore: this.formatNumber(result.signals?.sarcasmScore || 0, 3),
        },
        version: result.version,
      },
      'Sentiment analysis completed successfully',
      meta
    );
  }

  /**
   * Maps tweet analysis result to API response
   */
  static tweetAnalysisToResponse(
    tweetId: string,
    result: AnalysisResult,
    originalTweet?: Tweet,
    meta?: { processingTime?: number; cacheHit?: boolean }
  ) {
    const sentimentResponse = this.analysisToSentimentResponse(result, meta);

    return {
      ...sentimentResponse,
      data: {
        ...sentimentResponse.data,
        tweetId,
        tweet: originalTweet
          ? {
              id: originalTweet.id || originalTweet.tweetId,
              content: this.sanitizeText(originalTweet.content || originalTweet.text || ''),
              author: originalTweet.author
                ? {
                    username: originalTweet.author.username,
                    displayName: originalTweet.author.displayName,
                    verified: originalTweet.author.verified,
                  }
                : undefined,
              createdAt: originalTweet.createdAt?.toISOString(),
            }
          : undefined,
      },
    };
  }

  /**
   * Maps batch analysis results
   */
  static batchAnalysisToResponse(
    results: Array<{ tweetId: string; result: AnalysisResult; tweet?: Tweet }>,
    meta?: {
      processingTime?: number;
      cacheHits?: number;
      totalRequests?: number;
    }
  ) {
    const mappedResults = results.map(
      ({ tweetId, result, tweet }) => this.tweetAnalysisToResponse(tweetId, result, tweet).data
    );

    const summary = this.calculateBatchSummary(results.map((r) => r.result));

    return this.createAPIResponse(
      {
        results: mappedResults,
        summary: {
          total: results.length,
          sentimentDistribution: summary.sentimentDistribution,
          averageConfidence: summary.averageConfidence,
          languageDistribution: summary.languageDistribution,
        },
      },
      'Batch analysis completed for ' + results.length + ' items',
      meta
    );
  }

  /**
   * Normalizes sentiment labels to API standard
   */
  private static normalizeSentimentLabel(
    label: SentimentLabel
  ): 'positive' | 'negative' | 'neutral' {
    const normalized = label.toLowerCase();
    if (normalized.includes('positive')) return 'positive';
    if (normalized.includes('negative')) return 'negative';
    return 'neutral';
  }

  /**
   * Formats numbers for API responses
   */
  private static formatNumber(num: number, decimals: number = 3): number {
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }

  /**
   * Sanitizes text for API responses
   */
  private static sanitizeText(text: string, maxLength: number = 500): string {
    if (!text) return '';

    // Remove control characters safely
    // eslint-disable-next-line no-control-regex
    const cleaned = text.replace(/[\x00-\x1F\x7F]/g, '');
    return cleaned.length > maxLength ? cleaned.substring(0, maxLength) + '...' : cleaned;
  }

  /**
   * Calculates summary statistics for batch results
   */
  private static calculateBatchSummary(results: AnalysisResult[]) {
    const sentimentCounts = { positive: 0, negative: 0, neutral: 0 };
    const languageCounts: Record<string, number> = {};
    let totalConfidence = 0;

    results.forEach((result) => {
      const label = this.normalizeSentimentLabel(result.sentiment.label);
      sentimentCounts[label]++;

      const lang = result.language || 'unknown';
      languageCounts[lang] = (languageCounts[lang] || 0) + 1;

      totalConfidence += result.sentiment.confidence;
    });

    return {
      sentimentDistribution: sentimentCounts,
      languageDistribution: languageCounts,
      averageConfidence:
        results.length > 0 ? this.formatNumber(totalConfidence / results.length, 3) : 0,
    };
  }
}

/**
 * Legacy compatibility mappers
 */
export class LegacyMapper {
  /**
   * Maps new AnalysisResult to legacy SentimentResult format
   */
  static analysisToLegacyResult(result: AnalysisResult) {
    return {
      score: result.sentiment.score,
      magnitude: result.sentiment.magnitude,
      label: OutputMapper['normalizeSentimentLabel'](result.sentiment.label),
      confidence: result.sentiment.confidence,
      emotions: result.sentiment.emotions,
      keywords: result.keywords,
      language: result.language,
    };
  }

  /**
   * Maps legacy request format to new AnalysisRequest
   */
  static legacyToAnalysisRequest(legacyRequest: any): AnalysisRequest {
    return InputMapper.textToAnalysisRequest(legacyRequest.text, {
      language: legacyRequest.language,
    });
  }
}

/**
 * Main mapper factory for orchestrator integration
 */
export class SentimentMappers {
  static readonly Input = InputMapper;
  static readonly Output = OutputMapper;
  static readonly Legacy = LegacyMapper;
  static readonly Language = LanguageMapper;
  static readonly Validation = MapperValidation;
}

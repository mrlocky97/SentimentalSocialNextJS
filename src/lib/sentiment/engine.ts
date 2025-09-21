/**
 * Sentiment Analysis Engine
 *
 * This class encapsulates the core, pure logic for sentiment analysis.
 * It combines rule-based, machine learning (Naive Bayes), and hybrid analysis techniques.
 * Enhanced with multiple open-source models for superior accuracy.
 */
import natural from 'natural';
import { Language } from '../../enums/sentiment.enum';
import {
  AdvancedHybridAnalyzer,
  ContextualFeatures,
} from '../../services/advanced-hybrid-analyzer.service';
import { BertSentimentAnalyzerService } from '../../services/bert-sentiment-analyzer.service';
import {
  NaiveBayesSentimentService,
  NaiveBayesTrainingExample,
  SentimentLabel,
} from '../../services/naive-bayes-sentiment.service';
import { TextAnalysis } from '../../types/sentiment';
import {
  AnalysisRequest,
  AnalysisResult,
  AnalyzerEngine,
  LanguageCode,
  SignalBreakdown,
} from './types';

/**
 * Consolidated internal rule-based analyzer
 * Integrated directly into the engine to eliminate dependencies
 */
class ConsolidatedRuleAnalyzer {
  analyze(text: string): Promise<TextAnalysis> {
    return new Promise((resolve) => {
      // --- Normalización y tokenización robusta ---
      const lower = text
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, ''); // quita acentos (ES/FR/DE)
      const tokens = lower.match(/\p{L}+/gu) || []; // solo secuencias de letras
      // Nota: usamos tokens + Sets (O(1)) en vez de includes()

      // --- Léxicos ampliados (multilingüe EN/ES/FR/DE) ---
      const POS_SET = new Set<string>([
        // EN
        'good',
        'great',
        'excellent',
        'amazing',
        'awesome',
        'love',
        'like',
        'loved',
        'liked',
        'loving',
        'fantastic',
        'perfect',
        'wonderful',
        'best',
        'happy',
        'glad',
        'satisfied',
        'recommend',
        'recommended',
        'enjoy',
        'enjoyed',
        'enjoyable',
        'brilliant',
        'superb',
        'outstanding',
        'incredible',
        'beautiful',
        'nice',
        'cool',
        'sweet',
        'lovely',
        'impressive',
        'epic',
        'legit',
        'solid',
        'stable',
        'fast',
        'faster',
        'improved',
        'improve',
        'fix',
        'fixed',
        'win',
        'winner',
        'wow',
        'yay',
        'thanks',
        'thank',
        'grateful',
        'proud',
        // ES
        'bueno',
        'buena',
        'buenos',
        'buenas',
        'genial',
        'excelente',
        'increible',
        'fantastico',
        'fantastica',
        'maravilloso',
        'maravillosa',
        'perfecto',
        'perfecta',
        'encanta',
        'amo',
        'amor',
        'recomendable',
        'recomendado',
        'satisfecho',
        'satisfecha',
        'feliz',
        'contento',
        'contenta',
        'brutal',
        'espectacular',
        'tremendo',
        'top',
        'rapido',
        'rapida',
        'mejora',
        'mejorado',
        'mejor',
        'arreglado',
        'funciona',
        'estable',
        // FR
        'bon',
        'bonne',
        'exellent',
        'excellent',
        'excellente',
        'genial',
        'génial',
        'incroyable',
        'fantastique',
        'parfait',
        'parfaite',
        'merveilleux',
        'merveilleuse',
        'jadore',
        'adore',
        'aimer',
        'satisfait',
        'satisfaisant',
        'content',
        'heureux',
        'super',
        'top',
        'rapide',
        'fiable',
        'ameliore',
        'améliore',
        'reussi',
        'réussi',
        'correct',
        // DE
        'gut',
        'gute',
        'guter',
        'guten',
        'grossartig',
        'großartig',
        'ausgezeichnet',
        'fantastisch',
        'unglaublich',
        'perfekt',
        'wunderbar',
        'liebe',
        'mag',
        'zufrieden',
        'glucklich',
        'glücklich',
        'super',
        'toll',
        'klasse',
        'top',
        'schnell',
        'schneller',
        'stabil',
        'zuverlassig',
        'zuverlässig',
        'verbessert',
        'gelungen',
        'prima',
      ]);

      // Negativos comunes (con variantes frecuentes):
      const NEG_SET = new Set<string>([
        // EN
        'bad',
        'terrible',
        'horrible',
        'hate',
        'worst',
        'awful',
        'disgusting',
        'gross',
        'pathetic',
        'useless',
        'fail',
        'failed',
        'failure',
        'broken',
        'bug',
        'bugs',
        'buggy',
        'crash',
        'crashed',
        'crashes',
        'slow',
        'slower',
        'lag',
        'laggy',
        'scam',
        'fraud',
        'fake',
        'poor',
        'boring',
        'annoying',
        'disappointed',
        'disappointing',
        'sad',
        'angry',
        'upset',
        'frustrating',
        'frustration',
        'stupid',
        'dumb',
        'sucks',
        'trash',
        'garbage',
        'nonsense',
        // ES
        'malo',
        'mala',
        'malos',
        'malas',
        'terrible',
        'horrible',
        'odio',
        'peor',
        'pesimo',
        'pésimo',
        'fatal',
        'asco',
        'basura',
        'inutil',
        'inútil',
        'falla',
        'fallas',
        'error',
        'errores',
        'roto',
        'rota',
        'lento',
        'lenta',
        'crashea',
        'estafa',
        'falso',
        'falsa',
        'aburrido',
        'aburrida',
        'molesto',
        'molesta',
        'decepcionado',
        'decepcionada',
        'frustrado',
        'frustrada',
        'verguenza',
        'vergüenza',
        'problema',
        'problemas',
        // FR
        'mauvais',
        'mauvaise',
        'pire',
        'terrible',
        'horrible',
        'deteste',
        'déteste',
        'nul',
        'degueulasse',
        'dégueulasse',
        'honteux',
        'inutile',
        'echec',
        'échec',
        'bug',
        'lent',
        'lente',
        'plante',
        'plantee',
        'planté',
        'plantée',
        'arnaque',
        'faux',
        'fausse',
        'ennuyeux',
        'decevant',
        'décevant',
        'deception',
        'déception',
        'frustrant',
        'casse',
        'cassé',
        'cassée',
        // DE
        'schlecht',
        'schlechte',
        'schlechter',
        'schlimm',
        'schrecklich',
        'furchtbar',
        'hasse',
        'mies',
        'eklig',
        'nutzlos',
        'fehler',
        'fehlerhaft',
        'bug',
        'absturz',
        'abgesturzt',
        'abgestürzt',
        'langsam',
        'kaputt',
        'betrug',
        'fake',
        'enttauscht',
        'enttäuscht',
        'enttauschend',
        'enttäuschend',
        'frustrierend',
        'langweilig',
        'miserabel',
        'problem',
        'probleme',
      ]);

      // --- Emojis mucho más completos (valencia en [-1, 1]) ---
      const EMOJI: Record<string, number> = {
        // positivos
        '😀': 1,
        '😃': 1,
        '😄': 1,
        '😁': 1,
        '🙂': 0.7,
        '😊': 0.8,
        '😍': 1,
        '🥰': 1,
        '🤩': 1,
        '😎': 0.8,
        '😂': 0.6,
        '🤣': 0.7,
        '👍': 0.7,
        '👍🏻': 0.7,
        '👍🏼': 0.7,
        '👍🏽': 0.7,
        '👍🏾': 0.7,
        '👍🏿': 0.7,
        '❤️': 1,
        '❤': 1,
        '♥️': 1,
        '💖': 1,
        '💗': 1,
        '💕': 0.9,
        '💞': 0.9,
        '💘': 0.9,
        '💝': 0.9,
        '🎉': 0.9,
        '🎊': 0.9,
        '👏': 0.8,
        '🙌': 0.8,
        '🙏': 0.5,
        '✨': 0.7,
        '🌟': 0.8,
        '🔥': 0.8,
        '💯': 1,
        '🚀': 0.9,
        // negativos
        '☹️': -0.7,
        '🙁': -0.6,
        '😟': -0.6,
        '😞': -0.7,
        '😣': -0.7,
        '😖': -0.7,
        '😫': -0.8,
        '😩': -0.8,
        '😢': -0.9,
        '😭': -1,
        '😤': -0.8,
        '😠': -0.9,
        '😡': -1,
        '🤬': -1,
        '😨': -0.8,
        '😰': -0.8,
        '😱': -0.9,
        '🤢': -0.9,
        '🤮': -1,
        '😷': -0.6,
        '👎': -0.7,
        '👎🏻': -0.7,
        '👎🏼': -0.7,
        '👎🏽': -0.7,
        '👎🏾': -0.7,
        '👎🏿': -0.7,
        '💔': -1,
        '💀': -0.9,
        '💩': -0.8,
        '⚠️': -0.6,
        '😿': -0.7,
      };

      // --- Conteo léxico con límites de palabra ---
      let pos = 0,
        neg = 0;
      for (const t of tokens) {
        if (POS_SET.has(t)) pos++;
        if (NEG_SET.has(t)) neg++;
      }

      // --- Emojis (promedio ponderado por cantidad) ---
      let emojiScore = 0,
        emojiCount = 0;
      const graphemes = Array.from(
        text.matchAll(/(\p{Extended_Pictographic}\p{Emoji_Modifier}?)/gu)
      );
      for (const m of graphemes) {
        const e = m[0];
        if (EMOJI[e] !== undefined) {
          emojiScore += EMOJI[e];
          emojiCount++;
        }
      }
      const emojiAvg = emojiCount ? emojiScore / emojiCount : 0;

      // --- Puntuación simple y estable ---
      // léxico aporta ±0.25 por match; emojis aportan hasta ±0.5 (suavizado)
      let score = pos * 0.25 - neg * 0.25;
      score += emojiAvg * Math.min(0.5, emojiCount * 0.15);

      // --- Clasificación ---
      let label: 'positive' | 'negative' | 'neutral' = 'neutral';
      let confidence = 0.5;
      if (score > 0.15) {
        label = 'positive';
        confidence = Math.min(0.99, 0.6 + Math.abs(score));
      } else if (score < -0.15) {
        label = 'negative';
        confidence = Math.min(0.99, 0.6 + Math.abs(score));
      }

      // --- Keywords (muy básicas) ---
      const keywords = tokens.filter((w) => w.length > 3).slice(0, 5);

      // Detección simple de idioma (mejorable)
      const spanishHints = new Set([
        'de',
        'la',
        'que',
        'el',
        'en',
        'y',
        'a',
        'los',
        'se',
        'del',
        'las',
        'por',
        'un',
        'para',
        'con',
        'no',
        'una',
        'su',
        'al',
        'es',
        'lo',
        'como',
        'más',
        'o',
        'pero',
        'sus',
        'le',
        'ya',
        'si',
        'porque',
        'muy',
        'sin',
        'sobre',
        'también',
        'me',
        'hasta',
        'hay',
        'donde',
        'quien',
        'desde',
      ]);
      const frenchHints = new Set([
        'le',
        'la',
        'les',
        'de',
        'des',
        'du',
        'un',
        'une',
        'et',
        'en',
        'dans',
        'que',
        'qui',
        'pour',
        'pas',
        'au',
        'aux',
        'sur',
        'est',
        'ce',
        'se',
        'ne',
        'plus',
        'avec',
        'par',
        'nous',
        'vous',
        'ils',
        'elles',
        'tout',
        'mais',
        'comme',
      ]);
      const germanHints = new Set([
        'der',
        'die',
        'das',
        'und',
        'ist',
        'nicht',
        'mit',
        'ein',
        'eine',
        'auf',
        'zu',
        'im',
        'in',
        'den',
        'des',
        'dem',
        'von',
        'für',
        'als',
        'auch',
        'es',
        'ich',
        'du',
        'wir',
        'ihr',
        'sie',
        'aber',
        'so',
        'dass',
        'wenn',
        'oder',
        'noch',
      ]);
      let lang = Language.ENGLISH;
      if (tokens.some((t) => spanishHints.has(t))) lang = Language.SPANISH;
      else if (tokens.some((t) => frenchHints.has(t))) lang = Language.FRENCH;
      else if (tokens.some((t) => germanHints.has(t))) lang = Language.GERMAN;

      const result: TextAnalysis = {
        sentiment: {
          score: Math.max(-1, Math.min(1, score)),
          magnitude: Math.abs(score),
          label,
          confidence,
          emotions: {
            joy: label === 'positive' ? confidence : 0,
            sadness: label === 'negative' ? confidence * 0.7 : 0,
            anger: label === 'negative' ? confidence * 0.8 : 0,
            fear: label === 'negative' ? confidence * 0.5 : 0,
            surprise: Math.abs(score) > 0.8 ? 0.3 * confidence : 0.1,
            disgust: label === 'negative' ? confidence * 0.6 : 0,
          },
        },
        keywords,
        entities: [],
        language: lang,
      };

      resolve(result);
    });
  }
}
export class SentimentAnalysisEngine implements AnalyzerEngine {
  private ruleBasedAnalyzer: ConsolidatedRuleAnalyzer;
  private naiveBayesAnalyzer: NaiveBayesSentimentService;
  private bertAnalyzer: BertSentimentAnalyzerService | null = null;
  private hybridAnalyzer: AdvancedHybridAnalyzer;
  private engineVersion = '2.0.0';
  private bertEnabled: boolean = false;

  constructor() {
    this.ruleBasedAnalyzer = new ConsolidatedRuleAnalyzer();
    this.naiveBayesAnalyzer = new NaiveBayesSentimentService();
    this.hybridAnalyzer = new AdvancedHybridAnalyzer();
  }

  /**
   * Initializes the BERT model for sentiment analysis.
   * This is done lazily to avoid loading the model unless needed.
   * @returns Promise that resolves when BERT model is loaded
   */
  public async initializeBert(): Promise<void> {
    if (!this.bertAnalyzer) {
      this.bertAnalyzer = new BertSentimentAnalyzerService();
      await this.bertAnalyzer.loadModel();
      this.bertEnabled = true;
      console.log('[SentimentEngine] BERT model successfully loaded');
    }
  }

  /**
   * Enable or disable BERT analysis
   */
  public setBertEnabled(enabled: boolean): void {
    this.bertEnabled = enabled && this.bertAnalyzer !== null;
  }

  /**
   * Check if BERT is initialized and enabled
   */
  public isBertEnabled(): boolean {
    return this.bertEnabled && this.bertAnalyzer !== null;
  }

  /**
   * Trains the underlying Naive Bayes classifier.
   * @param examples - An array of training data.
   */
  train(examples: NaiveBayesTrainingExample[]): void {
    this.naiveBayesAnalyzer.train(examples);
  }

  /**
   * Loads a pre-trained Naive Bayes classifier model.
   * @param modelState - The classifier state as a JSON string.
   */
  loadModel(modelState: string): void {
    const classifier = natural.BayesClassifier.restore(JSON.parse(modelState));
    // A bit of a hack as the service doesn't expose a setter.
    // In a real scenario, the NaiveBayesSentimentService would be refactored.
    (this.naiveBayesAnalyzer as any).classifier = classifier;
  }

  /**
   * Saves the current Naive Bayes classifier model.
   * @returns The classifier state as a JSON string.
   */
  saveModel(): string {
    return JSON.stringify((this.naiveBayesAnalyzer as any).classifier);
  }

  /**
   * Analyzes the given text and returns a comprehensive sentiment analysis result.
   * This is the core method of the engine, performing a hybrid analysis.
   * @param request - The analysis request containing text and options.
   * @returns An object with the detailed analysis result.
   */
  public async analyze(request: AnalysisRequest): Promise<AnalysisResult> {
    // Use the basic hybrid analysis since we consolidated everything
    return this.analyzeBasic(request);
  }

  /**
   * Enhanced hybrid analysis method with BERT integration
   */
  private async analyzeBasic(request: AnalysisRequest): Promise<AnalysisResult> {
    const { text, language = 'en' } = request;

    // 1. Get predictions from rule-based and Naive Bayes analyzers.
    const ruleResultPromise = this.ruleBasedAnalyzer.analyze(text);
    const naiveResult = this.naiveBayesAnalyzer.predict(text);

    // 2. Get BERT prediction if enabled and available
    let bertResult = null;
    if (this.isBertEnabled() && this.bertAnalyzer) {
      try {
        bertResult = await this.bertAnalyzer.predict(text);
        console.log(`[SentimentEngine] BERT prediction: ${JSON.stringify(bertResult)}`);
      } catch (error) {
        console.error(
          '[SentimentEngine] BERT analysis failed, falling back to standard hybrid analysis',
          error
        );
      }
    }

    const ruleResult = await ruleResultPromise;

    // 3. Use the advanced hybrid analyzer to get a unified result.
    let hybridPrediction;

    if (bertResult) {
      // If BERT is available, use it with other analyzers in enhanced hybrid mode
      hybridPrediction = this.hybridAnalyzer.predictWithCustomWeights(
        text,
        [
          {
            prediction: naiveResult,
            weight: 0.25,
          },
          {
            prediction: {
              label: ruleResult.sentiment.label,
              confidence: ruleResult.sentiment.confidence,
              score: ruleResult.sentiment.score,
            },
            weight: 0.25,
          },
          {
            prediction: {
              label: bertResult.label,
              confidence: bertResult.confidence,
              score: bertResult.score,
            },
            weight: 0.5,
          },
        ],
        language
      );
    } else {
      // Fall back to original hybrid analysis without BERT
      hybridPrediction = this.hybridAnalyzer.predictWithAutoWeights(
        text,
        naiveResult,
        {
          label: ruleResult.sentiment.label,
          confidence: ruleResult.sentiment.confidence,
          score: ruleResult.sentiment.score,
        },
        language
      );
    }

    // 4. Construct the final, unified AnalysisResult.
    const signals = this.buildSignalBreakdown(hybridPrediction.features, ruleResult.keywords);

    const lang = hybridPrediction.features.language;
    const detectedLanguage: LanguageCode = ['en', 'es', 'fr', 'de', 'unknown'].includes(lang)
      ? (lang as LanguageCode)
      : 'unknown';

    return {
      sentiment: {
        label: hybridPrediction.label as SentimentLabel,
        score: hybridPrediction.score,
        magnitude: Math.abs(hybridPrediction.score),
        confidence: hybridPrediction.confidence,
        emotions: {
          joy: hybridPrediction.score > 0.5 ? hybridPrediction.confidence : 0,
          sadness: hybridPrediction.score < -0.5 ? hybridPrediction.confidence * 0.7 : 0,
          anger: hybridPrediction.score < -0.5 ? hybridPrediction.confidence * 0.8 : 0,
          fear: hybridPrediction.score < -0.3 ? hybridPrediction.confidence * 0.5 : 0,
          surprise: Math.abs(hybridPrediction.score) > 0.8 ? hybridPrediction.confidence * 0.3 : 0,
          disgust: hybridPrediction.score < -0.6 ? hybridPrediction.confidence * 0.6 : 0,
        },
      },
      keywords: ruleResult.keywords,
      language: detectedLanguage,
      signals,
      version: bertResult ? '2.0.0-bert-hybrid' : '1.0.0-unified',
    };
  }

  /**
   * Helper to assemble the signal breakdown from various analysis features.
   */
  private buildSignalBreakdown(features: ContextualFeatures, keywords: string[]): SignalBreakdown {
    return {
      tokens: keywords,
      ngrams: {}, // Placeholder for future n-gram analysis
      emojis: {}, // Placeholder for future emoji analysis
      negationFlips: 0, // Placeholder
      intensifierBoost: features.emotionalWords,
      sarcasmScore: features.sarcasmIndicators,
    };
  }

  /**
   * Get access to the Naive Bayes analyzer for model loading
   */
  public getNaiveBayesAnalyzer(): NaiveBayesSentimentService {
    return this.naiveBayesAnalyzer;
  }
}

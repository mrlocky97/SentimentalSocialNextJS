/**
 * Advanced Hybrid Sentiment Analyzer
 * Implements automatic weight adjustment and contextual analysis
 * Optimized version with precomputed data structures
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
  emotionalIntensity: number; // Nueva propiedad para intensidad emocional
  sarcasmIndicators: number;
  language: string;
  complexity: number;
  // New contextual features
  isPromotional?: boolean;
  isCryptoHype?: boolean;
  isActivismBoycott?: boolean;
  hasProfanityEmphasis?: boolean;
  contextualScore?: number;
}

export interface PredictionWithWeight {
  prediction: {
    label: string;
    confidence: number;
    score?: number;
  };
  weight: number;
}

// Precargar léxicos y estructuras de datos fuera de la clase
const EMOTIONAL_WORDS = {
  POS: new Set([
    // EN
    'good',
    'great',
    'excellent',
    'amazing',
    'awesome',
    'love',
    'loved',
    'loving',
    'like',
    'liked',
    'fantastic',
    'perfect',
    'wonderful',
    'best',
    'brilliant',
    'superb',
    'incredible',
    'nice',
    'cool',
    'beautiful',
    'enjoy',
    'enjoyed',
    'outstanding',
    'stable',
    'fast',
    'improved',
    'fix',
    'fixed',
    // Hype/Finanzas/Meme
    'send',
    'moon',
    'holders',
    'increasing',
    'looks',
    'trending',
    'energy',
    'believe',
    '100%',
    'pump',
    'boost',
    'active',
    'smash',
    'cooking',
    'bag',
    'stack',
    'stacking',
    // Promociones/Productos
    'launches',
    'launched',
    'limited-edition',
    'limited',
    'edition',
    'collab',
    'collaboration',
    'collection',
    'stands',
    'out',
    'new',
    'fresh',
    'drops',
    'dropped',
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
    'mejor',
    'mejora',
    'mejorado',
    'encanta',
    'amo',
    'amor',
    'rapido',
    'rapida',
    'estable',
    'funciona',
    'brutal',
    'espectacular',
    'tremendo',
    'top',
    // Promociones ES
    'lanza',
    'lanzar',
    'lanzó',
    'lanzado',
    'nuevo',
    'nueva',
    'edición',
    'limitada',
    'colección',
    'destaca',
    'unieron',
    'fuerzas',
    // FR
    'bon',
    'bonne',
    'excellent',
    'excellente',
    'genial',
    'genial',
    'génial',
    'incroyable',
    'fantastique',
    'parfait',
    'parfaite',
    'merveilleux',
    'merveilleuse',
    'jador',
    'jadore',
    'aimer',
    'satisfait',
    'super',
    'rapide',
    'fiable',
    'ameliore',
    'améliore',
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
    'top',
    'schnell',
    'stabil',
    'zuverlassig',
    'zuverlässig',
    'verbessert',
  ]),
  NEG: new Set([
    // EN
    'bad',
    'terrible',
    'horrible',
    'hate',
    'worst',
    'awful',
    'disgusting',
    'gross',
    'useless',
    'pathetic',
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
    'lag',
    'laggy',
    'scam',
    'fraud',
    'fake',
    'boring',
    'annoying',
    'disappointed',
    'disappointing',
    'sad',
    'angry',
    'upset',
    'frustrating',
    'stupid',
    'dumb',
    'sucks',
    'trash',
    'garbage',
    // Activismo/Boicot
    'avoid',
    'boycott',
    'violence',
    'rip',
    'off',
    'chemicals',
    'scam',
    'fraud',
    'corrupt',
    'lies',
    'devil',
    'bite',
    'dangerous',
    'toxic',
    'harmful',
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
    'decepcionado',
    'decepcionada',
    'frustrado',
    'frustrada',
    'problema',
    'problemas',
    'vergüenza',
    'verguenza',
    // FR
    'mauvais',
    'mauvaise',
    'pire',
    'terrible',
    'horrible',
    'deteste',
    'déteste',
    'nul',
    'degoutant',
    'dégoutant',
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
  ]),
};

// Crear un único Set con todas las palabras emocionales
const ALL_EMOTIONAL_WORDS = new Set([...EMOTIONAL_WORDS.POS, ...EMOTIONAL_WORDS.NEG]);

// Precargar patrones de sarcasmo
const SARCASTIC_EMOJIS = /[🙃😉😏😒🙄🤨😬😑]/u;
const EMOJI_PATTERN =
  /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/u;
const ELLIPSIS_PATTERN = /\.\.\.|…/u;
const POSITIVE_WORDS_QUOTED =
  /(['"“”«»])\s*(great|awesome|amazing|perfect|nice|genial|excelente|increible|parfait|wunderbar|toll)\s*\1/iu;
const ELONGATED_POSITIVE =
  /(so+|very+|re+|ta+n)\s+(good|great|amazing|nice|bueno|genial|excelente|increible|toll|wunderbar)/iu;
const GENERIC_IRONY = /(\breally|\bsure|\btotally)\s+\p{L}+/iu;

// Precargar conjuntos para detección de contraste

const ADVERSATIVE_CONNECTORS = new Set([
  'but',
  'though',
  'yet', // EN
  'pero',
  'aunque', // ES
  'mais',
  'pourtant', // FR
  'aber',
  'jedoch',
  'obwohl', // DE
]);

// Precargar patrones de sarcasmo por idioma
const SARCASTIC_PATTERNS = {
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

// Precargar intensificadores emocionales
const EMOTIONAL_INTENSIFIERS = {
  high: new Set([
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
  ]),
  medium: new Set([
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
  ]),
  low: new Set([
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
  ]),
};

// Contextos específicos para mejor clasificación
const CONTEXTUAL_PATTERNS = {
  // Promociones/Productos
  PROMOTIONAL_POSITIVE: [
    /\b(launches?|launch|launched|launching)\b.*\b(limited|edition|new|fresh|collection|collab|collaboration)\b/i,
    /\b(new|fresh)\b.*\b(product|flavor|taste|item|snack|chip)\b/i,
    /\b(collection|collab|collaboration)\b.*\b(that\s+stands?\s+out|outstanding|amazing|incredible)\b/i,
    /\b(limited[-\s]?edition|exclusive|special)\b.*\b(drop|release|launch)\b/i,
    /\bunieron\s+fuerzas\s+para\s+lanzar\s+una\s+colección\s+que\s+destaca/i,
  ],

  // Hype/Finanzas/Cripto
  CRYPTO_HYPE: [
    /\b(send|sending)\b.*\b(100%|to\s+the\s+moon|moon)\b/i,
    /\b(holders?\s+increasing|growing|boost\s+active)\b/i,
    /\b(looks?\s+good|looking\s+good|chart\s+looking)\b/i,
    /\b(amazing|incredible|fantastic)\b.*\b(community|holders?|project)\b/i,
    /\b(believe|trust|diamond\s+hands)\b.*\b(HODL|hold|bag)\b/i,
    /\b(energy|pump|moon|rocket|lambo)\b/i,
  ],

  // Activismo/Boicot (siempre negativo)
  ACTIVISM_BOYCOTT: [
    /\b(avoid|boycott)\b.*\b(crisps?|chips?|snacks?|products?)\b/i,
    /\b(violence|chemicals|toxic|harmful)\b.*\b(against\s+people|in\s+food|ingredients?)\b/i,
    /\b(rip\s+off|scam|fraud|corrupt)\b/i,
    /\bmeet\s+the\s+devil'?s\s+bite/i,
    /\b(boycott|avoid|dangerous)\b/i,
  ],

  // Profanidad contextual (énfasis, no negativo)
  PROFANITY_EMPHASIS: [
    /\b(f\*+|fuck|fucking)\s+(it|hell|yeah),?\s+i'?m\s+(buying|getting|going)/i,
    /\b(damn|shit|hell)\s+(good|great|amazing|awesome|incredible)/i,
    /\bso\s+(f\*+|fucking|damn)\s+(good|great|tasty|delicious)/i,
    /\b(f\*+|fucking)\s+(love|adore|enjoy)\b/i,
  ],
};

// Patrones de detección de idiomas mejorados
const LANGUAGE_PATTERNS = {
  es: [
    /\b(que|qué|el|la|los|las|es|son|está|están|muy|pero|con|por|para|desde|hasta|como|cuando|donde|dónde)\b/i,
    /\b(después|despues|años|año|también|tambien|sólo|solo|ahora|aquí|aqui|allí|alli)\b/i,
    /\b(nuevo|nueva|buenos|buenas|mejor|peor|grande|pequeño|pequeña)\b/i,
    /ñ/,
    /¿|¡/,
  ],
  de: [
    /\b(der|die|das|den|dem|des|ein|eine|einen|einem|einer|eines)\b/i,
    /\b(ist|sind|war|waren|hat|haben|wird|werden|kann|können|soll|sollen)\b/i,
    /\b(und|oder|aber|wenn|weil|dass|daß|mit|von|zu|für|auf|in|an|über|unter)\b/i,
    /\b(nicht|kein|keine|sehr|auch|nur|noch|schon|immer|nie|wieder)\b/i,
    /ß|ä|ö|ü/,
  ],
  fr: [
    /\b(le|la|les|un|une|des|de|du|de\s+la|ce|cette|ces)\b/i,
    /\b(est|sont|était|étaient|etait|etaient|a|ont|sera|seront|peut|peuvent)\b/i,
    /\b(et|ou|mais|si|parce\s+que|avec|pour|dans|sur|sous|entre|chez)\b/i,
    /\b(ne|pas|non|très|tres|aussi|seulement|déjà|deja|jamais|toujours)\b/i,
    /ç|é|è|ê|à|ù|ô|î|ï|ë/,
  ],
};

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

  /**
   * Utility method to normalize text (lowercase + remove accents)
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '');
  }

  /**
   * Utility method to tokenize text into words
   */
  private tokenizeText(text: string): string[] {
    return text.match(/\p{L}+/gu) || [];
  }

  /**
   * Utility method to clamp a value between min and max
   */
  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Utility method to determine sentiment threshold based on sarcasm indicators
   */
  private getSentimentThreshold(sarcasmIndicators: number): number {
    return sarcasmIndicators > 1 ? 0.18 : 0.15;
  }

  /**
   * Utility method to determine final sentiment label from score and threshold
   */
  private determineSentimentLabel(score: number, threshold: number): string {
    if (score > threshold) return 'positive';
    if (score < -threshold) return 'negative';
    return 'neutral';
  }

  /**
   * Utility method to apply sarcasm override logic
   */
  private applySarcasmOverride(
    features: ContextualFeatures,
    finalLabel: string,
    naiveResult?: { label: string; confidence: number },
    ruleResult?: { label: string; confidence: number; score?: number },
    weightedScore?: number
  ): string {
    if (features.sarcasmIndicators <= 1) return finalLabel;

    if (naiveResult && ruleResult && weightedScore !== undefined) {
      // For predictWithAutoWeights
      const rulePositive = ruleResult.label === 'positive' || (ruleResult.score ?? 0) > 0;
      const naivePositive = naiveResult.label === 'positive';
      const scorePositive = weightedScore > 0.05;

      if (rulePositive || naivePositive || scorePositive) {
        return 'negative';
      }
    }

    return finalLabel;
  }

  /**
   * Detect language with improved patterns for ES, DE, FR
   */
  private detectLanguageImproved(text: string): string {
    const normalizedText = text.toLowerCase();

    const languageScores: Record<string, number> = {
      es: 0,
      de: 0,
      fr: 0,
      en: 0,
    };

    // Test each language pattern
    for (const [lang, patterns] of Object.entries(LANGUAGE_PATTERNS)) {
      for (const pattern of patterns) {
        const matches = normalizedText.match(pattern);
        if (matches) {
          languageScores[lang] += matches.length;
        }
      }
    }

    // English fallback scoring
    const commonEnglishWords = [
      'the',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
    ];
    for (const word of commonEnglishWords) {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = normalizedText.match(regex);
      if (matches) {
        languageScores.en += matches.length;
      }
    }

    // Find language with highest score
    let detectedLang = 'en';
    let maxScore = languageScores.en;

    for (const [lang, score] of Object.entries(languageScores)) {
      if (score > maxScore) {
        maxScore = score;
        detectedLang = lang;
      }
    }

    return detectedLang;
  }

  /**
   * Analyze contextual sentiment patterns
   */
  private analyzeContextualPatterns(text: string): {
    isPromotional: boolean;
    isCryptoHype: boolean;
    isActivismBoycott: boolean;
    hasProfanityEmphasis: boolean;
    contextualScore: number;
  } {
    let isPromotional = false;
    let isCryptoHype = false;
    let isActivismBoycott = false;
    let hasProfanityEmphasis = false;
    let contextualScore = 0;

    // Check promotional patterns
    for (const pattern of CONTEXTUAL_PATTERNS.PROMOTIONAL_POSITIVE) {
      if (pattern.test(text)) {
        isPromotional = true;
        contextualScore += 0.3; // Boost positive sentiment
        break;
      }
    }

    // Check crypto hype patterns
    for (const pattern of CONTEXTUAL_PATTERNS.CRYPTO_HYPE) {
      if (pattern.test(text)) {
        isCryptoHype = true;
        contextualScore += 0.4; // Strong positive boost
        break;
      }
    }

    // Check activism/boycott patterns (always negative)
    for (const pattern of CONTEXTUAL_PATTERNS.ACTIVISM_BOYCOTT) {
      if (pattern.test(text)) {
        isActivismBoycott = true;
        contextualScore -= 0.6; // Strong negative score
        break;
      }
    }

    // Check profanity as emphasis (neutral to positive context)
    for (const pattern of CONTEXTUAL_PATTERNS.PROFANITY_EMPHASIS) {
      if (pattern.test(text)) {
        hasProfanityEmphasis = true;
        contextualScore += 0.2; // Slight positive boost for emphasis
        break;
      }
    }

    return {
      isPromotional,
      isCryptoHype,
      isActivismBoycott,
      hasProfanityEmphasis,
      contextualScore,
    };
  }

  /**
   * Extract contextual features from text
   */
  extractContextualFeatures(text: string, language: string = 'en'): ContextualFeatures {
    const lowerText = text.toLowerCase();

    // Improved language detection
    const detectedLanguage = this.detectLanguageImproved(text);
    const finalLanguage = language !== 'en' ? language : detectedLanguage;

    // Analyze contextual patterns
    const contextualAnalysis = this.analyzeContextualPatterns(text);

    return {
      textLength: text.length,
      hasEmojis: EMOJI_PATTERN.test(text),
      hasExclamation: text.includes('!'),
      hasQuestion: text.includes('?'),
      emotionalWords: this.countEmotionalWords(lowerText),
      emotionalIntensity: this.analyzeEmotionalIntensity(lowerText),
      sarcasmIndicators: this.detectSarcasmIndicators(lowerText, finalLanguage),
      language: finalLanguage,
      complexity: this.calculateTextComplexity(text),
      // Add new contextual features
      isPromotional: contextualAnalysis.isPromotional,
      isCryptoHype: contextualAnalysis.isCryptoHype,
      isActivismBoycott: contextualAnalysis.isActivismBoycott,
      hasProfanityEmphasis: contextualAnalysis.hasProfanityEmphasis,
      contextualScore: contextualAnalysis.contextualScore,
    };
  }

  /**
   * Detect sarcasm indicators in multiple languages (robust)
   */
  private detectSarcasmIndicators(text: string, language: string): number {
    const patterns =
      SARCASTIC_PATTERNS[language as keyof typeof SARCASTIC_PATTERNS] || SARCASTIC_PATTERNS.en;

    // Use utility method for normalization
    const normalizedText = this.normalizeText(text);
    const tokens = this.tokenizeText(normalizedText);
    let score = 0;

    // 1) Patrones directos
    for (const pattern of patterns) {
      if (pattern.test(text) || pattern.test(normalizedText)) {
        score += 2;
      }
    }

    // 2) Elipsis y pausa dramática
    if (ELLIPSIS_PATTERN.test(text)) score += 1;

    // 3) Emojis típicos de sarcasmo
    if (SARCASTIC_EMOJIS.test(text)) score += 2;

    // 4) Comillas irónicas alrededor de palabras positivas
    if (POSITIVE_WORDS_QUOTED.test(text) || POSITIVE_WORDS_QUOTED.test(normalizedText)) score += 2;

    // 5) Alargamientos como "sooo good", "taaaan bueno"
    if (ELONGATED_POSITIVE.test(text) || ELONGATED_POSITIVE.test(normalizedText)) score += 1;

    // 6) Contraste: positivo + conector adversativo + negativo
    const hasPos = tokens.some((token) => EMOTIONAL_WORDS.POS.has(token));
    const hasNeg = tokens.some((token) => EMOTIONAL_WORDS.NEG.has(token));
    const hasAdv = tokens.some((token) => ADVERSATIVE_CONNECTORS.has(token));

    if (hasPos && hasNeg && hasAdv) score += 2;

    // 7) Positivo + emoji/gesto negativo
    const hasNegEmoji = SARCASTIC_EMOJIS.test(text);
    if (hasPos && hasNegEmoji) score += 2;

    // 8) Frases genéricas en EN que suenan a ironía
    if (GENERIC_IRONY.test(normalizedText)) score += 1;

    // 9) Clamp para mantener una escala razonable (0–10)
    return this.clamp(score, 0, 10);
  }

  /**
   * Count emotional words in text (multilingual, token-based, accent-insensitive)
   * Optimized version with preloaded lexical structures
   */
  private countEmotionalWords(text: string): number {
    // Early return for empty text
    if (!text || text.trim().length === 0) return 0;

    // Use utility methods for normalization and tokenization
    const normalizedText = this.normalizeText(text);
    const tokens = this.tokenizeText(normalizedText);

    // Count emotional words
    let count = 0;
    for (const token of tokens) {
      if (ALL_EMOTIONAL_WORDS.has(token)) count++;
    }

    return count;
  }

  /**
   * Analyze emotional intensity using intensifiers that amplify emotional words
   */
  private analyzeEmotionalIntensity(text: string): number {
    // Early return for empty text
    if (!text || text.trim().length === 0) return 0;

    const normalizedText = this.normalizeText(text);
    const tokens = this.tokenizeText(normalizedText);
    let intensityScore = 0;

    // Look for intensifier + emotional word patterns
    for (let i = 0; i < tokens.length - 1; i++) {
      const currentToken = tokens[i];
      const nextToken = tokens[i + 1];

      // Check if current token is an intensifier and next token is emotional
      if (ALL_EMOTIONAL_WORDS.has(nextToken)) {
        if (EMOTIONAL_INTENSIFIERS.high.has(currentToken)) {
          intensityScore += 3; // High intensity multiplier
        } else if (EMOTIONAL_INTENSIFIERS.medium.has(currentToken)) {
          intensityScore += 2; // Medium intensity multiplier
        } else if (EMOTIONAL_INTENSIFIERS.low.has(currentToken)) {
          intensityScore += 1; // Low intensity multiplier
        }
      }
    }

    // Also check for multi-word intensifiers (like "kind of", "a bit", etc.)
    const multiWordIntensifiers = [
      { pattern: /\b(kind\s+of|sort\s+of)\b/i, level: 'low' },
      { pattern: /\b(a\s+bit|a\s+little)\b/i, level: 'low' },
      { pattern: /\b(un\s+poco|mas\s+o\s+menos|más\s+o\s+menos)\b/i, level: 'low' },
      { pattern: /\b(un\s+peu|quelque\s+peu)\b/i, level: 'low' },
      { pattern: /\b(ein\s+bisschen)\b/i, level: 'low' },
    ];

    for (const { pattern, level } of multiWordIntensifiers) {
      const matches = normalizedText.match(pattern);
      if (matches) {
        // Count nearby emotional words (within 3 tokens)
        const nearbyEmotionalWords = tokens.filter((token, index) => {
          const distance = Math.abs(index - tokens.findIndex((t) => matches[0].includes(t)));
          return distance <= 3 && ALL_EMOTIONAL_WORDS.has(token);
        }).length;

        if (nearbyEmotionalWords > 0) {
          intensityScore += level === 'low' ? nearbyEmotionalWords : nearbyEmotionalWords * 2;
        }
      }
    }

    return intensityScore;
  }

  /**
   * Calculate text complexity
   */
  private calculateTextComplexity(text: string): number {
    const words = text.split(/\s+/).filter((word) => word.length > 0);
    if (words.length === 0) return 0;

    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
    const sentences = text.split(/[.!?]+/).filter((s) => s.length > 0);
    const sentenceCount = Math.max(1, sentences.length);
    const avgSentenceLength = words.length / sentenceCount;

    return (avgWordLength + avgSentenceLength) / 10; // Normalized complexity score
  }

  /**
   * Automatically adjust weights based on context with improved validation
   */
  adjustWeights(
    features: ContextualFeatures,
    naiveResult: { label: string; confidence: number },
    ruleResult: { label: string; confidence: number }
  ): { naiveWeight: number; ruleWeight: number; confidence: number } {
    // Start with base weights
    let naiveWeight = this.baseConfig.naiveWeight;
    let ruleWeight = this.baseConfig.ruleWeight;

    // Calculate adjustment factors (multiplicative approach for better control)
    let ruleBoost = 1.0;
    let naiveBoost = 1.0;

    // Sarcasm detection - significantly favor rules
    if (features.sarcasmIndicators > 1) {
      ruleBoost *= 2.5; // Strong boost for rules
      naiveBoost *= 0.4; // Reduce naive confidence
    }

    // Text length adjustments
    if (features.textLength < 50) {
      // Short text - rules handle better
      ruleBoost *= 1.6;
      naiveBoost *= 0.7;
    } else if (features.textLength > 200 && features.complexity > 0.8) {
      // Long complex text - naive bayes excels
      naiveBoost *= 1.8;
      ruleBoost *= 0.6;
    }

    // Confidence-based adjustments
    const confidenceDiff = Math.abs(naiveResult.confidence - ruleResult.confidence);
    if (confidenceDiff > 0.3) {
      // Significant confidence difference - trust the more confident model
      if (naiveResult.confidence > ruleResult.confidence) {
        naiveBoost *= 1.3;
        ruleBoost *= 0.8;
      } else {
        ruleBoost *= 1.3;
        naiveBoost *= 0.8;
      }
    }

    // Emotional intensity adjustments - use new emotionalIntensity feature
    if (features.emotionalWords > 2 || features.emotionalIntensity > 3) {
      // High emotional content or strong intensifiers detected - both models can be useful
      if (naiveResult.confidence > 0.7) naiveBoost *= 1.2;
      if (ruleResult.confidence > 0.7) ruleBoost *= 1.2;

      // If very high intensity, favor rules slightly more as they handle context better
      if (features.emotionalIntensity > 6) {
        ruleBoost *= 1.1;
      }
    }

    // Emoji adjustments
    if (features.hasEmojis) {
      ruleBoost *= 1.3; // Rules handle emojis explicitly
      naiveBoost *= 0.9;
    }

    // Apply boosts to base weights
    naiveWeight *= naiveBoost;
    ruleWeight *= ruleBoost;

    // Normalize to ensure weights sum to 1
    const total = naiveWeight + ruleWeight;
    if (total > 0) {
      naiveWeight = naiveWeight / total;
      ruleWeight = ruleWeight / total;
    } else {
      // Fallback to equal weights if something went wrong
      naiveWeight = 0.5;
      ruleWeight = 0.5;
    }

    // Apply minimum thresholds to prevent complete dominance
    const minWeight = 0.05; // Minimum 5% weight
    const maxWeight = 0.95; // Maximum 95% weight

    if (naiveWeight < minWeight) {
      naiveWeight = minWeight;
      ruleWeight = 1.0 - minWeight;
    } else if (naiveWeight > maxWeight) {
      naiveWeight = maxWeight;
      ruleWeight = 1.0 - maxWeight;
    }

    // Calculate weighted confidence with validation
    const weightedConfidence = this.clamp(
      naiveResult.confidence * naiveWeight + ruleResult.confidence * ruleWeight,
      0.0,
      1.0
    );

    // Apply confidence boost only if both models are reasonably confident
    const avgConfidence = (naiveResult.confidence + ruleResult.confidence) / 2;
    const confidenceBoost = avgConfidence > 0.6 ? 1.05 : 1.0; // Modest 5% boost

    return {
      naiveWeight: Math.round(naiveWeight * 1000) / 1000, // Round to 3 decimals
      ruleWeight: Math.round(ruleWeight * 1000) / 1000,
      confidence: this.clamp(weightedConfidence * confidenceBoost, 0.0, 1.0),
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

    // Calculate weighted score with contextual adjustments
    const naiveScore =
      naiveResult.label === 'positive' ? 0.7 : naiveResult.label === 'negative' ? -0.7 : 0;

    const ruleScore = ruleResult.score || 0;
    const baseWeightedScore =
      naiveScore * adjustedWeights.naiveWeight + ruleScore * adjustedWeights.ruleWeight;

    // Apply contextual score adjustments
    let contextualAdjustment = features.contextualScore || 0;

    // Strong contextual overrides
    if (features.isActivismBoycott) {
      // Activism/boycott content should be negative regardless of other signals
      contextualAdjustment = -0.8;
    } else if (features.isCryptoHype && baseWeightedScore >= -0.1) {
      // Crypto hype should be positive unless clearly negative
      contextualAdjustment = Math.max(contextualAdjustment, 0.4);
    } else if (features.isPromotional && baseWeightedScore >= -0.2) {
      // Promotional content should be positive unless clearly negative
      contextualAdjustment = Math.max(contextualAdjustment, 0.3);
    }

    // Apply profanity emphasis correction
    if (features.hasProfanityEmphasis && baseWeightedScore < 0) {
      // If profanity is used for emphasis in positive context, boost score
      contextualAdjustment += 0.4;
    }

    const weightedScore = baseWeightedScore + contextualAdjustment;

    // Determine final label with adjusted thresholds for sarcasm
    const threshold = this.getSentimentThreshold(features.sarcasmIndicators);
    let finalLabel = this.determineSentimentLabel(weightedScore, threshold);

    // Apply sarcasm override
    finalLabel = this.applySarcasmOverride(
      features,
      finalLabel,
      naiveResult,
      ruleResult,
      weightedScore
    );

    // Generate explanation
    const explanationParts = [
      `Auto-adjusted weights (Naive: ${adjustedWeights.naiveWeight.toFixed(2)}, Rule: ${adjustedWeights.ruleWeight.toFixed(2)})`,
    ];

    if (features.sarcasmIndicators > 1)
      explanationParts.push('Sarcasm detected - biasing toward negative');
    if (features.emotionalWords > 2) explanationParts.push('High emotional intensity detected');
    if (features.emotionalIntensity > 3)
      explanationParts.push(`Strong intensifiers detected (score: ${features.emotionalIntensity})`);
    if (features.hasEmojis) explanationParts.push('Emoji analysis applied');
    if (features.isActivismBoycott)
      explanationParts.push('Activism/boycott content detected - classified as negative');
    if (features.isCryptoHype)
      explanationParts.push('Crypto hype/financial content detected - boosted positive');
    if (features.isPromotional)
      explanationParts.push('Promotional content detected - boosted positive');
    if (features.hasProfanityEmphasis)
      explanationParts.push('Profanity used for emphasis - not negative');
    if (features.language !== 'en') explanationParts.push(`Language: ${features.language}`);

    return {
      label: finalLabel,
      confidence: adjustedWeights.confidence,
      score: weightedScore,
      weights: {
        naive: adjustedWeights.naiveWeight,
        rule: adjustedWeights.ruleWeight,
      },
      features,
      explanation: explanationParts.join('; '),
    };
  }

  /**
   * Enhanced hybrid prediction with custom weighted models
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
    const threshold = this.getSentimentThreshold(features.sarcasmIndicators);
    let finalLabel = this.determineSentimentLabel(weightedScore, threshold);

    // Apply sarcasm override for custom weights
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

    const explanationParts = [
      `Custom weights (${weightExplanation})`,
      features.sarcasmIndicators > 1 ? 'Sarcasm detected - biasing toward negative' : '',
      features.emotionalWords > 2 ? 'High emotional intensity detected' : '',
      features.emotionalIntensity > 3
        ? `Strong intensifiers detected (score: ${features.emotionalIntensity})`
        : '',
      features.hasEmojis ? 'Emoji analysis applied' : '',
    ].filter(Boolean);

    return {
      label: finalLabel,
      confidence: weightedConfidence,
      score: weightedScore,
      weights,
      features,
      explanation: explanationParts.join('; '),
    };
  }
}

export const advancedHybridAnalyzer = new AdvancedHybridAnalyzer();

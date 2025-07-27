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
      languageSupport: ['en', 'es', 'de', 'fr']
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

    // ENHANCED SENTIMENT LEXICONS - Expandidos para mejor precisión
    const positiveWords = [
      // Inglés básico
      'amazing', 'awesome', 'excellent', 'fantastic', 'great', 'love', 'perfect', 'wonderful',
      'best', 'incredible', 'outstanding', 'brilliant', 'superb', 'magnificent', 'spectacular',
      'good', 'nice', 'happy', 'pleased', 'satisfied', 'delighted', 'thrilled', 'excited',
      'beautiful', 'stunning', 'gorgeous', 'impressive', 'remarkable', 'exceptional',

      // Inglés adicional
      'fabulous', 'marvelous', 'terrific', 'splendid', 'divine', 'phenomenal', 'extraordinary',
      'flawless', 'elite', 'premium', 'superior', 'top-notch', 'first-class', 'world-class',
      'stellar', 'epic', 'legendary', 'iconic', 'masterpiece', 'genius', 'breakthrough',
      'revolutionary', 'innovative', 'cutting-edge', 'state-of-the-art', 'game-changer',

      // Emociones positivas
      'joy', 'bliss', 'ecstasy', 'euphoria', 'elation', 'cheerful', 'optimistic', 'hopeful',
      'confident', 'proud', 'grateful', 'thankful', 'blessed', 'fortunate', 'lucky',

      // Calidad y valor
      'quality', 'value', 'bargain', 'deal', 'worth', 'worthwhile', 'beneficial', 'useful',
      'helpful', 'effective', 'efficient', 'reliable', 'trustworthy', 'authentic', 'genuine',

      // Español básico
      'increíble', 'excelente', 'fantástico', 'maravilloso', 'perfecto', 'genial', 'súper',
      'bueno', 'buena', 'buenas', 'buenos', 'magnífico', 'espectacular', 'extraordinario',
      'encanta', 'encanto', 'amo', 'adoro', 'feliz', 'contento', 'satisfecho', 'emocionado',

      // Español adicional
      'fabuloso', 'estupendo', 'fenomenal', 'divino', 'precioso', 'hermoso', 'bello',
      'impresionante', 'sorprendente', 'asombroso', 'brillante', 'genial', 'ideal',
      'óptimo', 'exquisito', 'delicioso', 'sabroso', 'rico', 'calidad', 'valor',

      // Alemán básico
      'wunderbar', 'fantastisch', 'großartig', 'ausgezeichnet', 'perfekt', 'toll', 'super',
      'gut', 'schön', 'herrlich', 'prächtig', 'fabelhaft', 'erstaunlich', 'beeindruckend',
      'glücklich', 'zufrieden', 'begeistert', 'erfreut', 'froh', 'dankbar', 'stolz',
      // Alemán adicional
      'unglaublich', 'spektakulär', 'phänomenal', 'außergewöhnlich', 'hervorragend',
      'erstklassig', 'spitzenklasse', 'weltklasse', 'meisterhaft', 'genial', 'brilliant',
      'innovativ', 'revolutionär', 'bahnbrechend', 'wegweisend', 'zukunftsweisend',
      'qualität', 'wert', 'nutzen', 'vorteil', 'hilfreich', 'nützlich', 'wertvoll',

      // Francés básico
      'merveilleux', 'fantastique', 'excellent', 'parfait', 'magnifique', 'superbe', 'génial',
      'bon', 'bonne', 'bons', 'bonnes', 'beau', 'belle', 'joli', 'jolie', 'formidable',
      'heureux', 'heureuse', 'content', 'contente', 'satisfait', 'satisfaite', 'ravi', 'ravie',
      // Francés adicional
      'incroyable', 'extraordinaire', 'exceptionnel', 'remarquable', 'impressionnant',
      'spectaculaire', 'phénoménal', 'fabuleux', 'splendide', 'divin', 'sublime',
      'prestigieux', 'luxueux', 'élégant', 'raffiné', 'sophistiqué', 'innovant',
      'révolutionnaire', 'avant-gardiste', 'qualité', 'valeur', 'avantage', 'bénéfice',
      'utile', 'efficace', 'fiable', 'authentique', 'précieux', 'utilitaire',

      // Expresiones coloquiales
      'cool', 'awesome', 'rad', 'dope', 'lit', 'fire', 'sick', 'tight', 'fresh',
      'legit', 'solid', 'clutch', 'boss', 'mint', 'clean', 'smooth', 'sweet',

      // Emojis y símbolos como texto
      'thumbsup', 'heart', 'fire', 'star', 'crown', 'gem', 'trophy', 'medal'
    ];

    const negativeWords = [
      // Inglés básico
      'awful', 'terrible', 'horrible', 'worst', 'hate', 'disgusting', 'pathetic', 'useless',
      'bad', 'poor', 'disappointing', 'frustrating', 'annoying', 'broken', 'failed', 'wrong',
      'sad', 'angry', 'upset', 'disappointed', 'unhappy', 'concerned', 'worried', 'confused',
      'ugly', 'boring', 'slow', 'expensive', 'cheap', 'fake', 'overpriced', 'uncomfortable',

      // Inglés adicional
      'dreadful', 'appalling', 'atrocious', 'abysmal', 'deplorable', 'despicable', 'detestable',
      'revolting', 'repulsive', 'sickening', 'nauseating', 'vile', 'foul', 'rotten', 'corrupt',
      'toxic', 'harmful', 'damaging', 'destructive', 'disastrous', 'catastrophic', 'ruinous',
      'defective', 'flawed', 'faulty', 'inferior', 'substandard', 'mediocre', 'inadequate',

      // Emociones negativas
      'furious', 'enraged', 'livid', 'irate', 'outraged', 'disgusted', 'repulsed', 'horrified',
      'devastated', 'crushed', 'heartbroken', 'depressed', 'miserable', 'wretched', 'anguished',
      'tormented', 'suffering', 'pain', 'agony', 'torture', 'nightmare', 'hell',

      // Problemas y fallos
      'problem', 'issue', 'trouble', 'difficulty', 'struggle', 'challenge', 'obstacle',
      'error', 'mistake', 'bug', 'glitch', 'crash', 'freeze', 'lag', 'delay',
      'waste', 'loss', 'damage', 'harm', 'injury', 'hurt', 'wound', 'scar',

      // Español básico
      'terrible', 'horrible', 'malo', 'mala', 'malos', 'malas', 'pésimo', 'fatal',
      'desastre', 'disgusto', 'odio', 'detesto', 'asco', 'repugnante', 'asqueroso',
      'triste', 'enfadado', 'molesto', 'frustrado', 'decepcionado', 'preocupado',

      // Español adicional
      'espantoso', 'horroroso', 'abominable', 'detestable', 'repulsivo', 'nauseabundo',
      'deplorable', 'lamentable', 'patético', 'vergonzoso', 'inaceptable', 'intolerable',
      'problema', 'fallo', 'error', 'defecto', 'basura', 'porquería', 'chatarra',

      // Alemán básico
      'schrecklich', 'furchtbar', 'schlecht', 'schlimm', 'schlimmer', 'schlechteste', 'hassen',
      'ekelhaft', 'widerlich', 'abstoßend', 'entsetzlich', 'grauenhaft', 'grausam',
      'traurig', 'wütend', 'ärgerlich', 'frustriert', 'enttäuscht', 'besorgt', 'verwirrt',
      // Alemán adicional
      'katastrophal', 'verheerend', 'zerstörerisch', 'schädlich', 'giftig', 'korrupt',
      'fehlerhaft', 'mangelhaft', 'unzureichend', 'minderwertig', 'mittelmäßig',
      'problem', 'schwierigkeit', 'fehler', 'panne', 'störung', 'schaden', 'verlust',
      'elend', 'jammer', 'qual', 'schmerz', 'leiden', 'alptraum', 'hölle',

      // Francés básico
      'terrible', 'horrible', 'affreux', 'épouvantable', 'mauvais', 'mauvaise', 'pire',
      'détester', 'haïr', 'dégoûtant', 'répugnant', 'pathétique', 'inutile', 'nul',
      'triste', 'en colère', 'fâché', 'frustré', 'déçu', 'inquiet', 'confus',
      // Francés adicional
      'catastrophique', 'désastreux', 'destructeur', 'nuisible', 'toxique', 'corrompu',
      'défectueux', 'défaillant', 'insuffisant', 'inférieur', 'médiocre', 'inadéquat',
      'problème', 'difficulté', 'erreur', 'panne', 'dysfonctionnement', 'dommage', 'perte',
      'misère', 'souffrance', 'douleur', 'agonie', 'torture', 'cauchemar', 'enfer',

      // Expresiones coloquiales negativas
      'trash', 'garbage', 'crap', 'junk', 'rubbish', 'mess', 'disaster', 'nightmare',
      'joke', 'scam', 'ripoff', 'fraud', 'fake', 'phony', 'bogus', 'sketchy',

      // Emojis negativos como texto
      'thumbsdown', 'angry', 'crying', 'skull', 'poop', 'vomit', 'sick'
    ];

    const intensifiers = [
      // Inglés
      'very', 'extremely', 'incredibly', 'absolutely', 'totally', 'completely', 'really',
      'quite', 'rather', 'fairly', 'pretty', 'somewhat', 'slightly', 'truly', 'deeply',
      'super', 'ultra', 'mega', 'hyper', 'tremendously', 'enormously', 'immensely',
      'exceptionally', 'extraordinarily', 'remarkably', 'particularly', 'especially',
      'highly', 'strongly', 'intensely', 'severely', 'seriously', 'critically',
      'massively', 'hugely', 'vastly', 'significantly', 'substantially', 'considerably',

      // Español
      'muy', 'súper', 'ultra', 'mega', 'extremadamente', 'increíblemente', 'totalmente',
      'completamente', 'absolutamente', 'realmente', 'verdaderamente', 'profundamente',
      'bastante', 'demasiado', 'tan', 'tanto', 'mucho', 'poco', 'algo', 'nada',
      'enormemente', 'tremendamente', 'sumamente', 'altamente', 'especialmente',

      // Alemán
      'sehr', 'extrem', 'unglaublich', 'absolut', 'völlig', 'komplett', 'wirklich',
      'ziemlich', 'eher', 'recht', 'ganz', 'etwas', 'leicht', 'wahrhaft', 'tief',
      'super', 'ultra', 'mega', 'hyper', 'enorm', 'immens', 'gewaltig',
      'außergewöhnlich', 'außerordentlich', 'bemerkenswert', 'besonders', 'speziell',
      'hoch', 'stark', 'intensiv', 'schwer', 'ernst', 'kritisch', 'massiv',

      // Francés
      'très', 'extrêmement', 'incroyablement', 'absolument', 'totalement', 'complètement', 'vraiment',
      'assez', 'plutôt', 'relativement', 'pas mal', 'quelque peu', 'légèrement', 'vraiment', 'profondément',
      'super', 'ultra', 'méga', 'hyper', 'énormément', 'immensément', 'considérablement',
      'exceptionnellement', 'extraordinairement', 'remarquablement', 'particulièrement', 'spécialement',
      'hautement', 'fortement', 'intensément', 'sévèrement', 'sérieusement', 'gravement',

      // Expresiones coloquiales
      'hella', 'super', 'crazy', 'mad', 'wicked', 'stupid', 'insanely', 'ridiculously',
      'damn', 'fucking', 'bloody', 'freaking', 'frickin', 'freakin'
    ];

    const negators = [
      // Inglés básico
      'not', 'no', 'never', 'none', 'nothing', 'nobody', 'nowhere', "don't", "won't", "can't",
      "shouldn't", "wouldn't", "couldn't", "mustn't", "needn't", "haven't", "hasn't", "hadn't",
      "isn't", "aren't", "wasn't", "weren't", "doesn't", "didn't", "ain't",

      // Inglés adicional  
      'without', 'lack', 'lacking', 'missing', 'absent', 'void', 'devoid', 'empty',
      'fail', 'failed', 'failure', 'unable', 'impossible', 'cannot', 'hardly', 'barely',
      'scarcely', 'rarely', 'seldom', 'neither', 'nor', 'refuse', 'deny', 'reject',

      // Español básico
      'no', 'nunca', 'jamás', 'nada', 'nadie', 'ningún', 'ninguna', 'ninguno', 'ningunos',
      'sin', 'falta', 'carece', 'ausente', 'vacío', 'imposible', 'incapaz',

      // Español adicional
      'tampoco', 'apenas', 'escasamente', 'raramente', 'difícilmente', 'ni', 'rechazar',
      'negar', 'denegar', 'fallar', 'fracasar', 'fracaso', 'fallo', 'error',

      // Alemán básico
      'nicht', 'nein', 'nie', 'niemals', 'nichts', 'niemand', 'nirgendwo', 'kein', 'keine',
      'ohne', 'fehlen', 'fehlend', 'vermissen', 'abwesend', 'leer', 'unmöglich', 'unfähig',
      // Alemán adicional
      'kaum', 'selten', 'weder', 'noch', 'ablehnen', 'verweigern', 'verneinen',
      'versagen', 'scheitern', 'fehler', 'mangel', 'verlust',

      // Francés básico
      'ne', 'pas', 'non', 'jamais', 'rien', 'personne', 'nulle part', 'aucun', 'aucune',
      'sans', 'manquer', 'manquant', 'absent', 'vide', 'impossible', 'incapable',
      // Francés adicional
      'à peine', 'rarement', 'ni', 'refuser', 'nier', 'rejeter',
      'échouer', 'échec', 'erreur', 'défaut', 'perte', 'manque',

      // Contracciones y coloquiales
      'aint', 'nope', 'nah', 'nay', 'nix', 'zilch', 'zip', 'zero', 'nil'
    ];

    // ALGORITMO MEJORADO DE ANÁLISIS
    const words = cleanText.toLowerCase().split(/\s+/);
    let score = 0;
    let magnitude = 0;
    let wordCount = 0;
    let sentimentWords: Array<{ word: string, score: number, position: number }> = [];

    // Primera pasada: identificar palabras de sentimiento
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      let baseScore = 0;

      if (positiveWords.includes(word)) {
        baseScore = 1.0;
      } else if (negativeWords.includes(word)) {
        baseScore = -1.0;
      }

      if (baseScore !== 0) {
        sentimentWords.push({ word, score: baseScore, position: i });
        wordCount++;
      }
    }

    // Segunda pasada: aplicar modificadores contextuales
    for (const sentimentWord of sentimentWords) {
      let finalScore = sentimentWord.score;
      let intensity = 1.0;
      const pos = sentimentWord.position;

      // Buscar intensificadores en ventana de 3 palabras antes
      for (let j = Math.max(0, pos - 3); j < pos; j++) {
        const prevWord = words[j];
        if (intensifiers.includes(prevWord)) {
          // Diferentes niveles de intensificación
          if (['extremely', 'incredibly', 'absolutely', 'tremendously', 'enormously'].includes(prevWord) ||
            ['extremadamente', 'increíblemente', 'absolutamente', 'tremendamente'].includes(prevWord)) {
            intensity = 2.0;
          } else if (['very', 'really', 'super', 'quite', 'pretty'].includes(prevWord) ||
            ['muy', 'súper', 'bastante', 'realmente'].includes(prevWord)) {
            intensity = 1.5;
          } else if (['somewhat', 'rather', 'fairly', 'slightly'].includes(prevWord) ||
            ['algo', 'poco', 'ligeramente'].includes(prevWord)) {
            intensity = 1.2;
          } else {
            intensity = 1.3; // intensificador genérico
          }
          break; // Solo tomar el intensificador más cercano
        }
      }

      // Buscar negadores en ventana de 4 palabras antes
      let negated = false;
      for (let j = Math.max(0, pos - 4); j < pos; j++) {
        const prevWord = words[j];
        if (negators.includes(prevWord)) {
          negated = true;
          break;
        }
      }

      // Aplicar intensidad
      finalScore *= intensity;

      // Aplicar negación (inversión parcial, no total)
      if (negated) {
        finalScore *= -0.75; // Negación no es inversión total
      }

      // Considerar posición en el texto (las últimas palabras tienen más peso)
      const positionWeight = 1 + (pos / words.length) * 0.3;
      finalScore *= positionWeight;

      score += finalScore;
      magnitude += Math.abs(finalScore);
    }

    // CÁLCULOS FINALES MEJORADOS
    let normalizedScore = 0;
    let normalizedMagnitude = 0;

    if (wordCount > 0) {
      // Normalización más sofisticada
      const avgScore = score / wordCount;
      const textLength = words.length;

      // Ajuste por longitud del texto
      const lengthFactor = Math.min(1.0, Math.log(textLength + 1) / Math.log(20));

      // Normalización con factor de longitud
      normalizedScore = Math.max(-1, Math.min(1, avgScore * lengthFactor));
      normalizedMagnitude = (magnitude / wordCount) * lengthFactor;
    }

    // Determinar confianza basada en múltiples factores
    const density = wordCount / words.length; // Densidad de palabras de sentimiento
    const textLengthFactor = Math.min(1.0, words.length / 10); // Textos más largos = más confianza
    const magnitudeFactor = Math.min(1.0, normalizedMagnitude); // Mayor magnitud = más confianza

    const confidence = Math.min(0.95, Math.max(0.1,
      (density * 0.4 + textLengthFactor * 0.3 + magnitudeFactor * 0.3)
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
   * Analyze emotions in text - ENHANCED VERSION
   */
  private analyzeEmotions(text: string, sentimentScore: number): EmotionAnalysis {
    const lowerText = text.toLowerCase();

    // ENHANCED EMOTION KEYWORDS - Expandidos con términos en 4 idiomas: EN, ES, DE, FR
    const emotionKeywords = {
      joy: [
        // Inglés
        'happy', 'joy', 'joyful', 'excited', 'thrilled', 'delighted', 'cheerful', 'elated',
        'love', 'loving', 'blissful', 'ecstatic', 'euphoric', 'gleeful', 'merry', 'jolly',
        'upbeat', 'optimistic', 'hopeful', 'bright', 'sunny', 'radiant', 'beaming',
        'celebrate', 'celebration', 'party', 'fun', 'enjoyable', 'pleasant', 'wonderful',
        'amazing', 'fantastic', 'marvelous', 'terrific', 'brilliant', 'awesome', 'great',
        // Español
        'feliz', 'alegre', 'contento', 'emocionado', 'encantado', 'radiante', 'eufórico',
        'gozoso', 'dichoso', 'jubiloso', 'animado', 'optimista', 'esperanzado',
        'celebrar', 'fiesta', 'diversión', 'disfrute', 'placer', 'gozo', 'júbilo',
        // Alemán
        'glücklich', 'freude', 'freudig', 'aufgeregt', 'begeistert', 'erfreut', 'fröhlich',
        'heiter', 'liebe', 'liebevoll', 'selig', 'ekstatisch', 'euphorisch', 'vergnügt',
        'munter', 'lustig', 'optimistisch', 'hoffnungsvoll', 'hell', 'sonnig', 'strahlend',
        'feiern', 'feier', 'party', 'spaß', 'vergnügen', 'angenehm', 'wunderbar',
        // Francés
        'heureux', 'heureuse', 'joie', 'joyeux', 'excité', 'ravi', 'ravie', 'enchanté',
        'radieux', 'euphorique', 'gai', 'gaie', 'optimiste', 'espoir', 'lumineux',
        'célébrer', 'fête', 'amusement', 'plaisir', 'agréable', 'merveilleux', 'fantastique',
        // Emojis como texto
        'smile', 'laugh', 'heart', 'hearts', 'sunshine', 'rainbow', 'star', 'fire'
      ],

      sadness: [
        // Inglés
        'sad', 'sadness', 'depressed', 'depression', 'disappointed', 'disappointment',
        'heartbroken', 'sorry', 'grief', 'grieve', 'mourn', 'mourning', 'melancholy',
        'gloomy', 'blue', 'down', 'low', 'miserable', 'wretched', 'devastated',
        'crushed', 'broken', 'hurt', 'pain', 'painful', 'ache', 'aching', 'sorrow',
        'tears', 'cry', 'crying', 'weep', 'weeping', 'sob', 'sobbing', 'lament',
        // Español
        'triste', 'tristeza', 'deprimido', 'depresión', 'decepcionado', 'decepción',
        'dolido', 'dolor', 'pena', 'pesar', 'luto', 'melancolía', 'desanimado',
        'abatido', 'desalentado', 'desconsolado', 'afligido', 'angustiado',
        'llorar', 'llanto', 'lágrimas', 'sollozar', 'lamentar', 'sufrir', 'sufrimiento',
        // Alemán
        'traurig', 'trauer', 'deprimiert', 'depression', 'enttäuscht', 'enttäuschung',
        'herzzerbrochen', 'leid', 'kummer', 'trauern', 'melancholie', 'düster',
        'niedergeschlagen', 'elend', 'erbärmlich', 'verzweifelt', 'zerbrochen',
        'verletzt', 'schmerz', 'schmerzlich', 'tränen', 'weinen', 'schluchzen',
        // Francés
        'triste', 'tristesse', 'déprimé', 'dépression', 'déçu', 'déception',
        'cœur brisé', 'désolé', 'chagrin', 'pleurer', 'deuil', 'mélancolie',
        'sombre', 'abattu', 'misérable', 'malheureux', 'dévasté', 'brisé',
        'blessé', 'douleur', 'douloureux', 'larmes', 'pleurer', 'sangloter',
        // Emojis como texto
        'crying', 'tear', 'broken_heart', 'wilted_flower'
      ],

      anger: [
        // Inglés
        'angry', 'anger', 'furious', 'rage', 'mad', 'irate', 'livid', 'enraged',
        'outraged', 'incensed', 'infuriated', 'annoyed', 'irritated', 'frustrated',
        'aggravated', 'agitated', 'hostile', 'aggressive', 'violent', 'fierce',
        'hate', 'hatred', 'despise', 'loathe', 'detest', 'abhor', 'resent',
        'disgusted', 'revolted', 'appalled', 'outrageous', 'unacceptable',
        // Español
        'enfadado', 'enojado', 'furioso', 'rabioso', 'iracundo', 'indignado',
        'molesto', 'irritado', 'frustrado', 'exasperado', 'hostil', 'agresivo',
        'odio', 'odiar', 'detestar', 'despreciar', 'aborrecer', 'repugnar',
        'disgusto', 'asco', 'repugnancia', 'indignación', 'cólera', 'ira',
        // Alemán
        'wütend', 'wut', 'zornig', 'zorn', 'verrückt', 'rasend', 'empört',
        'erbost', 'gereizt', 'irritiert', 'frustriert', 'feindselig', 'aggressiv',
        'hassen', 'hass', 'verachten', 'verabscheuen', 'angewidert', 'empörend',
        // Francés
        'en colère', 'colère', 'furieux', 'rage', 'fou', 'enragé', 'indigné',
        'agacé', 'irrité', 'frustré', 'hostile', 'agressif', 'violent',
        'détester', 'haine', 'mépriser', 'dégoûté', 'révoltant', 'inacceptable',
        // Emojis como texto
        'angry_face', 'rage', 'steam', 'explosion', 'fire'
      ],

      fear: [
        // Inglés
        'scared', 'afraid', 'fear', 'fearful', 'terrified', 'terror', 'horrified',
        'horror', 'frightened', 'panic', 'panicked', 'anxious', 'anxiety', 'worried',
        'worry', 'nervous', 'tense', 'stressed', 'stress', 'concerned', 'alarmed',
        'dread', 'dreading', 'apprehensive', 'uneasy', 'insecure', 'vulnerable',
        'threatened', 'danger', 'dangerous', 'risky', 'unsafe', 'petrified',
        // Español
        'miedo', 'temor', 'asustado', 'aterrorizado', 'horrorizado', 'espantado',
        'pánico', 'ansioso', 'ansiedad', 'preocupado', 'nervioso', 'tenso',
        'estresado', 'estrés', 'inquieto', 'intranquilo', 'inseguro', 'vulnerable',
        'amenazado', 'peligro', 'peligroso', 'riesgo', 'riesgoso', 'petrificado',
        // Alemán
        'angst', 'ängstlich', 'furcht', 'erschrocken', 'verängstigt', 'terror',
        'entsetzt', 'panik', 'panisch', 'ängstlich', 'besorgt', 'nervös',
        'gestresst', 'stress', 'beunruhigt', 'unsicher', 'verwundbar',
        'bedroht', 'gefahr', 'gefährlich', 'riskant', 'unsicher',
        // Francés
        'peur', 'effrayé', 'terrifié', 'terreur', 'horrifié', 'horreur',
        'panique', 'paniqué', 'anxieux', 'anxiété', 'inquiet', 'nerveux',
        'stressé', 'stress', 'préoccupé', 'alarmé', 'redouter', 'insécure',
        'vulnérable', 'menacé', 'danger', 'dangereux', 'risqué', 'pétrifié',
        // Emojis como texto
        'fearful_face', 'scream', 'ghost', 'skull', 'warning'
      ],

      surprise: [
        // Inglés
        'surprised', 'surprise', 'amazed', 'amazing', 'astonished', 'astounding',
        'shocked', 'shocking', 'stunned', 'stunning', 'bewildered', 'perplexed',
        'confused', 'puzzled', 'baffled', 'flabbergasted', 'dumbfounded',
        'unexpected', 'sudden', 'wow', 'whoa', 'omg', 'incredible', 'unbelievable',
        'remarkable', 'extraordinary', 'phenomenal', 'mind-blowing', 'jaw-dropping',
        // Español
        'sorprendido', 'sorpresa', 'asombrado', 'asombroso', 'pasmado', 'atónito',
        'desconcertado', 'perplejo', 'confundido', 'inesperado', 'repentino',
        'increíble', 'inaudito', 'extraordinario', 'fenomenal', 'impresionante',
        'wow', 'guau', 'vaya', 'madre mía', 'dios mío', 'impactante',
        // Alemán
        'überrascht', 'überraschung', 'erstaunt', 'erstaunlich', 'verblüfft',
        'schockiert', 'schockierend', 'verwirrt', 'perplex', 'unerwartet',
        'plötzlich', 'wow', 'unglaublich', 'außergewöhnlich', 'phänomenal',
        // Francés
        'surpris', 'surprise', 'étonné', 'étonnant', 'stupéfait', 'choqué',
        'choquant', 'confus', 'perplexe', 'inattendu', 'soudain',
        'incroyable', 'extraordinaire', 'phénoménal', 'stupéfiant',
        // Emojis como texto
        'surprised_face', 'exploding_head', 'star_struck', 'mind_blown'
      ],

      disgust: [
        // Inglés
        'disgusting', 'disgusted', 'disgust', 'gross', 'revolting', 'repulsive',
        'nauseating', 'nauseous', 'sick', 'sickening', 'vile', 'foul', 'rotten',
        'putrid', 'stinking', 'awful', 'horrible', 'terrible', 'appalling',
        'repugnant', 'abhorrent', 'loathsome', 'detestable', 'offensive',
        'yuck', 'yucky', 'ew', 'eww', 'ugh', 'blegh', 'nasty', 'filthy',
        // Español
        'asco', 'asqueroso', 'repugnante', 'nauseabundo', 'vomitivo', 'asqueante',
        'repulsivo', 'vil', 'inmundo', 'sucio', 'podrido', 'pútrido', 'hediondo',
        'horrible', 'espantoso', 'abominable', 'detestable', 'ofensivo',
        'puaj', 'guácala', 'qué asco', 'cochino', 'mugriento', 'pestilente',
        // Alemán
        'ekelhaft', 'ekel', 'widerlich', 'abstoßend', 'abscheulich', 'übel',
        'schlecht', 'faul', 'stinkend', 'scheußlich', 'grauenhaft',
        'widerwärtig', 'garstig', 'schmutzig', 'dreckig', 'igitt',
        // Francés
        'dégoûtant', 'dégoût', 'répugnant', 'écœurant', 'nauséabond',
        'répulsif', 'vil', 'immonde', 'sale', 'pourri', 'puant',
        'horrible', 'épouvantable', 'abominable', 'détestable', 'offensant',
        'beurk', 'pouah', 'dégueulasse', 'crasseux', 'immonde',
        // Emojis como texto
        'nauseated_face', 'vomiting', 'sick', 'poop', 'rotten'
      ]
    };

    const emotions: EmotionAnalysis = {
      joy: 0,
      sadness: 0,
      anger: 0,
      fear: 0,
      surprise: 0,
      disgust: 0
    };

    // ALGORITMO MEJORADO: Análisis con pesos y contexto
    for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
      let emotionScore = 0;
      let keywordCount = 0;

      keywords.forEach(keyword => {
        // Buscar coincidencias exactas y parciales
        const exactMatches = (lowerText.match(new RegExp(`\\b${keyword}\\b`, 'g')) || []).length;
        const partialMatches = (lowerText.match(new RegExp(keyword, 'g')) || []).length - exactMatches;

        // Pesos diferentes para coincidencias exactas vs parciales
        emotionScore += exactMatches * 1.0 + partialMatches * 0.5;
        keywordCount += exactMatches + partialMatches;
      });

      // Normalizar por densidad de palabras emocionales
      const textWords = lowerText.split(/\s+/).length;
      const density = keywordCount / Math.max(textWords, 1);

      // Aplicar factor de densidad y limitar a rango [0, 1]
      emotions[emotion as keyof EmotionAnalysis] = Math.min(1, density * 3);
    }

    // AJUSTES BASADOS EN SENTIMIENTO GENERAL
    if (sentimentScore > 0.3) {
      emotions.joy += sentimentScore * 0.4;
    } else if (sentimentScore < -0.3) {
      // Distribuir sentimiento negativo entre tristeza e ira
      emotions.sadness += Math.abs(sentimentScore) * 0.3;
      emotions.anger += Math.abs(sentimentScore) * 0.2;
    }

    // NORMALIZACIÓN FINAL - Asegurar rango [0, 1]
    Object.keys(emotions).forEach(key => {
      emotions[key as keyof EmotionAnalysis] = Math.min(1, Math.max(0, emotions[key as keyof EmotionAnalysis]));
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
   * Detect language of text - ENHANCED VERSION for 4 languages
   */
  private detectLanguage(text: string): string {
    // Expanded language detection for EN, ES, DE, FR
    const spanishWords = ['el', 'la', 'de', 'que', 'y', 'en', 'un', 'es', 'se', 'no', 'te', 'lo', 'le', 'da', 'su', 'por', 'son', 'con', 'para', 'muy', 'del', 'al', 'una', 'pero', 'más', 'todo', 'esta', 'como', 'tiene', 'tiempo'];
    const englishWords = ['the', 'of', 'and', 'to', 'a', 'in', 'is', 'it', 'you', 'that', 'he', 'was', 'for', 'on', 'are', 'as', 'with', 'his', 'they', 'this', 'have', 'from', 'or', 'one', 'had', 'by', 'words', 'but', 'not', 'what'];
    const germanWords = ['der', 'die', 'und', 'in', 'den', 'von', 'zu', 'das', 'mit', 'sich', 'des', 'auf', 'für', 'ist', 'im', 'dem', 'nicht', 'ein', 'eine', 'als', 'auch', 'es', 'an', 'werden', 'aus', 'er', 'hat', 'dass', 'sie', 'nach'];
    const frenchWords = ['le', 'de', 'et', 'à', 'un', 'il', 'être', 'et', 'en', 'avoir', 'que', 'pour', 'dans', 'ce', 'son', 'une', 'sur', 'avec', 'ne', 'se', 'pas', 'tout', 'pouvoir', 'par', 'plus', 'dire', 'me', 'on', 'mon', 'lui'];

    const words = text.toLowerCase().split(/\s+/);
    let spanishCount = 0;
    let englishCount = 0;
    let germanCount = 0;
    let frenchCount = 0;

    words.forEach(word => {
      if (spanishWords.includes(word)) spanishCount++;
      if (englishWords.includes(word)) englishCount++;
      if (germanWords.includes(word)) germanCount++;
      if (frenchWords.includes(word)) frenchCount++;
    });

    // Determine the language with the highest count
    const counts = [
      { lang: 'es', count: spanishCount },
      { lang: 'en', count: englishCount },
      { lang: 'de', count: germanCount },
      { lang: 'fr', count: frenchCount }
    ];

    // Sort by count (descending) and return the language with highest count
    counts.sort((a, b) => b.count - a.count);

    // If no language has a clear majority, default to English
    if (counts[0].count === 0) return 'en';

    return counts[0].lang;
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
   * Preprocess text for better analysis - ENHANCED VERSION
   */
  private preprocessText(text: string): string {
    if (!text || typeof text !== 'string') {
      return '';
    }

    let processed = text.toLowerCase().trim();

    // PASO 1: Remover URLs pero mantener el contexto
    processed = processed.replace(/https?:\/\/[^\s]+/g, ' link ');

    // PASO 2: Normalizar caracteres especiales y acentos
    const charMap: { [key: string]: string } = {
      'á': 'a', 'à': 'a', 'ä': 'a', 'â': 'a', 'ã': 'a', 'å': 'a',
      'é': 'e', 'è': 'e', 'ë': 'e', 'ê': 'e',
      'í': 'i', 'ì': 'i', 'ï': 'i', 'î': 'i',
      'ó': 'o', 'ò': 'o', 'ö': 'o', 'ô': 'o', 'õ': 'o', 'ø': 'o',
      'ú': 'u', 'ù': 'u', 'ü': 'u', 'û': 'u',
      'ñ': 'n', 'ç': 'c'
    };

    Object.keys(charMap).forEach(char => {
      processed = processed.replace(new RegExp(char, 'g'), charMap[char]);
    });

    // PASO 3: Expandir contracciones comunes en 4 idiomas: EN, ES, DE, FR
    const contractions: { [key: string]: string } = {
      // Inglés
      "don't": "do not", "doesn't": "does not", "didn't": "did not",
      "won't": "will not", "wouldn't": "would not", "shouldn't": "should not",
      "can't": "cannot", "couldn't": "could not", "mustn't": "must not",
      "isn't": "is not", "aren't": "are not", "wasn't": "was not",
      "weren't": "were not", "haven't": "have not", "hasn't": "has not",
      "hadn't": "had not", "i'm": "i am", "you're": "you are",
      "he's": "he is", "she's": "she is", "it's": "it is",
      "we're": "we are", "they're": "they are", "i've": "i have",
      "you've": "you have", "we've": "we have", "they've": "they have",
      "i'll": "i will", "you'll": "you will", "he'll": "he will",
      "she'll": "she will", "we'll": "we will", "they'll": "they will",
      "i'd": "i would", "you'd": "you would", "he'd": "he would",
      "she'd": "she would", "we'd": "we would", "they'd": "they would",

      // Español - contracciones informales comunes
      "q ": "que ", "xq": "porque", "pq": "porque", "x": "por",
      "tb": "tambien", "tmb": "tambien", "d ": "de ", "pa": "para",
      "xa": "para", "xfa": "por favor", "pf": "por favor",
      "ke": "que", "kien": "quien", "komo": "como", "kuando": "cuando",

      // Alemán - contracciones comunes
      "ich bin": "ich bin", "du bist": "du bist", "er ist": "er ist",
      "wir sind": "wir sind", "ihr seid": "ihr seid", "sie sind": "sie sind",
      "hab": "habe", "hast": "hast", "hat": "hat", "habt": "habt", "haben": "haben",
      "werd": "werde", "wirst": "wirst", "wird": "wird", "werdet": "werdet", "werden": "werden",
      "bin": "bin", "bist": "bist", "ist": "ist", "sind": "sind", "seid": "seid",

      // Francés - contracciones comunes
      "j'ai": "je ai", "j'aime": "je aime", "j'étais": "je étais",
      "c'est": "ce est", "c'était": "ce était", "c'sera": "ce sera",
      "l'ai": "le ai", "l'avait": "le avait", "l'est": "le est",
      "d'accord": "de accord", "d'habitude": "de habitude", "d'ailleurs": "de ailleurs",
      "qu'est": "que est", "qu'il": "que il", "qu'elle": "que elle",
      "n'est": "ne est", "n'ai": "ne ai", "n'était": "ne était"
    };

    Object.keys(contractions).forEach(contraction => {
      const regex = new RegExp(`\\b${contraction}\\b`, 'gi');
      processed = processed.replace(regex, contractions[contraction]);
    });

    // PASO 4: Normalizar repeticiones excesivas de caracteres
    // "hooooola" -> "hoola", "siiiiii" -> "sii"
    processed = processed.replace(/(.)\1{2,}/g, '$1$1');

    // PASO 5: Normalizar signos de puntuación múltiples
    processed = processed.replace(/[!]{2,}/g, '!');
    processed = processed.replace(/[?]{2,}/g, '?');
    processed = processed.replace(/[.]{3,}/g, '...');

    // PASO 6: Convertir emojis de texto común a palabras
    const emojiMap: { [key: string]: string } = {
      ':)': ' happy ', ':(': ' sad ', ':D': ' very happy ',
      ':/': ' confused ', ':|': ' neutral ', ':P': ' playful ',
      ';)': ' wink ', '<3': ' love ', '</3': ' heartbreak ',
      ':@': ' angry ', '>:(': ' very angry ', 'xD': ' laugh ',
      ':-*': ' kiss ', ':o': ' surprised ', 'o.O': ' confused ',
      '^^': ' happy ', '>.<': ' annoyed ', 'T_T': ' crying ',
      '-.-': ' tired ', '>.>': ' suspicious ', '<.<': ' shy '
    };

    Object.keys(emojiMap).forEach(emoji => {
      processed = processed.replace(new RegExp(emoji.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), emojiMap[emoji]);
    });

    // PASO 7: Limpiar caracteres especiales manteniendo algunos importantes
    processed = processed.replace(/[^\w\sáéíóúñü.,!?#@]/g, ' '); // Mantener # y @ para hashtags y mentions
    processed = processed.replace(/\s+/g, ' '); // Espacios múltiples a uno solo

    // PASO 8: Eliminar palabras muy cortas (1 carácter) excepto algunas importantes
    const importantSingleChars = ['a', 'i', 'y', 'o', 'u']; // "a", "I", "y" (and), "o" (or), "u" (you)
    processed = processed.replace(/\b\w\b/g, (match) =>
      importantSingleChars.includes(match.toLowerCase()) ? match : ' '
    );

    // PASO 9: Limpieza final
    processed = processed.replace(/\s+/g, ' ').trim();

    return processed;
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

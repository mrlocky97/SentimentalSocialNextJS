/**
 * Multi-language Sentiment Analyzer
 * Supports English, Spanish, French, German, Italian, Portuguese
 */

export interface MultiLanguageConfig {
  primaryLanguage: string;
  fallbackLanguage: string;
  autoDetect: boolean;
}

export class MultiLanguageSentimentAnalyzer {
  private languageLexicons: Map<string, any>;
  private supportedLanguages = ["en", "es", "fr", "de", "it", "pt"];

  constructor() {
    this.languageLexicons = new Map();
    this.initializeLexicons();
  }

  private initializeLexicons() {
    // English lexicon (base)
    this.languageLexicons.set("en", {
      positive: [
        "amazing",
        "awesome",
        "brilliant",
        "excellent",
        "fantastic",
        "great",
        "incredible",
        "love",
        "perfect",
        "wonderful",
        "outstanding",
        "superb",
        "magnificent",
        "phenomenal",
        "remarkable",
        "spectacular",
        "terrific",
        "marvelous",
        "fabulous",
        "delightful",
        "good",
        "nice",
        "best",
        "beautiful",
        "happy",
        "excited",
        "thrilled",
        "pleased",
      ],
      negative: [
        "awful",
        "terrible",
        "horrible",
        "disgusting",
        "hate",
        "worst",
        "pathetic",
        "useless",
        "worthless",
        "disappointing",
        "frustrating",
        "annoying",
        "ridiculous",
        "stupid",
        "dumb",
        "crazy",
        "insane",
        "devastating",
        "tragic",
        "disaster",
        "bad",
        "poor",
        "sad",
        "angry",
        "mad",
        "upset",
        "depressed",
        "miserable",
      ],
      intensifiers: [
        "very",
        "extremely",
        "incredibly",
        "absolutely",
        "completely",
        "totally",
      ],
      negations: [
        "not",
        "no",
        "never",
        "none",
        "hardly",
        "barely",
        "don't",
        "doesn't",
        "won't",
        "can't",
      ],
    });

    // Spanish lexicon
    this.languageLexicons.set("es", {
      positive: [
        "increíble",
        "fantástico",
        "excelente",
        "genial",
        "maravilloso",
        "perfecto",
        "brillante",
        "amor",
        "amo",
        "encanta",
        "encantado",
        "feliz",
        "contento",
        "alegre",
        "emocionado",
        "bueno",
        "buena",
        "mejor",
        "hermoso",
        "hermosa",
        "estupendo",
        "magnífico",
        "extraordinario",
      ],
      negative: [
        "terrible",
        "horrible",
        "malo",
        "mala",
        "pésimo",
        "pésima",
        "odio",
        "detesto",
        "asqueroso",
        "repugnante",
        "decepcionante",
        "frustante",
        "molesto",
        "ridículo",
        "estúpido",
        "tonto",
        "inútil",
        "desastre",
        "trágico",
        "devastador",
        "triste",
        "enfadado",
        "enojado",
        "deprimido",
        "miserable",
        "furioso",
      ],
      intensifiers: [
        "muy",
        "extremadamente",
        "increíblemente",
        "absolutamente",
        "completamente",
        "totalmente",
      ],
      negations: [
        "no",
        "nunca",
        "jamás",
        "nada",
        "nadie",
        "ningún",
        "ninguna",
        "sin",
      ],
    });

    // French lexicon
    this.languageLexicons.set("fr", {
      positive: [
        "incroyable",
        "fantastique",
        "excellent",
        "génial",
        "merveilleux",
        "parfait",
        "brillant",
        "amour",
        "aime",
        "adore",
        "heureux",
        "content",
        "joyeux",
        "excité",
        "ravi",
        "bon",
        "bonne",
        "meilleur",
        "beau",
        "belle",
        "formidable",
        "magnifique",
        "extraordinaire",
      ],
      negative: [
        "terrible",
        "horrible",
        "mauvais",
        "mauvaise",
        "affreux",
        "affreuse",
        "déteste",
        "hais",
        "dégoûtant",
        "répugnant",
        "décevant",
        "frustrant",
        "énervant",
        "ridicule",
        "stupide",
        "idiot",
        "inutile",
        "désastre",
        "tragique",
        "dévastateur",
        "triste",
        "en colère",
        "fâché",
        "déprimé",
        "misérable",
        "furieux",
      ],
      intensifiers: [
        "très",
        "extrêmement",
        "incroyablement",
        "absolument",
        "complètement",
        "totalement",
      ],
      negations: [
        "ne",
        "pas",
        "non",
        "jamais",
        "rien",
        "personne",
        "aucun",
        "aucune",
      ],
    });

    // German lexicon
    this.languageLexicons.set("de", {
      positive: [
        "unglaublich",
        "fantastisch",
        "ausgezeichnet",
        "großartig",
        "wunderbar",
        "perfekt",
        "brillant",
        "liebe",
        "lieben",
        "glücklich",
        "zufrieden",
        "froh",
        "aufgeregt",
        "begeistert",
        "gut",
        "beste",
        "schön",
        "herrlich",
        "prächtig",
        "außergewöhnlich",
        "hervorragend",
      ],
      negative: [
        "schrecklich",
        "furchtbar",
        "schlecht",
        "schlimm",
        "hasse",
        "hassen",
        "ekelhaft",
        "widerlich",
        "enttäuschend",
        "frustrierend",
        "ärgerlich",
        "lächerlich",
        "dumm",
        "nutzlos",
        "katastrophe",
        "tragisch",
        "verheerend",
        "traurig",
        "wütend",
        "verärgert",
        "deprimiert",
        "elend",
        "rasend",
      ],
      intensifiers: [
        "sehr",
        "extrem",
        "unglaublich",
        "absolut",
        "völlig",
        "total",
      ],
      negations: [
        "nicht",
        "nein",
        "nie",
        "niemals",
        "nichts",
        "niemand",
        "kein",
        "keine",
      ],
    });

    // Italian lexicon
    this.languageLexicons.set("it", {
      positive: [
        "incredibile",
        "fantastico",
        "eccellente",
        "geniale",
        "meraviglioso",
        "perfetto",
        "brillante",
        "amore",
        "amo",
        "adoro",
        "felice",
        "contento",
        "allegro",
        "emozionato",
        "entusiasta",
        "buono",
        "buona",
        "migliore",
        "bello",
        "bella",
        "stupendo",
        "magnifico",
        "straordinario",
      ],
      negative: [
        "terribile",
        "orribile",
        "cattivo",
        "cattiva",
        "pessimo",
        "pessima",
        "odio",
        "detesto",
        "disgustoso",
        "ripugnante",
        "deludente",
        "frustrante",
        "fastidioso",
        "ridicolo",
        "stupido",
        "idiota",
        "inutile",
        "disastro",
        "tragico",
        "devastante",
        "triste",
        "arrabbiato",
        "infuriato",
        "depresso",
        "miserabile",
        "furioso",
      ],
      intensifiers: [
        "molto",
        "estremamente",
        "incredibilmente",
        "assolutamente",
        "completamente",
        "totalmente",
      ],
      negations: ["non", "no", "mai", "niente", "nessuno", "nessuna", "senza"],
    });

    // Portuguese lexicon
    this.languageLexicons.set("pt", {
      positive: [
        "incrível",
        "fantástico",
        "excelente",
        "genial",
        "maravilhoso",
        "perfeito",
        "brilhante",
        "amor",
        "amo",
        "adoro",
        "feliz",
        "contente",
        "alegre",
        "animado",
        "entusiasmado",
        "bom",
        "boa",
        "melhor",
        "lindo",
        "linda",
        "estupendo",
        "magnífico",
        "extraordinário",
      ],
      negative: [
        "terrível",
        "horrível",
        "ruim",
        "péssimo",
        "péssima",
        "odeio",
        "detesto",
        "nojento",
        "repugnante",
        "decepcionante",
        "frustrante",
        "irritante",
        "ridículo",
        "estúpido",
        "idiota",
        "inútil",
        "desastre",
        "trágico",
        "devastador",
        "triste",
        "zangado",
        "irritado",
        "deprimido",
        "miserável",
        "furioso",
      ],
      intensifiers: [
        "muito",
        "extremamente",
        "incrivelmente",
        "absolutamente",
        "completamente",
        "totalmente",
      ],
      negations: [
        "não",
        "nunca",
        "jamais",
        "nada",
        "ninguém",
        "nenhum",
        "nenhuma",
        "sem",
      ],
    });
  }

  /**
   * Detect language of text
   */
  detectLanguage(text: string): string {
    const lowerText = text.toLowerCase();
    const scores: { [key: string]: number } = {};

    // Initialize scores
    this.supportedLanguages.forEach((lang) => (scores[lang] = 0));

    // Score based on lexicon matches
    for (const [lang, lexicon] of this.languageLexicons) {
      const allWords = [
        ...lexicon.positive,
        ...lexicon.negative,
        ...lexicon.intensifiers,
        ...lexicon.negations,
      ];

      allWords.forEach((word) => {
        if (lowerText.includes(word)) {
          scores[lang] += 1;
        }
      });
    }

    // Additional language-specific patterns
    if (
      /\b(el|la|los|las|un|una|de|en|con|por|para|que|se|no|es|está)\b/.test(
        lowerText,
      )
    ) {
      scores["es"] += 3;
    }
    if (
      /\b(le|la|les|un|une|de|du|des|et|ou|avec|pour|que|ne|est|sont)\b/.test(
        lowerText,
      )
    ) {
      scores["fr"] += 3;
    }
    if (
      /\b(der|die|das|den|dem|ein|eine|und|oder|mit|für|dass|ist|sind)\b/.test(
        lowerText,
      )
    ) {
      scores["de"] += 3;
    }
    if (
      /\b(il|la|lo|gli|le|un|una|di|in|con|per|che|non|è|sono)\b/.test(
        lowerText,
      )
    ) {
      scores["it"] += 3;
    }
    if (/\b(o|a|os|as|um|uma|de|em|com|para|que|não|é|são)\b/.test(lowerText)) {
      scores["pt"] += 3;
    }

    // Return language with highest score, default to English
    const detectedLang = Object.keys(scores).reduce((a, b) =>
      scores[a] > scores[b] ? a : b,
    );
    return scores[detectedLang] > 0 ? detectedLang : "en";
  }

  /**
   * Analyze sentiment with multi-language support
   */
  analyzeMultiLanguage(
    text: string,
    language?: string,
  ): {
    sentiment: "positive" | "negative" | "neutral";
    confidence: number;
    score: number;
    detectedLanguage: string;
    languageConfidence: number;
  } {
    const detectedLang = language || this.detectLanguage(text);
    const lexicon =
      this.languageLexicons.get(detectedLang) ||
      this.languageLexicons.get("en")!;

    const words = text.toLowerCase().split(/\s+/);
    let sentimentScore = 0;
    let wordCount = 0;
    let languageMatches = 0;

    for (let i = 0; i < words.length; i++) {
      const word = words[i].replace(/[^\w]/g, "");

      // Check for sentiment words
      if (lexicon.positive.includes(word)) {
        let score = 1;

        // Check for intensifiers
        if (i > 0 && lexicon.intensifiers.includes(words[i - 1])) {
          score *= 1.5;
        }

        // Check for negations
        let negated = false;
        for (let j = Math.max(0, i - 3); j < i; j++) {
          if (lexicon.negations.includes(words[j])) {
            negated = true;
            break;
          }
        }

        sentimentScore += negated ? -score : score;
        wordCount++;
        languageMatches++;
      } else if (lexicon.negative.includes(word)) {
        let score = -1;

        // Check for intensifiers
        if (i > 0 && lexicon.intensifiers.includes(words[i - 1])) {
          score *= 1.5;
        }

        // Check for negations
        let negated = false;
        for (let j = Math.max(0, i - 3); j < i; j++) {
          if (lexicon.negations.includes(words[j])) {
            negated = true;
            break;
          }
        }

        sentimentScore += negated ? -score : score;
        wordCount++;
        languageMatches++;
      }
    }

    // Normalize score
    if (wordCount > 0) {
      sentimentScore = sentimentScore / Math.sqrt(wordCount);
    }

    // Determine sentiment
    let sentiment: "positive" | "negative" | "neutral";
    let confidence: number;

    if (sentimentScore > 0.1) {
      sentiment = "positive";
      confidence = Math.min(0.95, 0.5 + Math.abs(sentimentScore) * 0.3);
    } else if (sentimentScore < -0.1) {
      sentiment = "negative";
      confidence = Math.min(0.95, 0.5 + Math.abs(sentimentScore) * 0.3);
    } else {
      sentiment = "neutral";
      confidence = 0.6;
    }

    // Language confidence based on matches
    const languageConfidence = Math.min(
      0.95,
      (languageMatches / words.length) * 2,
    );

    return {
      sentiment,
      confidence,
      score: sentimentScore,
      detectedLanguage: detectedLang,
      languageConfidence,
    };
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): string[] {
    return [...this.supportedLanguages];
  }
}

export const multiLanguageAnalyzer = new MultiLanguageSentimentAnalyzer();

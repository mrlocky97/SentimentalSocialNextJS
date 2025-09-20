/**
import { modernSlangVocabulary, phrasePatterns, emojiSentiment } from '../data/modern-slang-vocabulary';* Advanced Text Preprocessing for Improved Sentiment Analysis
 * Normaliza texto moderno y redes sociales
 */

import { emojiSentiment, modernSlangVocabulary, phrasePatterns } from '../data/modern-slang-vocabulary';

export class AdvancedTextPreprocessor {
  
  /**
   * Preprocesa texto para mejorar análisis de sentimientos
   */
  static preprocess(text: string): {
    normalizedText: string;
    features: {
      hasSlang: boolean;
      emojiSentiment: 'positive' | 'negative' | 'neutral' | null;
      intensifiers: number;
      mentionContext: 'complaint' | 'praise' | 'neutral' | null;
    };
  } {
    let normalizedText = text.toLowerCase();
    
    // 1. NORMALIZACIÓN DE MENCIONES Y HASHTAGS
    // Convertir menciones a contexto
    const mentionPattern = /@(\w+)/g;
    const mentions = normalizedText.match(mentionPattern) || [];
    
    // Detectar contexto de menciones (quejas vs elogios)
    let mentionContext: 'complaint' | 'praise' | 'neutral' | null = null;
    if (mentions.length > 0) {
      // Palabras que sugieren queja cuando hay mención
      const complaintWords = ['lost', 'worst', 'never', 'again', 'terrible', 'awful', 'broke', 'broken'];
      // Palabras que sugieren elogio cuando hay mención  
      const praiseWords = ['amazing', 'incredible', 'best', 'love', 'perfect', 'excellent', 'great'];
      
      const hasComplaint = complaintWords.some(word => normalizedText.includes(word));
      const hasPraise = praiseWords.some(word => normalizedText.includes(word));
      
      if (hasComplaint && !hasPraise) mentionContext = 'complaint';
      else if (hasPraise && !hasComplaint) mentionContext = 'praise';
      else mentionContext = 'neutral';
    }
    
    // Reemplazar menciones por contexto
    normalizedText = normalizedText.replace(mentionPattern, () => {
      if (mentionContext === 'complaint') return 'customer_service_complaint';
      if (mentionContext === 'praise') return 'brand_mention_positive';
      return 'brand_mention';
    });
    
    // 2. NORMALIZACIÓN DE HASHTAGS
    normalizedText = normalizedText.replace(/#(\w+)/g, (match, tag) => {
      // Convertir hashtags comunes a palabras
      const hashtagMappings: { [key: string]: string } = {
        'neveragain': 'never again terrible',
        'worstever': 'worst ever',
        'disappointed': 'disappointed',
        'amazing': 'amazing',
        'perfect': 'perfect',
        'love': 'love'
      };
      
      return hashtagMappings[tag.toLowerCase()] || tag;
    });
    
    // 3. EXPANSIÓN DE SLANG MODERNO
    let hasSlang = false;
    
    // Aplicar patrones de frases primero
    for (const pattern of phrasePatterns) {
      if (pattern.pattern.test(normalizedText)) {
        hasSlang = true;
        normalizedText = normalizedText.replace(pattern.pattern, (match) => {
          if (pattern.sentiment === 'positive') return 'excellent amazing';
          if (pattern.sentiment === 'negative') return 'terrible disappointing';
          return match;
        });
      }
    }
    
    // Aplicar vocabulario de slang
    for (const slang of modernSlangVocabulary) {
      const regex = new RegExp(`\\b${slang.term}\\b`, 'gi');
      if (regex.test(normalizedText)) {
        hasSlang = true;
        normalizedText = normalizedText.replace(regex, () => {
          if (slang.sentiment === 'positive') {
            return slang.weight > 1.3 ? 'excellent amazing' : 'good positive';
          } else if (slang.sentiment === 'negative') {
            return slang.weight > 1.3 ? 'terrible awful' : 'bad negative';
          }
          return slang.term;
        });
      }
    }
    
    // 4. ANÁLISIS DE EMOJIS
    let emojiSentimentValue: 'positive' | 'negative' | 'neutral' | null = null;
    let positiveEmojiCount = 0;
    let negativeEmojiCount = 0;
    
    for (const emoji of emojiSentiment) {
      const emojiCount = (text.match(new RegExp(emoji.emoji, 'g')) || []).length;
      if (emojiCount > 0) {
        if (emoji.sentiment === 'positive') positiveEmojiCount += emojiCount * emoji.weight;
        if (emoji.sentiment === 'negative') negativeEmojiCount += emojiCount * emoji.weight;
      }
    }
    
    if (positiveEmojiCount > negativeEmojiCount) emojiSentimentValue = 'positive';
    else if (negativeEmojiCount > positiveEmojiCount) emojiSentimentValue = 'negative';
    else if (positiveEmojiCount > 0 || negativeEmojiCount > 0) emojiSentimentValue = 'neutral';
    
    // 5. DETECCIÓN DE INTENSIFICADORES
    const intensifiers = [
      'absolutely', 'extremely', 'incredibly', 'amazing', 'terrible', 
      'awful', 'fantastic', 'horrible', 'outstanding', 'dreadful',
      'brilliant', 'appalling', 'superb', 'atrocious', 'excellent'
    ];
    
    let intensifierCount = 0;
    for (const intensifier of intensifiers) {
      const matches = normalizedText.match(new RegExp(`\\b${intensifier}\\b`, 'gi'));
      intensifierCount += matches ? matches.length : 0;
    }
    
    // 6. NORMALIZACIÓN DE REPETICIONES
    // "sooooo good" → "so good"
    normalizedText = normalizedText.replace(/(.)\1{2,}/g, '$1');
    
    // 7. CORRECCIÓN DE CONTRACCIONES
    const contractions: { [key: string]: string } = {
      "ain't": "is not",
      "can't": "cannot", 
      "won't": "will not",
      "don't": "do not",
      "isn't": "is not",
      "wasn't": "was not",
      "weren't": "were not",
      "haven't": "have not",
      "hasn't": "has not",
      "shouldn't": "should not",
      "wouldn't": "would not",
      "couldn't": "could not",
      "didn't": "did not"
    };
    
    for (const [contraction, expansion] of Object.entries(contractions)) {
      normalizedText = normalizedText.replace(new RegExp(`\\b${contraction}\\b`, 'gi'), expansion);
    }
    
    return {
      normalizedText: normalizedText.trim(),
      features: {
        hasSlang,
        emojiSentiment: emojiSentimentValue,
        intensifiers: intensifierCount,
        mentionContext
      }
    };
  }
  
  /**
   * Genera características adicionales para mejorar clasificación
   */
  static extractFeatures(text: string): { [key: string]: number } {
    const processed = this.preprocess(text);
    
    return {
      // Características binarias
      hasSlang: processed.features.hasSlang ? 1 : 0,
      hasPositiveEmoji: processed.features.emojiSentiment === 'positive' ? 1 : 0,
      hasNegativeEmoji: processed.features.emojiSentiment === 'negative' ? 1 : 0,
      hasComplaint: processed.features.mentionContext === 'complaint' ? 1 : 0,
      hasPraise: processed.features.mentionContext === 'praise' ? 1 : 0,
      
      // Características numéricas
      intensifierCount: processed.features.intensifiers,
      textLength: text.length,
      wordCount: text.split(/\s+/).length,
      
      // Ratios
      exclamationRatio: (text.match(/!/g) || []).length / text.length,
      questionRatio: (text.match(/\?/g) || []).length / text.length,
      uppercaseRatio: (text.match(/[A-Z]/g) || []).length / text.length
    };
  }
}
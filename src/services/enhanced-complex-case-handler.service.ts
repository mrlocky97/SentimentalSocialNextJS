/**
 * Enhanced Complex Case Handler
 * Integra todas las capacidades existentes para manejar casos complejos
 * de análisis de sentimiento con mayor precisión
 */

import { logger } from "../lib/observability/logger";
import { AdvancedHybridAnalyzer } from "./advanced-hybrid-analyzer.service";
import { AdvancedTextPreprocessor } from "./advanced-text-preprocessor.service";
import { NaiveBayesSentimentService, SentimentPrediction } from "./naive-bayes-sentiment.service";

export interface ComplexCaseFeatures {
  // Características de sarcasmo
  sarcasmScore: number;
  hasQuotedPositives: boolean;
  hasContradictions: boolean;
  
  // Características de slang/errores
  hasSlang: boolean;
  hasTypos: boolean;
  normalizedConfidence: number;
  
  // Características contextuales
  temporalContext: 'past' | 'present' | 'future' | null;
  doubleNegation: boolean;
  culturalContext: 'formal' | 'informal' | 'slang' | null;
  
  // Características emocionales
  emotionalIntensity: number;
  contradictorySignals: boolean;
  
  // Características multilingües
  detectedLanguage: string;
  isMixedLanguage: boolean;
}

export interface EnhancedPrediction extends SentimentPrediction {
  complexityScore: number;
  features: ComplexCaseFeatures;
  confidence: number;
  reasoning: string[];
  fallbackUsed: boolean;
}

/**
 * Manejador especializado para casos complejos de análisis de sentimiento
 * Integra todas las capacidades avanzadas del sistema existente
 */
export class EnhancedComplexCaseHandler {
  private hybridAnalyzer: AdvancedHybridAnalyzer;
  private naiveBayesService: NaiveBayesSentimentService;
  
  // Patrones para detección de características complejas
  private readonly SARCASM_PATTERNS = {
    quotedPositives: /'([^']*(?:good|great|amazing|perfect|wonderful|fantastic|excellent|brilliant)[^']*)'/gi,
    contradiction: /\b(love|great|amazing|perfect|wonderful|fantastic|excellent|brilliant|good)\b.*\b(but|however|though|although|yet)\b.*\b(terrible|awful|bad|worst|hate|horrible|disgusting|pathetic|useless|broken|slow|worse|crashes|fails|disappointing)\b/gi,
    temporalDisplacement: /\b(was|used to be)\s+\w+\s+\b(but|now|today|currently)\b/gi,
    ironicPhrases: /\b(oh\s+(great|wonderful|perfect|fantastic|brilliant)|just\s+(great|perfect|what|wonderful)|exactly\s+what|how\s+(wonderful|perfect|great)|perfect\s+timing|great\s+job)\b/gi,
    suspiciousEllipsis: /\b(great|perfect|amazing|wonderful|excellent|brilliant|good)\b.*\.\.\./gi,
    fakeEnthusiasm: /\b(amazing|wonderful|perfect|great|excellent|brilliant)\s+(how|that)\b/gi
  };
  
  private readonly DOUBLE_NEGATION_PATTERNS = [
    /\b(can't|cannot)\s+(say|deny|argue)\s+(i'm|im|i\s+am)\s+not\b/gi,
    /\b(not)\s+\w+\s+(at\s+all)\b/gi,
    /\b(wasn't|wasnt)\s+\w+\s+(much|really)\s+(but)\b/gi,
    /\b(couldn't|couldnt)\s+(be|seem)\s+(more|less)\s+\w+/gi,
    /\b(wouldn't|wouldnt)\s+(say|call|consider)\s+(it|this|that)\s+\w+/gi,
    /\b(not)\s+(un\w+|dis\w+)/gi, // not unhappy, not disappointed
    /\b(never)\s+(not|been)\s+(more|less)\b/gi,
    /\b(hardly|barely)\s+(not|un\w+)/gi
  ];
  
  private readonly TEMPORAL_PATTERNS = {
    past: /\b(was|were|used to|back then|before|previously|in 20\d{2})\b/gi,
    present: /\b(is|are|now|currently|today|this|these days)\b/gi,
    future: /\b(will|gonna|going to|next|future|upcoming)\b/gi
  };
  
  private readonly CULTURAL_SLANG = {
    argentine: /\b(posta|re\s+\w+|la\s+rompe|genial|de\s+diez|copado|bárbaro)\b/gi,
    mexican: /\b(chido|padrísimo|está\s+padre|qué\s+onda)\b/gi,
    british: /\b(brilliant|cheers|mental|proper|naff|dodgy|chuffed)\b/gi,
    american: /\b(awesome|dope|lit|fire|sick|dope|rad)\b/gi
  };

  constructor() {
    this.hybridAnalyzer = new AdvancedHybridAnalyzer();
    this.naiveBayesService = new NaiveBayesSentimentService();
    
    logger.info("EnhancedComplexCaseHandler initialized");
  }

  /**
   * Analiza un texto complejo y proporciona una predicción mejorada
   */
  async analyzeComplexCase(text: string): Promise<EnhancedPrediction> {
    const startTime = Date.now();
    
    try {
      // 1. Preprocesamiento avanzado
      const preprocessed = AdvancedTextPreprocessor.preprocess(text);
      
      // 2. Extracción de características complejas
      const features = this.extractComplexFeatures(text, preprocessed);
      
      // 3. Análisis híbrido base (usando extractContextualFeatures)
      const hybridFeatures = this.hybridAnalyzer.extractContextualFeatures(text);
      
      // 4. Análisis Naive Bayes base
      const naiveResult = this.naiveBayesService.predict(text);
      
      // 5. Aplicar correcciones por complejidad
      const correctedPrediction = this.applyComplexityCorrections(
        text,
        naiveResult,
        hybridFeatures,
        features
      );
      
      // 6. Generar razonamiento
      const reasoning = this.generateReasoning(features, correctedPrediction);
      
      const processingTime = Date.now() - startTime;
      
      logger.info("Complex case analyzed", {
        originalText: text.substring(0, 50),
        complexityScore: correctedPrediction.complexityScore,
        processingTime,
        confidence: correctedPrediction.confidence
      });
      
      return {
        ...correctedPrediction,
        reasoning,
        fallbackUsed: features.normalizedConfidence < 0.3
      };
      
    } catch (error) {
      logger.error("Error analyzing complex case", error);
      
      // Fallback a predicción simple
      const fallbackResult = this.naiveBayesService.predict(text);
      return {
        ...fallbackResult,
        complexityScore: 1.0,
        features: this.getDefaultFeatures(),
        reasoning: ["Error en análisis complejo, usando predicción básica"],
        fallbackUsed: true
      };
    }
  }

  /**
   * Extrae características complejas del texto
   */
  private extractComplexFeatures(text: string, preprocessed: any): ComplexCaseFeatures {
    const features: ComplexCaseFeatures = {
      // Características de sarcasmo
      sarcasmScore: this.detectSarcasmScore(text),
      hasQuotedPositives: this.SARCASM_PATTERNS.quotedPositives.test(text),
      hasContradictions: this.SARCASM_PATTERNS.contradiction.test(text),
      
      // Características de slang/errores
      hasSlang: preprocessed.features.hasSlang,
      hasTypos: this.detectTypos(text),
      normalizedConfidence: this.calculateNormalizedConfidence(text),
      
      // Características contextuales
      temporalContext: this.detectTemporalContext(text),
      doubleNegation: this.detectDoubleNegation(text),
      culturalContext: this.detectCulturalContext(text),
      
      // Características emocionales
      emotionalIntensity: preprocessed.features.intensifiers || 0,
      contradictorySignals: this.detectContradictorySignals(text, preprocessed),
      
      // Características multilingües
      detectedLanguage: this.detectLanguage(text),
      isMixedLanguage: this.detectMixedLanguage(text)
    };
    
    return features;
  }

  /**
   * Aplica correcciones basadas en la complejidad detectada
   */
  private applyComplexityCorrections(
    text: string,
    naiveResult: SentimentPrediction,
    hybridFeatures: any,
    features: ComplexCaseFeatures
  ): EnhancedPrediction {
    let correctedLabel = naiveResult.label;
    let correctedConfidence = naiveResult.confidence;
    let complexityScore = 0;
    
    // 1. Corrección por sarcasmo (umbral más bajo y más agresivo)
    if (features.sarcasmScore > 0) {
      complexityScore += Math.min(0.6, features.sarcasmScore * 0.1); // Scale sarcasm score
      
      // Sarcasmo detectado
      if (features.sarcasmScore >= 3 || features.hasQuotedPositives) {
        // Invertir sentimiento positivo a negativo si hay sarcasmo fuerte
        if (naiveResult.label === 'positive') {
          correctedLabel = 'negative';
          correctedConfidence = Math.min(0.85, 0.6 + (features.sarcasmScore * 0.05));
        }
      }
      
      // Sarcasmo moderado - reducir confianza hacia neutral
      else if (features.sarcasmScore >= 1) {
        correctedConfidence = Math.max(0.4, correctedConfidence - 0.2);
        if (correctedConfidence < 0.6) {
          correctedLabel = 'neutral';
        }
      }
    }
    
    // 2. Corrección por doble negación
    if (features.doubleNegation) {
      complexityScore += 0.3;
      if (naiveResult.label === 'negative') {
        correctedLabel = 'positive';
        correctedConfidence = Math.min(0.75, correctedConfidence + 0.15);
      }
    }
    
    // 3. Corrección por contexto temporal
    if (features.temporalContext === 'past' && features.hasContradictions) {
      complexityScore += 0.3;
      // "Era bueno antes pero ahora es terrible" -> negativo
      if (naiveResult.label === 'positive') {
        correctedLabel = 'negative';
        correctedConfidence = Math.min(0.7, correctedConfidence + 0.15);
      }
    }
    
    // 4. Corrección por slang y errores tipográficos
    if (features.hasSlang || features.hasTypos) {
      complexityScore += 0.2;
      // Reducir confianza ligeramente para slang/errores
      correctedConfidence = Math.max(0.3, correctedConfidence - 0.1);
    }
    
    // 5. Corrección por señales contradictorias
    if (features.contradictorySignals) {
      complexityScore += 0.4;
      // Si hay señales contradictorias, tender hacia neutral
      if (correctedConfidence < 0.6) {
        correctedLabel = 'neutral';
        correctedConfidence = 0.5;
      }
    }
    
    // 6. Boost por contexto cultural apropiado
    if (features.culturalContext === 'slang' && !features.hasTypos) {
      // Slang bien usado puede aumentar confianza
      correctedConfidence = Math.min(0.9, correctedConfidence + 0.1);
    }
    
    // Asegurar que cualquier característica compleja resulte en score > 0
    if (features.hasQuotedPositives || features.hasContradictions || features.hasSlang || 
        features.hasTypos || features.doubleNegation || features.contradictorySignals) {
      complexityScore = Math.max(0.1, complexityScore);
    }
    
    // Normalizar complejidad (0-1)
    complexityScore = Math.min(1.0, complexityScore);
    
    return {
      label: correctedLabel,
      confidence: correctedConfidence,
      scores: naiveResult.scores,
      complexityScore,
      features,
      reasoning: [], // Se llenará después
      fallbackUsed: false // Se determinará después
    };
  }

  /**
   * Detecta puntuación de sarcasmo en el texto
   */
  private detectSarcasmScore(text: string): number {
    let score = 0;
    
    // Palabras positivas entre comillas - indicador fuerte de sarcasmo
    if (this.SARCASM_PATTERNS.quotedPositives.test(text)) score += 4;
    
    // Contradicciones explícitas - muy común en sarcasmo
    if (this.SARCASM_PATTERNS.contradiction.test(text)) score += 5;
    
    // Desplazamiento temporal
    if (this.SARCASM_PATTERNS.temporalDisplacement.test(text)) score += 3;
    
    // Frases irónicas específicas
    if (this.SARCASM_PATTERNS.ironicPhrases.test(text)) score += 4;
    
    // Puntos suspensivos después de palabras positivas
    if (this.SARCASM_PATTERNS.suspiciousEllipsis.test(text)) score += 3;
    
    // Falso entusiasmo
    if (this.SARCASM_PATTERNS.fakeEnthusiasm.test(text)) score += 3;
    
    // Elongaciones sarcásticas: "soooo good"
    const elongations = /\b\w*([aeiou])\1{2,}\w*\b/gi;
    if (elongations.test(text)) score += 2;
    
    // Exclamación excesiva seguida de crítica
    const excessiveExclamation = /\b(amazing|great|perfect|wonderful|excellent|fantastic)!\s*.*\b(but|however|unfortunately|sadly|except|crashes|broken|fails|slow|terrible|awful|horrible)\b/gi;
    if (excessiveExclamation.test(text)) score += 4;
    
    return Math.min(10, score);
  }

  /**
   * Detecta errores tipográficos
   */
  private detectTypos(text: string): boolean {
    // Patrones comunes de errores tipográficos
    const typoPatterns = [
      /\b\w*([aeiou])\1{2,}\w*\b/gi, // Repeticiones: "amazzzzing"
      /\b\w*([bcdfghjklmnpqrstvwxyz])\1{2,}\w*\b/gi, // Consonantes repetidas
      /\b(teh|hte|adn|nad|froem|form)\b/gi, // Errores comunes
      /\b\w{6,}[bcdfghjklmnpqrstvwxyz]{3,}\b/gi // Consonantes agrupadas
    ];
    
    return typoPatterns.some(pattern => pattern.test(text));
  }

  /**
   * Calcula confianza normalizada basada en características del texto
   */
  private calculateNormalizedConfidence(text: string): number {
    let confidence = 1.0;
    
    // Reducir por longitud muy corta o muy larga
    if (text.length < 10) confidence -= 0.2;
    if (text.length > 200) confidence -= 0.1;
    
    // Reducir por muchos caracteres especiales
    const specialChars = (text.match(/[^a-zA-Z0-9\s]/g) || []).length;
    if (specialChars > text.length * 0.3) confidence -= 0.2;
    
    return Math.max(0.1, confidence);
  }

  /**
   * Detecta contexto temporal en el texto
   */
  private detectTemporalContext(text: string): 'past' | 'present' | 'future' | null {
    if (this.TEMPORAL_PATTERNS.past.test(text)) return 'past';
    if (this.TEMPORAL_PATTERNS.future.test(text)) return 'future';
    if (this.TEMPORAL_PATTERNS.present.test(text)) return 'present';
    return null;
  }

  /**
   * Detecta doble negación
   */
  private detectDoubleNegation(text: string): boolean {
    return this.DOUBLE_NEGATION_PATTERNS.some(pattern => pattern.test(text));
  }

  /**
   * Detecta contexto cultural
   */
  private detectCulturalContext(text: string): 'formal' | 'informal' | 'slang' | null {
    // Detectar slang por región
    const hasSlang = Object.values(this.CULTURAL_SLANG).some(pattern => pattern.test(text));
    if (hasSlang) return 'slang';
    
    // Detectar formalidad
    const formalWords = /\b(furthermore|moreover|nevertheless|consequently|therefore)\b/gi;
    if (formalWords.test(text)) return 'formal';
    
    // Detectar informalidad
    const informalWords = /\b(yeah|yep|nope|gonna|wanna|kinda|sorta)\b/gi;
    if (informalWords.test(text)) return 'informal';
    
    return null;
  }

  /**
   * Detecta señales contradictorias en el texto
   */
  private detectContradictorySignals(text: string, preprocessed: any): boolean {
    // Emojis positivos con texto negativo o viceversa
    const hasPositiveEmoji = preprocessed.features.emojiSentiment === 'positive';
    const hasNegativeEmoji = preprocessed.features.emojiSentiment === 'negative';
    
    const negativeWords = /\b(bad|terrible|awful|hate|worst|horrible)\b/gi;
    const positiveWords = /\b(good|great|love|amazing|perfect|excellent)\b/gi;
    
    const hasNegativeText = negativeWords.test(text);
    const hasPositiveText = positiveWords.test(text);
    
    return (hasPositiveEmoji && hasNegativeText) || (hasNegativeEmoji && hasPositiveText);
  }

  /**
   * Detecta idioma del texto
   */
  private detectLanguage(text: string): string {
    const languageHints = {
      es: /\b(el|la|que|de|pero|con|por|y|es|está|muy|más)\b/gi,
      fr: /\b(le|la|les|et|des|que|pour|dans|avec|très|plus)\b/gi,
      de: /\b(der|die|das|und|nicht|mit|ein|eine|sehr|mehr)\b/gi
    };
    
    for (const [lang, pattern] of Object.entries(languageHints)) {
      if (pattern.test(text)) return lang;
    }
    
    return 'en';
  }

  /**
   * Detecta texto en múltiples idiomas
   */
  private detectMixedLanguage(text: string): boolean {
    let detectedLanguages = 0;
    
    const languagePatterns = [
      /\b(the|and|but|with|this|that)\b/gi, // EN
      /\b(el|la|que|de|pero|con)\b/gi, // ES
      /\b(le|la|les|et|des|que)\b/gi, // FR
      /\b(der|die|das|und|nicht)\b/gi // DE
    ];
    
    languagePatterns.forEach(pattern => {
      if (pattern.test(text)) detectedLanguages++;
    });
    
    return detectedLanguages > 1;
  }

  /**
   * Genera explicación del razonamiento
   */
  private generateReasoning(features: ComplexCaseFeatures, prediction: EnhancedPrediction): string[] {
    const reasoning: string[] = [];
    
    if (features.sarcasmScore > 2) {
      reasoning.push(`Sarcasmo detectado (score: ${features.sarcasmScore})`);
    }
    
    if (features.doubleNegation) {
      reasoning.push("Doble negación detectada - invirtiendo sentimiento");
    }
    
    if (features.hasQuotedPositives) {
      reasoning.push("Palabras positivas entre comillas - posible sarcasmo");
    }
    
    if (features.temporalContext && features.hasContradictions) {
      reasoning.push(`Contexto temporal ${features.temporalContext} con contradicciones`);
    }
    
    if (features.hasSlang) {
      reasoning.push("Slang moderno detectado - ajustando interpretación");
    }
    
    if (features.hasTypos) {
      reasoning.push("Errores tipográficos detectados - reduciendo confianza");
    }
    
    if (features.contradictorySignals) {
      reasoning.push("Señales contradictorias - tendencia hacia neutral");
    }
    
    if (features.culturalContext) {
      reasoning.push(`Contexto cultural: ${features.culturalContext}`);
    }
    
    reasoning.push(`Complejidad del caso: ${(prediction.complexityScore * 100).toFixed(1)}%`);
    
    return reasoning;
  }

  /**
   * Obtiene características por defecto en caso de error
   */
  private getDefaultFeatures(): ComplexCaseFeatures {
    return {
      sarcasmScore: 0,
      hasQuotedPositives: false,
      hasContradictions: false,
      hasSlang: false,
      hasTypos: false,
      normalizedConfidence: 0.5,
      temporalContext: null,
      doubleNegation: false,
      culturalContext: null,
      emotionalIntensity: 0,
      contradictorySignals: false,
      detectedLanguage: 'en',
      isMixedLanguage: false
    };
  }

  /**
   * Obtiene estadísticas del manejador
   */
  getStats(): {
    totalAnalyzed: number;
    complexCasesDetected: number;
    averageComplexity: number;
    fallbackRate: number;
  } {
    // Implementar contadores si se necesitan estadísticas detalladas
    return {
      totalAnalyzed: 0,
      complexCasesDetected: 0,
      averageComplexity: 0,
      fallbackRate: 0
    };
  }
}
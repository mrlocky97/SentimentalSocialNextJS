/**
 * Generador Local de Dataset
 * Genera ejemplos sintéticos usando LLM para casos específicos
 */

import { TrainingData } from '../experimental/naive-bayes.model';
import fs from 'fs/promises';
import path from 'path';

interface GenerationPrompt {
  category: string;
  language: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  count: number;
  context: string;
  examples?: string[];
}

interface SyntheticDatasetConfig {
  totalExamples: number;
  languageDistribution: Record<string, number>; // porcentajes
  sentimentBalance: boolean;
  includeEdgeCases: boolean;
  domains: string[];
}

export class LocalDatasetGenerator {
  private prompts: GenerationPrompt[];

  constructor() {
    this.prompts = this.createGenerationPrompts();
  }

  /**
   * Crear prompts específicos para generación
   */
  private createGenerationPrompts(): GenerationPrompt[] {
    return [
      // === ESPAÑOL ===
      {
        category: "productos_ecommerce",
        language: "es",
        sentiment: "positive",
        count: 50,
        context: "Reseñas positivas de productos en español para e-commerce",
        examples: [
          "Este producto superó mis expectativas, excelente calidad",
          "Llegó rápido y en perfectas condiciones, muy recomendado",
          "La mejor compra que he hecho este año, increíble"
        ]
      },
      {
        category: "productos_ecommerce", 
        language: "es",
        sentiment: "negative",
        count: 50,
        context: "Reseñas negativas de productos en español",
        examples: [
          "Muy decepcionado con la compra, mala calidad",
          "No funciona como se describe, quiero devolverlo",
          "Tardó mucho en llegar y vino dañado"
        ]
      },
      {
        category: "productos_ecommerce",
        language: "es", 
        sentiment: "neutral",
        count: 50,
        context: "Reseñas neutras de productos en español",
        examples: [
          "El producto está bien, cumple lo básico",
          "Funciona correctamente pero nada especial",
          "Precio justo para lo que ofrece"
        ]
      },

      // === INGLÉS ===
      {
        category: "social_media",
        language: "en",
        sentiment: "positive", 
        count: 50,
        context: "Positive social media posts and comments",
        examples: [
          "Having an amazing day! Everything is perfect",
          "Just received the best news ever! So excited",
          "This service is absolutely fantastic, love it"
        ]
      },
      {
        category: "social_media",
        language: "en",
        sentiment: "negative",
        count: 50,
        context: "Negative social media posts and comments",
        examples: [
          "This is the worst service I've ever experienced",
          "Completely disappointed with everything today",
          "Never buying from them again, terrible quality"
        ]
      },
      {
        category: "social_media",
        language: "en",
        sentiment: "neutral",
        count: 50,
        context: "Neutral social media posts and comments",
        examples: [
          "Just posting an update on my progress",
          "The weather is okay today, nothing special",
          "Standard service, meets basic expectations"
        ]
      },

      // === CASOS EDGE ===
      {
        category: "edge_cases_sarcasm",
        language: "es",
        sentiment: "negative",
        count: 30,
        context: "Casos con sarcasmo e ironía en español (sentimiento negativo)",
        examples: [
          "Qué maravilloso, otra vez llega tarde el pedido",
          "Genial, justo lo que necesitaba, que se rompa al primer uso",
          "Excelente atención al cliente, me ignoraron por completo"
        ]
      },
      {
        category: "edge_cases_negation",
        language: "en",
        sentiment: "positive",
        count: 30,
        context: "Casos con negaciones que mantienen sentimiento positivo",
        examples: [
          "I can't believe how good this product is",
          "It's not bad at all, actually quite impressive",
          "Never thought I'd find something this amazing"
        ]
      },

      // === EMOJIS Y EXPRESIONES ===
      {
        category: "emojis_expressions",
        language: "es",
        sentiment: "positive",
        count: 25,
        context: "Expresiones con emojis positivos en español",
        examples: [
          "¡Me encanta! 😍❤️ Súper recomendado",
          "Perfecto 👌 Exactamente lo que buscaba 🎉",
          "Excelente calidad 💯 Volveré a comprar seguro ✨"
        ]
      },
      {
        category: "emojis_expressions",
        language: "es", 
        sentiment: "negative",
        count: 25,
        context: "Expresiones con emojis negativos en español",
        examples: [
          "Muy malo 😡 No lo recomiendo para nada 👎",
          "Decepcionante 😞 Esperaba mucho más 💔",
          "Terrible experiencia 😤 Perdí mi dinero 💸"
        ]
      },

      // === COMPARACIONES ===
      {
        category: "comparisons",
        language: "en",
        sentiment: "positive",
        count: 25,
        context: "Comparative positive statements",
        examples: [
          "Much better than the previous version",
          "Way superior to competitors in the market",
          "Significantly improved from last year's model"
        ]
      },
      {
        category: "comparisons",
        language: "en",
        sentiment: "negative", 
        count: 25,
        context: "Comparative negative statements",
        examples: [
          "Much worse than I expected",
          "Far inferior to the original version",
          "Significantly disappointing compared to alternatives"
        ]
      },

      // === CONTEXTO TÉCNICO ===
      {
        category: "technical_reviews",
        language: "en",
        sentiment: "neutral",
        count: 30,
        context: "Technical neutral reviews",
        examples: [
          "The specifications meet the standard requirements",
          "Performance is within expected parameters",
          "Functions as documented in the manual"
        ]
      },

      // === MULTIIDIOMA MIXTO ===
      {
        category: "mixed_language",
        language: "mixed",
        sentiment: "positive",
        count: 20,
        context: "Textos que mezclan idiomas (code-switching)",
        examples: [
          "This producto es amazing, me encanta",
          "Super good quality, muy recomendado",
          "Excellent service, gracias por todo"
        ]
      }
    ];
  }

  /**
   * Generar dataset sintético usando templates inteligentes
   */
  async generateSyntheticDataset(config: SyntheticDatasetConfig): Promise<TrainingData[]> {
    console.log('🏭 GENERANDO DATASET SINTÉTICO');
    console.log('==============================\n');

    const generatedData: TrainingData[] = [];

    for (const prompt of this.prompts) {
      console.log(`🎯 Generando: ${prompt.category} (${prompt.language}) - ${prompt.sentiment}`);
      
      try {
        const examples = await this.generateExamplesFromTemplate(prompt);
        generatedData.push(...examples);
        
        console.log(`✅ Generados: ${examples.length} ejemplos`);
        
      } catch (error) {
        console.warn(`⚠️ Error generando ${prompt.category}:`, error);
        continue;
      }
    }

    // Balancear si es necesario
    if (config.sentimentBalance) {
      const balanced = this.balanceDataset(generatedData);
      console.log(`⚖️ Dataset balanceado: ${balanced.length} ejemplos`);
      return balanced;
    }

    console.log(`🎉 Dataset sintético completado: ${generatedData.length} ejemplos`);
    return generatedData;
  }

  /**
   * Generar ejemplos usando templates y variaciones
   */
  private async generateExamplesFromTemplate(prompt: GenerationPrompt): Promise<TrainingData[]> {
    const generated: TrainingData[] = [];
    const templates = this.getTemplatesForCategory(prompt.category, prompt.sentiment, prompt.language);
    const variations = this.getVariations(prompt.language);

    // Usar ejemplos base si existen
    if (prompt.examples) {
      for (const example of prompt.examples) {
        generated.push({
          text: example,
          sentiment: prompt.sentiment,
          language: prompt.language === 'mixed' ? 'es' : prompt.language
        });
      }
    }

    // Generar variaciones usando templates
    let remainingCount = prompt.count - generated.length;
    
    while (remainingCount > 0 && templates.length > 0) {
      for (const template of templates) {
        if (remainingCount <= 0) break;

        // Crear variaciones del template
        const variants = this.createVariants(template, variations, Math.min(5, remainingCount));
        
        for (const variant of variants) {
          generated.push({
            text: variant,
            sentiment: prompt.sentiment,
            language: prompt.language === 'mixed' ? 'es' : prompt.language
          });
          remainingCount--;
          
          if (remainingCount <= 0) break;
        }
      }
    }

    return generated.slice(0, prompt.count);
  }

  /**
   * Obtener templates según categoría
   */
  private getTemplatesForCategory(category: string, sentiment: string, language: string): string[] {
    const templates: Record<string, Record<string, Record<string, string[]>>> = {
      productos_ecommerce: {
        positive: {
          es: [
            "Este {producto} es {adjetivo_positivo}, muy {cualidad_positiva}",
            "Excelente {producto}, {verbo_positivo} todas mis expectativas",
            "La {caracteristica} de este {producto} es {adjetivo_positivo}",
            "{producto} {adjetivo_positivo}, lo {verbo_positivo} completamente",
            "Muy satisfecho con {articulo} {producto}, {cualidad_positiva} garantizada"
          ]
        },
        negative: {
          es: [
            "Este {producto} es {adjetivo_negativo}, muy {cualidad_negativa}",
            "Terrible {producto}, {verbo_negativo} todas mis expectativas",
            "La {caracteristica} de este {producto} es {adjetivo_negativo}",
            "{producto} {adjetivo_negativo}, no lo {verbo_positivo} para nada",
            "Muy decepcionado con {articulo} {producto}, {cualidad_negativa} total"
          ]
        },
        neutral: {
          es: [
            "El {producto} está {adjetivo_neutral}, cumple {expectativa_neutral}",
            "{producto} {adjetivo_neutral}, sin más que destacar",
            "La {caracteristica} es {adjetivo_neutral}, dentro de lo esperado",
            "{producto} funcional, {cualidad_neutral}",
            "Precio {adjetivo_neutral} para {articulo} {producto} de estas características"
          ]
        }
      },
      social_media: {
        positive: {
          en: [
            "Having a {adjetivo_positivo} {tiempo}! Everything is {estado_positivo}",
            "Just {verbo_positivo} the most {adjetivo_positivo} {evento}!",
            "This {servicio} is absolutely {adjetivo_positivo}, {verbo_positivo} it!",
            "So {emocion_positiva} about {evento}! Can't wait to {accion_positiva}",
            "{verbo_positivo} every moment of this {tiempo}! Life is {adjetivo_positivo}"
          ]
        },
        negative: {
          en: [
            "Having a {adjetivo_negativo} {tiempo}! Everything is {estado_negativo}",
            "Just {verbo_negativo} the most {adjetivo_negativo} {evento}!",
            "This {servicio} is absolutely {adjetivo_negativo}, {verbo_negativo} it!",
            "So {emocion_negativa} about {evento}! Don't want to {accion_negativa}",
            "{verbo_negativo} every moment of this {tiempo}! Life is {adjetivo_negativo}"
          ]
        },
        neutral: {
          en: [
            "Having a {adjetivo_neutral} {tiempo}! Everything is {estado_neutral}",
            "Just {verbo_neutral} a {adjetivo_neutral} {evento}",
            "This {servicio} is {adjetivo_neutral}, {expectativa_neutral}",
            "Feeling {emocion_neutral} about {evento}",
            "{tiempo} is going {adjetivo_neutral}, nothing special"
          ]
        }
      }
    };

    return templates[category]?.[sentiment]?.[language] || [];
  }

  /**
   * Obtener variaciones de palabras por idioma
   */
  private getVariations(language: string): Record<string, string[]> {
    const variations: Record<string, Record<string, string[]>> = {
      es: {
        producto: ["producto", "artículo", "item", "compra", "objeto"],
        adjetivo_positivo: ["excelente", "fantástico", "increíble", "perfecto", "maravilloso", "genial"],
        adjetivo_negativo: ["terrible", "horrible", "pésimo", "malo", "decepcionante", "desastroso"],
        adjetivo_neutral: ["normal", "estándar", "regular", "básico", "aceptable", "promedio"],
        cualidad_positiva: ["calidad", "durabilidad", "eficiencia", "utilidad", "funcionalidad"],
        cualidad_negativa: ["deficiencia", "fragilidad", "inutilidad", "ineficiencia", "falla"],
        cualidad_neutral: ["funcionalidad básica", "características estándar", "rendimiento promedio"],
        verbo_positivo: ["supera", "excede", "cumple", "satisface", "mejora"],
        verbo_negativo: ["decepciona", "frustra", "falla", "incumple", "empeora"],
        caracteristica: ["calidad", "precio", "diseño", "funcionalidad", "durabilidad"],
        articulo: ["el", "la", "este", "esta"],
        expectativa_neutral: ["lo básico", "las expectativas mínimas", "lo esperado"]
      },
      en: {
        adjetivo_positivo: ["amazing", "excellent", "fantastic", "perfect", "wonderful", "great"],
        adjetivo_negativo: ["terrible", "horrible", "awful", "bad", "disappointing", "disastrous"],
        adjetivo_neutral: ["normal", "standard", "regular", "basic", "acceptable", "average"],
        tiempo: ["day", "week", "experience", "moment", "time"],
        estado_positivo: ["perfect", "great", "amazing", "wonderful"],
        estado_negativo: ["terrible", "awful", "disappointing", "frustrating"],
        estado_neutral: ["okay", "normal", "standard", "regular"],
        verbo_positivo: ["love", "enjoy", "appreciate", "recommend"],
        verbo_negativo: ["hate", "dislike", "regret", "avoid"],
        verbo_neutral: ["experienced", "tried", "used", "tested"],
        servicio: ["service", "product", "experience", "company"],
        evento: ["news", "experience", "opportunity", "moment"],
        emocion_positiva: ["excited", "happy", "thrilled", "delighted"],
        emocion_negativa: ["disappointed", "frustrated", "upset", "annoyed"],
        emocion_neutral: ["neutral", "indifferent", "calm", "okay"],
        accion_positiva: ["share", "celebrate", "continue", "recommend"],
        accion_negativa: ["complain", "worry", "stress", "regret"],
        expectativa_neutral: ["meets expectations", "does the job", "works fine"]
      }
    };

    return variations[language] || {};
  }

  /**
   * Crear variantes de un template
   */
  private createVariants(template: string, variations: Record<string, string[]>, count: number): string[] {
    const variants: string[] = [];
    const placeholders = template.match(/\{([^}]+)\}/g) || [];

    for (let i = 0; i < count; i++) {
      let variant = template;

      for (const placeholder of placeholders) {
        const key = placeholder.slice(1, -1); // Remover {}
        const options = variations[key] || [key];
        const randomOption = options[Math.floor(Math.random() * options.length)];
        variant = variant.replace(placeholder, randomOption);
      }

      if (!variants.includes(variant)) {
        variants.push(variant);
      }
    }

    return variants;
  }

  /**
   * Balancear dataset por sentimiento
   */
  private balanceDataset(data: TrainingData[]): TrainingData[] {
    const byClass: Record<string, TrainingData[]> = {
      positive: [],
      negative: [],
      neutral: []
    };

    // Agrupar por clase
    for (const item of data) {
      byClass[item.sentiment].push(item);
    }

    // Encontrar la clase con menos ejemplos
    const minCount = Math.min(
      byClass.positive.length,
      byClass.negative.length,
      byClass.neutral.length
    );

    // Tomar muestras balanceadas
    const balanced: TrainingData[] = [];
    for (const [sentiment, items] of Object.entries(byClass)) {
      const shuffled = this.shuffleArray(items);
      balanced.push(...shuffled.slice(0, minCount));
    }

    return this.shuffleArray(balanced);
  }

  /**
   * Mezclar array aleatoriamente
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Guardar dataset sintético
   */
  async saveSyntheticDataset(data: TrainingData[], filename: string = 'synthetic-dataset.ts'): Promise<void> {
    const stats = this.calculateStats(data);
    
    const content = `/**
 * Dataset Sintético de Entrenamiento
 * Generado localmente usando templates inteligentes
 * Total: ${stats.total} ejemplos
 * Distribución: ${stats.positive}P / ${stats.negative}N / ${stats.neutral}Neu
 */

import { TrainingData } from '../experimental/naive-bayes.model';

export const SYNTHETIC_SENTIMENT_DATASET: TrainingData[] = ${JSON.stringify(data, null, 2)};

export const SYNTHETIC_DATASET_STATS = ${JSON.stringify(stats, null, 2)};

export function getSyntheticDataset(): TrainingData[] {
  return SYNTHETIC_SENTIMENT_DATASET;
}

export function getSyntheticDatasetStats() {
  return SYNTHETIC_DATASET_STATS;
}`;

    const filepath = path.join(process.cwd(), 'src', 'data', filename);
    await fs.writeFile(filepath, content);
    
    console.log(`💾 Dataset sintético guardado: ${filepath}`);
    console.log(`📊 ${stats.total} ejemplos total`);
  }

  private calculateStats(data: TrainingData[]) {
    const stats = {
      total: data.length,
      positive: 0,
      negative: 0,
      neutral: 0,
      languages: {} as Record<string, number>
    };

    for (const item of data) {
      // Normalizar sentimiento para el conteo
      const normalizedSentiment = item.sentiment === 'very_positive' ? 'positive' :
                                 item.sentiment === 'very_negative' ? 'negative' :
                                 item.sentiment === 'positive' ? 'positive' :
                                 item.sentiment === 'negative' ? 'negative' : 'neutral';
      
      stats[normalizedSentiment as keyof typeof stats]++;
      
      const lang = item.language || 'unknown';
      stats.languages[lang] = (stats.languages[lang] || 0) + 1;
    }

    return stats;
  }
}

// Función de conveniencia
export async function generateLocalDataset(config?: Partial<SyntheticDatasetConfig>) {
  console.log('🏭 INICIANDO GENERACIÓN LOCAL DEL DATASET');
  console.log('=========================================\n');

  const defaultConfig: SyntheticDatasetConfig = {
    totalExamples: 1000,
    languageDistribution: { es: 60, en: 40 },
    sentimentBalance: true,
    includeEdgeCases: true,
    domains: ['ecommerce', 'social_media', 'technical']
  };

  const finalConfig = { ...defaultConfig, ...config };
  const generator = new LocalDatasetGenerator();

  try {
    const syntheticData = await generator.generateSyntheticDataset(finalConfig);
    await generator.saveSyntheticDataset(syntheticData);
    
    console.log('\n🎉 ¡Generación local completada!');
    console.log(`📊 Total: ${syntheticData.length} ejemplos sintéticos`);
    
    return syntheticData;
    
  } catch (error) {
    console.error('❌ Error en generación local:', error);
    throw error;
  }
}

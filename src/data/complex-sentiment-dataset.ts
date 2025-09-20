/**
 * Dataset especializado para casos complejos de análisis de sentimiento
 * Incluye ejemplos de sarcasmo, slang moderno, errores tipográficos,
 * expresiones culturales y casos ambiguos
 */

export interface ComplexCaseExample {
  text: string;
  label: 'positive' | 'negative' | 'neutral';
  complexity: 'high' | 'medium' | 'low';
  category: 'sarcasm' | 'slang' | 'typos' | 'cultural' | 'temporal' | 'negation' | 'mixed';
  difficulty: number; // 1-10
  reasoning: string;
}

export const ComplexSentimentDataset: ComplexCaseExample[] = [
  // CASOS DE SARCASMO (Alta complejidad)
  {
    text: "Oh 'wonderful', another app that crashes during important calls",
    label: 'negative',
    complexity: 'high',
    category: 'sarcasm',
    difficulty: 9,
    reasoning: "Sarcasmo evidente con 'wonderful' entre comillas y contexto negativo"
  },
  {
    text: "Perfect timing for the server to go down right during the presentation",
    label: 'negative',
    complexity: 'high',
    category: 'sarcasm',
    difficulty: 8,
    reasoning: "Sarcasmo temporal - 'perfect timing' en contexto claramente negativo"
  },
  {
    text: "Just 'fantastic' how the update broke the only feature that worked",
    label: 'negative',
    complexity: 'high',
    category: 'sarcasm',
    difficulty: 9,
    reasoning: "Comillas sarcásticas alrededor de palabra positiva en contexto negativo"
  },
  {
    text: "Great job making the app even slower than before... impressive",
    label: 'negative',
    complexity: 'high',
    category: 'sarcasm',
    difficulty: 7,
    reasoning: "Palabras positivas con puntos suspensivos y contexto claramente negativo"
  },
  {
    text: "Amazing how they managed to make customer service even worse",
    label: 'negative',
    complexity: 'high',
    category: 'sarcasm',
    difficulty: 8,
    reasoning: "Palabra positiva seguida de comparación negativa"
  },

  // SLANG MODERNO Y EXPRESIONES GENERACIONALES
  {
    text: "This app is absolutely fire! No cap, it's bussin fr fr 💯",
    label: 'positive',
    complexity: 'medium',
    category: 'slang',
    difficulty: 6,
    reasoning: "Slang positivo moderno: 'fire', 'no cap', 'bussin', 'fr fr'"
  },
  {
    text: "This update is straight up broken, devs really fumbled the bag",
    label: 'negative',
    complexity: 'medium',
    category: 'slang',
    difficulty: 5,
    reasoning: "Slang negativo: 'straight up broken', 'fumbled the bag'"
  },
  {
    text: "The new feature is mid tbh, nothing special but it works I guess",
    label: 'neutral',
    complexity: 'medium',
    category: 'slang',
    difficulty: 7,
    reasoning: "Slang neutral: 'mid' significa mediocre, 'tbh' (to be honest)"
  },
  {
    text: "This product is lowkey goated, not gonna lie it's pretty sick",
    label: 'positive',
    complexity: 'medium',
    category: 'slang',
    difficulty: 6,
    reasoning: "Slang positivo: 'lowkey goated' (secretamente bueno), 'sick' (genial)"
  },
  {
    text: "That's cap bro, this app is trash and you know it",
    label: 'negative',
    complexity: 'medium',
    category: 'slang',
    difficulty: 5,
    reasoning: "Slang negativo: 'cap' (mentira), 'trash' (basura)"
  },

  // ERRORES TIPOGRÁFICOS Y ESCRITURA INFORMAL
  {
    text: "Amazng qualiti! Hihgly recomend to evryone, realy awsome",
    label: 'positive',
    complexity: 'medium',
    category: 'typos',
    difficulty: 6,
    reasoning: "Múltiples errores tipográficos pero sentimiento claramente positivo"
  },
  {
    text: "Wrost purchas ever, totaly waist of mony, dont by this",
    label: 'negative',
    complexity: 'medium',
    category: 'typos',
    difficulty: 5,
    reasoning: "Errores tipográficos con sentimiento claramente negativo"
  },
  {
    text: "Its okey i gess, not grat but not terible eiter",
    label: 'neutral',
    complexity: 'medium',
    category: 'typos',
    difficulty: 7,
    reasoning: "Errores tipográficos con sentimiento neutro balanceado"
  },

  // EXPRESIONES CULTURALES Y MULTILINGÜES
  {
    text: "Este producto la rompe mal, súper recomendado posta",
    label: 'positive',
    complexity: 'medium',
    category: 'cultural',
    difficulty: 7,
    reasoning: "Argentinismo: 'la rompe mal' (es excelente), 'posta' (en serio)"
  },
  {
    text: "C'est pas terrible ce produit, franchement décevant",
    label: 'negative',
    complexity: 'high',
    category: 'cultural',
    difficulty: 8,
    reasoning: "Francés: 'pas terrible' (no está bien), 'décevant' (decepcionante)"
  },
  {
    text: "This app is proper brilliant, innit? Absolutely chuffed with it!",
    label: 'positive',
    complexity: 'medium',
    category: 'cultural',
    difficulty: 6,
    reasoning: "Inglés británico: 'proper brilliant', 'innit', 'chuffed'"
  },
  {
    text: "Das ist echt mies, totale Geldverschwendung würde ich sagen",
    label: 'negative',
    complexity: 'medium',
    category: 'cultural',
    difficulty: 6,
    reasoning: "Alemán: 'echt mies' (realmente malo), 'Geldverschwendung' (desperdicio de dinero)"
  },

  // CONTEXTO TEMPORAL Y COMPARACIONES
  {
    text: "This was good back in 2020 but now feels completely outdated",
    label: 'negative',
    complexity: 'high',
    category: 'temporal',
    difficulty: 8,
    reasoning: "Contexto temporal que cambia sentimiento de positivo a negativo"
  },
  {
    text: "Still works great after 3 years, definitely built to last",
    label: 'positive',
    complexity: 'medium',
    category: 'temporal',
    difficulty: 5,
    reasoning: "Durabilidad temporal que refuerza sentimiento positivo"
  },
  {
    text: "Used to hate this app but the recent updates changed everything",
    label: 'positive',
    complexity: 'high',
    category: 'temporal',
    difficulty: 7,
    reasoning: "Cambio temporal de negativo a positivo"
  },

  // DOBLES NEGACIONES Y CASOS AMBIGUOS
  {
    text: "I can't say I'm not impressed with this purchase",
    label: 'positive',
    complexity: 'high',
    category: 'negation',
    difficulty: 9,
    reasoning: "Doble negación que resulta en sentimiento positivo"
  },
  {
    text: "Not disappointed at all, wasn't expecting much but this delivers",
    label: 'positive',
    complexity: 'high',
    category: 'negation',
    difficulty: 8,
    reasoning: "Negación de sentimiento negativo + superación de expectativas"
  },
  {
    text: "Can't complain about the quality, though the price isn't great",
    label: 'neutral',
    complexity: 'high',
    category: 'mixed',
    difficulty: 8,
    reasoning: "Sentimientos mixtos: calidad buena vs precio malo"
  },

  // CASOS MIXTOS CON EMOCIONES CONTRADICTORIAS
  {
    text: "I love this app but hate how it drains my battery so fast 😔",
    label: 'neutral',
    complexity: 'high',
    category: 'mixed',
    difficulty: 7,
    reasoning: "Sentimientos contradictorios: amor por la app vs odio por problema específico"
  },
  {
    text: "Great product overall, though shipping took way longer than expected",
    label: 'positive',
    complexity: 'medium',
    category: 'mixed',
    difficulty: 6,
    reasoning: "Sentimiento general positivo con crítica menor sobre envío"
  },
  {
    text: "Perfect app, absolutely no complaints whatsoever... except it crashes daily",
    label: 'negative',
    complexity: 'high',
    category: 'mixed',
    difficulty: 9,
    reasoning: "Sarcasmo + contradicción: elogio seguido de crítica grave"
  },

  // EXPRESIONES EXTREMAS E HIPÉRBOLES
  {
    text: "This coffee literally saved my life this Monday morning!",
    label: 'positive',
    complexity: 'medium',
    category: 'slang',
    difficulty: 5,
    reasoning: "Hipérbole positiva con 'literally saved my life'"
  },
  {
    text: "If this app were a person, I'd write them a thank you letter",
    label: 'positive',
    complexity: 'medium',
    category: 'slang',
    difficulty: 6,
    reasoning: "Metáfora de gratitud creativa"
  },
  {
    text: "This product could end world hunger and I'd still complain about the packaging",
    label: 'negative',
    complexity: 'high',
    category: 'sarcasm',
    difficulty: 9,
    reasoning: "Hipérbole sarcástica que indica insatisfacción extrema"
  },

  // CASOS DE REVISIÓN CRÍTICA CONSTRUCTIVA
  {
    text: "Solid foundation but needs work on user interface and loading times",
    label: 'neutral',
    complexity: 'medium',
    category: 'mixed',
    difficulty: 6,
    reasoning: "Evaluación equilibrada con aspectos positivos y negativos específicos"
  },
  {
    text: "Shows promise but currently too buggy for daily use",
    label: 'negative',
    complexity: 'medium',
    category: 'mixed',
    difficulty: 5,
    reasoning: "Reconoce potencial pero critica estado actual"
  },
  {
    text: "Exceeded expectations in some areas, disappointed in others",
    label: 'neutral',
    complexity: 'medium',
    category: 'mixed',
    difficulty: 7,
    reasoning: "Experiencia balanceada con altos y bajos"
  },

  // CASOS CON CONTEXTO ESPECÍFICO DE REDES SOCIALES
  {
    text: "@company your app is fire but why does it eat my data like crazy? 📱💀",
    label: 'neutral',
    complexity: 'medium',
    category: 'mixed',
    difficulty: 6,
    reasoning: "Mención directa con elogio + queja específica + emojis expresivos"
  },
  {
    text: "Trending for all the wrong reasons #fail #disappointed #refund",
    label: 'negative',
    complexity: 'medium',
    category: 'slang',
    difficulty: 5,
    reasoning: "Hashtags negativos y expresión de redes sociales"
  },
  {
    text: "This deserves to go viral! Everyone needs to try this #amazing #gameChanger",
    label: 'positive',
    complexity: 'low',
    category: 'slang',
    difficulty: 3,
    reasoning: "Entusiasmo con hashtags claramente positivos"
  }
];

/**
 * Dataset de casos complejos filtrado por categoría
 */
export function getComplexCasesByCategory(category: ComplexCaseExample['category']): ComplexCaseExample[] {
  return ComplexSentimentDataset.filter(example => example.category === category);
}

/**
 * Dataset de casos complejos filtrado por dificultad
 */
export function getComplexCasesByDifficulty(minDifficulty: number, maxDifficulty: number = 10): ComplexCaseExample[] {
  return ComplexSentimentDataset.filter(
    example => example.difficulty >= minDifficulty && example.difficulty <= maxDifficulty
  );
}

/**
 * Dataset de casos complejos filtrado por complejidad
 */
export function getComplexCasesByComplexity(complexity: ComplexCaseExample['complexity']): ComplexCaseExample[] {
  return ComplexSentimentDataset.filter(example => example.complexity === complexity);
}

/**
 * Obtener estadísticas del dataset de casos complejos
 */
export function getComplexDatasetStats(): {
  total: number;
  byCategory: Record<string, number>;
  byComplexity: Record<string, number>;
  byLabel: Record<string, number>;
  averageDifficulty: number;
} {
  const stats = {
    total: ComplexSentimentDataset.length,
    byCategory: {} as Record<string, number>,
    byComplexity: {} as Record<string, number>,
    byLabel: {} as Record<string, number>,
    averageDifficulty: 0
  };

  let totalDifficulty = 0;

  ComplexSentimentDataset.forEach(example => {
    // Contar por categoría
    stats.byCategory[example.category] = (stats.byCategory[example.category] || 0) + 1;
    
    // Contar por complejidad
    stats.byComplexity[example.complexity] = (stats.byComplexity[example.complexity] || 0) + 1;
    
    // Contar por etiqueta
    stats.byLabel[example.label] = (stats.byLabel[example.label] || 0) + 1;
    
    // Sumar dificultad
    totalDifficulty += example.difficulty;
  });

  stats.averageDifficulty = totalDifficulty / ComplexSentimentDataset.length;

  return stats;
}
/**
 * Script de prueba para validar las capacidades de auto-aprendizaje
 * 
 * Este script demuestra:
 * - Análisis de sentimiento básico
 * - Provisión de feedback para auto-aprendizaje
 * - Entrenamiento incremental
 * - Detección de mejoras en el rendimiento
 */

import { SentimentLabel } from '../src/services/naive-bayes-sentiment.service';
import { TweetSentimentAnalysisManager } from '../src/services/tweet-sentiment-analysis.manager.service';

interface TestExample {
  text: string;
  expectedLabel: SentimentLabel;
  description: string;
}

// Datos de prueba más diversos y realistas para auto-aprendizaje
const testExamples: TestExample[] = [
  // Casos claros (fáciles)
  {
    text: "¡Me encanta este producto! Es increíble y muy útil.",
    expectedLabel: "positive",
    description: "Comentario positivo claro en español"
  },
  {
    text: "This product is absolutely terrible, worst purchase ever made!",
    expectedLabel: "negative", 
    description: "Comentario negativo claro en inglés"
  },
  {
    text: "The product is okay, nothing special or extraordinary.",
    expectedLabel: "neutral",
    description: "Comentario neutral claro"
  },
  
  // Casos con sarcasmo y ironía (difíciles)
  {
    text: "Oh great, another 'amazing' product that breaks after one week. Just perfect!",
    expectedLabel: "negative",
    description: "Sarcasmo negativo (caso difícil)"
  },
  {
    text: "Yeah, sure, this is 'the best' thing I've ever bought... NOT!",
    expectedLabel: "negative",
    description: "Ironía evidente (caso difícil)"
  },
  
  // Casos con jerga moderna y slang
  {
    text: "This product is fire! Absolutely goated, no cap 🔥",
    expectedLabel: "positive",
    description: "Jerga moderna positiva"
  },
  {
    text: "Bruh this is straight trash, mid af, not gonna lie",
    expectedLabel: "negative",
    description: "Jerga moderna negativa"
  },
  
  // Casos con emociones mixtas
  {
    text: "I wanted to love this product but it has some serious flaws. Disappointed.",
    expectedLabel: "negative",
    description: "Emociones mixtas (expectativa vs realidad)"
  },
  {
    text: "Not bad for the price, could be better but does the job.",
    expectedLabel: "neutral",
    description: "Evaluación balanceada"
  },
  
  // Casos con contexto cultural
  {
    text: "C'est pas terrible ce produit, franchement déçu",
    expectedLabel: "negative",
    description: "Expresión francesa negativa"
  },
  {
    text: "Está buenísimo este producto, la rompe mal!",
    expectedLabel: "positive",
    description: "Jerga argentina positiva"
  },
  
  // Casos con errores tipográficos (realista)
  {
    text: "Amazng qualiti! Hihgly recomend it to evryone.",
    expectedLabel: "positive",
    description: "Comentario positivo con errores tipográficos"
  }
];

// Datos más diversos para entrenamiento incremental
const incrementalTrainingData = [
  // Casos de productos específicos
  { text: "This smartphone camera quality is outstanding, crystal clear photos!", label: "positive" as SentimentLabel },
  { text: "The laptop overheats constantly, terrible build quality for the price.", label: "negative" as SentimentLabel },
  { text: "The headphones are decent, average sound quality but comfortable.", label: "neutral" as SentimentLabel },
  
  // Casos de servicio al cliente
  { text: "Customer support was incredibly helpful and solved my issue quickly!", label: "positive" as SentimentLabel },
  { text: "Waited 2 hours on hold just to be transferred 3 times. Worst service ever.", label: "negative" as SentimentLabel },
  { text: "Support was okay, took a while but they eventually helped.", label: "neutral" as SentimentLabel },
  
  // Casos con slang y expresiones modernas
  { text: "This app slaps different! It's bussin fr fr 💯", label: "positive" as SentimentLabel },
  { text: "This update is straight up broken, devs really fumbled the bag", label: "negative" as SentimentLabel },
  { text: "The new feature is mid, nothing special but works I guess", label: "neutral" as SentimentLabel },
  
  // Casos multilingües
  { text: "Questo prodotto è fantastico! Lo consiglio vivamente", label: "positive" as SentimentLabel },
  { text: "Das ist wirklich schlecht, totale Geldverschwendung", label: "negative" as SentimentLabel },
  { text: "Le produit est correct, sans plus ni moins", label: "neutral" as SentimentLabel }
];

async function testAutoLearningCapabilities(): Promise<void> {
  console.log("🧠 Iniciando pruebas del sistema de auto-aprendizaje...\n");

  // Crear instancia del manager con auto-aprendizaje habilitado
  const manager = new TweetSentimentAnalysisManager(true);

  console.log("✅ Manager inicializado con auto-aprendizaje habilitado");
  console.log(`📊 Estado inicial: ${manager.isAutoLearningEnabled() ? 'HABILITADO' : 'DESHABILITADO'}\n`);

  // 1. Obtener estadísticas iniciales
  console.log("📈 ESTADÍSTICAS INICIALES:");
  console.log("=" .repeat(40));
  const initialStats = manager.getAutoLearningStats();
  console.log(JSON.stringify(initialStats, null, 2));
  console.log();

  // 2. Realizar análisis y proporcionar feedback
  console.log("🔍 FASE 1: Análisis con feedback");
  console.log("=" .repeat(40));
  
  let correctPredictions = 0;
  let totalPredictions = 0;

  for (const example of testExamples) {
    // Predecir con el modelo
    const prediction = manager.predictWithAutoLearning(example.text);
    const isCorrect = prediction.label === example.expectedLabel;
    
    if (isCorrect) correctPredictions++;
    totalPredictions++;

    console.log(`📝 ${example.description}`);
    console.log(`   Texto: "${example.text}"`);
    console.log(`   Esperado: ${example.expectedLabel}`);
    console.log(`   Predicho: ${prediction.label} (${(prediction.confidence * 100).toFixed(1)}%)`);
    console.log(`   Resultado: ${isCorrect ? '✅ CORRECTO' : '❌ INCORRECTO'}`);

    // Proporcionar feedback al sistema
    const feedbackProvided = manager.provideFeedback(
      example.text,
      example.expectedLabel,
      'test-user',
      'validation-script'
    );

    if (feedbackProvided) {
      console.log(`   📤 Feedback proporcionado al sistema`);
    }
    console.log();
  }

  const initialAccuracy = (correctPredictions / totalPredictions) * 100;
  console.log(`🎯 Precisión inicial: ${initialAccuracy.toFixed(1)}% (${correctPredictions}/${totalPredictions})`);
  console.log();

  // 3. Estadísticas después del feedback
  console.log("📈 ESTADÍSTICAS DESPUÉS DEL FEEDBACK:");
  console.log("=" .repeat(40));
  const statsAfterFeedback = manager.getAutoLearningStats();
  console.log(JSON.stringify(statsAfterFeedback, null, 2));
  console.log();

  // 4. Entrenamiento incremental
  console.log("🎓 FASE 2: Entrenamiento incremental");
  console.log("=" .repeat(40));
  
  console.log(`📚 Entrenando con ${incrementalTrainingData.length} ejemplos adicionales...`);
  const trainingSuccess = manager.incrementalTrain(incrementalTrainingData);
  
  if (trainingSuccess) {
    console.log("✅ Entrenamiento incremental completado exitosamente");
  } else {
    console.log("❌ Error en el entrenamiento incremental");
  }
  console.log();

  // 5. Forzar procesamiento del buffer
  console.log("🔄 FASE 3: Procesamiento del buffer");
  console.log("=" .repeat(40));
  
  const bufferProcessed = manager.forceProcessAutoLearningBuffer();
  if (bufferProcessed) {
    console.log("✅ Buffer de auto-aprendizaje procesado");
  } else {
    console.log("⚠️ No se pudo procesar el buffer");
  }
  console.log();

  // 6. Volver a probar después del entrenamiento
  console.log("🔍 FASE 4: Re-evaluación después del entrenamiento");
  console.log("=" .repeat(40));
  
  let improvedCorrect = 0;
  let improvedTotal = 0;

  for (const example of testExamples) {
    const prediction = manager.predictWithAutoLearning(example.text);
    const isCorrect = prediction.label === example.expectedLabel;
    
    if (isCorrect) improvedCorrect++;
    improvedTotal++;

    console.log(`📝 ${example.description}`);
    console.log(`   Predicho: ${prediction.label} (${(prediction.confidence * 100).toFixed(1)}%)`);
    console.log(`   Resultado: ${isCorrect ? '✅ CORRECTO' : '❌ INCORRECTO'}`);
    console.log();
  }

  const improvedAccuracy = (improvedCorrect / improvedTotal) * 100;
  const accuracyImprovement = improvedAccuracy - initialAccuracy;

  console.log(`🎯 Precisión después del entrenamiento: ${improvedAccuracy.toFixed(1)}% (${improvedCorrect}/${improvedTotal})`);
  console.log(`📈 Mejora: ${accuracyImprovement >= 0 ? '+' : ''}${accuracyImprovement.toFixed(1)}%`);
  
  if (accuracyImprovement > 0) {
    console.log("🚀 ¡El auto-aprendizaje mejoró el rendimiento!");
  } else if (accuracyImprovement === 0) {
    console.log("📊 El rendimiento se mantiene estable");
  } else {
    console.log("⚠️ El rendimiento disminuyó - puede necesitar más datos");
  }
  console.log();

  // 7. Estadísticas finales
  console.log("📈 ESTADÍSTICAS FINALES:");
  console.log("=" .repeat(40));
  const finalStats = manager.getAutoLearningStats();
  console.log(JSON.stringify(finalStats, null, 2));
  console.log();

  // 8. Validación final con casos muy desafiantes
  console.log("🔬 FASE 5: Validación con casos desafiantes");
  console.log("=" .repeat(40));
  
  const challengingCases = [
    // Sarcasmo muy sutil
    { text: "What a 'wonderful' day to discover my order was cancelled without notice", expected: "negative" as SentimentLabel, description: "Sarcasmo sutil con comillas" },
    { text: "Just 'fantastic' how the app crashes right when I need it most", expected: "negative" as SentimentLabel, description: "Sarcasmo con timing crítico" },
    
    // Casos de satisfacción genuina con críticas constructivas
    { text: "I love this app but the dark mode could use some improvements", expected: "positive" as SentimentLabel, description: "Positivo con crítica constructiva" },
    { text: "Great product overall, though shipping took longer than expected", expected: "positive" as SentimentLabel, description: "Satisfacción general con queja menor" },
    
    // Casos neutrales que parecen positivos/negativos
    { text: "I used this product for a month, here are my observations", expected: "neutral" as SentimentLabel, description: "Introducción neutral aparentemente informativa" },
    { text: "The product does what it says it will do", expected: "neutral" as SentimentLabel, description: "Cumplimiento básico de expectativas" },
    
    // Expresiones extremas pero humorísticas
    { text: "This coffee literally saved my life this Monday morning!", expected: "positive" as SentimentLabel, description: "Hipérbole humorística positiva" },
    { text: "If this app were a person, I'd write them a thank you letter", expected: "positive" as SentimentLabel, description: "Metáfora de gratitud creativa" },
    
    // Doble negación que resulta en positivo
    { text: "I can't say I'm not impressed with this purchase", expected: "positive" as SentimentLabel, description: "Doble negación = positivo" },
    { text: "Not disappointed at all, wasn't expecting much but this delivers", expected: "positive" as SentimentLabel, description: "Expectativas superadas con negaciones" },
    
    // Contexto temporal afectando sentimiento
    { text: "This was good in 2020 but feels outdated now", expected: "negative" as SentimentLabel, description: "Cambio temporal negativo" },
    { text: "Still works great after 3 years, built to last", expected: "positive" as SentimentLabel, description: "Durabilidad temporal positiva" }
  ];

  let challengingCorrect = 0;
  const challengingTotal = challengingCases.length;

  for (const challenge of challengingCases) {
    const prediction = manager.predictWithAutoLearning(challenge.text);
    const isCorrect = prediction.label === challenge.expected;
    
    if (isCorrect) challengingCorrect++;

    console.log(`🔍 ${challenge.description}`);
    console.log(`   Texto: "${challenge.text}"`);
    console.log(`   Esperado: ${challenge.expected} | Predicho: ${prediction.label} (${(prediction.confidence * 100).toFixed(1)}%)`);
    console.log(`   Resultado: ${isCorrect ? '✅ CORRECTO' : '❌ INCORRECTO'}`);
    console.log();
  }

  const challengingAccuracy = (challengingCorrect / challengingTotal) * 100;
  console.log(`🎯 Precisión en casos desafiantes: ${challengingAccuracy.toFixed(1)}% (${challengingCorrect}/${challengingTotal})`);
  console.log();

  // 9. Probar análisis con potencial de feedback
  console.log("🔬 FASE 5: Análisis con potencial de feedback");
  console.log("=" .repeat(40));
  
  const testTweet = {
    id: "test-tweet-123",
    tweetId: "test-tweet-123",
    content: "This is an amazing product that I absolutely love!",
    text: "This is an amazing product that I absolutely love!",
    author: {
      id: "test-user",
      username: "testuser",
      name: "Test User",
      displayName: "Test User",
      followers: 100,
      following: 50,
      followersCount: 100,
      followingCount: 50,
      tweetsCount: 25,
      verified: false
    },
    metrics: {
      likes: 10,
      retweets: 5,
      replies: 2,
      quotes: 1,
      impressions: 100,
      engagementRate: 0.18
    },
    hashtags: [],
    mentions: [],
    urls: [],
    media: [],
    createdAt: new Date().toISOString(),
    scrapedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lang: "en",
    language: "en",
    isRetweet: false,
    isReply: false,
    isQuote: false,
    conversationId: "test-conversation-123",
    parentTweetId: null,
    publicMetrics: {
      retweetCount: 5,
      likeCount: 10,
      replyCount: 2,
      quoteCount: 1
    }
  } as any; // Usar any para evitar problemas de tipo en el script de prueba

  const analysisWithFeedback = await manager.analyzeTweetWithFeedbackPotential(
    testTweet,
    { enableFeedback: true }
  );

  console.log("🐦 Tweet de prueba:", testTweet.content);
  console.log("📊 Análisis:", JSON.stringify(analysisWithFeedback.analysis.sentiment, null, 2));
  console.log("🔄 Feedback habilitado:", analysisWithFeedback.feedbackEnabled);
  console.log();

  // 9. Cleanup
  manager.dispose();
  console.log("🧹 Recursos liberados");
  console.log();

  console.log("🎉 PRUEBAS COMPLETADAS EXITOSAMENTE");
  console.log("=" .repeat(50));
  console.log(`📊 Resumen completo:`);
  console.log(`   • Precisión inicial: ${initialAccuracy.toFixed(1)}%`);
  console.log(`   • Precisión post-entrenamiento: ${improvedAccuracy.toFixed(1)}%`);
  console.log(`   • Mejora con auto-aprendizaje: ${accuracyImprovement >= 0 ? '+' : ''}${accuracyImprovement.toFixed(1)}%`);
  console.log(`   • Precisión en casos desafiantes: ${challengingAccuracy.toFixed(1)}%`);
  console.log(`   • Ejemplos de feedback procesados: ${testExamples.length}`);
  console.log(`   • Entrenamiento incremental: ${incrementalTrainingData.length} ejemplos`);
  console.log(`   • Casos desafiantes evaluados: ${challengingTotal}`);
  console.log(`   • Sistema de auto-aprendizaje: ${trainingSuccess ? 'FUNCIONAL ✅' : 'CON PROBLEMAS ❌'}`);
  
  if (challengingAccuracy >= 70) {
    console.log(`   🏆 EXCELENTE: Manejo robusto de casos complejos`);
  } else if (challengingAccuracy >= 50) {
    console.log(`   👍 BUENO: Manejo decente, con espacio para mejora`);
  } else {
    console.log(`   ⚠️ NECESITA MEJORAS: Dificultades con casos complejos`);
  }
}

// Función principal
async function main(): Promise<void> {
  try {
    await testAutoLearningCapabilities();
  } catch (error) {
    console.error("❌ Error durante las pruebas:", error);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main();
}

export { testAutoLearningCapabilities };

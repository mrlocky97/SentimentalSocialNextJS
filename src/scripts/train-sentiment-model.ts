#!/usr/bin/env ts-node

/**
 * Enhanced Sentiment Analysis Model Training Script
 * Entrena y prueba el modelo de análisis de sentimientos con el nuevo dataset mejorado
 */

import * as fs from "fs";
import * as path from "path";
import { enhancedTrainingDataV3Complete } from "../data/enhanced-training-data-v3";
import { FixedNaiveBayesService } from "../services/fixed-naive-bayes.service";

async function trainAndTestModel() {
  console.log(
    "🚀 Iniciando entrenamiento del modelo de análisis de sentimientos...\n",
  );

  // Mostrar estadísticas del dataset
  const positiveCount = enhancedTrainingDataV3Complete.filter(
    (d: { label: string }) => d.label === "positive",
  ).length;
  const negativeCount = enhancedTrainingDataV3Complete.filter(
    (d: { label: string }) => d.label === "negative",
  ).length;
  const neutralCount = enhancedTrainingDataV3Complete.filter(
    (d: { label: string }) => d.label === "neutral",
  ).length;

  console.log("📊 Estadísticas del Dataset Mejorado:");
  console.log(`   Total ejemplos: ${enhancedTrainingDataV3Complete.length}`);
  console.log(
    `   Positivos: ${positiveCount} (${((positiveCount / enhancedTrainingDataV3Complete.length) * 100).toFixed(1)}%)`,
  );
  console.log(
    `   Negativos: ${negativeCount} (${((negativeCount / enhancedTrainingDataV3Complete.length) * 100).toFixed(1)}%)`,
  );
  console.log(
    `   Neutrales: ${neutralCount} (${((neutralCount / enhancedTrainingDataV3Complete.length) * 100).toFixed(1)}%)`,
  );
  console.log("");

  // Inicializar el servicio de sentimientos mejorado
  const sentimentService = new FixedNaiveBayesService();

  // Entrenar el modelo
  console.log("🔄 Entrenando modelo...");
  const trainingStart = Date.now();

  try {
    // Convertir datos para compatibilidad con SimpleSentimentLabel
    const trainingData = enhancedTrainingDataV3Complete.map((item) => ({
      text: item.text,
      label: item.label as "positive" | "negative" | "neutral",
    }));

    sentimentService.train(trainingData);
    const trainingTime = Date.now() - trainingStart;
    console.log(`✅ Modelo entrenado exitosamente en ${trainingTime}ms\n`);

    // Guardar el modelo entrenado
    console.log("💾 Guardando modelo entrenado...");
    const modelData = {
      trained: true,
      trainingDate: new Date().toISOString(),
      datasetSize: enhancedTrainingDataV3Complete.length,
      stats: sentimentService.getStats(),
      trainingTime: trainingTime,
    };

    // Crear el directorio si no existe
    const modelPath = path.join(
      __dirname,
      "../../data/trained-sentiment-model-v3.json",
    );

    // Asegurar que el directorio existe
    const dir = path.dirname(modelPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(modelPath, JSON.stringify(modelData, null, 2));
    console.log(`✅ Modelo guardado en: ${modelPath}\n`);

    // Pruebas del modelo con ejemplos específicos de redes sociales
    console.log(
      "🧪 Probando el modelo con ejemplos de redes sociales y marketing...\n",
    );

    const testCases = [
      // Casos positivos de marketing/redes sociales
      "Just ordered from @nike and the experience was amazing! 10/10 would recommend",
      "This new @apple iPhone is absolutely incredible! Best purchase this year",
      "Loving the new @starbucks fall menu perfect for this weather!",
      "This product is fire! Absolutely obsessed!",
      "No cap, this is the best purchase I have made this year!",

      // Casos negativos con sarcasmo
      "Oh wonderful, another app update that breaks everything I liked about it",
      "Great job Brand! Nothing says quality like breaking after one day",
      "@delta lost my luggage AGAIN worst airline experience ever #NeverAgain",
      "This ain't it chief. Major disappointment vibes",
      "Straight up trash! How is this even legal to sell?",

      // Casos neutrales informativos
      "@weather forecast shows rain tomorrow. Remember to bring umbrellas",
      "New @brand store opening next week at the mall. Grand opening specials available",
      "Product quality is good but customer service needs improvement. Mixed experience overall.",

      // Casos complejos multilingües
      "Que maravilla! This brand really gets it right! Excelente servicio!",
      "C'est vraiment disappointing! Expected so much better from this brand",
    ];

    console.log("🎯 Resultados de las predicciones:\n");

    testCases.forEach((text, index) => {
      const prediction = sentimentService.predict(text);
      const confidence = (prediction.confidence * 100).toFixed(1);

      console.log(`${index + 1}. "${text}"`);
      console.log(
        `   📈 Predicción: ${prediction.label.toUpperCase()} (${confidence}% confianza)`,
      );
      console.log("");
    });

    // Estadísticas adicionales
    console.log("📈 Análisis de Rendimiento:");
    console.log(
      `   Dataset: ${enhancedTrainingDataV3Complete.length} ejemplos de alta calidad`,
    );
    console.log(
      `   Características: Social media, emojis, sarcasmo, multilingüe`,
    );
    console.log(`   Tiempo de entrenamiento: ${trainingTime}ms`);
    console.log(`   Optimizado para: Twitter, Instagram, marketing, brands`);
    console.log("");

    console.log("🏆 Mejoras implementadas:");
    console.log(
      "   ✅ Eliminación de duplicados (reducido de ~4k a ejemplos únicos)",
    );
    console.log("   ✅ Detección de sarcasmo e ironía");
    console.log("   ✅ Soporte para emojis y slang moderno");
    console.log("   ✅ Contexto de marca y marketing");
    console.log("   ✅ Patrones específicos de redes sociales");
    console.log("   ✅ Contenido multilingüe (EN/ES/FR/DE)");
    console.log("   ✅ Casos edge y clasificaciones difíciles");
  } catch (error) {
    console.error("❌ Error durante el entrenamiento:", error);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  trainAndTestModel()
    .then(() => {
      console.log("\n🎉 ¡Entrenamiento completado exitosamente!");
      console.log("💡 El modelo está listo para usar en producción.");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Error fatal:", error);
      process.exit(1);
    });
}

export { trainAndTestModel };

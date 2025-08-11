#!/usr/bin/env ts-node

/**
 * Script para Guardar el Modelo de Sentimientos Entrenado
 * Entrena el modelo con el dataset mejorado y lo guarda para uso en producción
 */

import * as fs from 'fs';
import * as path from 'path';
import { enhancedTrainingData } from '../data/enhanced-training-data';
import { NaiveBayesSentimentService } from '../services/naive-bayes-sentiment.service';

async function saveTrainedModel() {
  console.log('🚀 Iniciando proceso de entrenamiento y guardado del modelo...\n');

  // Mostrar estadísticas del dataset
  const positiveCount = enhancedTrainingData.filter((d) => d.label === 'positive').length;
  const negativeCount = enhancedTrainingData.filter((d) => d.label === 'negative').length;
  const neutralCount = enhancedTrainingData.filter((d) => d.label === 'neutral').length;

  console.log('📊 Estadísticas del Dataset de Producción:');
  console.log(`   Total ejemplos: ${enhancedTrainingData.length}`);
  console.log(
    `   Positivos: ${positiveCount} (${((positiveCount / enhancedTrainingData.length) * 100).toFixed(1)}%)`
  );
  console.log(
    `   Negativos: ${negativeCount} (${((negativeCount / enhancedTrainingData.length) * 100).toFixed(1)}%)`
  );
  console.log(
    `   Neutrales: ${neutralCount} (${((neutralCount / enhancedTrainingData.length) * 100).toFixed(1)}%)`
  );
  console.log('');

  // Inicializar y entrenar el modelo
  console.log('🔄 Entrenando modelo de producción...');
  const trainingStart = Date.now();

  try {
    const sentimentService = new NaiveBayesSentimentService();
    sentimentService.train(enhancedTrainingData);

    const trainingTime = Date.now() - trainingStart;
    console.log(`✅ Modelo entrenado exitosamente en ${trainingTime}ms\n`);

    // Crear metadatos del modelo
    const metadata = {
      version: '2.0.0',
      trainingDate: new Date().toISOString(),
      datasetSize: enhancedTrainingData.length,
      trainingTime: trainingTime,
      distribution: {
        positive: positiveCount,
        negative: negativeCount,
        neutral: neutralCount,
      },
      features: [
        'Social media optimized',
        'Emoji and slang support',
        'Sarcasm detection',
        'Multilingual (EN/ES/FR/DE)',
        'Brand and marketing context',
        'Modern communication patterns',
      ],
    };

    // Guardar el modelo en la carpeta data
    const modelPath = path.join(__dirname, '../data/trained-sentiment-model.json');
    const metadataPath = path.join(__dirname, '../data/model-metadata.json');

    console.log('💾 Guardando modelo entrenado...');

    // Guardar el clasificador usando el método nativo
    sentimentService.saveToFile(modelPath);

    // Guardar metadatos por separado
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    console.log(`✅ Modelo guardado exitosamente en: ${modelPath}`);
    console.log(`✅ Metadatos guardados en: ${metadataPath}\n`);

    // Verificar que el archivo se guardó correctamente
    const fileStats = fs.statSync(modelPath);
    console.log('📋 Información del modelo guardado:');
    console.log(`   Tamaño del archivo: ${(fileStats.size / 1024).toFixed(2)} KB`);
    console.log(`   Ubicación: ${modelPath}`);
    console.log(`   Fecha de creación: ${fileStats.birthtime.toISOString()}`);
    console.log('');

    // Prueba rápida del modelo guardado
    console.log('🧪 Verificando funcionalidad del modelo guardado...');

    const testCases = [
      'This product is absolutely amazing! Love it! 😍',
      'Worst purchase ever. Complete waste of money 😠',
      'The package arrived today. Standard delivery time.',
      'Oh great, another bug in the app. Just perfect! 🙄',
    ];

    testCases.forEach((text, index) => {
      const prediction = sentimentService.predict(text);
      console.log(`   ${index + 1}. "${text}"`);
      console.log(
        `      → ${prediction.label.toUpperCase()} (${(prediction.confidence * 100).toFixed(1)}%)`
      );
    });

    console.log('\n🎉 ¡Modelo de producción guardado exitosamente!');
    console.log('💡 El modelo está listo para ser cargado y utilizado en la aplicación.');
    console.log(
      `📈 Características: ${enhancedTrainingData.length} ejemplos balanceados con soporte avanzado`
    );
  } catch (error) {
    console.error('❌ Error durante el proceso:', error);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  saveTrainedModel()
    .then(() => {
      console.log('\n✨ Proceso completado exitosamente!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error fatal:', error);
      process.exit(1);
    });
}

export { saveTrainedModel };

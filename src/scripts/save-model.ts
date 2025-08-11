#!/usr/bin/env tsx

/**
 * Script Simple para Guardar el Modelo Entrenado
 */

import * as fs from 'fs';
import * as path from 'path';
import { enhancedTrainingData } from '../data/enhanced-training-data';
import { NaiveBayesSentimentService } from '../services/naive-bayes-sentiment.service';

async function saveModel() {
  console.log('🚀 Entrenando y guardando modelo de producción...\n');

  const sentimentService = new NaiveBayesSentimentService();
  sentimentService.train(enhancedTrainingData);

  const modelPath = path.join(__dirname, '../data/trained-sentiment-model.json');

  console.log('💾 Guardando modelo...');
  sentimentService.saveToFile(modelPath);

  // Crear archivo de metadatos
  const metadata = {
    version: '2.0.0',
    trainingDate: new Date().toISOString(),
    datasetSize: enhancedTrainingData.length,
    features: ['Social media', 'Emojis', 'Sarcasm', 'Multilingual'],
  };

  const metadataPath = path.join(__dirname, '../data/model-metadata.json');
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

  console.log(`✅ Modelo guardado: ${modelPath}`);
  console.log(`✅ Metadatos guardados: ${metadataPath}`);
  console.log('🎉 ¡Modelo listo para producción!');
}

saveModel().catch(console.error);

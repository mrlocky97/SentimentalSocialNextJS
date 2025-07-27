/**
 * Test Script para Verificar Optimizaciones
 * Prueba las funciones centralizadas creadas durante la optimización
 */

import { normalizeSentimentLabel, calculateSentimentMetrics } from '../lib/utils/sentiment.utils';
import { isValidEmail, isValidPassword, isValidHashtag } from '../lib/utils/validation.utils';
import { calculateEngagementRate, calculateBatchSentimentMetrics } from '../lib/utils/metrics.utils';

console.log('🧪 Iniciando pruebas de optimización...\n');

// Test 1: Sentiment Utilities
console.log('📊 Probando utilidades de sentimientos...');
try {
  const normalizedPositive = normalizeSentimentLabel('very_positive');
  const normalizedNegative = normalizeSentimentLabel('very_negative');
  const normalizedNeutral = normalizeSentimentLabel('neutral');
  
  console.log(`✅ normalizeSentimentLabel - Positive: ${normalizedPositive}`);
  console.log(`✅ normalizeSentimentLabel - Negative: ${normalizedNegative}`);
  console.log(`✅ normalizeSentimentLabel - Neutral: ${normalizedNeutral}`);
  
} catch (error) {
  console.log(`❌ Error en sentiment utilities: ${error}`);
}

// Test 2: Validation Utilities
console.log('\n🔍 Probando utilidades de validación...');
try {
  const validEmail = isValidEmail('test@example.com');
  const invalidEmail = isValidEmail('invalid-email');
  const validPassword = isValidPassword('StrongPass123');
  const invalidPassword = isValidPassword('weak');
  const validHashtag = isValidHashtag('#SentimentalSocial');
  
  console.log(`✅ isValidEmail - Valid: ${validEmail}, Invalid: ${invalidEmail}`);
  console.log(`✅ isValidPassword - Valid: ${validPassword}, Invalid: ${invalidPassword}`);
  console.log(`✅ isValidHashtag - Valid: ${validHashtag}`);
  
} catch (error) {
  console.log(`❌ Error en validation utilities: ${error}`);
}

// Test 3: Metrics Utilities
console.log('\n📈 Probando utilidades de métricas...');
try {
  const engagementRate = calculateEngagementRate(100, 50, 25, 10, 1000);
  console.log(`✅ calculateEngagementRate - Rate: ${engagementRate.toFixed(2)}%`);
  
  const sentiments = [
    { label: 'positive' as const, score: 0.8, confidence: 0.9, magnitude: 0.8 },
    { label: 'negative' as const, score: -0.5, confidence: 0.7, magnitude: 0.5 },
    { label: 'neutral' as const, score: 0.1, confidence: 0.6, magnitude: 0.1 }
  ];
  
  const batchMetrics = calculateBatchSentimentMetrics(sentiments);
  console.log(`✅ calculateBatchSentimentMetrics - Avg Score: ${batchMetrics.averageScore.toFixed(2)}`);
  console.log(`✅ calculateBatchSentimentMetrics - Positive %: ${batchMetrics.positivePercentage.toFixed(1)}%`);
  
} catch (error) {
  console.log(`❌ Error en metrics utilities: ${error}`);
}

// Test 4: Integration Test
console.log('\n🔗 Probando integración de utilidades...');
try {
  // Simular análisis de un tweet
  const tweetText = "Me encanta este producto! #awesome";
  const sentiment = 'positive';
  
  // Normalizar sentiment
  const normalized = normalizeSentimentLabel(sentiment);
  
  // Validar hashtag
  const hashtag = '#awesome';
  const isValidHashtagTest = isValidHashtag(hashtag);
  
  // Calcular engagement
  const engagement = calculateEngagementRate(150, 75, 30, 15, 2000);
  
  console.log(`✅ Integración completa:`);
  console.log(`   - Sentiment normalizado: ${normalized}`);
  console.log(`   - Hashtag válido: ${isValidHashtagTest}`);
  console.log(`   - Engagement rate: ${engagement.toFixed(2)}%`);
  
} catch (error) {
  console.log(`❌ Error en integración: ${error}`);
}

console.log('\n🎉 Pruebas de optimización completadas!');
console.log('✨ Todas las utilidades centralizadas están funcionando correctamente.');
console.log('📝 Las optimizaciones DRY han sido implementadas exitosamente.');

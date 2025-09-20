/**
 * Script Simple de Validación Cruzada (JavaScript)
 * Versión JavaScript que funciona directamente sin compilación
 */

const { sentimentServiceFacade } = require('../dist/lib/sentiment/sentiment-service-facade');

// Mock data para prueba rápida (reemplazar con datos reales)
const testData = [
  { text: "This movie is amazing! I love it", label: "positive" },
  { text: "This is the worst film ever", label: "negative" },
  { text: "The movie was okay, nothing special", label: "neutral" },
  { text: "Absolutely fantastic performance!", label: "positive" },
  { text: "Terrible acting and boring plot", label: "negative" },
  { text: "It's an average movie", label: "neutral" },
  { text: "Best movie of the year!", label: "positive" },
  { text: "Waste of time and money", label: "negative" },
  { text: "The story was fine", label: "neutral" },
  { text: "Incredible cinematography and acting", label: "positive" },
  // Slang moderno
  { text: "This movie is fire! 🔥", label: "positive" },
  { text: "No cap, this is bussin fr", label: "positive" },
  { text: "That's mid, ain't it chief?", label: "negative" },
  { text: "This slaps different 💯", label: "positive" },
  { text: "Big L for that decision", label: "negative" },
  { text: "It's giving main character energy ✨", label: "positive" },
  { text: "This ain't it fam", label: "negative" },
  { text: "Straight up vibes 🌊", label: "positive" },
  { text: "That's sus ngl", label: "negative" },
  { text: "Living rent free in my head 💭", label: "positive" }
];

/**
 * Función simple de validación cruzada
 */
async function simpleKFoldValidation(data, k = 3) {
  console.log(`🔄 Validación Cruzada ${k}-Fold Simple`);
  console.log('='.repeat(50));
  
  console.log(`📊 Dataset: ${data.length} ejemplos`);
  
  // Distribución de clases
  const classCounts = data.reduce((acc, item) => {
    acc[item.label] = (acc[item.label] || 0) + 1;
    return acc;
  }, {});
  
  console.log('📈 Distribución de clases:');
  Object.entries(classCounts).forEach(([label, count]) => {
    console.log(`   ${label}: ${count} (${(count/data.length*100).toFixed(1)}%)`);
  });
  
  // Shuffle data
  const shuffledData = [...data].sort(() => Math.random() - 0.5);
  
  // Crear folds
  const foldSize = Math.floor(shuffledData.length / k);
  const folds = [];
  
  for (let i = 0; i < k; i++) {
    const start = i * foldSize;
    const end = i === k - 1 ? shuffledData.length : (i + 1) * foldSize;
    folds.push(shuffledData.slice(start, end));
  }
  
  const results = [];
  
  console.log(`\n🔍 Ejecutando ${k} folds...`);
  
  for (let i = 0; i < k; i++) {
    console.log(`\n📊 Fold ${i + 1}/${k}`);
    
    const testSet = folds[i];
    console.log(`   Test set: ${testSet.length} ejemplos`);
    
    let correct = 0;
    const predictions = [];
    
    console.log(`   Evaluando ${testSet.length} ejemplos...`);
    
    for (const item of testSet) {
      try {
        const result = await sentimentServiceFacade.testSentimentAnalysis({
          text: item.text,
          method: 'unified'
        });
        
        const predicted = result.label.toLowerCase();
        const isCorrect = predicted === item.label;
        
        if (isCorrect) correct++;
        
        predictions.push({
          text: item.text,
          actual: item.label,
          predicted: predicted,
          confidence: result.confidence || 0.5,
          correct: isCorrect
        });
        
      } catch (error) {
        console.warn(`     Error en predicción: ${error.message}`);
        predictions.push({
          text: item.text,
          actual: item.label,
          predicted: 'neutral',
          confidence: 0,
          correct: false
        });
      }
    }
    
    const accuracy = correct / testSet.length;
    results.push({ accuracy, predictions });
    
    console.log(`   ✅ Accuracy: ${(accuracy * 100).toFixed(2)}%`);
    console.log(`   📊 Correctas: ${correct}/${testSet.length}`);
    
    // Mostrar algunos ejemplos
    const errors = predictions.filter(p => !p.correct);
    if (errors.length > 0 && errors.length <= 3) {
      console.log(`   ❌ Errores (${errors.length}):`);
      errors.forEach(error => {
        console.log(`      "${error.text.substring(0, 40)}..." - Real: ${error.actual}, Predicho: ${error.predicted}`);
      });
    }
  }
  
  // Estadísticas finales
  console.log('\n' + '='.repeat(60));
  console.log(`📈 RESULTADOS FINALES - VALIDACIÓN CRUZADA ${k}-FOLD`);
  console.log('='.repeat(60));
  
  const avgAccuracy = results.reduce((sum, r) => sum + r.accuracy, 0) / results.length;
  const stdAccuracy = Math.sqrt(results.reduce((sum, r) => sum + Math.pow(r.accuracy - avgAccuracy, 2), 0) / results.length);
  
  console.log(`\n🎯 MÉTRICAS PROMEDIO:`);
  console.log(`   Accuracy: ${(avgAccuracy * 100).toFixed(2)}% ± ${(stdAccuracy * 100).toFixed(2)}%`);
  
  console.log(`\n📊 RENDIMIENTO POR FOLD:`);
  results.forEach((result, index) => {
    console.log(`   Fold ${index + 1}: ${(result.accuracy * 100).toFixed(1)}%`);
  });
  
  // Intervalo de confianza (95%)
  const t = 1.96;
  const margin = t * stdAccuracy / Math.sqrt(results.length);
  const ci = [avgAccuracy - margin, avgAccuracy + margin];
  
  console.log(`\n🎲 INTERVALO DE CONFIANZA (95%):`);
  console.log(`   Accuracy: [${(ci[0] * 100).toFixed(2)}%, ${(ci[1] * 100).toFixed(2)}%]`);
  
  // Análisis de todos los errores
  const allPredictions = results.flatMap(r => r.predictions);
  const allErrors = allPredictions.filter(p => !p.correct);
  
  console.log(`\n🔍 ANÁLISIS DE ERRORES:`);
  console.log(`   Total errores: ${allErrors.length}/${allPredictions.length} (${(allErrors.length/allPredictions.length*100).toFixed(1)}%)`);
  
  const errorsByClass = allErrors.reduce((acc, error) => {
    acc[error.actual] = (acc[error.actual] || 0) + 1;
    return acc;
  }, {});
  
  console.log('   Errores por clase:');
  Object.entries(errorsByClass).forEach(([label, count]) => {
    console.log(`     ${label}: ${count} errores`);
  });
  
  // Ejemplos de errores más comunes
  const errorExamples = allErrors.slice(0, 5);
  if (errorExamples.length > 0) {
    console.log('\n   Ejemplos de errores:');
    errorExamples.forEach((error, index) => {
      console.log(`     ${index + 1}. "${error.text.substring(0, 50)}..."`);
      console.log(`        Real: ${error.actual}, Predicho: ${error.predicted} (conf: ${(error.confidence*100).toFixed(1)}%)`);
    });
  }
  
  return {
    avgAccuracy,
    stdAccuracy,
    confidenceInterval: ci,
    results
  };
}

// Función principal
async function runSimpleEvaluation() {
  console.log('🚀 EVALUACIÓN SIMPLE DE SENTIMENT ANALYSIS');
  console.log('=' .repeat(70));
  
  try {
    // Validación cruzada con datos de prueba
    const result = await simpleKFoldValidation(testData, 3);
    
    console.log('\n✅ EVALUACIÓN COMPLETADA!');
    console.log(`\n🏆 RESULTADO FINAL: ${(result.avgAccuracy * 100).toFixed(2)}% ± ${(result.stdAccuracy * 100).toFixed(2)}%`);
    
    if (result.avgAccuracy >= 0.8) {
      console.log('🎉 ¡EXCELENTE! El modelo está funcionando muy bien.');
    } else if (result.avgAccuracy >= 0.6) {
      console.log('✅ BUENO. El modelo muestra un rendimiento aceptable.');
    } else {
      console.log('⚠️  MEJORABLE. El modelo necesita más ajustes.');
    }
    
  } catch (error) {
    console.error('❌ Error durante la evaluación:', error);
    throw error;
  }
}

// Ejecutar
runSimpleEvaluation()
  .then(() => {
    console.log('\n🎉 Evaluación simple completada!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error en evaluación:', error);
    process.exit(1);
  });
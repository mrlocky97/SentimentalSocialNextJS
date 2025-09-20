const { NaiveBayesSentimentService } = require('../dist/services/naive-bayes-sentiment.service');

async function diagnoseNaiveBayesModel() {
  console.log("🔍 DIAGNÓSTICO DEL MODELO NAIVE BAYES BASE");
  console.log("=".repeat(60));
  console.log();

  // Crear instancia del servicio
  const service = new NaiveBayesSentimentService();

  // Casos de prueba muy básicos
  const basicTests = [
    { text: "I love this", expectedLabel: "positive", description: "Básico positivo simple" },
    { text: "I hate this", expectedLabel: "negative", description: "Básico negativo simple" },
    { text: "This is okay", expectedLabel: "neutral", description: "Básico neutral simple" },
    { text: "amazing wonderful great", expectedLabel: "positive", description: "Múltiples palabras positivas" },
    { text: "terrible awful horrible", expectedLabel: "negative", description: "Múltiples palabras negativas" },
    { text: "the and is this", expectedLabel: "neutral", description: "Solo palabras neutras" }
  ];

  console.log("📊 PRUEBAS BÁSICAS:");
  let correct = 0;
  
  for (const test of basicTests) {
    const prediction = service.predict(test.text);
    const isCorrect = prediction.label === test.expectedLabel;
    if (isCorrect) correct++;

    console.log(`📝 ${test.description}`);
    console.log(`   Texto: "${test.text}"`);
    console.log(`   Esperado: ${test.expectedLabel} | Predicho: ${prediction.label} (${(prediction.confidence * 100).toFixed(1)}%)`);
    console.log(`   Scores: pos=${(prediction.scores.positive * 100).toFixed(1)}% neg=${(prediction.scores.negative * 100).toFixed(1)}% neu=${(prediction.scores.neutral * 100).toFixed(1)}%`);
    console.log(`   Resultado: ${isCorrect ? '✅ CORRECTO' : '❌ INCORRECTO'}`);
    console.log();
  }

  const accuracy = (correct / basicTests.length) * 100;
  console.log(`🎯 Precisión en casos básicos: ${accuracy.toFixed(1)}% (${correct}/${basicTests.length})`);
  console.log();

  // Probar palabras individuales conocidas
  console.log("🔤 PRUEBAS DE PALABRAS INDIVIDUALES:");
  
  const wordTests = [
    "love", "hate", "good", "bad", "amazing", "terrible", "okay", "nice", "awful", "neutral"
  ];

  for (const word of wordTests) {
    const prediction = service.predict(word);
    console.log(`   "${word}" → ${prediction.label} (${(prediction.confidence * 100).toFixed(1)}%)`);
  }
  console.log();

  // Examinar estado interno del modelo (si hay métodos públicos)
  console.log("⚙️ ESTADO INTERNO DEL MODELO:");
  
  // Intentar obtener información del vocabulario si es posible
  try {
    // Crear un texto con palabras conocidas y ver qué sucede
    const testText = "love amazing wonderful great fantastic excellent";
    const result = service.predict(testText);
    
    console.log(`📊 Prueba con palabras muy positivas: "${testText}"`);
    console.log(`   Resultado: ${result.label} (${(result.confidence * 100).toFixed(1)}%)`);
    console.log(`   Distribución: pos=${(result.scores.positive * 100).toFixed(1)}% neg=${(result.scores.negative * 100).toFixed(1)}% neu=${(result.scores.neutral * 100).toFixed(1)}%`);
    console.log();

    const negativeTest = "hate terrible awful horrible disgusting worst";
    const negResult = service.predict(negativeTest);
    
    console.log(`📊 Prueba con palabras muy negativas: "${negativeTest}"`);
    console.log(`   Resultado: ${negResult.label} (${(negResult.confidence * 100).toFixed(1)}%)`);
    console.log(`   Distribución: pos=${(negResult.scores.positive * 100).toFixed(1)}% neg=${(negResult.scores.negative * 100).toFixed(1)}% neu=${(negResult.scores.neutral * 100).toFixed(1)}%`);
    console.log();

  } catch (error) {
    console.log(`❌ Error accediendo al estado interno: ${error.message}`);
  }

  console.log("🏁 DIAGNÓSTICO COMPLETADO");
  
  if (accuracy < 50) {
    console.log();
    console.log("⚠️ PROBLEMAS DETECTADOS:");
    console.log("   • Precisión muy baja en casos básicos");
    console.log("   • Posible problema en el entrenamiento inicial");
    console.log("   • Dataset o preprocesamiento pueden estar afectados");
    console.log("   • Parámetros del modelo necesitan ajuste");
  }
}

// Función principal
async function main() {
  try {
    await diagnoseNaiveBayesModel();
  } catch (error) {
    console.error("❌ Error durante el diagnóstico:", error);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main();
}

module.exports = { diagnoseNaiveBayesModel };
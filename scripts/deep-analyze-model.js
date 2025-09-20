const { NaiveBayesSentimentService } = require('../dist/services/naive-bayes-sentiment.service');

async function deepAnalyzeModel() {
  console.log("🔬 ANÁLISIS PROFUNDO DEL MODELO NAIVE BAYES");
  console.log("=".repeat(60));
  console.log();

  const service = new NaiveBayesSentimentService();
  
  // Obtener estadísticas del modelo
  const stats = service.getStats();
  console.log("📊 ESTADÍSTICAS DEL MODELO:");
  console.log(`   • Vocabulario: ${stats.vocabularySize} palabras`);
  console.log(`   • Documentos entrenados: ${stats.totalDocuments}`);
  console.log(`   • Factor de suavizado: ${stats.smoothingFactor}`);
  console.log(`   • Distribución de clases:`);
  console.log(`     - Positivos: ${stats.classCounts.positive}`);
  console.log(`     - Negativos: ${stats.classCounts.negative}`);
  console.log(`     - Neutrales: ${stats.classCounts.neutral}`);
  console.log();

  // Verificar si palabras clave están en el vocabulario
  console.log("🔍 VERIFICACIÓN DEL VOCABULARIO:");
  const keyWords = ["love", "hate", "good", "bad", "amazing", "terrible", "wonderful", "awful", "great", "horrible"];
  
  const vocabulary = stats.vocabulary;
  for (const word of keyWords) {
    const inVocab = vocabulary.includes(word);
    console.log(`   "${word}": ${inVocab ? '✅ En vocabulario' : '❌ NO en vocabulario'}`);
  }
  console.log();

  // Serializar modelo para análisis detallado
  const serialized = service.serialize();
  
  console.log("📈 ANÁLISIS DE PALABRAS CLAVE:");
  
  for (const word of keyWords) {
    if (vocabulary.includes(word)) {
      console.log(`\n🔤 Palabra: "${word}"`);
      
      const posCount = serialized.classWordCounts.positive[word] || 0;
      const negCount = serialized.classWordCounts.negative[word] || 0;
      const neuCount = serialized.classWordCounts.neutral[word] || 0;
      
      console.log(`   Frecuencias: pos=${posCount}, neg=${negCount}, neu=${neuCount}`);
      
      if (posCount + negCount + neuCount > 0) {
        const total = posCount + negCount + neuCount;
        console.log(`   Distribución: pos=${((posCount/total)*100).toFixed(1)}%, neg=${((negCount/total)*100).toFixed(1)}%, neu=${((neuCount/total)*100).toFixed(1)}%`);
      }
    }
  }

  console.log("\n🔢 ANÁLISIS DE BALANCE DEL DATASET:");
  const totalPos = stats.classCounts.positive;
  const totalNeg = stats.classCounts.negative;
  const totalNeu = stats.classCounts.neutral;
  const total = totalPos + totalNeg + totalNeu;
  
  console.log(`   Distribución general:`);
  console.log(`   • Positivos: ${((totalPos/total)*100).toFixed(1)}% (${totalPos})`);
  console.log(`   • Negativos: ${((totalNeg/total)*100).toFixed(1)}% (${totalNeg})`);
  console.log(`   • Neutrales: ${((totalNeu/total)*100).toFixed(1)}% (${totalNeu})`);

  // Verificar palabras más frecuentes por clase
  console.log("\n📋 TOP 10 PALABRAS POR CLASE:");
  
  for (const cls of ['positive', 'negative', 'neutral']) {
    console.log(`\n${cls.toUpperCase()}:`);
    const wordCounts = serialized.classWordCounts[cls];
    const sortedWords = Object.entries(wordCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);
    
    for (const [word, count] of sortedWords) {
      console.log(`   "${word}": ${count} veces`);
    }
  }

  console.log("\n🏁 ANÁLISIS COMPLETADO");
}

// Función principal
async function main() {
  try {
    await deepAnalyzeModel();
  } catch (error) {
    console.error("❌ Error durante el análisis profundo:", error);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main();
}

module.exports = { deepAnalyzeModel };
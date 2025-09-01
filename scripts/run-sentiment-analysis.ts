/**
 * Script for testing the trained sentiment model
 * Allows testing the model with custom input
 * 
 * Usage:
 * npx tsx scripts/run-sentiment-analysis.ts "Your text to analyze"
 */

import dotenv from "dotenv";
dotenv.config({ path: [".env.local", ".env"] });

import { TweetSentimentAnalysisManager } from "../src/services/tweet-sentiment-analysis.manager.service";

async function analyzeText(text: string) {
  console.log("🔍 Analizando texto: ", text);
  console.log("");

  const manager = new TweetSentimentAnalysisManager();
  
  // Try to load the trained model
  const modelLoaded = await manager.tryLoadLatestModel();
  console.log(`📚 Modelo cargado: ${modelLoaded ? "✅ Sí" : "❌ No"}`);
  
  try {
    // Analyze the text
    console.log("🧠 Realizando análisis...");
    const result = await manager.getOrchestrator().analyzeText({ text });
    
    // Display results
    console.log("");
    console.log("📊 RESULTADO DEL ANÁLISIS:");
    console.log("------------------------");
    console.log(`Sentimiento: ${result.sentiment.label.toUpperCase()}`);
    console.log(`Confianza: ${(result.sentiment.confidence * 100).toFixed(1)}%`);
    console.log(`Score: ${result.sentiment.score.toFixed(2)} [-1 a +1]`);
    console.log(`Idioma detectado: ${result.language}`);
    
    if (result.keywords && result.keywords.length > 0) {
      console.log("");
      console.log("Palabras clave:");
      result.keywords.forEach((keyword, i) => {
        console.log(`  ${i + 1}. ${keyword}`);
      });
    }
    
    if (result.signals) {
      console.log("");
      console.log("Señales lingüísticas:");
      
      if (result.signals.emojis && Object.keys(result.signals.emojis).length > 0) {
        console.log("  Emojis detectados:");
        Object.entries(result.signals.emojis).forEach(([emoji, count]) => {
          console.log(`    ${emoji}: ${count}`);
        });
      }
      
      if (result.signals.negationFlips && result.signals.negationFlips > 0) {
        console.log(`  Negaciones: ${result.signals.negationFlips}`);
      }
      
      if (result.signals.intensifierBoost && result.signals.intensifierBoost > 0) {
        console.log(`  Intensificadores: ${result.signals.intensifierBoost}`);
      }
      
      if (result.signals.sarcasmScore && result.signals.sarcasmScore > 0) {
        console.log(`  Sarcasmo: ${result.signals.sarcasmScore.toFixed(2)}`);
      }
    }
    
    // Clean up resources
    manager.dispose();
    
    return result;
  } catch (error) {
    console.error("❌ Error durante el análisis:", error);
    manager.dispose();
    return null;
  }
}

// Main execution
async function main() {
  // Get text from command line arguments or use custom test datasets
  const inputText = process.argv[2];
  
  if (inputText) {
    await analyzeText(inputText);
  } else {
    console.log("🔤 No se proporcionó texto para analizar. Usando conjuntos de datos de prueba:");
    console.log("");
    
    // Importar los conjuntos de datos de prueba
    const { TestDatasetSpanish, TestDatasetEnglish, TestDatasetMixed, TestDatasetSarcasm, TestDatasetSlang } = 
      require("../src/data/test-custom-datasets");
    
    // Función para probar un conjunto de datos y mostrar resultados
    async function testDataset(name: string, dataset: any[]) {
      console.log(`\n\n📊 PROBANDO CONJUNTO: ${name}`);
      console.log("=".repeat(50));
      
      let correct = 0;
      let incorrect = 0;
      
      for (const item of dataset) {
        const result = await analyzeText(item.text);
        const isCorrect = result?.sentiment.label.toLowerCase() === item.expectedLabel;
        
        if (isCorrect) {
          correct++;
          console.log("✅ Correcto");
        } else {
          incorrect++;
          console.log(`❌ Incorrecto (esperado: ${item.expectedLabel}, obtenido: ${result?.sentiment.label.toLowerCase()})`);
        }
        console.log("-".repeat(50));
      }
      
      const accuracy = (correct / (correct + incorrect)) * 100;
      console.log(`\n🎯 Precisión: ${accuracy.toFixed(1)}% (${correct}/${correct + incorrect})`);
      
      return { correct, incorrect, accuracy };
    }
    
    // Probar cada conjunto de datos
    const results = {
      spanish: await testDataset("Español", TestDatasetSpanish),
      english: await testDataset("Inglés", TestDatasetEnglish),
      mixed: await testDataset("Multilingüe", TestDatasetMixed),
      sarcasm: await testDataset("Sarcasmo", TestDatasetSarcasm),
      slang: await testDataset("Jerga", TestDatasetSlang)
    };
    
    // Mostrar resumen general
    console.log("\n\n📈 RESUMEN DE RESULTADOS");
    console.log("=".repeat(50));
    console.log(`Español:     ${results.spanish.accuracy.toFixed(1)}%`);
    console.log(`Inglés:      ${results.english.accuracy.toFixed(1)}%`);
    console.log(`Multilingüe: ${results.mixed.accuracy.toFixed(1)}%`);
    console.log(`Sarcasmo:    ${results.sarcasm.accuracy.toFixed(1)}%`);
    console.log(`Jerga:       ${results.slang.accuracy.toFixed(1)}%`);
    
    const totalCorrect = Object.values(results).reduce((sum, r) => sum + r.correct, 0);
    const totalTests = Object.values(results).reduce((sum, r) => sum + r.correct + r.incorrect, 0);
    const overallAccuracy = (totalCorrect / totalTests) * 100;
    
    console.log(`\n🏆 Precisión general: ${overallAccuracy.toFixed(1)}% (${totalCorrect}/${totalTests})`);
  }
}

// Run the script
main().catch(console.error);

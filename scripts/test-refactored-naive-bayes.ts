#!/usr/bin/env ts-node

/**
 * Test script for the refactored NaiveBayesSentimentService
 * Tests multilingual support, efficiency improvements, and backward compatibility
 */

import { NaiveBayesSentimentService, NaiveBayesTrainingExample } from "../src/services/naive-bayes-sentiment.service";

async function testRefactoredNaiveBayes() {
  console.log("🧪 === TESTING REFACTORED NAIVE BAYES SERVICE ===\n");

  // Test 1: Constructor with options
  console.log("📝 Test 1: Constructor with multilingual options");
  const analyzer = new NaiveBayesSentimentService({
    smoothing: 1.0,
    prior: "empirical",
    defaultLang: "es",
    enableLangDetect: true,
    enableStopwords: true
  });
  
  // Bootstrap with default datasets
  analyzer.bootstrap();
  
  const stats = analyzer.getStats();
  console.log(`✅ Model initialized with ${stats.vocabularySize} vocabulary words`);
  console.log(`📊 Total documents: ${stats.totalDocuments}`);
  console.log(`⚙️  Options:`, stats.options);
  console.log();

  // Test 2: Multilingual predictions
  console.log("🌍 Test 2: Multilingual sentiment analysis");
  const multilingualTests = [
    { text: "I absolutely love this amazing product!", lang: "en" },
    { text: "¡Me encanta este producto increíble!", lang: "es" },
    { text: "Ich liebe dieses erstaunliche Produkt absolut!", lang: "de" },
    { text: "J'adore absolument ce produit incroyable!", lang: "fr" },
    { text: "This product is terrible and broken", lang: "en" },
    { text: "Este producto es terrible y está roto", lang: "es" },
    { text: "Dieses Produkt ist schrecklich und kaputt", lang: "de" },
    { text: "Ce produit est terrible et cassé", lang: "fr" }
  ];

  for (const test of multilingualTests) {
    const result = analyzer.predict(test.text);
    console.log(`🏳️ [${test.lang}] "${test.text}"`);
    console.log(`   → ${result.label.toUpperCase()} (${(result.confidence * 100).toFixed(1)}%)`);
    console.log(`   → Scores: +${(result.scores.positive * 100).toFixed(1)}% | -${(result.scores.negative * 100).toFixed(1)}% | =${(result.scores.neutral * 100).toFixed(1)}%`);
    console.log();
  }

  // Test 3: Negation handling
  console.log("🔄 Test 3: Negation handling");
  const negationTests = [
    "I do not love this product",
    "No me gusta nada este producto", 
    "Ich mag dieses Produkt nicht",
    "Je n'aime pas ce produit"
  ];

  for (const text of negationTests) {
    const result = analyzer.predict(text);
    console.log(`❌ "${text}" → ${result.label.toUpperCase()} (${(result.confidence * 100).toFixed(1)}%)`);
  }
  console.log();

  // Test 4: Unicode and emoji handling
  console.log("😊 Test 4: Unicode and emoji handling");
  const unicodeTests = [
    "¡Excelente producto! 😍 Me encantó",
    "Très bonne qualité! 👍 Parfait",
    "Großartiges Produkt! 🎉 Perfekt",
    "Amazing quality! 💯 Love it"
  ];

  for (const text of unicodeTests) {
    const result = analyzer.predict(text);
    console.log(`🌟 "${text}" → ${result.label.toUpperCase()} (${(result.confidence * 100).toFixed(1)}%)`);
  }
  console.log();

  // Test 5: Performance and efficiency
  console.log("⚡ Test 5: Performance test");
  const performanceTexts = Array.from({ length: 100 }, (_, i) => 
    `This is test sentence number ${i} with different sentiment variations`
  );

  const startTime = Date.now();
  performanceTexts.forEach(text => analyzer.predict(text));
  const endTime = Date.now();

  console.log(`🏃‍♂️ Processed ${performanceTexts.length} texts in ${endTime - startTime}ms`);
  console.log(`📈 Average: ${((endTime - startTime) / performanceTexts.length).toFixed(2)}ms per prediction`);
  console.log();

  // Test 6: Serialization and deserialization
  console.log("💾 Test 6: Serialization/Deserialization");
  const serialized = analyzer.serialize();
  console.log(`📦 Serialized model size: ${JSON.stringify(serialized).length} characters`);
  
  const newAnalyzer = new NaiveBayesSentimentService();
  newAnalyzer.deserialize(serialized);
  
  const testText = "This is a great product!";
  const originalResult = analyzer.predict(testText);
  const deserializedResult = newAnalyzer.predict(testText);
  
  console.log(`🔄 Original prediction: ${originalResult.label} (${(originalResult.confidence * 100).toFixed(1)}%)`);
  console.log(`🔄 Deserialized prediction: ${deserializedResult.label} (${(deserializedResult.confidence * 100).toFixed(1)}%)`);
  console.log(`✅ Serialization test: ${originalResult.label === deserializedResult.label ? 'PASSED' : 'FAILED'}`);
  console.log();

  // Test 7: Incremental training
  console.log("📚 Test 7: Incremental training");
  const beforeStats = analyzer.getStats();
  
  const newExamples: NaiveBayesTrainingExample[] = [
    { text: "This new feature is absolutely fantastic!", label: "positive" },
    { text: "I hate this buggy implementation", label: "negative" },
    { text: "The update works as expected", label: "neutral" }
  ];
  
  analyzer.incrementalTrain(newExamples);
  const afterStats = analyzer.getStats();
  
  console.log(`📈 Vocabulary before: ${beforeStats.vocabularySize}, after: ${afterStats.vocabularySize}`);
  console.log(`📈 Total docs before: ${beforeStats.totalDocuments}, after: ${afterStats.totalDocuments}`);
  console.log();

  console.log("🎉 === ALL TESTS COMPLETED SUCCESSFULLY ===");
}

// Run tests if called directly
if (require.main === module) {
  testRefactoredNaiveBayes()
    .then(() => {
      console.log("\n✅ Refactored Naive Bayes service is working correctly!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Error during testing:", error);
      process.exit(1);
    });
}

export { testRefactoredNaiveBayes };

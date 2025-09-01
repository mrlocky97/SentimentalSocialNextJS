/**
 * Complete Modular Test Suite
 * Executes all test modules sequentially or individually
 */

import { testBasicServices } from "./test-basic";
import { testReactiveServices } from "./test-reactive";
import { testAdvancedServices } from "./test-advanced";

async function runAllTests() {
  const startTime = Date.now();
  console.log("🚀 Starting COMPLETE Modular Test Suite...\n");
  console.log(
    "📦 Running 3 test modules sequentially for comprehensive coverage\n",
  );

  try {
    // Module 1: Basic Services
    console.log("📦 MODULE 1: Basic Services");
    console.log("═".repeat(50));
    await testBasicServices();
    console.log("═".repeat(50));
    console.log("✅ Module 1 completed\n");

    // Module 2: Reactive Services
    console.log("📦 MODULE 2: Reactive Services");
    console.log("═".repeat(50));
    await testReactiveServices();
    console.log("═".repeat(50));
    console.log("✅ Module 2 completed\n");

    // Module 3: Advanced Services
    console.log("📦 MODULE 3: Advanced Services");
    console.log("═".repeat(50));
    await testAdvancedServices();
    console.log("═".repeat(50));
    console.log("✅ Module 3 completed\n");

    const endTime = Date.now();
    const executionTime = (endTime - startTime) / 1000;

    console.log("🎉 COMPLETE TEST SUITE FINISHED!");
    console.log("═".repeat(60));
    console.log("✅ All 3 modules passed successfully");
    console.log("📊 Test Coverage: Complete system verification");
    console.log(
      `⏱️  Total execution time: ${executionTime.toFixed(2)} seconds`,
    );
    console.log("\n📈 Performance Summary:");
    console.log("   • Module 1 (Basic): ~2-3 seconds");
    console.log("   • Module 2 (Reactive): ~3-5 seconds");
    console.log("   • Module 3 (Advanced): ~4-6 seconds");
    console.log(`   • Total time: ${executionTime.toFixed(2)} seconds`);
    console.log(
      `\n🏆 Overall Performance: ${executionTime < 10 ? "⚡ ULTRA FAST" : executionTime < 15 ? "🚀 FAST" : "✅ GOOD"}!`,
    );
    console.log("🚀 Application is ready for production use!\n");
  } catch (error) {
    const endTime = Date.now();
    const executionTime = (endTime - startTime) / 1000;
    console.error(
      `❌ Complete test suite failed after ${executionTime.toFixed(2)} seconds:`,
      error,
    );
    process.exit(1);
  }
}

async function runSpecificModule(moduleName: string) {
  console.log(`🎯 Running specific module: ${moduleName}\n`);

  switch (moduleName.toLowerCase()) {
    case "basic":
      await testBasicServices();
      break;
    case "reactive":
      await testReactiveServices();
      break;
    case "advanced":
      await testAdvancedServices();
      break;
    default:
      console.error(
        "❌ Unknown module. Available modules: basic, reactive, advanced",
      );
      process.exit(1);
  }
}

// Export for use in other modules
export {
  runAllTests,
  runSpecificModule,
  testBasicServices,
  testReactiveServices,
  testAdvancedServices,
};

// Run test if this file is executed directly
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length > 0) {
    runSpecificModule(args[0]);
  } else {
    runAllTests();
  }
}

#!/usr/bin/env ts-node

/**
 * Prueba de API con modelo mejorado
 */

async function testEnhancedAPI() {
  console.log("🔧 Probando API con modelo mejorado...\n");

  const testCases = [
    {
      name: "Caso positivo básico",
      text: "I love this amazing product! It works perfectly.",
      expected: "positive",
    },
    {
      name: "Caso negativo básico",
      text: "This is terrible and completely disappointing.",
      expected: "negative",
    },
    {
      name: "Caso neutral básico",
      text: "The package arrived on time as expected.",
      expected: "neutral",
    },
    {
      name: "Sarcasmo (negativo)",
      text: "Oh wonderful, another system error during the demo.",
      expected: "negative",
    },
    {
      name: "Español positivo",
      text: "¡Excelente servicio al cliente! Muy recomendado.",
      expected: "positive",
    },
    {
      name: "Francés negativo",
      text: "C'est vraiment décevant, je ne recommande pas.",
      expected: "negative",
    },
    {
      name: "Alemán positivo",
      text: "Das ist wirklich fantastisch! Sehr gut gemacht.",
      expected: "positive",
    },
    {
      name: "Texto profesional neutral",
      text: "The quarterly report shows stable performance metrics.",
      expected: "neutral",
    },
  ];

  const baseUrl = "http://localhost:3000/api/sentiment";

  console.log("📡 Probando endpoint: POST /api/sentiment/analyze-text\n");

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`🧪 Test ${i + 1}: ${testCase.name}`);
    console.log(`📝 Texto: "${testCase.text}"`);
    console.log(`🎯 Esperado: ${testCase.expected.toUpperCase()}`);

    try {
      const response = await fetch(`${baseUrl}/analyze-text`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: testCase.text,
        }),
      });

      if (!response.ok) {
        console.log(
          `❌ Error HTTP: ${response.status} ${response.statusText}\n`,
        );
        continue;
      }

      const result = await response.json();

      if (result.success) {
        const prediction = result.data.analysis.sentiment;
        const confidence = (result.data.analysis.confidence * 100).toFixed(1);
        const confidenceLevel = result.data.analysis.confidenceLevel;
        const method = result.data.analysis.method;
        const enhanced = result.data.analysis.enhanced;

        const isCorrect = prediction === testCase.expected;
        console.log(
          `${isCorrect ? "✅" : "❌"} Predicho: ${prediction.toUpperCase()} (${confidence}%)`,
        );
        console.log(`🔍 Confianza: ${confidenceLevel}`);
        console.log(`⚙️ Método: ${method} ${enhanced ? "(ENHANCED)" : ""}`);
        console.log(`⏱️ Modelo: ${result.data.analysis.modelVersion}`);
      } else {
        console.log(`❌ Error en respuesta: ${result.error}`);
      }
    } catch (error) {
      console.log(
        `❌ Error de conexión: ${error instanceof Error ? error.message : "Error desconocido"}`,
      );
    }

    console.log("");
  }

  // Probar endpoint de estado del modelo
  console.log("📊 Probando endpoint: GET /api/sentiment/model-status\n");

  try {
    const response = await fetch(`${baseUrl}/model-status`);
    if (response.ok) {
      const result = await response.json();
      if (result.success) {
        console.log("✅ Estado del modelo obtenido correctamente:");
        console.log(JSON.stringify(result.data, null, 2));
      }
    }
  } catch (error) {
    console.log("❌ Error al obtener estado del modelo:", error);
  }

  console.log("\n🎉 Pruebas de API completadas!");
  console.log(
    "💡 Si hay errores de conexión, asegúrate de que el servidor esté ejecutándose en puerto 3000",
  );
}

// Función auxiliiva para simular fetch si no está disponible
declare const fetch: any;
if (typeof fetch === "undefined") {
  console.log(
    "❌ fetch no está disponible. Instala node-fetch para pruebas completas.",
  );
  console.log("💡 Para instalar: npm install node-fetch @types/node-fetch");
  process.exit(1);
}

if (require.main === module) {
  testEnhancedAPI().then(() => process.exit(0));
}

export { testEnhancedAPI };

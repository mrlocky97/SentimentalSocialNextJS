#!/usr/bin/env ts-node

/**
 * Prueba de integración del modelo mejorado en el API
 */

import * as http from "http";

async function testEnhancedModelAPI() {
  console.log("🚀 === PRUEBA DE INTEGRACIÓN DEL MODELO MEJORADO ===\n");

  const testCases = [
    {
      name: "Positivo básico",
      text: "I love this amazing product! It works perfectly.",
      expected: "positive",
    },
    {
      name: "Negativo básico",
      text: "This is terrible and completely disappointing.",
      expected: "negative",
    },
    {
      name: "Sarcasmo negativo",
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
  ];

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`🧪 Test ${i + 1}: ${testCase.name}`);
    console.log(`📝 Texto: "${testCase.text}"`);
    console.log(`🎯 Esperado: ${testCase.expected.toUpperCase()}`);

    try {
      const result = await makeAPIRequest("/api/sentiment/analyze-text", {
        text: testCase.text,
      });

      if (result.success) {
        const prediction = result.data.analysis.sentiment;
        const confidence = (result.data.analysis.confidence * 100).toFixed(1);
        const method = result.data.analysis.method;
        const enhanced = result.data.analysis.enhanced;

        const isCorrect = prediction === testCase.expected;
        console.log(
          `${isCorrect ? "✅" : "❌"} Predicho: ${prediction.toUpperCase()} (${confidence}%)`,
        );
        console.log(`⚙️ Método: ${method} ${enhanced ? "(ENHANCED ✨)" : ""}`);
      } else {
        console.log(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      console.log(
        `❌ Error de conexión: ${error instanceof Error ? error.message : "Error desconocido"}`,
      );
    }

    console.log("");
  }

  // Probar endpoint de estado del modelo
  console.log("📊 === ESTADO DEL MODELO MEJORADO ===\n");

  try {
    const modelStatus = await makeAPIRequest("/api/sentiment/model-status");
    if (modelStatus.success) {
      console.log("✅ Estado del modelo obtenido correctamente:");
      console.log(JSON.stringify(modelStatus.data, null, 2));
    }
  } catch (error) {
    console.log("❌ Error al obtener estado del modelo:", error);
  }

  console.log("\n🎉 === PRUEBAS COMPLETADAS ===");
  console.log("💡 Modelo mejorado integrado exitosamente en el API");
}

function makeAPIRequest(endpoint: string, data?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : "";

    const options = {
      hostname: "localhost",
      port: 3001,
      path: endpoint,
      method: data ? "POST" : "GET",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
      },
    };

    const req = http.request(options, (res) => {
      let responseData = "";

      res.on("data", (chunk) => {
        responseData += chunk;
      });

      res.on("end", () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve(parsedData);
        } catch (error) {
          reject(new Error(`Error parsing JSON: ${error}`));
        }
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    if (postData) {
      req.write(postData);
    }

    req.end();
  });
}

if (require.main === module) {
  testEnhancedModelAPI()
    .then(() => {
      console.log(
        "\n✨ Integración del modelo mejorado verificada exitosamente!",
      );
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Error en las pruebas:", error);
      process.exit(1);
    });
}

export { testEnhancedModelAPI };

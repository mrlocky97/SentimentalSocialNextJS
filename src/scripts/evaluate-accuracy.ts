import { enhancedTrainingDataV3Complete as TRAIN } from "../data/enhanced-training-data-v3";
import { TweetSentimentAnalysisManager } from "../services/tweet-sentiment-analysis.manager.service";

type Label = "positive" | "negative" | "neutral";

interface ClassMetrics {
  precision: number;
  recall: number;
  f1Score: number;
  support: number;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
}

interface EvaluationResults {
  accuracy: number;
  macroF1: number;
  weightedF1: number;
  perClassMetrics: Record<Label, ClassMetrics>;
  confusionMatrix: Record<Label, Record<Label, number>>;
  totalSamples: number;
}

/** Separa train/test estratificado (80/20) con seed fijo para reproducibilidad */
function stratifiedSplit<T extends { label: Label }>(data: T[], seed = 42) {
  // Usar seed para reproducibilidad
  let seedValue = seed;
  const seededRandom = () => {
    seedValue = (seedValue * 9301 + 49297) % 233280;
    return seedValue / 233280;
  };

  const byLabel: Record<Label, T[]> = {
    positive: [],
    negative: [],
    neutral: [],
  };

  // Normalizar etiquetas y filtrar datos válidos
  const normalizedData = data
    .map((d) => {
      let normalizedLabel: Label;
      const originalLabel = d.label.toLowerCase().trim();

      if (originalLabel === "positive" || originalLabel === "pos") {
        normalizedLabel = "positive";
      } else if (originalLabel === "negative" || originalLabel === "neg") {
        normalizedLabel = "negative";
      } else if (originalLabel === "neutral" || originalLabel === "neu") {
        normalizedLabel = "neutral";
      } else {
        console.warn(
          `⚠️ Etiqueta desconocida encontrada: "${d.label}" -> convertida a "neutral"`,
        );
        normalizedLabel = "neutral";
      }

      return { ...d, label: normalizedLabel };
    })
    .filter((d) => d.label in byLabel);

  normalizedData.forEach((d) => byLabel[d.label].push(d));

  const shuffleWithSeed = (arr: T[]) => {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(seededRandom() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const split = (arr: T[]) => {
    const testSize = Math.max(1, Math.floor(arr.length * 0.2));
    const shuffled = shuffleWithSeed(arr);
    return {
      train: shuffled.slice(testSize),
      test: shuffled.slice(0, testSize),
    };
  };

  const positive = split(byLabel.positive);
  const negative = split(byLabel.negative);
  const neutral = split(byLabel.neutral);

  return {
    train: [...positive.train, ...negative.train, ...neutral.train],
    test: [...positive.test, ...negative.test, ...neutral.test],
  };
}

function calculateMetrics(
  confusionMatrix: Record<Label, Record<Label, number>>,
): EvaluationResults {
  const labels: Label[] = ["positive", "negative", "neutral"];
  const perClassMetrics: Record<Label, ClassMetrics> = {} as any;

  let totalCorrect = 0;
  let totalSamples = 0;
  let weightedF1Sum = 0;

  // Calcular métricas por clase
  for (const label of labels) {
    const truePositives = confusionMatrix[label][label];
    const falsePositives = labels.reduce(
      (sum, l) => sum + (l !== label ? confusionMatrix[l][label] : 0),
      0,
    );
    const falseNegatives = labels.reduce(
      (sum, l) => sum + (l !== label ? confusionMatrix[label][l] : 0),
      0,
    );
    const support = labels.reduce(
      (sum, l) => sum + confusionMatrix[label][l],
      0,
    );

    const precision = truePositives / (truePositives + falsePositives) || 0;
    const recall = truePositives / (truePositives + falseNegatives) || 0;
    const f1Score = (2 * precision * recall) / (precision + recall) || 0;

    perClassMetrics[label] = {
      precision,
      recall,
      f1Score,
      support,
      truePositives,
      falsePositives,
      falseNegatives,
    };

    totalCorrect += truePositives;
    totalSamples += support;
    weightedF1Sum += f1Score * support;
  }

  const accuracy = totalCorrect / totalSamples;
  const macroF1 =
    labels.reduce((sum, l) => sum + perClassMetrics[l].f1Score, 0) /
    labels.length;
  const weightedF1 = weightedF1Sum / totalSamples;

  return {
    accuracy,
    macroF1,
    weightedF1,
    perClassMetrics,
    confusionMatrix,
    totalSamples,
  };
}

function printDetailedResults(results: EvaluationResults) {
  console.log("\n" + "=".repeat(80));
  console.log("📊 EVALUACIÓN DETALLADA DEL MODELO DE SENTIMIENTOS");
  console.log("=".repeat(80));

  // Información general
  console.log(`\n📈 MÉTRICAS GENERALES:`);
  console.log(`   Muestras totales: ${results.totalSamples}`);
  console.log(
    `   Accuracy (Exactitud): ${(results.accuracy * 100).toFixed(2)}%`,
  );
  console.log(`   Macro-F1: ${(results.macroF1 * 100).toFixed(2)}%`);
  console.log(`   Weighted-F1: ${(results.weightedF1 * 100).toFixed(2)}%`);

  // Matriz de confusión
  console.log(`\n🔍 MATRIZ DE CONFUSIÓN:`);
  console.log("   (Filas = Real, Columnas = Predicho)");
  const labels: Label[] = ["positive", "negative", "neutral"];

  // Header
  const header =
    "Real\\Pred".padEnd(12) + labels.map((l) => l.padStart(10)).join("");
  console.log("   " + header);
  console.log("   " + "-".repeat(header.length));

  // Filas de la matriz
  for (const realLabel of labels) {
    const row =
      realLabel.padEnd(12) +
      labels
        .map((predLabel) =>
          results.confusionMatrix[realLabel][predLabel].toString().padStart(10),
        )
        .join("");
    console.log("   " + row);
  }

  // Métricas por clase
  console.log(`\n📋 MÉTRICAS POR CLASE:`);
  console.log("   " + "-".repeat(85));
  console.log(
    "   Clase".padEnd(12) +
      "Precision".padStart(10) +
      "Recall".padStart(10) +
      "F1-Score".padStart(10) +
      "Support".padStart(10) +
      "TP".padStart(6) +
      "FP".padStart(6) +
      "FN".padStart(6),
  );
  console.log("   " + "-".repeat(85));

  for (const label of labels) {
    const metrics = results.perClassMetrics[label];
    const row =
      label.padEnd(12) +
      (metrics.precision * 100).toFixed(1).padStart(9) +
      "%" +
      (metrics.recall * 100).toFixed(1).padStart(9) +
      "%" +
      (metrics.f1Score * 100).toFixed(1).padStart(9) +
      "%" +
      metrics.support.toString().padStart(10) +
      metrics.truePositives.toString().padStart(6) +
      metrics.falsePositives.toString().padStart(6) +
      metrics.falseNegatives.toString().padStart(6);
    console.log("   " + row);
  }

  // Análisis de fortalezas y debilidades
  console.log(`\n🎯 ANÁLISIS DE FORTALEZAS Y DEBILIDADES:`);

  const sortedByF1 = labels.sort(
    (a, b) =>
      results.perClassMetrics[b].f1Score - results.perClassMetrics[a].f1Score,
  );

  console.log(
    `   🟢 Mejor clase: ${sortedByF1[0]} (F1: ${(results.perClassMetrics[sortedByF1[0]].f1Score * 100).toFixed(1)}%)`,
  );
  console.log(
    `   🟡 Peor clase: ${sortedByF1[2]} (F1: ${(results.perClassMetrics[sortedByF1[2]].f1Score * 100).toFixed(1)}%)`,
  );

  // Confusiones más comunes
  console.log(`\n🔄 CONFUSIONES MÁS COMUNES:`);
  const confusions: Array<{ real: Label; pred: Label; count: number }> = [];

  for (const real of labels) {
    for (const pred of labels) {
      if (real !== pred && results.confusionMatrix[real][pred] > 0) {
        confusions.push({
          real,
          pred,
          count: results.confusionMatrix[real][pred],
        });
      }
    }
  }

  confusions.sort((a, b) => b.count - a.count);

  if (confusions.length > 0) {
    confusions.slice(0, 3).forEach((conf, i) => {
      const percentage = ((conf.count / results.totalSamples) * 100).toFixed(1);
      console.log(
        `   ${i + 1}. ${conf.real} → ${conf.pred}: ${conf.count} casos (${percentage}%)`,
      );
    });
  } else {
    console.log("   ✅ No hay confusiones significativas");
  }

  // Recomendaciones
  console.log(`\n💡 RECOMENDACIONES:`);
  const worstClass = sortedByF1[2];
  const worstMetrics = results.perClassMetrics[worstClass];

  if (worstMetrics.precision < 0.7) {
    console.log(
      `   - Mejorar precisión en "${worstClass}": revisar falsos positivos`,
    );
  }
  if (worstMetrics.recall < 0.7) {
    console.log(
      `   - Mejorar recall en "${worstClass}": revisar falsos negativos`,
    );
  }
  if (results.accuracy < 0.8) {
    console.log(
      `   - Accuracy general baja: considerar más datos de entrenamiento`,
    );
  }
  if (results.macroF1 < 0.75) {
    console.log(`   - Macro-F1 baja: balancear mejor las clases en el dataset`);
  }

  console.log("\n" + "=".repeat(80));
}

(async () => {
  console.log("🚀 Iniciando evaluación detallada del modelo...");

  // Diagnóstico del dataset
  console.log("\n🔍 DIAGNÓSTICO DEL DATASET:");
  const labelCounts: Record<string, number> = {};
  TRAIN.forEach((item: any) => {
    const label = item.label;
    labelCounts[label] = (labelCounts[label] || 0) + 1;
  });

  console.log("📊 Etiquetas encontradas en el dataset:");
  Object.entries(labelCounts).forEach(([label, count]) => {
    console.log(`   ${label}: ${count} ejemplos`);
  });

  const { train, test } = stratifiedSplit(TRAIN as any[]);
  console.log(
    `📊 Dataset dividido - Train: ${train.length}, Test: ${test.length}`,
  );

  // Mostrar distribución de clases en test
  const testDistribution: Record<string, number> = test.reduce(
    (acc, item) => {
      acc[item.label] = (acc[item.label] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  console.log("📋 Distribución en test set:");
  Object.entries(testDistribution).forEach(([label, count]) => {
    const percentage = ((count / test.length) * 100).toFixed(1);
    console.log(`   ${label}: ${count} (${percentage}%)`);
  });

  const manager = new TweetSentimentAnalysisManager();

  // Inicializar matriz de confusión
  const confusionMatrix: Record<Label, Record<Label, number>> = {
    positive: { positive: 0, negative: 0, neutral: 0 },
    negative: { positive: 0, negative: 0, neutral: 0 },
    neutral: { positive: 0, negative: 0, neutral: 0 },
  };

  console.log("\n🔄 Evaluando modelo en test set...");
  let processed = 0;
  const totalSamples = test.length;

  for (const example of test) {
    try {
      const result = await manager.analyzeTweet(
        {
          id: `eval_${processed}`,
          content: example.text,
          author: { username: "test_user" },
          createdAt: new Date().toISOString(),
          source: "evaluation",
        } as any,
        {},
      );
      const predictedLabel = result.analysis.sentiment.label as Label;
      const actualLabel = example.label as Label;

      confusionMatrix[actualLabel][predictedLabel] += 1;

      processed++;
      if (processed % 50 === 0 || processed === totalSamples) {
        const progress = ((processed / totalSamples) * 100).toFixed(1);
        console.log(
          `   Procesado: ${processed}/${totalSamples} (${progress}%)`,
        );
      }
    } catch (error) {
      console.error(`❌ Error procesando ejemplo "${example.text}":`, error);
      processed++;
    }
  }

  // Calcular y mostrar resultados
  const results = calculateMetrics(confusionMatrix);
  printDetailedResults(results);

  // Guardar ejemplos mal clasificados para análisis
  console.log("\n📝 EJEMPLOS MAL CLASIFICADOS (primeros 10):");
  let errorCount = 0;
  for (const example of test) {
    if (errorCount >= 10) break;

    try {
      const result = await manager.analyzeTweet(
        { content: example.text } as any,
        {},
      );
      const predictedLabel = result.analysis.sentiment.label as Label;
      const actualLabel = example.label as Label;

      if (predictedLabel !== actualLabel) {
        errorCount++;
        console.log(
          `   ${errorCount}. Real: ${actualLabel} | Predicho: ${predictedLabel}`,
        );
        console.log(
          `      Texto: "${example.text.substring(0, 80)}${example.text.length > 80 ? "..." : ""}"`,
        );
        console.log(
          `      Confianza: ${(result.analysis.sentiment.confidence * 100).toFixed(1)}%\n`,
        );
      }
    } catch (error) {
      console.error(
        `❌ Error procesando ejemplo "${example.text}":`,
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  }

  console.log("✅ Evaluación completada!");
})().catch(console.error);

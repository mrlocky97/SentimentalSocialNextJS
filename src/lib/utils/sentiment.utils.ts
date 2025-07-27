/**
 * Sentiment Analysis Utilities
 * Centralized utilities for sentiment analysis operations
 */

/**
 * Normalize sentiment labels to standard format
 */
export function normalizeSentimentLabel(label: string): 'positive' | 'negative' | 'neutral' {
    const normalized = label.toLowerCase().trim();

    if (normalized.includes('very_positive') || normalized === 'positive' || normalized === 'pos') {
        return 'positive';
    }

    if (normalized.includes('very_negative') || normalized === 'negative' || normalized === 'neg') {
        return 'negative';
    }

    return 'neutral';
}

/**
 * Calculate comprehensive metrics for sentiment analysis evaluation
 */
export interface SentimentMetrics {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    avgProcessingTime: number;
    detailedMetrics: Record<string, {
        precision: number;
        recall: number;
        f1: number;
        tp: number;
        fp: number;
        fn: number;
    }>;
}

export function calculateSentimentMetrics(
    predictions: string[],
    actuals: string[],
    times: number[]
): SentimentMetrics {
    const labels = ['positive', 'negative', 'neutral'];

    // Accuracy general
    const accuracy = predictions.reduce((correct, pred, idx) =>
        pred === actuals[idx] ? correct + 1 : correct, 0) / predictions.length;

    // Métricas por clase
    let totalPrecision = 0;
    let totalRecall = 0;
    let totalF1 = 0;
    let validClasses = 0;

    const detailedMetrics: Record<string, any> = {};

    for (const label of labels) {
        const tp = predictions.reduce((count, pred, idx) =>
            pred === label && actuals[idx] === label ? count + 1 : count, 0);
        const fp = predictions.reduce((count, pred, idx) =>
            pred === label && actuals[idx] !== label ? count + 1 : count, 0);
        const fn = predictions.reduce((count, pred, idx) =>
            pred !== label && actuals[idx] === label ? count + 1 : count, 0);

        if (tp + fp > 0 && tp + fn > 0) {
            const precision = tp / (tp + fp);
            const recall = tp / (tp + fn);
            const f1 = 2 * (precision * recall) / (precision + recall);

            detailedMetrics[label] = { precision, recall, f1, tp, fp, fn };

            totalPrecision += precision;
            totalRecall += recall;
            totalF1 += f1;
            validClasses++;
        }
    }

    const avgPrecision = validClasses > 0 ? totalPrecision / validClasses : 0;
    const avgRecall = validClasses > 0 ? totalRecall / validClasses : 0;
    const avgF1Score = validClasses > 0 ? totalF1 / validClasses : 0;
    const avgProcessingTime = times.reduce((a, b) => a + b, 0) / times.length;

    return {
        accuracy,
        precision: avgPrecision,
        recall: avgRecall,
        f1Score: avgF1Score,
        avgProcessingTime,
        detailedMetrics
    };
}

/**
 * Compare two sets of sentiment analysis results
 */
export interface SentimentComparison {
    accuracyImprovement: number;
    f1Improvement: number;
    precisionImprovement: number;
    recallImprovement: number;
    isSignificantImprovement: boolean;
    summary: string;
}

export function compareSentimentResults(
    original: SentimentMetrics,
    improved: SentimentMetrics,
    significanceThreshold: number = 2
): SentimentComparison {
    const accuracyImprovement = (improved.accuracy - original.accuracy) * 100;
    const f1Improvement = (improved.f1Score - original.f1Score) * 100;
    const precisionImprovement = (improved.precision - original.precision) * 100;
    const recallImprovement = (improved.recall - original.recall) * 100;

    const isSignificantImprovement = accuracyImprovement > significanceThreshold;

    let summary: string;
    if (isSignificantImprovement) {
        summary = 'MEJORA SIGNIFICATIVA: El nuevo modelo mejora notablemente el rendimiento';
    } else if (accuracyImprovement > 0) {
        summary = 'MEJORA MODERADA: El nuevo modelo muestra mejoras menores';
    } else {
        summary = 'SIN MEJORA: El nuevo modelo no mejora el rendimiento';
    }

    return {
        accuracyImprovement,
        f1Improvement,
        precisionImprovement,
        recallImprovement,
        isSignificantImprovement,
        summary
    };
}

/**
 * Remove duplicates from training data by text content
 */
export function removeDuplicateSentiments<T extends { text: string }>(data: T[]): T[] {
    const seen = new Set<string>();
    const unique: T[] = [];

    for (const item of data) {
        const key = item.text.toLowerCase().trim();
        if (!seen.has(key)) {
            seen.add(key);
            unique.push(item);
        }
    }

    return unique;
}

/**
 * Balance sentiment classes in training data
 */
export function balanceSentimentClasses<T extends { sentiment: string }>(
    data: T[],
    targetSize?: number
): T[] {
    const byClass = data.reduce((acc, item) => {
        const normalized = normalizeSentimentLabel(item.sentiment);
        if (!acc[normalized]) acc[normalized] = [];
        acc[normalized].push(item);
        return acc;
    }, {} as Record<string, T[]>);

    // Find minimum class size or use target
    const sizes = Object.values(byClass).map(arr => arr.length);
    const minSize = targetSize ? Math.min(targetSize, Math.min(...sizes)) : Math.min(...sizes);

    // Balance each class
    const balanced: T[] = [];
    for (const [, items] of Object.entries(byClass)) {
        const shuffled = [...items].sort(() => Math.random() - 0.5);
        balanced.push(...shuffled.slice(0, minSize));
    }

    return balanced.sort(() => Math.random() - 0.5); // Final shuffle
}

/**
 * Generate performance report for sentiment analysis
 */
export function generateSentimentReport(
    results: SentimentMetrics,
    modelName: string,
    datasetSize: number
): string {
    return `
REPORTE DE RENDIMIENTO - ${modelName.toUpperCase()}
${'='.repeat(50)}

MÉTRICAS GENERALES:
   Accuracy: ${(results.accuracy * 100).toFixed(2)}%
   Precision: ${(results.precision * 100).toFixed(2)}%
   Recall: ${(results.recall * 100).toFixed(2)}%
   F1-Score: ${(results.f1Score * 100).toFixed(2)}%
   Tiempo promedio: ${results.avgProcessingTime.toFixed(2)}ms
   Dataset size: ${datasetSize} ejemplos

MÉTRICAS DETALLADAS POR CLASE:
${Object.entries(results.detailedMetrics).map(([label, metrics]) => `
   ${label.toUpperCase()}:
     Precision: ${(metrics.precision * 100).toFixed(1)}%
     Recall: ${(metrics.recall * 100).toFixed(1)}%
     F1-Score: ${(metrics.f1 * 100).toFixed(1)}%
     TP: ${metrics.tp}, FP: ${metrics.fp}, FN: ${metrics.fn}
`).join('')}
`;
}

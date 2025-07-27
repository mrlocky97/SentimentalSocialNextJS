/**
 * Naive Bayes Sentiment Analysis Model
 * Implementación de Naive Bayes para análisis de sentimientos multiidioma
 * Basado en algoritmo de clasificación bayesiana para TFG
 */

import { SentimentResult, SentimentLabel } from '../types/sentiment';

export interface TrainingData {
    text: string;
    sentiment: SentimentLabel;
    language?: string;
}

export interface WordProbability {
    positive: number;
    negative: number;
    neutral: number;
    count: number;
}

export interface ModelStatistics {
    totalDocuments: number;
    documentCounts: {
        positive: number;
        negative: number;
        neutral: number;
    };
    vocabulary: Set<string>;
    wordProbabilities: Map<string, WordProbability>;
    classPriors: {
        positive: number;
        negative: number;
        neutral: number;
    };
}

export interface NaiveBayesConfig {
    smoothingFactor: number; // Laplace smoothing
    minWordLength: number;
    maxVocabularySize: number;
    enableBigrams: boolean;
    enableTfIdf: boolean;
    enableNegationHandling: boolean; // Nueva característica
    enableIntensifierHandling: boolean; // Nueva característica
    minWordFrequency: number; // Nueva característica
    useSubwordFeatures: boolean; // Nueva característica
}

export class NaiveBayesSentimentModel {
    private config: NaiveBayesConfig;
    private statistics: ModelStatistics;
    private isTrained: boolean = false;
    private stopWords: Set<string>;
    private negationWords: Set<string>;
    private intensifiers: Set<string>;

    constructor(config: Partial<NaiveBayesConfig> = {}) {
        this.config = {
            smoothingFactor: 1.0, // Laplace smoothing
            minWordLength: 2,
            maxVocabularySize: 10000,
            enableBigrams: false,
            enableTfIdf: false,
            enableNegationHandling: true, // Nueva característica activada
            enableIntensifierHandling: true, // Nueva característica activada
            minWordFrequency: 2, // Filtrar palabras muy raras
            useSubwordFeatures: false, // Características de subpalabras
            ...config
        };

        this.statistics = {
            totalDocuments: 0,
            documentCounts: { positive: 0, negative: 0, neutral: 0 },
            vocabulary: new Set(),
            wordProbabilities: new Map(),
            classPriors: { positive: 0, negative: 0, neutral: 0 }
        };

        // Stop words multiidioma
        this.stopWords = new Set([
            // Inglés
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
            // Español
            'el', 'la', 'los', 'las', 'un', 'una', 'y', 'o', 'pero', 'en', 'de', 'del', 'al', 'por', 'para', 'con', 'sin', 'es', 'son', 'fue', 'fueron', 'ser', 'estar', 'estoy', 'está', 'están', 'he', 'has', 'ha', 'han', 'que', 'se', 'le', 'lo', 'me', 'te', 'nos',
            // Alemán
            'der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einen', 'einem', 'einer', 'und', 'oder', 'aber', 'in', 'an', 'auf', 'zu', 'von', 'mit', 'für', 'ist', 'sind', 'war', 'waren', 'sein', 'haben', 'hat', 'hatte', 'hatten',
            // Francés
            'le', 'la', 'les', 'un', 'une', 'des', 'et', 'ou', 'mais', 'dans', 'de', 'du', 'au', 'aux', 'pour', 'avec', 'sans', 'est', 'sont', 'était', 'étaient', 'être', 'avoir', 'a', 'ai', 'as', 'avons', 'avez', 'ont', 'que', 'qui', 'se', 'me', 'te', 'nous', 'vous'
        ]);

        // Palabras de negación multiidioma
        this.negationWords = new Set([
            // Inglés
            'not', 'no', 'never', 'none', 'nothing', 'nobody', 'nowhere', "don't", "won't", "can't",
            "shouldn't", "wouldn't", "couldn't", "mustn't", "needn't", "haven't", "hasn't", "hadn't",
            "isn't", "aren't", "wasn't", "weren't", "doesn't", "didn't", "ain't",
            // Español
            'no', 'nunca', 'jamás', 'nada', 'nadie', 'ningún', 'ninguna', 'ninguno', 'ningunos',
            'sin', 'tampoco', 'apenas', 'ni',
            // Alemán
            'nicht', 'nein', 'nie', 'niemals', 'nichts', 'niemand', 'nirgendwo', 'kein', 'keine',
            // Francés
            'ne', 'pas', 'non', 'jamais', 'rien', 'personne', 'nulle', 'aucun', 'aucune'
        ]);

        // Intensificadores multiidioma
        this.intensifiers = new Set([
            // Inglés
            'very', 'extremely', 'incredibly', 'absolutely', 'totally', 'completely', 'really',
            'quite', 'rather', 'fairly', 'pretty', 'somewhat', 'super', 'ultra', 'mega',
            'highly', 'strongly', 'intensely', 'severely', 'seriously', 'critically',
            // Español
            'muy', 'súper', 'ultra', 'mega', 'extremadamente', 'increíblemente', 'totalmente',
            'completamente', 'absolutamente', 'realmente', 'bastante', 'demasiado',
            // Alemán
            'sehr', 'extrem', 'unglaublich', 'absolut', 'völlig', 'komplett', 'wirklich',
            'ziemlich', 'eher', 'recht', 'ganz', 'super', 'ultra', 'mega',
            // Francés
            'très', 'extrêmement', 'incroyablement', 'absolument', 'totalement', 'complètement',
            'vraiment', 'assez', 'plutôt', 'super', 'ultra', 'méga'
        ]);
    }

    /**
     * Entrenar el modelo con datos de entrenamiento
     */
    async train(trainingData: TrainingData[]): Promise<void> {

        if (trainingData.length === 0) {
            throw new Error('Training data cannot be empty');
        }

        // Resetear estadísticas
        this.resetStatistics();

        // Primera pasada: contar documentos y construir vocabulario
        await this.buildVocabulary(trainingData);

        // Segunda pasada: calcular probabilidades
        await this.calculateProbabilities(trainingData);

        // Calcular priors de clases
        this.calculateClassPriors();

        this.isTrained = true;
        this.printTrainingStatistics();
    }

    /**
     * Predecir sentimiento de un texto
     */
    async predict(text: string): Promise<SentimentResult> {
        if (!this.isTrained) {
            throw new Error('Model must be trained before making predictions');
        }

        const startTime = Date.now();

        // Preprocesar texto
        const tokens = this.preprocessText(text);

        // Calcular probabilidades log para cada clase
        const logProbabilities = this.calculateLogProbabilities(tokens);

        // Encontrar la clase con mayor probabilidad
        const predictedClass = this.selectBestClass(logProbabilities);

        // Convertir probabilidades log a probabilidades normales
        const probabilities = this.convertLogProbabilities(logProbabilities);

        // Calcular confianza
        const confidence = this.calculateConfidence(probabilities);

        // Calcular score normalizado (-1 a 1)
        const score = this.calculateSentimentScore(probabilities);

        const processingTime = Date.now() - startTime;

        return {
            score,
            magnitude: Math.abs(score),
            label: predictedClass,
            confidence,
            emotions: {
                joy: predictedClass === 'positive' ? confidence : 0,
                sadness: predictedClass === 'negative' ? confidence : 0,
                anger: predictedClass === 'negative' ? confidence * 0.7 : 0,
                fear: predictedClass === 'negative' ? confidence * 0.5 : 0,
                surprise: predictedClass === 'neutral' ? confidence * 0.6 : 0,
                disgust: predictedClass === 'negative' ? confidence * 0.6 : 0
            }
        };
    }

    /**
     * Resetear estadísticas del modelo
     */
    private resetStatistics(): void {
        this.statistics = {
            totalDocuments: 0,
            documentCounts: { positive: 0, negative: 0, neutral: 0 },
            vocabulary: new Set(),
            wordProbabilities: new Map(),
            classPriors: { positive: 0, negative: 0, neutral: 0 }
        };
    }

    /**
     * Normalizar etiquetas de sentimiento a formato simplificado
     */
    private normalizeSentimentLabel(label: SentimentLabel): 'positive' | 'negative' | 'neutral' {
        if (label === 'very_positive' || label === 'positive') return 'positive';
        if (label === 'very_negative' || label === 'negative') return 'negative';
        return 'neutral';
    }

    /**
     * Construir vocabulario desde datos de entrenamiento
     */
    private async buildVocabulary(trainingData: TrainingData[]): Promise<void> {
        const wordFrequency = new Map<string, number>();

        for (const doc of trainingData) {
            this.statistics.totalDocuments++;
            const normalizedSentiment = this.normalizeSentimentLabel(doc.sentiment);
            this.statistics.documentCounts[normalizedSentiment]++;

            const tokens = this.preprocessText(doc.text);

            for (const token of tokens) {
                wordFrequency.set(token, (wordFrequency.get(token) || 0) + 1);
            }
        }

        // Seleccionar las palabras más frecuentes para el vocabulario
        const sortedWords = Array.from(wordFrequency.entries())
            .filter(([, freq]) => freq >= this.config.minWordFrequency) // Filtrar por frecuencia mínima
            .sort(([, a], [, b]) => b - a)
            .slice(0, this.config.maxVocabularySize);

        for (const [word] of sortedWords) {
            this.statistics.vocabulary.add(word);
        }

    }

    /**
     * Calcular probabilidades de palabras por clase
     */
    private async calculateProbabilities(trainingData: TrainingData[]): Promise<void> {
        // Inicializar contadores de palabras por clase
        const wordClassCounts = new Map<string, { positive: number; negative: number; neutral: number; count: number }>();

        // Contar apariciones de palabras en cada clase
        for (const doc of trainingData) {
            const tokens = this.preprocessText(doc.text);
            const uniqueTokens = new Set(tokens); // Evitar contar la misma palabra múltiples veces en un documento
            const normalizedSentiment = this.normalizeSentimentLabel(doc.sentiment);

            for (const token of uniqueTokens) {
                if (this.statistics.vocabulary.has(token)) {
                    if (!wordClassCounts.has(token)) {
                        wordClassCounts.set(token, { positive: 0, negative: 0, neutral: 0, count: 0 });
                    }

                    const counts = wordClassCounts.get(token)!;
                    counts[normalizedSentiment]++;
                    counts.count++;
                }
            }
        }

        // Calcular probabilidades con suavizado de Laplace
        for (const [word, counts] of wordClassCounts.entries()) {
            const totalPositive = this.statistics.documentCounts.positive;
            const totalNegative = this.statistics.documentCounts.negative;
            const totalNeutral = this.statistics.documentCounts.neutral;

            const smoothing = this.config.smoothingFactor;

            this.statistics.wordProbabilities.set(word, {
                positive: (counts.positive + smoothing) / (totalPositive + smoothing * this.statistics.vocabulary.size),
                negative: (counts.negative + smoothing) / (totalNegative + smoothing * this.statistics.vocabulary.size),
                neutral: (counts.neutral + smoothing) / (totalNeutral + smoothing * this.statistics.vocabulary.size),
                count: counts.count
            });
        }

    }

    /**
     * Calcular probabilidades a priori de las clases
     */
    private calculateClassPriors(): void {
        const total = this.statistics.totalDocuments;

        this.statistics.classPriors = {
            positive: this.statistics.documentCounts.positive / total,
            negative: this.statistics.documentCounts.negative / total,
            neutral: this.statistics.documentCounts.neutral / total
        };
    }

    /**
     * Preprocesar texto para extracción de características mejoradas
     */
    private preprocessText(text: string): string[] {
        // Limpiar y normalizar
        let cleaned = text.toLowerCase()
            .replace(/[^\w\sáéíóúüñ]/g, ' ') // Mantener caracteres especiales del español
            .replace(/\s+/g, ' ')
            .trim();

        // Tokenizar
        const words = cleaned.split(' ');
        const features: string[] = [];

        // Manejo de negaciones si está habilitado
        if (this.config.enableNegationHandling) {
            for (let i = 0; i < words.length; i++) {
                const word = words[i];

                // Verificar si la palabra anterior es una negación
                const hasNegation = i > 0 && this.negationWords.has(words[i - 1]);

                if (word.length >= this.config.minWordLength &&
                    !this.stopWords.has(word) &&
                    !/^\d+$/.test(word)) {

                    // Añadir prefijo de negación si es necesario
                    if (hasNegation) {
                        features.push(`NOT_${word}`);
                    } else {
                        features.push(word);
                    }
                }
            }
        } else {
            // Filtrado básico sin manejo de negaciones
            const filtered = words.filter(word =>
                word.length >= this.config.minWordLength &&
                !this.stopWords.has(word) &&
                !/^\d+$/.test(word)
            );
            features.push(...filtered);
        }

        // Añadir bigramas si está habilitado
        if (this.config.enableBigrams) {
            for (let i = 0; i < features.length - 1; i++) {
                const bigram = `${features[i]}_${features[i + 1]}`;
                features.push(bigram);
            }
        }

        // Añadir manejo de intensificadores
        if (this.config.enableIntensifierHandling) {
            const intensifiedFeatures: string[] = [];

            for (let i = 0; i < features.length; i++) {
                const feature = features[i];

                // Verificar si hay un intensificador antes
                const hasIntensifier = i > 0 && this.intensifiers.has(features[i - 1]);

                if (hasIntensifier) {
                    intensifiedFeatures.push(`INTENSE_${feature}`);
                }
            }

            features.push(...intensifiedFeatures);
        }

        // Añadir características de subpalabras si está habilitado
        if (this.config.useSubwordFeatures) {
            const subwordFeatures: string[] = [];

            for (const feature of features) {
                if (feature.length >= 4 && !feature.includes('_')) {
                    // Añadir prefijos y sufijos
                    subwordFeatures.push(`PREFIX_${feature.substring(0, 3)}`);
                    subwordFeatures.push(`SUFFIX_${feature.substring(feature.length - 3)}`);
                }
            }

            features.push(...subwordFeatures);
        }

        return features;
    }

    /**
     * Calcular probabilidades logarítmicas para cada clase
     */
    private calculateLogProbabilities(tokens: string[]): { positive: number; negative: number; neutral: number } {
        const uniqueTokens = new Set(tokens);

        let logProbPositive = Math.log(this.statistics.classPriors.positive);
        let logProbNegative = Math.log(this.statistics.classPriors.negative);
        let logProbNeutral = Math.log(this.statistics.classPriors.neutral);

        for (const token of uniqueTokens) {
            if (this.statistics.wordProbabilities.has(token)) {
                const probs = this.statistics.wordProbabilities.get(token)!;
                logProbPositive += Math.log(probs.positive);
                logProbNegative += Math.log(probs.negative);
                logProbNeutral += Math.log(probs.neutral);
            } else {
                // Manejar palabras no vistas con suavizado
                const smoothing = this.config.smoothingFactor;
                const vocabSize = this.statistics.vocabulary.size;

                const smoothedProb = smoothing / (this.statistics.totalDocuments + smoothing * vocabSize);
                const logSmoothProb = Math.log(smoothedProb);

                logProbPositive += logSmoothProb;
                logProbNegative += logSmoothProb;
                logProbNeutral += logSmoothProb;
            }
        }

        return {
            positive: logProbPositive,
            negative: logProbNegative,
            neutral: logProbNeutral
        };
    }

    /**
     * Seleccionar la clase con mayor probabilidad
     */
    private selectBestClass(logProbs: { positive: number; negative: number; neutral: number }): SentimentLabel {
        if (logProbs.positive >= logProbs.negative && logProbs.positive >= logProbs.neutral) {
            return 'positive';
        } else if (logProbs.negative >= logProbs.neutral) {
            return 'negative';
        } else {
            return 'neutral';
        }
    }

    /**
     * Convertir probabilidades logarítmicas a probabilidades normales
     */
    private convertLogProbabilities(logProbs: { positive: number; negative: number; neutral: number }): { positive: number; negative: number; neutral: number } {
        // Encontrar el máximo para estabilidad numérica
        const maxLogProb = Math.max(logProbs.positive, logProbs.negative, logProbs.neutral);

        // Exponencial con normalización
        const expPositive = Math.exp(logProbs.positive - maxLogProb);
        const expNegative = Math.exp(logProbs.negative - maxLogProb);
        const expNeutral = Math.exp(logProbs.neutral - maxLogProb);

        const total = expPositive + expNegative + expNeutral;

        return {
            positive: expPositive / total,
            negative: expNegative / total,
            neutral: expNeutral / total
        };
    }

    /**
     * Calcular confianza de la predicción
     */
    private calculateConfidence(probs: { positive: number; negative: number; neutral: number }): number {
        const maxProb = Math.max(probs.positive, probs.negative, probs.neutral);
        const secondMaxProb = Math.max(
            maxProb === probs.positive ? Math.max(probs.negative, probs.neutral) : Math.max(probs.positive, probs.negative, probs.neutral),
            0
        );

        // Confianza basada en la diferencia entre la mejor y segunda mejor predicción
        return Math.min(0.95, Math.max(0.1, maxProb - secondMaxProb + 0.5));
    }

    /**
     * Calcular score de sentimiento normalizado (-1 a 1)
     */
    private calculateSentimentScore(probs: { positive: number; negative: number; neutral: number }): number {
        return probs.positive - probs.negative;
    }

    /**
     * Imprimir estadísticas de entrenamiento
     */
    private printTrainingStatistics(): void {
        console.log(`❌ Negativos: ${this.statistics.documentCounts.negative} (${(this.statistics.classPriors.negative * 100).toFixed(1)}%)`);
    }

    /**
     * Obtener estadísticas del modelo
     */
    getStatistics(): ModelStatistics {
        return { ...this.statistics };
    }

    /**
     * Verificar si el modelo está entrenado
     */
    isModelTrained(): boolean {
        return this.isTrained;
    }

    /**
     * Obtener configuración del modelo
     */
    getConfig(): NaiveBayesConfig {
        return { ...this.config };
    }

    /**
     * Exportar modelo entrenado
     */
    exportModel(): any {
        if (!this.isTrained) {
            throw new Error('Cannot export untrained model');
        }

        return {
            config: this.config,
            statistics: {
                ...this.statistics,
                vocabulary: Array.from(this.statistics.vocabulary),
                wordProbabilities: Array.from(this.statistics.wordProbabilities.entries())
            },
            isTrained: this.isTrained,
            exportDate: new Date().toISOString()
        };
    }

    /**
     * Importar modelo entrenado
     */
    importModel(modelData: any): void {
        this.config = modelData.config;
        this.statistics = {
            ...modelData.statistics,
            vocabulary: new Set(modelData.statistics.vocabulary),
            wordProbabilities: new Map(modelData.statistics.wordProbabilities)
        };
        this.isTrained = modelData.isTrained;

    }
}

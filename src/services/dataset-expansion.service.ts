/**
 * Dataset Downloader y Processor
 * Descarga y procesa datasets públicos para sentiment analysis
 */

import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { TrainingData } from '../experimental/naive-bayes.model';

interface DatasetSource {
    name: string;
    url: string;
    format: 'csv' | 'json' | 'txt' | 'tsv';
    description: string;
    size: string;
    languages: string[];
    license: string;
}

interface ProcessedDataset {
    source: string;
    data: TrainingData[];
    stats: {
        total: number;
        positive: number;
        negative: number;
        neutral: number;
        languages: Record<string, number>;
    };
}

export class DatasetExpansionService {
    private outputDir: string;

    constructor() {
        this.outputDir = path.join(process.cwd(), 'src', 'data', 'external-datasets');
    }

    /**
     * Fuentes de datasets públicos recomendados
     */
    getDatasetSources(): DatasetSource[] {
        return [
            {
                name: "Amazon Multilingual Reviews",
                url: "https://amazon-reviews-ml.s3.amazonaws.com/json/train.json",
                format: "json",
                description: "Reseñas de productos Amazon en múltiples idiomas",
                size: "~2M ejemplos",
                languages: ["en", "es", "de", "fr", "ja", "zh"],
                license: "Research use"
            },
            {
                name: "IMDB Movie Reviews",
                url: "https://ai.stanford.edu/~amaas/data/sentiment/aclImdb_v1.tar.gz",
                format: "txt",
                description: "Reseñas de películas IMDB",
                size: "50K ejemplos",
                languages: ["en"],
                license: "Academic use"
            },
            {
                name: "Stanford Sentiment Treebank",
                url: "https://nlp.stanford.edu/sentiment/trainDevTestTrees_PTB.zip",
                format: "txt",
                description: "Análisis de sentimientos granular",
                size: "11K frases",
                languages: ["en"],
                license: "Academic free"
            },
            {
                name: "Spanish Twitter Sentiment",
                url: "https://github.com/dccuchile/spanish-sentiment-analysis-dataset/raw/master/training_data.csv",
                format: "csv",
                description: "Tweets en español etiquetados",
                size: "8K tweets",
                languages: ["es"],
                license: "MIT"
            },
            {
                name: "Multilingual Sentiment Dataset",
                url: "https://raw.githubusercontent.com/tyqiangz/multilingual-sentiment-datasets/master/dataset.json",
                format: "json",
                description: "Dataset multiidioma curado",
                size: "15K ejemplos",
                languages: ["en", "es", "de", "fr", "it"],
                license: "Apache 2.0"
            }
        ];
    }

    /**
     * Descargar dataset específico
     */
    async downloadDataset(source: DatasetSource): Promise<string> {

        try {
            // Crear directorio si no existe
            await fs.mkdir(this.outputDir, { recursive: true });

            // Descargar archivo
            const response = await axios.get(source.url, {
                responseType: 'arraybuffer',
                timeout: 30000,
                headers: {
                    'User-Agent': 'SentimentalSocial-DatasetExpander/1.0'
                }
            });

            // Guardar archivo
            const filename = `${source.name.replace(/\s+/g, '_').toLowerCase()}.${source.format}`;
            const filepath = path.join(this.outputDir, filename);

            await fs.writeFile(filepath, response.data);


            return filepath;

        } catch (error) {
            console.error(`❌ Error descargando ${source.name}:`, error);
            throw error;
        }
    }

    /**
     * Procesar dataset descargado
     */
    async processDataset(source: DatasetSource, filepath: string): Promise<ProcessedDataset> {

        try {
            const content = await fs.readFile(filepath, 'utf-8');
            let rawData: any[] = [];

            // Parsear según formato
            switch (source.format) {
                case 'json':
                    rawData = this.parseJSON(content);
                    break;
                case 'csv':
                    rawData = this.parseCSV(content);
                    break;
                case 'tsv':
                    rawData = this.parseTSV(content);
                    break;
                case 'txt':
                    rawData = this.parseTXT(content);
                    break;
                default:
                    throw new Error(`Formato no soportado: ${source.format}`);
            }

            // Convertir a nuestro formato
            const processedData = this.convertToTrainingData(rawData, source);

            // Calcular estadísticas
            const stats = this.calculateStats(processedData);


            return {
                source: source.name,
                data: processedData,
                stats
            };

        } catch (error) {
            console.error(`❌ Error procesando ${source.name}:`, error);
            throw error;
        }
    }

    /**
     * Procesar múltiples datasets
     */
    async processMultipleDatasets(sourceNames?: string[]): Promise<ProcessedDataset[]> {
        const sources = this.getDatasetSources();
        const targetSources = sourceNames ?
            sources.filter(s => sourceNames.includes(s.name)) :
            sources;

        const results: ProcessedDataset[] = [];

        for (const source of targetSources) {
            try {

                // Descargar
                const filepath = await this.downloadDataset(source);

                // Procesar
                const processed = await this.processDataset(source, filepath);
                results.push(processed);


            } catch (error) {
                console.warn(`⚠️ Saltando ${source.name} por error:`, error);
                continue;
            }
        }

        return results;
    }

    /**
     * Combinar datasets procesados
     */
    combineDatasets(datasets: ProcessedDataset[], maxPerSource: number = 1000): TrainingData[] {

        const combined: TrainingData[] = [];

        for (const dataset of datasets) {

            // Limitar ejemplos por fuente para balancear
            const limited = this.limitAndBalance(dataset.data, maxPerSource);
            combined.push(...limited);

        }

        // Mezclar aleatoriamente
        const shuffled = this.shuffleArray(combined);


        return shuffled;
    }

    /**
     * Guardar dataset expandido
     */
    async saveExpandedDataset(data: TrainingData[], filename: string = 'expanded-dataset.ts'): Promise<void> {
        const stats = this.calculateStats(data);

        const content = `/**
 * Dataset Expandido de Entrenamiento
 * Generado automáticamente desde múltiples fuentes públicas
 * Total: ${stats.total} ejemplos
 * Distribución: ${stats.positive}P / ${stats.negative}N / ${stats.neutral}Neu
 */

import { TrainingData } from '../experimental/naive-bayes.model';

export const EXPANDED_SENTIMENT_DATASET: TrainingData[] = ${JSON.stringify(data, null, 2)};

export const EXPANDED_DATASET_STATS = ${JSON.stringify(stats, null, 2)};

export function getExpandedDataset(): TrainingData[] {
  return EXPANDED_SENTIMENT_DATASET;
}

export function getExpandedDatasetStats() {
  return EXPANDED_DATASET_STATS;
}`;

        const filepath = path.join(process.cwd(), 'src', 'data', filename);
        await fs.writeFile(filepath, content);

    }

    // Métodos de parsing privados
    private parseJSON(content: string): any[] {
        try {
            const parsed = JSON.parse(content);
            return Array.isArray(parsed) ? parsed : [parsed];
        } catch {
            // Intentar parsear línea por línea (JSONL)
            return content.split('\n')
                .filter(line => line.trim())
                .map(line => JSON.parse(line));
        }
    }

    private parseCSV(content: string): any[] {
        const lines = content.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

        return lines.slice(1).map(line => {
            const values = this.parseCSVLine(line);
            const obj: any = {};
            headers.forEach((header, i) => {
                obj[header] = values[i] || '';
            });
            return obj;
        });
    }

    private parseTSV(content: string): any[] {
        const lines = content.split('\n').filter(line => line.trim());
        const headers = lines[0].split('\t').map(h => h.trim());

        return lines.slice(1).map(line => {
            const values = line.split('\t');
            const obj: any = {};
            headers.forEach((header, i) => {
                obj[header] = values[i] || '';
            });
            return obj;
        });
    }

    private parseTXT(content: string): any[] {
        // Para archivos de texto, asumimos una línea por ejemplo
        return content.split('\n')
            .filter(line => line.trim())
            .map((line, index) => ({ id: index, text: line.trim() }));
    }

    private parseCSVLine(line: string): string[] {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }

        result.push(current.trim());
        return result.map(val => val.replace(/^"/, '').replace(/"$/, ''));
    }

    private convertToTrainingData(rawData: any[], source: DatasetSource): TrainingData[] {
        const converted: TrainingData[] = [];

        for (const item of rawData) {
            try {
                const trainingItem = this.extractSentimentData(item, source);
                if (trainingItem) {
                    converted.push(trainingItem);
                }
            } catch (error) {
                // Ignorar elementos que no se pueden procesar
                continue;
            }
        }

        return converted;
    }

    private extractSentimentData(item: any, source: DatasetSource): TrainingData | null {
        let text = '';
        let sentiment = '';
        let language = 'en';

        // Extraer texto según la fuente
        if (item.text) text = item.text;
        else if (item.review_body) text = item.review_body;
        else if (item.comment) text = item.comment;
        else if (item.content) text = item.content;
        else if (item.message) text = item.message;
        else if (typeof item === 'string') text = item;

        // Extraer sentimiento según la fuente
        if (item.sentiment) sentiment = item.sentiment;
        else if (item.label) sentiment = item.label;
        else if (item.rating) {
            const rating = parseInt(item.rating);
            if (rating >= 4) sentiment = 'positive';
            else if (rating <= 2) sentiment = 'negative';
            else sentiment = 'neutral';
        }
        else if (item.stars) {
            const stars = parseInt(item.stars);
            if (stars >= 4) sentiment = 'positive';
            else if (stars <= 2) sentiment = 'negative';
            else sentiment = 'neutral';
        }

        // Extraer idioma
        if (item.language) language = item.language;
        else if (item.lang) language = item.lang;
        else if (source.languages.length === 1) language = source.languages[0];

        // Validar y limpiar
        if (!text || text.length < 10 || text.length > 500) return null;
        if (!sentiment) return null;

        // Normalizar sentimiento
        const normalizedSentiment = this.normalizeSentiment(sentiment);
        if (!normalizedSentiment) return null;

        return {
            text: text.trim(),
            sentiment: normalizedSentiment as any,
            language: language.toLowerCase()
        };
    }

    private normalizeSentiment(sentiment: string): string | null {
        const s = sentiment.toLowerCase().trim();

        // Mapeo de etiquetas comunes
        const positiveLabels = ['positive', 'pos', '1', 'good', 'happy', 'love', 'great', 'excellent'];
        const negativeLabels = ['negative', 'neg', '0', 'bad', 'sad', 'hate', 'terrible', 'awful'];
        const neutralLabels = ['neutral', 'neu', 'mixed', 'ok', 'average'];

        if (positiveLabels.some(label => s.includes(label))) return 'positive';
        if (negativeLabels.some(label => s.includes(label))) return 'negative';
        if (neutralLabels.some(label => s.includes(label))) return 'neutral';

        // Valores numéricos
        const num = parseFloat(s);
        if (!isNaN(num)) {
            if (num > 0.5) return 'positive';
            if (num < -0.5) return 'negative';
            return 'neutral';
        }

        return null;
    }

    private limitAndBalance(data: TrainingData[], maxTotal: number): TrainingData[] {
        const byClass: Record<string, TrainingData[]> = {
            positive: [],
            negative: [],
            neutral: []
        };

        // Agrupar por clase
        for (const item of data) {
            const sentiment = this.normalizeSentiment(item.sentiment) || 'neutral';
            byClass[sentiment].push(item);
        }

        // Limitar cada clase
        const maxPerClass = Math.floor(maxTotal / 3);
        const result: TrainingData[] = [];

        for (const [sentiment, items] of Object.entries(byClass)) {
            const shuffled = this.shuffleArray(items);
            const limited = shuffled.slice(0, maxPerClass);
            result.push(...limited);
        }

        return this.shuffleArray(result);
    }

    private shuffleArray<T>(array: T[]): T[] {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    private calculateStats(data: TrainingData[]) {
        const stats = {
            total: data.length,
            positive: 0,
            negative: 0,
            neutral: 0,
            languages: {} as Record<string, number>
        };

        for (const item of data) {
            const sentiment = this.normalizeSentiment(item.sentiment) || 'neutral';
            stats[sentiment as keyof typeof stats]++;

            const lang = item.language || 'unknown';
            stats.languages[lang] = (stats.languages[lang] || 0) + 1;
        }

        return stats;
    }
}

// Función de conveniencia para usar desde scripts
export async function expandDataset(sourceNames?: string[], maxPerSource: number = 1000) {

    const service = new DatasetExpansionService();

    try {
        // Procesar datasets
        const processed = await service.processMultipleDatasets(sourceNames);

        if (processed.length === 0) {
            console.log('❌ No se pudo procesar ningún dataset');
            return;
        }

        // Combinar datasets
        const combined = service.combineDatasets(processed, maxPerSource);

        // Guardar dataset expandido
        await service.saveExpandedDataset(combined);


        return combined;

    } catch (error) {
        console.error('❌ Error en expansión del dataset:', error);
        throw error;
    }
}

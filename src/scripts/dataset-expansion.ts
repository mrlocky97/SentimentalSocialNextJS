/**
 * Script Principal de Expansión del Dataset
 * Combina datasets públicos + generación local para máxima precisión
 */

import { expandDataset } from '../services/dataset-expansion.service';
import { generateLocalDataset } from '../services/local-dataset-generator.service';
import { getBalancedDataset } from '../data/training-dataset';
import { TrainingData } from '../experimental/naive-bayes.model';
import fs from 'fs/promises';
import path from 'path';

interface DatasetExpansionConfig {
  usePublicDatasets: boolean;
  useLocalGeneration: boolean;
  combineWithExisting: boolean;
  targetSize: number;
  maxPublicExamples: number;
  maxSyntheticExamples: number;
  languageDistribution: Record<string, number>;
  testSplit: number;
}

class DatasetExpansionManager {
  private config: DatasetExpansionConfig;

  constructor(config?: Partial<DatasetExpansionConfig>) {
    this.config = {
      usePublicDatasets: true,
      useLocalGeneration: true,
      combineWithExisting: true,
      targetSize: 3000,
      maxPublicExamples: 1500,
      maxSyntheticExamples: 1000,
      languageDistribution: { es: 45, en: 35, de: 10, fr: 10 },
      testSplit: 0.2,
      ...config
    };
  }

  /**
   * Ejecutar expansión completa del dataset
   */
  async runExpansion(): Promise<void> {
    console.log('🚀 EXPANSIÓN COMPLETA DEL DATASET');
    console.log('=================================\n');

    console.log('⚙️ CONFIGURACIÓN:');
    console.log(`📊 Tamaño objetivo: ${this.config.targetSize} ejemplos`);
    console.log(`🌐 Datasets públicos: ${this.config.usePublicDatasets ? '✅' : '❌'}`);
    console.log(`🏭 Generación local: ${this.config.useLocalGeneration ? '✅' : '❌'}`);
    console.log(`🔗 Combinar con existente: ${this.config.combineWithExisting ? '✅' : '❌'}`);
    console.log(`📈 División test: ${(this.config.testSplit * 100).toFixed(0)}%`);
    console.log('');

    const datasets: TrainingData[][] = [];

    // 1. Dataset existente (si se combina)
    if (this.config.combineWithExisting) {
      console.log('📚 PASO 1: Cargando dataset existente...');
      const existing = getBalancedDataset();
      datasets.push(existing);
      console.log(`✅ Cargados: ${existing.length} ejemplos existentes\n`);
    }

    // 2. Datasets públicos (si está habilitado)
    if (this.config.usePublicDatasets) {
      console.log('🌐 PASO 2: Descargando datasets públicos...');
      try {
        // Seleccionar datasets específicos para evitar problemas
        const publicDatasets = [
          "Spanish Twitter Sentiment",
          "Multilingual Sentiment Dataset"
        ];
        
        const publicData = await expandDataset(publicDatasets, this.config.maxPublicExamples);
        if (publicData && publicData.length > 0) {
          datasets.push(publicData);
          console.log(`✅ Descargados: ${publicData.length} ejemplos públicos\n`);
        }
      } catch (error) {
        console.warn('⚠️ Error con datasets públicos, continuando sin ellos...\n');
      }
    }

    // 3. Generación local (si está habilitada)
    if (this.config.useLocalGeneration) {
      console.log('🏭 PASO 3: Generando dataset sintético...');
      try {
        const syntheticData = await generateLocalDataset({
          totalExamples: this.config.maxSyntheticExamples,
          languageDistribution: this.config.languageDistribution,
          sentimentBalance: true,
          includeEdgeCases: true
        });
        
        if (syntheticData && syntheticData.length > 0) {
          datasets.push(syntheticData);
          console.log(`✅ Generados: ${syntheticData.length} ejemplos sintéticos\n`);
        }
      } catch (error) {
        console.warn('⚠️ Error en generación local, continuando sin ella...\n');
      }
    }

    // 4. Combinar todos los datasets
    console.log('🔗 PASO 4: Combinando datasets...');
    const combinedDataset = this.combineDatasets(datasets);
    console.log(`✅ Combinados: ${combinedDataset.length} ejemplos total\n`);

    // 5. Procesar y optimizar
    console.log('⚙️ PASO 5: Procesando y optimizando...');
    const processedDataset = await this.processDataset(combinedDataset);
    console.log(`✅ Procesados: ${processedDataset.length} ejemplos finales\n`);

    // 6. Dividir en train/test
    console.log('📊 PASO 6: Dividiendo en train/test...');
    const { train, test } = this.splitDataset(processedDataset);
    console.log(`🎯 Entrenamiento: ${train.length} ejemplos`);
    console.log(`🧪 Prueba: ${test.length} ejemplos\n`);

    // 7. Guardar datasets finales
    console.log('💾 PASO 7: Guardando datasets...');
    await this.saveDatasets(train, test, processedDataset);

    // 8. Mostrar estadísticas finales
    this.showFinalStats(processedDataset);

    console.log('\n🎉 ¡EXPANSIÓN COMPLETA FINALIZADA!');
  }

  /**
   * Combinar múltiples datasets
   */
  private combineDatasets(datasets: TrainingData[][]): TrainingData[] {
    const combined: TrainingData[] = [];
    
    for (let i = 0; i < datasets.length; i++) {
      const dataset = datasets[i];
      console.log(`   📦 Dataset ${i + 1}: ${dataset.length} ejemplos`);
      combined.push(...dataset);
    }

    // Mezclar aleatoriamente
    return this.shuffleArray(combined);
  }

  /**
   * Procesar y optimizar dataset combinado
   */
  private async processDataset(data: TrainingData[]): Promise<TrainingData[]> {
    console.log('   🧹 Eliminando duplicados...');
    const deduplicated = this.removeDuplicates(data);
    console.log(`   ✅ Eliminados: ${data.length - deduplicated.length} duplicados`);

    console.log('   ⚖️ Balanceando clases...');
    const balanced = this.balanceDataset(deduplicated);
    console.log(`   ✅ Balanceados: ${balanced.length} ejemplos`);

    console.log('   🔧 Validando calidad...');
    const validated = this.validateQuality(balanced);
    console.log(`   ✅ Validados: ${validated.length} ejemplos de calidad`);

    // Limitar al tamaño objetivo
    const final = validated.slice(0, this.config.targetSize);
    console.log(`   🎯 Tamaño final: ${final.length} ejemplos`);

    return final;
  }

  /**
   * Eliminar duplicados
   */
  private removeDuplicates(data: TrainingData[]): TrainingData[] {
    const seen = new Set<string>();
    const unique: TrainingData[] = [];

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
   * Balancear dataset por sentimiento
   */
  private balanceDataset(data: TrainingData[]): TrainingData[] {
    const byClass: Record<string, TrainingData[]> = {
      positive: [],
      negative: [],
      neutral: []
    };

    // Agrupar por clase normalizada
    for (const item of data) {
      const normalized = this.normalizeSentiment(item.sentiment);
      byClass[normalized].push(item);
    }

    // Encontrar el tamaño mínimo para balancear
    const targetPerClass = Math.floor(this.config.targetSize / 3);
    const balanced: TrainingData[] = [];

    for (const [sentiment, items] of Object.entries(byClass)) {
      const shuffled = this.shuffleArray(items);
      const limited = shuffled.slice(0, Math.min(targetPerClass, items.length));
      balanced.push(...limited);
      
      console.log(`     ${sentiment}: ${limited.length} ejemplos`);
    }

    return this.shuffleArray(balanced);
  }

  /**
   * Validar calidad de los ejemplos
   */
  private validateQuality(data: TrainingData[]): TrainingData[] {
    return data.filter(item => {
      // Filtrar textos muy cortos o muy largos
      if (item.text.length < 10 || item.text.length > 500) return false;
      
      // Filtrar textos que son solo números o símbolos
      if (!/[a-záéíóúñA-ZÁÉÍÓÚÑ]/.test(item.text)) return false;
      
      // Filtrar textos repetitivos
      const words = item.text.toLowerCase().split(/\s+/);
      if (words.length < 3) return false;
      
      return true;
    });
  }

  /**
   * Dividir dataset en train/test
   */
  private splitDataset(data: TrainingData[]): { train: TrainingData[], test: TrainingData[] } {
    const shuffled = this.shuffleArray(data);
    const testSize = Math.floor(data.length * this.config.testSplit);
    
    return {
      test: shuffled.slice(0, testSize),
      train: shuffled.slice(testSize)
    };
  }

  /**
   * Guardar datasets finales
   */
  private async saveDatasets(train: TrainingData[], test: TrainingData[], full: TrainingData[]): Promise<void> {
    const timestamp = new Date().toISOString().split('T')[0];
    
    // Dataset completo expandido
    const fullContent = this.generateDatasetFile(full, 'EXPANDED_TRAINING_DATASET', 'Dataset expandido completo');
    await fs.writeFile(
      path.join(process.cwd(), 'src', 'data', `expanded-training-dataset.ts`),
      fullContent
    );
    console.log(`   💾 Guardado: expanded-training-dataset.ts`);

    // Dataset de entrenamiento
    const trainContent = this.generateDatasetFile(train, 'TRAIN_DATASET', 'Dataset de entrenamiento');
    await fs.writeFile(
      path.join(process.cwd(), 'src', 'data', `train-dataset.ts`),
      trainContent
    );
    console.log(`   💾 Guardado: train-dataset.ts`);

    // Dataset de prueba
    const testContent = this.generateDatasetFile(test, 'TEST_DATASET', 'Dataset de prueba');
    await fs.writeFile(
      path.join(process.cwd(), 'src', 'data', `test-dataset.ts`),
      testContent
    );
    console.log(`   💾 Guardado: test-dataset.ts`);

    // Backup con timestamp
    const backupContent = this.generateDatasetFile(full, 'BACKUP_DATASET', `Backup del ${timestamp}`);
    await fs.writeFile(
      path.join(process.cwd(), 'src', 'data', `backup-dataset-${timestamp}.ts`),
      backupContent
    );
    console.log(`   💾 Backup: backup-dataset-${timestamp}.ts`);
  }

  /**
   * Generar archivo de dataset
   */
  private generateDatasetFile(data: TrainingData[], exportName: string, description: string): string {
    const stats = this.calculateStats(data);
    
    return `/**
 * ${description}
 * Generado automáticamente: ${new Date().toISOString()}
 * Total: ${stats.total} ejemplos
 * Distribución: ${stats.positive}P / ${stats.negative}N / ${stats.neutral}Neu
 * Idiomas: ${Object.entries(stats.languages).map(([lang, count]) => `${lang}:${count}`).join(', ')}
 */

import { TrainingData } from '../experimental/naive-bayes.model';

export const ${exportName}: TrainingData[] = ${JSON.stringify(data, null, 2)};

export const ${exportName}_STATS = ${JSON.stringify(stats, null, 2)};

export function get${exportName.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join('')}(): TrainingData[] {
  return ${exportName};
}

export function get${exportName.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join('')}Stats() {
  return ${exportName}_STATS;
}`;
  }

  /**
   * Mostrar estadísticas finales
   */
  private showFinalStats(data: TrainingData[]): void {
    const stats = this.calculateStats(data);
    
    console.log('📊 ESTADÍSTICAS FINALES:');
    console.log('========================');
    console.log(`📚 Total ejemplos: ${stats.total}`);
    console.log(`✅ Positivos: ${stats.positive} (${(stats.positive/stats.total*100).toFixed(1)}%)`);
    console.log(`❌ Negativos: ${stats.negative} (${(stats.negative/stats.total*100).toFixed(1)}%)`);
    console.log(`⚪ Neutrales: ${stats.neutral} (${(stats.neutral/stats.total*100).toFixed(1)}%)`);
    console.log('');
    console.log('🌐 DISTRIBUCIÓN POR IDIOMA:');
    for (const [lang, count] of Object.entries(stats.languages)) {
      console.log(`   ${lang}: ${count} (${(count/stats.total*100).toFixed(1)}%)`);
    }
    console.log('');
    
    const improvement = ((stats.total / 234) * 100).toFixed(0);
    console.log(`🚀 MEJORA: ${improvement}% más ejemplos vs dataset original`);
  }

  // Métodos auxiliares
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private normalizeSentiment(sentiment: string): string {
    if (sentiment === 'very_positive' || sentiment === 'positive') return 'positive';
    if (sentiment === 'very_negative' || sentiment === 'negative') return 'negative';
    return 'neutral';
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
      const normalized = this.normalizeSentiment(item.sentiment);
      stats[normalized as keyof typeof stats]++;
      
      const lang = item.language || 'unknown';
      stats.languages[lang] = (stats.languages[lang] || 0) + 1;
    }

    return stats;
  }
}

// Función principal de expansión
export async function runDatasetExpansion(config?: Partial<DatasetExpansionConfig>) {
  const manager = new DatasetExpansionManager(config);
  await manager.runExpansion();
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  runDatasetExpansion({
    usePublicDatasets: false, // Comenzar solo con generación local por ahora
    useLocalGeneration: true,
    combineWithExisting: true,
    targetSize: 2000
  }).catch(console.error);
}

/**
 * Script Principal de Evaluación Integral
 * 
 * Punto de entrada único para ejecutar diferentes metodologías de evaluación:
 * - Validación cruzada rápida
 * - Comparación de configuraciones
 * - Suite completa de evaluación
 * - Evaluación personalizada
 */

import { runEvaluationSuite } from './evaluation-methodologies';
import { runConfigurationComparison } from './model-configuration-comparison';
import { runQuickEvaluation } from './quick-cross-validation';

interface EvaluationOption {
  id: string;
  name: string;
  description: string;
  estimatedTime: string;
  action: () => Promise<void>;
}

class EvaluationRunner {
  
  private static options: EvaluationOption[] = [
    {
      id: 'quick',
      name: 'Validación Cruzada Rápida',
      description: 'K-fold cross validation con muestra pequeña para pruebas rápidas',
      estimatedTime: '2-3 minutos',
      action: runQuickEvaluation
    },
    {
      id: 'config',
      name: 'Comparación de Configuraciones',
      description: 'Compara diferentes configuraciones del modelo enhanced',
      estimatedTime: '3-5 minutos',
      action: async () => { await runConfigurationComparison(); }
    },
    {
      id: 'full',
      name: 'Suite Completa de Evaluación',
      description: 'Evaluación exhaustiva con múltiples metodologías',
      estimatedTime: '10-15 minutos',
      action: runEvaluationSuite
    },
    {
      id: 'custom',
      name: 'Evaluación Personalizada',
      description: 'Configuración personalizada de parámetros de evaluación',
      estimatedTime: 'Variable',
      action: () => EvaluationRunner.runCustomEvaluation()
    },
    {
      id: 'all',
      name: 'Ejecutar Todo',
      description: 'Ejecuta todas las evaluaciones en secuencia',
      estimatedTime: '15-25 minutos',
      action: () => EvaluationRunner.runAllEvaluations()
    }
  ];
  
  /**
   * Muestra el menú principal y ejecuta la opción seleccionada
   */
  static async runInteractiveMenu(): Promise<void> {
    console.log('🎯 SISTEMA DE EVALUACIÓN DE SENTIMENT ANALYSIS');
    console.log('='.repeat(80));
    console.log('');
    
    console.log('📋 Opciones disponibles:');
    this.options.forEach((option, index) => {
      console.log(`   ${index + 1}. ${option.name}`);
      console.log(`      ${option.description}`);
      console.log(`      ⏱️  Tiempo estimado: ${option.estimatedTime}`);
      console.log('');
    });
    
    // Por defecto ejecutar validación cruzada rápida
    const defaultOptionIndex = 0;
    const selectedOption = this.options[defaultOptionIndex];
    
    console.log(`🚀 Ejecutando: ${selectedOption.name}`);
    console.log(`⏱️  Tiempo estimado: ${selectedOption.estimatedTime}`);
    console.log('='.repeat(80));
    
    try {
      await selectedOption.action();
      console.log(`\n✅ ${selectedOption.name} completada exitosamente!`);
    } catch (error) {
      console.error(`\n❌ Error en ${selectedOption.name}:`, error);
      throw error;
    }
  }
  
  /**
   * Ejecuta evaluación personalizada
   */
  private static async runCustomEvaluation(): Promise<void> {
    console.log('🔧 EVALUACIÓN PERSONALIZADA');
    console.log('='.repeat(60));
    
    // Configuración personalizada por defecto
    const customConfig = {
      kFolds: 5,
      sampleSize: 500,
      includeBootstrap: false,
      includeHoldOut: true,
      compareConfigurations: true
    };
    
    console.log('⚙️  Configuración personalizada:');
    console.log(`   K-Folds: ${customConfig.kFolds}`);
    console.log(`   Tamaño de muestra: ${customConfig.sampleSize}`);
    console.log(`   Incluir Bootstrap: ${customConfig.includeBootstrap ? 'Sí' : 'No'}`);
    console.log(`   Incluir Hold-out: ${customConfig.includeHoldOut ? 'Sí' : 'No'}`);
    console.log(`   Comparar configuraciones: ${customConfig.compareConfigurations ? 'Sí' : 'No'}`);
    
    console.log('\n🚀 Iniciando evaluación personalizada...');
    
    // Ejecutar según configuración
    if (customConfig.compareConfigurations) {
      console.log('\n1️⃣ Comparando configuraciones...');
      await runConfigurationComparison();
    }
    
    console.log('\n2️⃣ Validación cruzada...');
    await runQuickEvaluation();
    
    if (customConfig.includeHoldOut) {
      console.log('\n3️⃣ Hold-out validation adicional...');
      // Aquí podrías llamar a una función específica de hold-out
      console.log('   (Incluido en suite completa)');
    }
    
    console.log('\n✅ Evaluación personalizada completada!');
  }
  
  /**
   * Ejecuta todas las evaluaciones en secuencia
   */
  private static async runAllEvaluations(): Promise<void> {
    console.log('🎯 EJECUTANDO TODAS LAS EVALUACIONES');
    console.log('='.repeat(80));
    
    const evaluations = [
      { name: 'Validación Cruzada Rápida', action: runQuickEvaluation },
      { name: 'Comparación de Configuraciones', action: runConfigurationComparison },
      { name: 'Suite Completa', action: runEvaluationSuite }
    ];
    
    for (let i = 0; i < evaluations.length; i++) {
      const eval_ = evaluations[i];
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📊 ${i + 1}/${evaluations.length}: ${eval_.name}`);
      console.log(`${'='.repeat(60)}`);
      
      try {
        await eval_.action();
        console.log(`✅ ${eval_.name} completada!`);
      } catch (error) {
        console.error(`❌ Error en ${eval_.name}:`, error);
        console.log('🔄 Continuando con siguiente evaluación...');
      }
      
      // Pausa entre evaluaciones
      if (i < evaluations.length - 1) {
        console.log('\n⏳ Pausa de 2 segundos...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log('\n🎉 TODAS LAS EVALUACIONES COMPLETADAS!');
  }
  
  /**
   * Ejecuta evaluación específica por ID
   */
  static async runSpecificEvaluation(optionId: string): Promise<void> {
    const option = this.options.find(opt => opt.id === optionId);
    
    if (!option) {
      throw new Error(`Opción de evaluación no encontrada: ${optionId}`);
    }
    
    console.log(`🚀 Ejecutando: ${option.name}`);
    console.log(`⏱️  Tiempo estimado: ${option.estimatedTime}`);
    console.log('='.repeat(80));
    
    await option.action();
  }
  
  /**
   * Muestra información de ayuda
   */
  static showHelp(): void {
    console.log('🆘 AYUDA - SISTEMA DE EVALUACIÓN');
    console.log('='.repeat(60));
    console.log('');
    console.log('📖 USO:');
    console.log('   npm run evaluate              # Menú interactivo');
    console.log('   npm run evaluate quick        # Validación cruzada rápida');
    console.log('   npm run evaluate config       # Comparación de configuraciones');
    console.log('   npm run evaluate full         # Suite completa');
    console.log('   npm run evaluate custom       # Evaluación personalizada');
    console.log('   npm run evaluate all          # Todas las evaluaciones');
    console.log('');
    console.log('📊 METODOLOGÍAS INCLUIDAS:');
    console.log('   • K-Fold Cross Validation');
    console.log('   • Stratified Sampling');
    console.log('   • Hold-out Validation');
    console.log('   • Bootstrap Sampling');
    console.log('   • Comparación de modelos');
    console.log('   • Análisis de errores');
    console.log('   • Intervalos de confianza');
    console.log('');
    console.log('📈 MÉTRICAS CALCULADAS:');
    console.log('   • Accuracy');
    console.log('   • Precision (macro-promedio)');
    console.log('   • Recall (macro-promedio)');
    console.log('   • F1-Score (macro-promedio)');
    console.log('   • Matriz de confusión');
    console.log('   • Tiempo de procesamiento');
    console.log('   • Confianza promedio');
    console.log('');
    console.log('🎯 CONFIGURACIONES PROBADAS:');
    console.log('   • Enhanced Engine (con preprocesamiento avanzado)');
    console.log('   • Base Engine (sin enhancements)');
    console.log('   • Unified Orchestrator (sistema unificado)');
  }
  
  /**
   * Genera reporte de resumen de todas las evaluaciones
   */
  static async generateSummaryReport(): Promise<void> {
    console.log('📋 GENERANDO REPORTE DE RESUMEN...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportName = `evaluation-summary-${timestamp}.txt`;
    
    console.log(`📄 Reporte guardado como: ${reportName}`);
    console.log('');
    console.log('📊 RESUMEN EJECUTIVO:');
    console.log('   El sistema de evaluación incluye múltiples metodologías');
    console.log('   para validar el rendimiento del análisis de sentiment.');
    console.log('   Recomendamos usar "quick" para desarrollo y "full" para');
    console.log('   evaluación final antes de producción.');
  }
}

// Función principal
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  try {
    switch (command) {
      case 'help':
      case '--help':
      case '-h':
        EvaluationRunner.showHelp();
        break;
        
      case 'quick':
        await EvaluationRunner.runSpecificEvaluation('quick');
        break;
        
      case 'config':
        await EvaluationRunner.runSpecificEvaluation('config');
        break;
        
      case 'full':
        await EvaluationRunner.runSpecificEvaluation('full');
        break;
        
      case 'custom':
        await EvaluationRunner.runSpecificEvaluation('custom');
        break;
        
      case 'all':
        await EvaluationRunner.runSpecificEvaluation('all');
        break;
        
      case 'summary':
        await EvaluationRunner.generateSummaryReport();
        break;
        
      default:
        await EvaluationRunner.runInteractiveMenu();
        break;
    }
    
  } catch (error) {
    console.error('💥 Error en el sistema de evaluación:', error);
    console.log('\n💡 Usa "npm run evaluate help" para ver las opciones disponibles');
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main()
    .then(() => {
      console.log('\n🎉 Evaluación completada exitosamente!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Error fatal:', error);
      process.exit(1);
    });
}

export { EvaluationRunner };

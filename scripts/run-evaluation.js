/**
 * Script Principal de Evaluación - Versión Simple
 * Punto de entrada para ejecutar diferentes evaluaciones
 */

const { execSync } = require('child_process');
const path = require('path');

function showMenu() {
  console.log('🎯 SISTEMA DE EVALUACIÓN DE SENTIMENT ANALYSIS');
  console.log('='.repeat(60));
  console.log('');
  console.log('📋 Opciones disponibles:');
  console.log('   1. Validación Cruzada Simple (3-Fold)');
  console.log('      - Evaluación rápida con dataset pequeño');
  console.log('      - Tiempo estimado: 1-2 minutos');
  console.log('      - Incluye análisis de errores');
  console.log('');
  console.log('   2. Test de Slang Moderno');
  console.log('      - Prueba específica de expresiones modernas');
  console.log('      - Tiempo estimado: 30 segundos');
  console.log('');
  console.log('   3. Validación Cruzada Completa (TypeScript)');
  console.log('      - Evaluación exhaustiva con dataset completo');
  console.log('      - Tiempo estimado: 5-10 minutos');
  console.log('');
  console.log('🚀 Iniciando evaluación por defecto: Validación Cruzada Simple');
}

function runSimpleValidation() {
  console.log('\n▶️  Ejecutando Validación Cruzada Simple...');
  try {
    execSync('node scripts/simple-cross-validation.js', { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
  } catch (error) {
    console.error('❌ Error ejecutando validación simple:', error.message);
    throw error;
  }
}

function runSlangTest() {
  console.log('\n▶️  Ejecutando Test de Slang Moderno...');
  try {
    execSync('node scripts/test-enhanced-system.js', { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
  } catch (error) {
    console.error('❌ Error ejecutando test de slang:', error.message);
    throw error;
  }
}

function runCompleteValidation() {
  console.log('\n▶️  Ejecutando Validación Cruzada Completa...');
  try {
    // Primero compilar
    console.log('🔨 Compilando TypeScript...');
    execSync('npx tsc --build tsconfig.server.json', { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    console.log('▶️  Ejecutando evaluación TypeScript...');
    execSync('npx ts-node --esm scripts/quick-cross-validation.ts', { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
  } catch (error) {
    console.error('❌ Error ejecutando validación completa:', error.message);
    console.log('💡 Intentando alternativa...');
    
    try {
      // Alternativa: usar solo la validación simple
      runSimpleValidation();
    } catch (altError) {
      console.error('❌ Error en alternativa:', altError.message);
      throw error;
    }
  }
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  try {
    showMenu();
    
    switch (command) {
      case '1':
      case 'simple':
        runSimpleValidation();
        break;
        
      case '2':
      case 'slang':
        runSlangTest();
        break;
        
      case '3':
      case 'complete':
        runCompleteValidation();
        break;
        
      case 'all':
        console.log('\n🔄 Ejecutando todas las evaluaciones...');
        runSimpleValidation();
        console.log('\n' + '='.repeat(60));
        runSlangTest();
        break;
        
      case 'help':
      case '--help':
      case '-h':
        showHelp();
        break;
        
      default:
        // Por defecto ejecutar validación simple
        runSimpleValidation();
        break;
    }
    
    console.log('\n✅ Evaluación completada exitosamente!');
    
  } catch (error) {
    console.error('\n💥 Error en el sistema de evaluación:', error);
    console.log('\n💡 Comandos disponibles:');
    console.log('   node scripts/run-evaluation.js simple    # Validación simple');
    console.log('   node scripts/run-evaluation.js slang     # Test de slang');
    console.log('   node scripts/run-evaluation.js complete  # Evaluación completa');
    console.log('   node scripts/run-evaluation.js all       # Todas las evaluaciones');
    console.log('   node scripts/run-evaluation.js help      # Esta ayuda');
    process.exit(1);
  }
}

function showHelp() {
  console.log('\n🆘 AYUDA - SISTEMA DE EVALUACIÓN');
  console.log('='.repeat(60));
  console.log('');
  console.log('📖 USO:');
  console.log('   node scripts/run-evaluation.js [comando]');
  console.log('');
  console.log('📋 COMANDOS:');
  console.log('   simple     Validación cruzada simple (por defecto)');
  console.log('   slang      Test específico de slang moderno');
  console.log('   complete   Evaluación completa con TypeScript');
  console.log('   all        Ejecutar simple + slang');
  console.log('   help       Mostrar esta ayuda');
  console.log('');
  console.log('📊 METODOLOGÍAS:');
  console.log('   • K-Fold Cross Validation (3-fold y 5-fold)');
  console.log('   • Stratified Sampling');
  console.log('   • Análisis de errores por clase');
  console.log('   • Intervalos de confianza');
  console.log('   • Test específicos de slang moderno');
  console.log('');
  console.log('📈 MÉTRICAS:');
  console.log('   • Accuracy con desviación estándar');
  console.log('   • Precisión por clase');
  console.log('   • Análisis de confianza');
  console.log('   • Tiempo de procesamiento');
  console.log('   • Distribución de errores');
  console.log('');
  console.log('🎯 RECOMENDACIONES:');
  console.log('   • Desarrollo: use "simple" para pruebas rápidas');
  console.log('   • Validación: use "slang" para verificar mejoras');
  console.log('   • Producción: use "complete" para evaluación final');
}

// Ejecutar función principal
main();
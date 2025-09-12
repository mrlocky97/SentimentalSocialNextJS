#!/usr/bin/env node

/**
 * Utilidades para administrar la persistencia de jobs
 * Ejecuta: node scripts/job-persistence-utils.js [comando]
 * 
 * Comandos disponibles:
 * - cleanup: Limpiar jobs antiguos
 * - stats: Mostrar estadísticas detalladas
 * - export: Exportar datos de jobs
 * - migrate: Migrar datos existentes
 */

const axios = require('axios');
const fs = require('fs');

const BASE_URL = 'http://localhost:3001';

// Comandos disponibles
const commands = {
  cleanup: cleanupOldJobs,
  stats: showDetailedStats,
  export: exportJobData,
  test: runConnectivityTest,
  help: showHelp
};

async function cleanupOldJobs() {
  console.log('🧹 Limpiando jobs antiguos...\n');
  
  try {
    // Obtener estadísticas antes
    const statsBefore = await getStats();
    console.log(`📊 Estado actual: ${statsBefore.totalJobs} jobs en BD`);
    
    // Simular limpieza (en una implementación real, harías una llamada a un endpoint de limpieza)
    console.log('🔍 Identificando jobs para limpieza:');
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30); // 30 días atrás
    
    console.log(`   📅 Fecha límite: ${cutoffDate.toLocaleDateString()}`);
    console.log('   🎯 Criterios: jobs completados > 30 días');
    console.log('   ⚠️ Preservando: jobs con errores, jobs recientes');
    
    // En una implementación real, implementarías este endpoint
    console.log('\n💡 Para implementar limpieza automática:');
    console.log('   1. Crear endpoint DELETE /api/v1/scraping/advanced/jobs/cleanup');
    console.log('   2. Implementar lógica en job-persistence.service.ts');
    console.log('   3. Añadir parámetros de configuración');
    
  } catch (error) {
    console.error('❌ Error en limpieza:', error.message);
  }
}

async function showDetailedStats() {
  console.log('📊 Estadísticas detalladas del sistema...\n');
  
  try {
    const statsResponse = await axios.get(`${BASE_URL}/api/v1/scraping/advanced/stats`);
    
    if (statsResponse.data.success) {
      const { stats } = statsResponse.data;
      
      console.log('🔄 ESTADO DE LA COLA:');
      if (stats.queue?.queueStats) {
        console.log(`   Activos: ${stats.queue.queueStats.active}`);
        console.log(`   En espera: ${stats.queue.queueStats.waiting}`);
        console.log(`   Completados: ${stats.queue.queueStats.completed}`);
        console.log(`   Fallidos: ${stats.queue.queueStats.failed}`);
      }
      
      console.log('\n💾 BASE DE DATOS:');
      if (stats.database?.overall) {
        console.log(`   Total jobs: ${stats.database.overall.totalJobs}`);
        console.log(`   Tweets recolectados: ${stats.database.overall.totalTweetsCollected}`);
        console.log(`   Análisis realizados: ${stats.database.overall.totalSentimentAnalyzed}`);
        console.log(`   Guardados en BD: ${stats.database.overall.totalSavedToDatabase}`);
      }
      
      console.log('\n📋 DISTRIBUCIÓN POR ESTADO:');
      if (stats.database?.byStatus) {
        stats.database.byStatus.forEach(status => {
          const percentage = ((status.count / (stats.database.overall.totalJobs || 1)) * 100).toFixed(1);
          console.log(`   ${status._id}: ${status.count} (${percentage}%)`);
        });
      }
      
      console.log('\n🏷️ DISTRIBUCIÓN POR TIPO:');
      if (stats.database?.byType) {
        stats.database.byType.forEach(type => {
          const percentage = ((type.count / (stats.database.overall.totalJobs || 1)) * 100).toFixed(1);
          console.log(`   ${type._id}: ${type.count} (${percentage}%)`);
        });
      }
      
      console.log('\n🎯 DISTRIBUCIÓN POR CAMPAÑA:');
      if (stats.database?.byCampaign) {
        stats.database.byCampaign.slice(0, 10).forEach(campaign => {
          console.log(`   ${campaign._id}: ${campaign.count} jobs`);
        });
        if (stats.database.byCampaign.length > 10) {
          console.log(`   ... y ${stats.database.byCampaign.length - 10} campañas más`);
        }
      }
      
    }
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error.response?.data?.error || error.message);
  }
}

async function exportJobData() {
  console.log('📤 Exportando datos de jobs...\n');
  
  try {
    // Obtener todos los jobs
    const jobsResponse = await axios.get(`${BASE_URL}/api/v1/scraping/advanced/jobs?limit=1000`);
    
    if (jobsResponse.data.success) {
      const { jobs } = jobsResponse.data;
      
      // Crear reporte de exportación
      const exportData = {
        metadata: {
          exportDate: new Date().toISOString(),
          totalJobs: jobs.length,
          version: '1.0'
        },
        summary: {
          byStatus: {},
          byType: {},
          byCampaign: {}
        },
        jobs: jobs.map(job => ({
          jobId: job.jobId,
          type: job.type,
          query: job.query,
          status: job.status,
          campaignId: job.campaignId,
          targetCount: job.targetCount,
          tweetsCollected: job.tweetsCollected,
          sentimentAnalyzed: job.sentimentAnalyzed,
          createdAt: job.createdAt,
          completedAt: job.completedAt,
          source: job.source
        }))
      };
      
      // Generar resúmenes
      jobs.forEach(job => {
        // Por estado
        exportData.summary.byStatus[job.status] = (exportData.summary.byStatus[job.status] || 0) + 1;
        
        // Por tipo
        exportData.summary.byType[job.type] = (exportData.summary.byType[job.type] || 0) + 1;
        
        // Por campaña
        if (job.campaignId) {
          exportData.summary.byCampaign[job.campaignId] = (exportData.summary.byCampaign[job.campaignId] || 0) + 1;
        }
      });
      
      // Guardar archivo
      const filename = `job-export-${new Date().toISOString().split('T')[0]}.json`;
      fs.writeFileSync(filename, JSON.stringify(exportData, null, 2));
      
      console.log(`✅ Datos exportados a: ${filename}`);
      console.log(`📊 Total jobs exportados: ${jobs.length}`);
      console.log(`📁 Tamaño del archivo: ${(fs.statSync(filename).size / 1024).toFixed(2)} KB`);
      
    }
  } catch (error) {
    console.error('❌ Error exportando datos:', error.response?.data?.error || error.message);
  }
}

async function runConnectivityTest() {
  console.log('🔗 Probando conectividad del sistema...\n');
  
  const tests = [
    {
      name: 'Servidor base',
      url: `${BASE_URL}/health`,
      critical: true
    },
    {
      name: 'API Info',
      url: `${BASE_URL}/api/v1`,
      critical: true
    },
    {
      name: 'Estadísticas',
      url: `${BASE_URL}/api/v1/scraping/advanced/stats`,
      critical: false
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const response = await axios.get(test.url, { timeout: 5000 });
      console.log(`✅ ${test.name}: OK (${response.status})`);
      passed++;
    } catch (error) {
      const symbol = test.critical ? '❌' : '⚠️';
      console.log(`${symbol} ${test.name}: Error (${error.response?.status || 'TIMEOUT'})`);
      failed++;
    }
  }
  
  console.log(`\n📊 Resultado: ${passed} éxitos, ${failed} fallos`);
  
  if (failed > 0) {
    console.log('\n💡 Sugerencias:');
    console.log('   1. Verificar que el servidor esté ejecutándose');
    console.log('   2. Comprobar la configuración de la base de datos');
    console.log('   3. Revisar logs del servidor para errores');
  }
}

function showHelp() {
  console.log('🛠️ Utilidades de Persistencia de Jobs\n');
  console.log('Uso: node scripts/job-persistence-utils.js [comando]\n');
  console.log('Comandos disponibles:');
  console.log('  cleanup    🧹 Limpiar jobs antiguos de la base de datos');
  console.log('  stats      📊 Mostrar estadísticas detalladas del sistema');
  console.log('  export     📤 Exportar datos de jobs a archivo JSON');
  console.log('  test       🔗 Probar conectividad del sistema');
  console.log('  help       ❓ Mostrar esta ayuda');
  console.log('\nEjemplos:');
  console.log('  node scripts/job-persistence-utils.js stats');
  console.log('  node scripts/job-persistence-utils.js export');
  console.log('  node scripts/job-persistence-utils.js test');
}

// Función auxiliar para obtener estadísticas
async function getStats() {
  try {
    const response = await axios.get(`${BASE_URL}/api/v1/scraping/advanced/stats`);
    return response.data.success ? response.data.stats.database?.overall || {} : {};
  } catch (error) {
    return {};
  }
}

// Ejecutar comando
async function main() {
  const command = process.argv[2] || 'help';
  
  if (commands[command]) {
    await commands[command]();
  } else {
    console.log(`❌ Comando desconocido: ${command}\n`);
    showHelp();
  }
}

main();
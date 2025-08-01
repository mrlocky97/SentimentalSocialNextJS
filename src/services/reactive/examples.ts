// /**
//  * Ejemplo de Uso - Sistema de Servicios Reactivos
//  * Demostración práctica de todas las funcionalidades implementadas
//  */

// import { 
//   initializeReactiveServices,
//   reactiveTwitterScraper,
//   reactiveSentimentAnalyzer,
//   notificationSystem,
//   autoOptimizationSystem,
//   predictiveAnalyticsSystem,
//   reactiveOrchestrator,
//   createSocialMediaWorkflow,
//   startSentimentMonitoring,
//   getSystemStatus,
//   defaultReactiveConfig
// } from './index';

// /**
//  * Ejemplo 1: Inicialización y configuración básica
//  */
// export function ejemploInicializacion() {
//   console.log('🚀 === EJEMPLO 1: INICIALIZACIÓN ===');
  
//   // Configuración personalizada
//   const config = {
//     ...defaultReactiveConfig,
//     maxConcurrentRequests: 15,
//     cacheTimeout: 600000, // 10 minutos
//     retryAttempts: 5
//   };
  
//   // Inicializar servicios
//   initializeReactiveServices(config);
  
//   // Mostrar estado del sistema
//   getSystemStatus().then(status => {
//     console.log('📊 Estado del Sistema:', status);
//   });
// }

// /**
//  * Ejemplo 2: Scraping de Twitter con optimizaciones
//  */
// export function ejemploTwitterScraping() {
//   console.log('🐦 === EJEMPLO 2: TWITTER SCRAPING REACTIVO ===');
  
//   // Scraping con prioridad alta
//   const hashtags = ['#AI', '#MachineLearning', '#Tech'];
  
//   reactiveTwitterScraper.batchScrape(hashtags, {}, 'high').subscribe({
//     next: (tweets) => {
//       console.log(`✅ Scraped ${tweets.length} tweets para hashtags: ${hashtags.join(', ')}`);
      
//       // Mostrar estadísticas del scraper
//       reactiveTwitterScraper.getStats().subscribe(stats => {
//         console.log('📈 Estadísticas del Scraper:');
//         console.log(`   - Cache Hit Rate: ${(stats.cacheHitRate * 100).toFixed(1)}%`);
//         console.log(`   - Success Rate: ${(stats.successRate * 100).toFixed(1)}%`);
//         console.log(`   - Tiempo promedio de respuesta: ${stats.averageResponseTime}ms`);
//         console.log(`   - Requests en cola: ${stats.queueLength}`);
//       });
//     },
//     error: (error) => {
//       console.error('❌ Error en scraping:', error);
//     }
//   });
// }

// /**
//  * Ejemplo 3: Análisis de sentimientos en lotes
//  */
// export function ejemploAnalisisSentimientos() {
//   console.log('💭 === EJEMPLO 3: ANÁLISIS DE SENTIMIENTOS REACTIVO ===');
  
//   // Tweets de ejemplo para análisis
//   const tweetsMuestra = [
//     { id: '1', text: '¡Excelente producto! Muy recomendado 👍', user: 'user1', created_at: new Date().toISOString(), retweet_count: 5, favorite_count: 10 },
//     { id: '2', text: 'No me gustó para nada, muy decepcionante 😞', user: 'user2', created_at: new Date().toISOString(), retweet_count: 1, favorite_count: 2 },
//     { id: '3', text: 'Es un producto normal, nada especial', user: 'user3', created_at: new Date().toISOString(), retweet_count: 0, favorite_count: 1 },
//     { id: '4', text: '¡Increíble innovación! El futuro es ahora 🚀', user: 'user4', created_at: new Date().toISOString(), retweet_count: 15, favorite_count: 30 },
//     { id: '5', text: 'Muy malo, no lo recomiendo a nadie', user: 'user5', created_at: new Date().toISOString(), retweet_count: 0, favorite_count: 0 }
//   ];
  
//   reactiveSentimentAnalyzer.analyzeTweetsBatch(tweetsMuestra).subscribe({
//     next: (resultados) => {
//       console.log(`✅ Analizados ${resultados.length} tweets:`);
      
//       resultados.forEach((resultado, index) => {
//         const tweet = tweetsMuestra[index];
//         console.log(`   Tweet "${tweet.text.substring(0, 30)}..."`);
//         console.log(`   Sentimiento: ${resultado.sentiment || 'Neutro'}`);
//         console.log(`   Score: ${resultado.score || 0}`);
//         console.log('   ---');
//       });
      
//       // Mostrar estadísticas del analizador
//       reactiveSentimentAnalyzer.getStats().subscribe(stats => {
//         console.log('📈 Estadísticas del Analizador:');
//         console.log(`   - Total analizados: ${stats.totalAnalyzed}`);
//         console.log(`   - Velocidad: ${stats.tweetsPerSecond} tweets/sec`);
//         console.log(`   - Cache Hit Rate: ${(stats.cacheHitRate * 100).toFixed(1)}%`);
//         console.log(`   - Tiempo promedio: ${stats.averageProcessingTime}ms`);
//       });
//     },
//     error: (error) => {
//       console.error('❌ Error en análisis:', error);
//     }
//   });
// }

// /**
//  * Ejemplo 4: Sistema de notificaciones multi-canal
//  */
// export function ejemploNotificaciones() {
//   console.log('🔔 === EJEMPLO 4: SISTEMA DE NOTIFICACIONES ===');
  
//   // Configurar canales de notificación
//   notificationSystem.configureChannels({
//     console: { enabled: true, level: 'info' },
//     file: { enabled: true, path: './logs/notifications.log' },
//     webhook: { enabled: false }, // Deshabilitado para demo
//     email: { enabled: false }    // Deshabilitado para demo
//   });
  
//   // Enviar diferentes tipos de notificaciones
//   notificationSystem.notify({
//     type: 'info',
//     title: 'Sistema Iniciado',
//     message: 'El sistema de servicios reactivos está funcionando correctamente',
//     priority: 'medium'
//   });
  
//   notificationSystem.sendSuccess(
//     'Análisis Completado',
//     'El análisis de sentimientos se completó exitosamente',
//     { processed: 100, positive: 60, negative: 25, neutral: 15 }
//   );
  
//   notificationSystem.sendWarning(
//     'Alto Volumen Detectado',
//     'Se detectó un incremento del 300% en menciones negativas',
//     { increase: '300%', timeframe: '1h' }
//   );
  
//   // Mostrar estadísticas de notificaciones
//   setTimeout(() => {
//     notificationSystem.getStats().subscribe(stats => {
//       console.log('📈 Estadísticas de Notificaciones:');
//       console.log(`   - Total enviadas: ${stats.totalSent}`);
//       console.log(`   - Success Rate: ${(stats.successRate * 100).toFixed(1)}%`);
//       console.log(`   - Tiempo promedio: ${stats.averageResponseTime}ms`);
//       console.log(`   - Por canal:`, stats.channelStats);
//     });
//   }, 2000);
// }

// /**
//  * Ejemplo 5: Auto-optimización de campañas
//  */
// export function ejemploAutoOptimizacion() {
//   console.log('⚡ === EJEMPLO 5: AUTO-OPTIMIZACIÓN DE CAMPAÑAS ===');
  
//   const campaignId = 'campaign-demo-2024';
//   const campaignData = {
//     hashtags: ['#AI', '#Innovation', '#TechTrends'],
//     content: 'Descubre la revolución de la IA en nuestra nueva plataforma',
//     targetAudience: 'tech-enthusiasts',
//     budget: 5000
//   };
  
//   // Programar optimización de hashtags
//   autoOptimizationSystem.scheduleOptimization(
//     'hashtag_optimization',
//     campaignId,
//     campaignData,
//     'high'
//   ).subscribe({
//     next: (resultado) => {
//       console.log('✅ Optimización de hashtags completada:');
//       console.log(`   - Mejora: ${resultado.metrics.improvement.toFixed(1)}%`);
//       console.log(`   - Mejoras aplicadas:`, resultado.improvements);
//       console.log(`   - Recomendaciones:`, resultado.recommendations);
//     },
//     error: (error) => {
//       console.error('❌ Error en optimización:', error);
//     }
//   });
  
//   // Programar optimización de timing
//   setTimeout(() => {
//     autoOptimizationSystem.scheduleOptimization(
//       'timing_optimization',
//       campaignId,
//       campaignData,
//       'medium'
//     ).subscribe({
//       next: (resultado) => {
//         console.log('✅ Optimización de timing completada:');
//         console.log(`   - Mejora: ${resultado.metrics.improvement.toFixed(1)}%`);
//         console.log(`   - Mejoras aplicadas:`, resultado.improvements);
//       }
//     });
//   }, 3000);
  
//   // Mostrar estadísticas del sistema
//   setTimeout(() => {
//     autoOptimizationSystem.getStats().subscribe(stats => {
//       console.log('📈 Estadísticas de Auto-optimización:');
//       console.log(`   - Total tareas: ${stats.totalTasks}`);
//       console.log(`   - Completadas: ${stats.completedTasks}`);
//       console.log(`   - Mejora promedio: ${stats.averageImprovement.toFixed(1)}%`);
//       console.log(`   - Success Rate: ${(stats.successRate * 100).toFixed(1)}%`);
//     });
//   }, 6000);
// }

// /**
//  * Ejemplo 6: Análisis predictivo avanzado
//  */
// export function ejemploAnalisisPredictivo() {
//   console.log('🔮 === EJEMPLO 6: ANÁLISIS PREDICTIVO AVANZADO ===');
  
//   const campaignId = 'predictive-demo-2024';
//   const campaignData = {
//     content: 'Lanzamiento revolucionario de IA conversacional',
//     hashtags: ['#AI', '#ChatBot', '#Innovation'],
//     targetDemographic: 'millennials-tech'
//   };
  
//   // Predicción de engagement
//   predictiveAnalyticsSystem.predict('engagement', campaignId, campaignData, '24h').subscribe({
//     next: (prediccion) => {
//       console.log('✅ Predicción de Engagement:');
//       console.log(`   - Likes esperados: ${prediccion.prediction.expectedLikes}`);
//       console.log(`   - Shares esperados: ${prediccion.prediction.expectedShares}`);
//       console.log(`   - Tasa de engagement: ${prediccion.prediction.engagementRate.toFixed(2)}%`);
//       console.log(`   - Confianza: ${(prediccion.confidence * 100).toFixed(1)}%`);
//       console.log(`   - Factores clave:`, prediccion.factors);
//     }
//   });
  
//   // Predicción de viralidad
//   setTimeout(() => {
//     predictiveAnalyticsSystem.predict('virality', campaignId, campaignData, '7d').subscribe({
//       next: (prediccion) => {
//         console.log('✅ Predicción de Viralidad:');
//         console.log(`   - Score de viralidad: ${prediccion.prediction.viralityScore.toFixed(1)}/10`);
//         console.log(`   - Potencial de shares: ${prediccion.prediction.sharesPotential}`);
//         console.log(`   - Probabilidad viral: ${(prediccion.prediction.viralityProbability * 100).toFixed(1)}%`);
//         console.log(`   - Multiplicador de alcance: ${prediccion.prediction.reachMultiplier.toFixed(1)}x`);
//       }
//     });
//   }, 2000);
  
//   // Análisis de tendencias
//   setTimeout(() => {
//     predictiveAnalyticsSystem.getTrends().subscribe(tendencias => {
//       console.log('✅ Análisis de Tendencias:');
//       console.log(`   - Tendencias emergentes:`, tendencias.trending);
//       console.log(`   - En declive:`, tendencias.declining);
//       console.log(`   - Nuevas oportunidades:`, tendencias.emerging);
//       console.log(`   - Confianza del análisis: ${(tendencias.confidence * 100).toFixed(1)}%`);
//     });
//   }, 4000);
  
//   // Estadísticas del sistema predictivo
//   setTimeout(() => {
//     predictiveAnalyticsSystem.getStats().subscribe(stats => {
//       console.log('📈 Estadísticas del Sistema Predictivo:');
//       console.log(`   - Predicciones totales: ${stats.totalPredictions}`);
//       console.log(`   - Precisión promedio: ${(stats.averageConfidence * 100).toFixed(1)}%`);
//       console.log(`   - Tendencias analizadas: ${stats.trendsAnalyzed}`);
//       console.log(`   - Alertas generadas: ${stats.alertsGenerated}`);
//     });
//   }, 6000);
// }

// /**
//  * Ejemplo 7: Workflow completo de optimización
//  */
// export function ejemploWorkflowCompleto() {
//   console.log('🎯 === EJEMPLO 7: WORKFLOW COMPLETO DE OPTIMIZACIÓN ===');
  
//   const campaignId = 'workflow-demo-2024';
//   const hashtags = ['#AI', '#MachineLearning', '#Innovation'];
//   const content = 'Revolucionando el futuro con IA avanzada';
  
//   // Crear workflow de optimización completo
//   createSocialMediaWorkflow(campaignId, hashtags, content).subscribe({
//     next: (workflow) => {
//       console.log(`✅ Workflow creado: ${workflow.name}`);
//       console.log(`   - ID: ${workflow.id}`);
//       console.log(`   - Estado: ${workflow.status}`);
//       console.log(`   - Progreso: ${workflow.progress}%`);
//       console.log(`   - Pasos: ${workflow.steps.length}`);
      
//       // Monitorear progreso del workflow
//       const monitoreo = setInterval(() => {
//         reactiveOrchestrator.getWorkflow(workflow.id).subscribe(updatedWorkflow => {
//           if (updatedWorkflow) {
//             console.log(`   📊 Progreso: ${updatedWorkflow.progress}% - Estado: ${updatedWorkflow.status}`);
            
//             if (updatedWorkflow.status === 'completed') {
//               console.log('🎉 ¡Workflow completado exitosamente!');
//               console.log('   Pasos ejecutados:');
//               updatedWorkflow.steps.forEach(step => {
//                 console.log(`     - ${step.name}: ${step.status} (${step.duration}ms)`);
//               });
//               clearInterval(monitoreo);
//             } else if (updatedWorkflow.status === 'failed') {
//               console.log('❌ Workflow falló');
//               clearInterval(monitoreo);
//             }
//           }
//         });
//       }, 2000);
//     },
//     error: (error) => {
//       console.error('❌ Error creando workflow:', error);
//     }
//   });
// }

// /**
//  * Ejemplo 8: Monitoreo en tiempo real
//  */
// export function ejemploMonitoreoTiempoReal() {
//   console.log('📡 === EJEMPLO 8: MONITOREO EN TIEMPO REAL ===');
  
//   // Monitoreo de sentimientos para palabras clave
//   const keywords = ['marca', 'producto', 'servicio'];
  
//   console.log(`🔍 Iniciando monitoreo de sentimientos para: ${keywords.join(', ')}`);
  
//   const monitoreo$ = startSentimentMonitoring(keywords);
  
//   // Suscribirse al monitoreo (simula resultados)
//   const subscription = monitoreo$.subscribe({
//     next: (resultados) => {
//       console.log('📊 Resultados del monitoreo:');
//       console.log(`   - Total analizados: ${resultados.length}`);
      
//       const positivos = resultados.filter((r: any) => r.sentiment?.score > 0.2).length;
//       const negativos = resultados.filter((r: any) => r.sentiment?.score < -0.2).length;
//       const neutros = resultados.length - positivos - negativos;
      
//       console.log(`   - Positivos: ${positivos} (${((positivos/resultados.length)*100).toFixed(1)}%)`);
//       console.log(`   - Negativos: ${negativos} (${((negativos/resultados.length)*100).toFixed(1)}%)`);
//       console.log(`   - Neutros: ${neutros} (${((neutros/resultados.length)*100).toFixed(1)}%)`);
      
//       if (negativos > resultados.length * 0.3) {
//         console.log('⚠️  ALERTA: Alto nivel de sentimientos negativos detectado!');
//       }
//     },
//     error: (error) => {
//       console.error('❌ Error en monitoreo:', error);
//     }
//   });
  
//   // Detener monitoreo después de 30 segundos
//   setTimeout(() => {
//     subscription.unsubscribe();
//     console.log('🛑 Monitoreo detenido');
//   }, 30000);
// }

// /**
//  * Ejemplo 9: Estadísticas centralizadas del sistema
//  */
// export function ejemploEstadisticasCentralizadas() {
//   console.log('📈 === EJEMPLO 9: ESTADÍSTICAS CENTRALIZADAS ===');
  
//   // Estadísticas del orquestador
//   reactiveOrchestrator.getStats().subscribe(stats => {
//     console.log('🎛️  Estadísticas del Orquestador:');
//     console.log(`   - Workflows totales: ${stats.totalWorkflows}`);
//     console.log(`   - Workflows activos: ${stats.activeWorkflows}`);
//     console.log(`   - Workflows completados: ${stats.completedWorkflows}`);
//     console.log(`   - Tiempo promedio de workflow: ${stats.averageWorkflowTime}ms`);
//     console.log(`   - Servicios online: ${stats.servicesOnline}/${stats.totalServices}`);
//     console.log(`   - Uptime del sistema: ${(stats.systemUptime / 1000).toFixed(0)}s`);
//   });
  
//   // Estado de salud del sistema
//   setTimeout(() => {
//     reactiveOrchestrator.getSystemHealth().subscribe(health => {
//       console.log('🏥 Estado de Salud del Sistema:');
//       console.log(`   - Estado general: ${health.overall}`);
//       console.log(`   - Servicios monitoreados: ${health.services.length}`);
      
//       health.services.forEach(service => {
//         console.log(`   - ${service.name}: ${service.status}`);
//         console.log(`     * Uptime: ${(service.uptime / 1000).toFixed(0)}s`);
//         console.log(`     * Tiempo de respuesta: ${service.performance.responseTime.toFixed(1)}ms`);
//         console.log(`     * Success Rate: ${(service.performance.successRate * 100).toFixed(1)}%`);
//         console.log(`     * Throughput: ${service.performance.throughput.toFixed(1)} ops/min`);
//       });
      
//       if (health.alerts.length > 0) {
//         console.log('🚨 Alertas del sistema:');
//         health.alerts.forEach(alert => {
//           console.log(`   - ${alert}`);
//         });
//       }
//     });
//   }, 1000);
  
//   // Monitoreo en tiempo real
//   setTimeout(() => {
//     console.log('📡 Iniciando stream de monitoreo en tiempo real...');
    
//     const monitoringStream = reactiveOrchestrator.getMonitoringStream();
//     const subscription = monitoringStream.subscribe(data => {
//       console.log('📊 Datos en tiempo real:');
//       console.log(`   - Workflows activos: ${data.activeTasks}`);
//       console.log(`   - Cola de trabajos: ${data.queueLength}`);
//       console.log(`   - CPU del sistema: ${data.metrics.cpuUsage.toFixed(1)}%`);
//       console.log(`   - Memoria del sistema: ${data.metrics.memoryUsage.toFixed(1)}%`);
//       console.log(`   - Conexiones activas: ${data.metrics.activeConnections}`);
//     });
    
//     // Detener después de 15 segundos
//     setTimeout(() => {
//       subscription.unsubscribe();
//       console.log('🛑 Stream de monitoreo detenido');
//     }, 15000);
//   }, 2000);
// }

// /**
//  * Función principal para ejecutar todos los ejemplos
//  */
// export function ejecutarTodosLosEjemplos() {
//   console.log('🎉 === DEMOSTRACIÓN COMPLETA DEL SISTEMA REACTIVO ===\n');
  
//   // Ejecutar ejemplos en secuencia con delays
//   ejemploInicializacion();
  
//   setTimeout(() => ejemploTwitterScraping(), 2000);
//   setTimeout(() => ejemploAnalisisSentimientos(), 5000);
//   setTimeout(() => ejemploNotificaciones(), 8000);
//   setTimeout(() => ejemploAutoOptimizacion(), 12000);
//   setTimeout(() => ejemploAnalisisPredictivo(), 18000);
//   setTimeout(() => ejemploWorkflowCompleto(), 25000);
//   setTimeout(() => ejemploMonitoreoTiempoReal(), 32000);
//   setTimeout(() => ejemploEstadisticasCentralizadas(), 45000);
  
//   // Resumen final
//   setTimeout(() => {
//     console.log('\n🎊 === DEMOSTRACIÓN COMPLETADA ===');
//     console.log('✅ Todos los servicios reactivos han sido probados exitosamente');
//     console.log('🚀 El sistema está listo para uso en producción');
//     console.log('📚 Consulta README.md para documentación detallada');
//   }, 65000);
// }

// // Ejemplo de uso individual
// // ejemploInicializacion();
// // ejemploTwitterScraping();
// // ejemploAnalisisSentimientos();

// // Para ejecutar todos los ejemplos
// // ejecutarTodosLosEjemplos();

# Advanced Scraping System - Sistema de Scraping Avanzado

## Resumen

Has implementado exitosamente un sistema de scraping avanzado que puede manejar 1000+ tweets sin errores de rate limiting (429). El sistema incluye:

- **Queue System con Redis**: Para procesamiento escalable en producción
- **Fallback Service**: Servicio simple en memoria para desarrollo/testing
- **WebSocket Progress**: Seguimiento en tiempo real del progreso
- **Batch Processing**: Procesamiento por lotes para evitar límites de la API
- **Rate Limiting**: Control inteligente de velocidad con delays adaptativos

## Arquitectura del Sistema

### Componentes Principales

1. **ScrapingQueueService** (Redis-based)
   - Procesamiento de trabajos con Bull Queue
   - Persistencia en Redis
   - Procesamiento concurrente (hasta 5 trabajos simultáneos)
   - Reintentos automáticos y recuperación de errores

2. **SimpleScrapingService** (Fallback)
   - Procesamiento en memoria para desarrollo
   - Mismo API que el servicio Redis
   - Procesamiento por lotes para simular comportamiento de queue

3. **ProgressWebSocketService**
   - Notificaciones en tiempo real vía Socket.IO
   - Broadcast de progreso a clientes suscritos
   - Gestión de conexiones y limpieza automática

4. **QueueManager**
   - Orchestrador central que conecta todos los servicios
   - Validación de parámetros de entrada
   - Estadísticas del sistema

## API Endpoints

### Crear Job de Scraping
```bash
POST /api/v1/scraping/advanced/job
Content-Type: application/json

{
  "type": "hashtag|user|search",
  "query": "consulta_a_buscar",
  "targetCount": 1000,
  "campaignId": "tu_campana_id",
  "priority": "high|medium|low",
  "options": {
    "maxTweets": 1000,
    "includeReplies": false,
    "includeRetweets": true
  }
}
```

### Obtener Progreso del Job
```bash
GET /api/v1/scraping/advanced/job/{jobId}
```

### Cancelar Job
```bash
POST /api/v1/scraping/advanced/job/{jobId}/cancel
```

### Listar Jobs del Usuario
```bash
GET /api/v1/scraping/advanced/jobs?status=running
```

### Estadísticas del Sistema
```bash
GET /api/v1/scraping/advanced/stats
```

## Configuración del Sistema

### Variables de Entorno

```env
# Para usar Redis (producción)
REDIS_URL=redis://localhost:6379

# Si no está configurado Redis, se usa el servicio simple automáticamente
```

### Inicialización del Servidor

El sistema se auto-configura al iniciar:

```javascript
// En server.ts
import { queueManager } from './services/queue/queue-manager.service';
import { progressWebSocketService } from './services/websocket/progress-websocket.service';

// El sistema detecta automáticamente si Redis está disponible
// y configura el servicio apropiado
```

## Uso Práctico

### Ejemplo 1: Scraping de 1000 Tweets por Hashtag

```bash
curl -X POST http://localhost:3000/api/v1/scraping/advanced/job \
  -H "Content-Type: application/json" \
  -d '{
    "type": "hashtag",
    "query": "javascript",
    "targetCount": 1000,
    "campaignId": "mi-campana-js",
    "priority": "high"
  }'
```

### Ejemplo 2: Seguimiento en Tiempo Real

```javascript
// Cliente WebSocket
import io from 'socket.io-client';

const socket = io('http://localhost:3000');

// Suscribirse a actualizaciones de progreso
socket.emit('subscribe-to-job', { jobId: 'job-id-aqui' });

// Escuchar actualizaciones
socket.on('job-progress', (data) => {
  console.log(`Progreso: ${data.percentage}%`);
  console.log(`Tweets recolectados: ${data.tweetsCollected}`);
  console.log(`Batch actual: ${data.currentBatch}/${data.totalBatches}`);
});

socket.on('job-completed', (data) => {
  console.log('¡Job completado!', data);
});
```

## Características de Rate Limiting

### Estrategias Implementadas

1. **Batch Processing**: Procesa en lotes de 10-50 tweets
2. **Adaptive Delays**: Delays dinámicos basados en respuestas de la API
3. **Exponential Backoff**: Incremento exponencial de delays en errores
4. **Concurrent Limiting**: Máximo 5 trabajos simultáneos
5. **Request Throttling**: Control de velocidad por minuto

### Tiempos Estimados

- **100 tweets**: ~2-3 minutos
- **500 tweets**: ~8-12 minutos  
- **1000 tweets**: ~15-25 minutos
- **5000 tweets**: ~1-2 horas

*Los tiempos varían según la disponibilidad de la API y la complejidad de las consultas.*

## Monitoreo y Debugging

### Logs del Sistema

El sistema genera logs detallados:

```bash
# Ver logs del servidor
tail -f logs/server.log

# Filtrar logs de scraping
grep "scraping" logs/server.log

# Ver errores específicos
grep "ERROR" logs/server.log | grep "scraping"
```

### Métricas Disponibles

- Trabajos pendientes, activos, completados, fallidos
- Throughput (tweets por segundo)
- Tiempo estimado de finalización
- Conexiones WebSocket activas
- Uso de memoria del sistema

## Resolución de Problemas

### Error 429 (Rate Limiting)
✅ **Solucionado**: El sistema maneja automáticamente con delays adaptativos

### Redis No Disponible
✅ **Solucionado**: Fallback automático al servicio simple

### Jobs Que No Progresan
```bash
# Verificar estadísticas
curl http://localhost:3000/api/v1/scraping/advanced/stats

# Verificar job específico
curl http://localhost:3000/api/v1/scraping/advanced/job/{jobId}
```

### Memoria Alta en Jobs Largos
El sistema limpia automáticamente jobs antiguos y gestiona memoria eficientemente.

## Escalabilidad

### Para Desarrollo
- Usa SimpleScrapingService automáticamente
- Sin dependencias externas
- Procesamiento inmediato para testing

### Para Producción
- Instala Redis: `docker run -d -p 6379:6379 redis:alpine`
- El sistema detecta y usa Redis automáticamente
- Procesamiento distribuido y persistente

## Próximos Pasos

1. **Configurar Redis** para usar el sistema completo en producción
2. **Implementar Frontend** para visualizar progreso en tiempo real
3. **Configurar Alertas** para jobs que fallan o toman mucho tiempo
4. **Scaling Horizontal** agregando más workers Redis

## Comandos Útiles

```bash
# Construir el proyecto
npm run build

# Iniciar servidor en desarrollo
npm run dev

# Iniciar servidor en producción
npm start

# Ejecutar tests
npm test

# Ver logs en tiempo real
npm run logs
```

¡El sistema está listo para manejar scraping masivo de tweets sin problemas de rate limiting! 🚀

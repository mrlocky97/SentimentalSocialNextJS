# 🚀 Ejemplos de Uso - Endpoints Avanzados con Análisis de Sentimiento

## 📋 Tabla de Contenidos
1. [Ejemplos Básicos](#ejemplos-básicos)
2. [Ejemplos Avanzados](#ejemplos-avanzados)
3. [Monitoreo de Progreso](#monitoreo-de-progreso)
4. [WebSocket en Tiempo Real](#websocket-en-tiempo-real)
5. [Gestión de Jobs](#gestión-de-jobs)
6. [Casos de Uso Reales](#casos-de-uso-reales)

---

## 📝 Ejemplos Básicos

### 1. Scraping de Hashtag con Análisis de Sentimiento

```bash
curl -X POST http://localhost:3001/api/v1/scraping/advanced/job \
  -H "Content-Type: application/json" \
  -d '{
    "type": "hashtag",
    "query": "inteligenciaartificial",
    "targetCount": 1000,
    "campaignId": "ai_research_2024",
    "analyzeSentiment": true,
    "priority": "high"
  }'
```

**Respuesta:**
```json
{
  "success": true,
  "jobId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "message": "Scraping job created successfully", 
  "estimatedTime": 300,
  "websocketUrl": "/socket.io/"
}
```

### 2. Scraping de Usuario sin Análisis de Sentimiento

```bash
curl -X POST http://localhost:3001/api/v1/scraping/advanced/job \
  -H "Content-Type: application/json" \
  -d '{
    "type": "user",
    "query": "elonmusk",
    "targetCount": 500,
    "campaignId": "elon_tweets_2024",
    "analyzeSentiment": false,
    "priority": "medium"
  }'
```

### 3. Búsqueda General con Opciones Avanzadas

```bash
curl -X POST http://localhost:3001/api/v1/scraping/advanced/job \
  -H "Content-Type: application/json" \
  -d '{
    "type": "search",
    "query": "cambio climático",
    "targetCount": 2000,
    "campaignId": "climate_analysis_2024",
    "analyzeSentiment": true,
    "priority": "urgent",
    "options": {
      "includeReplies": false,
      "includeRetweets": false,
      "language": "es",
      "maxAgeHours": 48
    }
  }'
```

---

## 🔬 Ejemplos Avanzados

### 4. Scraping Masivo para Investigación de Mercado

```bash
curl -X POST http://localhost:3001/api/v1/scraping/advanced/job \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "type": "hashtag",
    "query": "iPhone16",
    "targetCount": 10000,
    "campaignId": "iphone16_launch_sentiment",
    "analyzeSentiment": true,
    "priority": "urgent",
    "options": {
      "includeReplies": true,
      "includeRetweets": false,
      "language": "en",
      "maxAgeHours": 24
    }
  }'
```

### 5. Análisis de Competencia

```bash
curl -X POST http://localhost:3001/api/v1/scraping/advanced/job \
  -H "Content-Type: application/json" \
  -d '{
    "type": "search",
    "query": "Tesla vs BMW vs Mercedes",
    "targetCount": 5000,
    "campaignId": "auto_competition_2024",
    "analyzeSentiment": true,
    "priority": "high",
    "options": {
      "includeReplies": false,
      "language": "en"
    }
  }'
```

---

## 📊 Monitoreo de Progreso

### 6. Verificar Estado del Job

```bash
curl http://localhost:3001/api/v1/scraping/advanced/job/f47ac10b-58cc-4372-a567-0e02b2c3d479/progress
```

**Respuesta durante Scraping:**
```json
{
  "success": true,
  "progress": {
    "jobId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "current": 350,
    "total": 1000,
    "percentage": 35,
    "phase": "scraping",
    "currentBatch": 7,
    "totalBatches": 20,
    "tweetsCollected": 350,
    "sentimentAnalyzed": 0,
    "savedToDatabase": 0,
    "status": "running",
    "estimatedTimeRemaining": 180
  }
}
```

**Respuesta durante Análisis:**
```json
{
  "success": true,
  "progress": {
    "jobId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "current": 1000,
    "total": 1000,
    "percentage": 85,
    "phase": "analyzing",
    "currentBatch": 20,
    "totalBatches": 20,
    "tweetsCollected": 1000,
    "sentimentAnalyzed": 750,
    "savedToDatabase": 0,
    "status": "running",
    "estimatedTimeRemaining": 45
  }
}
```

**Respuesta Completada:**
```json
{
  "success": true,
  "progress": {
    "jobId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "current": 1000,
    "total": 1000,
    "percentage": 100,
    "phase": "completed",
    "currentBatch": 20,
    "totalBatches": 20,
    "tweetsCollected": 1000,
    "sentimentAnalyzed": 1000,
    "savedToDatabase": 1000,
    "status": "completed",
    "completedAt": "2024-01-15T10:45:30Z"
  }
}
```

---

## 🔌 WebSocket en Tiempo Real

### 7. Cliente JavaScript para Progreso Live

```javascript
// Conectar al WebSocket
const socket = io('http://localhost:3001');

// Función para iniciar scraping y monitorear
async function startScrapingWithProgress() {
  // 1. Crear el job
  const response = await fetch('http://localhost:3001/api/v1/scraping/advanced/job', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      type: 'hashtag',
      query: 'tecnologia',
      targetCount: 3000,
      campaignId: 'tech_monitoring_2024',
      analyzeSentiment: true,
      priority: 'high'
    })
  });

  const data = await response.json();
  const jobId = data.jobId;

  console.log('Job iniciado:', jobId);

  // 2. Suscribirse a updates del job
  socket.emit('subscribe', { jobId });

  // 3. Escuchar progreso en tiempo real
  socket.on('progress', (progressData) => {
    const { progress } = progressData;
    
    console.log(`🔄 Fase: ${progress.phase}`);
    console.log(`📊 Progreso: ${progress.percentage}%`);
    console.log(`📥 Tweets: ${progress.tweetsCollected}/${progress.total}`);
    
    if (progress.phase === 'analyzing') {
      console.log(`🧠 Analizados: ${progress.sentimentAnalyzed}`);
    }
    
    if (progress.phase === 'saving') {
      console.log(`💾 Guardados: ${progress.savedToDatabase}`);
    }
    
    if (progress.phase === 'completed') {
      console.log('✅ Proceso completado!');
      socket.emit('unsubscribe', { jobId });
    }
  });

  // 4. Manejar errores
  socket.on('error', (error) => {
    console.error('❌ Error:', error);
  });
}

// Ejecutar
startScrapingWithProgress();
```

### 8. Cliente React Component

```jsx
import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

const ScrapingDashboard = () => {
  const [jobs, setJobs] = useState([]);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Conectar WebSocket
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    return () => newSocket.close();
  }, []);

  const startScraping = async (config) => {
    try {
      const response = await fetch('/api/v1/scraping/advanced/job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      const data = await response.json();
      const jobId = data.jobId;

      // Agregar job a la lista
      setJobs(prev => [...prev, {
        jobId,
        ...config,
        status: 'iniciado',
        progress: 0
      }]);

      // Suscribirse a updates
      socket.emit('subscribe', { jobId });

      // Escuchar progreso
      socket.on('progress', (progressData) => {
        setJobs(prev => prev.map(job => 
          job.jobId === progressData.progress.jobId 
            ? { ...job, progress: progressData.progress }
            : job
        ));
      });

    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div className="scraping-dashboard">
      <h2>Dashboard de Scraping Avanzado</h2>
      
      {/* Formulario para nuevo job */}
      <button onClick={() => startScraping({
        type: 'hashtag',
        query: 'innovation',
        targetCount: 1000,
        campaignId: 'innovation_tracker',
        analyzeSentiment: true
      })}>
        Iniciar Scraping de #innovation
      </button>

      {/* Lista de jobs activos */}
      <div className="jobs-list">
        {jobs.map(job => (
          <div key={job.jobId} className="job-card">
            <h3>{job.query} ({job.type})</h3>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${job.progress?.percentage || 0}%` }}
              ></div>
            </div>
            <p>Fase: {job.progress?.phase || 'iniciando'}</p>
            <p>Progreso: {job.progress?.percentage || 0}%</p>
            {job.progress?.phase === 'analyzing' && (
              <p>Analizando sentimiento: {job.progress.sentimentAnalyzed}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ScrapingDashboard;
```

---

## 🔧 Gestión de Jobs

### 9. Listar Jobs del Usuario

```bash
curl "http://localhost:3001/api/v1/scraping/advanced/jobs?userId=user123&status=running"
```

**Respuesta:**
```json
{
  "success": true,
  "jobs": [
    {
      "jobId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "type": "hashtag",
      "query": "inteligenciaartificial",
      "status": "running",
      "progress": {
        "percentage": 65,
        "phase": "analyzing",
        "tweetsCollected": 1000,
        "sentimentAnalyzed": 650
      }
    }
  ],
  "total": 1
}
```

### 10. Cancelar Job

```bash
curl -X POST http://localhost:3001/api/v1/scraping/advanced/job/f47ac10b-58cc-4372-a567-0e02b2c3d479/cancel \
  -H "Content-Type: application/json" \
  -d '{"userId": "user123"}'
```

### 11. Estadísticas del Sistema

```bash
curl http://localhost:3001/api/v1/scraping/advanced/stats
```

**Respuesta:**
```json
{
  "success": true,
  "stats": {
    "queueStats": {
      "waiting": 3,
      "active": 5,
      "completed": 127,
      "failed": 2,
      "total": 137
    },
    "connectionStats": {
      "totalConnections": 12,
      "totalJobSubscriptions": 8,
      "activeJobs": 5
    },
    "systemHealth": {
      "uptime": 86400,
      "memoryUsage": {
        "rss": 145678336,
        "heapTotal": 89123840,
        "heapUsed": 67234816
      }
    }
  }
}
```

---

## 🎯 Casos de Uso Reales

### 12. Monitoreo de Marca en Tiempo Real

```javascript
// Script para monitoreo continuo de marca
const brandMonitoring = async () => {
  const brands = ['apple', 'samsung', 'google', 'microsoft'];
  
  for (const brand of brands) {
    await fetch('http://localhost:3001/api/v1/scraping/advanced/job', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'search',
        query: brand,
        targetCount: 2000,
        campaignId: `brand_monitoring_${brand}_${new Date().toISOString().split('T')[0]}`,
        analyzeSentiment: true,
        priority: 'high',
        options: {
          includeReplies: false,
          language: 'en',
          maxAgeHours: 6
        }
      })
    });
    
    // Esperar 1 segundo entre requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
};
```

### 13. Análisis de Eventos en Vivo

```bash
# Scraping durante evento Apple Keynote
curl -X POST http://localhost:3001/api/v1/scraping/advanced/job \
  -H "Content-Type: application/json" \
  -d '{
    "type": "hashtag",
    "query": "AppleKeynote",
    "targetCount": 8000,
    "campaignId": "apple_keynote_sep_2024",
    "analyzeSentiment": true,
    "priority": "urgent",
    "options": {
      "includeReplies": true,
      "includeRetweets": false,
      "maxAgeHours": 2
    }
  }'
```

### 14. Investigación Académica

```bash
# Análisis de sentimiento sobre vacunas
curl -X POST http://localhost:3001/api/v1/scraping/advanced/job \
  -H "Content-Type: application/json" \
  -d '{
    "type": "search",
    "query": "vaccine effectiveness study",
    "targetCount": 5000,
    "campaignId": "vaccine_research_2024",
    "analyzeSentiment": true,
    "priority": "medium",
    "options": {
      "includeReplies": false,
      "language": "en",
      "maxAgeHours": 168
    }
  }'
```

---

## 📋 Plantillas de Request

### 15. Plantilla Básica

```json
{
  "type": "hashtag|user|search",
  "query": "tu_busqueda",
  "targetCount": 1000,
  "campaignId": "tu_campana_2024",
  "analyzeSentiment": true,
  "priority": "medium"
}
```

### 16. Plantilla Completa

```json
{
  "type": "hashtag",
  "query": "sustentabilidad",
  "targetCount": 3000,
  "campaignId": "sustainability_analysis_2024",
  "analyzeSentiment": true,
  "priority": "high",
  "options": {
    "includeReplies": false,
    "includeRetweets": false,
    "maxAgeHours": 24,
    "language": "es"
  }
}
```

---

## 🚨 Manejo de Errores

### 17. Responses de Error Comunes

**Job no encontrado:**
```json
{
  "success": false,
  "error": "Job not found"
}
```

**Parámetros faltantes:**
```json
{
  "success": false,
  "error": "Missing required fields: type, query, targetCount, campaignId"
}
```

**Rate limit excedido:**
```json
{
  "success": false,
  "error": "Rate limit exceeded. Please try again later."
}
```

---

## ⚡ Tips de Rendimiento

### 18. Configuraciones Optimizadas

```javascript
// Para análisis rápido (menos tweets, más velocidad)
const quickAnalysis = {
  targetCount: 500,
  priority: "urgent",
  options: {
    includeReplies: false,
    includeRetweets: false
  }
};

// Para análisis profundo (más tweets, más tiempo)
const deepAnalysis = {
  targetCount: 10000,
  priority: "medium",
  options: {
    includeReplies: true,
    includeRetweets: false,
    maxAgeHours: 72
  }
};

// Para monitoreo continuo
const continuousMonitoring = {
  targetCount: 2000,
  priority: "high",
  options: {
    maxAgeHours: 6,
    includeReplies: false
  }
};
```

---

¡Estos ejemplos te muestran cómo aprovechar al máximo los nuevos endpoints avanzados con análisis de sentimiento! 🚀
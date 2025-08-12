# 📊 Dashboard APIs para Frontend Externo

## 🎯 Descripción General

Conjunto de APIs RESTful optimizadas para el consumo de un frontend externo que implementará el dashboard de observabilidad de SentimentalSocial.

## 🌐 Endpoints Disponibles

### Base URL

```
http://localhost:3001/api/v1/dashboard
```

---

## 📡 APIs Principales

### 1. **GET `/metrics`** - Métricas Actuales

Obtiene métricas en tiempo real del sistema.

**Respuesta:**

```json
{
  "success": true,
  "data": {
    "timestamp": "2025-08-12T17:30:00.000Z",
    "system": {
      "health": "healthy",
      "memory": {
        "used": 156672512,
        "total": 2147483648,
        "percentage": 7.3
      },
      "cpu": {
        "usage": 12.5
      },
      "uptime": 3600
    },
    "http": {
      "totalRequests": 1247,
      "requestsPerMinute": 23,
      "averageResponseTime": 150,
      "errorRate": 0.8
    },
    "cache": {
      "hitRate": 94.2,
      "hits": 1174,
      "misses": 73,
      "size": 245
    },
    "sentiment": {
      "totalAnalyses": 892,
      "averageConfidence": 85.5,
      "averageTime": 120,
      "analysesPerMinute": 8
    }
  },
  "responseTime": 12,
  "timestamp": "2025-08-12T17:30:00.000Z"
}
```

---

### 2. **GET `/historical?timeRange=1h|6h|24h`** - Datos Históricos

Obtiene datos históricos para gráficos temporales.

**Parámetros:**

- `timeRange`: `1h`, `6h`, o `24h` (por defecto: `1h`)

**Respuesta:**

```json
{
  "success": true,
  "data": {
    "timestamps": ["2025-08-12T16:30:00.000Z", "2025-08-12T16:31:00.000Z", "..."],
    "series": {
      "requests": [100, 102, 98, 105],
      "responseTime": [150, 148, 152, 149],
      "memoryUsage": [7.2, 7.3, 7.1, 7.4],
      "cpuUsage": [12.1, 12.5, 11.8, 12.9],
      "cacheHitRate": [94.0, 94.2, 93.8, 94.5],
      "sentimentAnalyses": [45, 47, 44, 48]
    }
  },
  "timeRange": "1h",
  "responseTime": 8,
  "timestamp": "2025-08-12T17:30:00.000Z"
}
```

---

### 3. **GET `/summary`** - Resumen de Estado

Obtiene un resumen ejecutivo del estado del sistema.

**Respuesta:**

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "uptime": 3600,
    "totalRequests": 1247,
    "totalSentimentAnalyses": 892,
    "averageResponseTime": 150,
    "systemLoad": 12.5,
    "lastUpdated": "2025-08-12T17:30:00.000Z"
  },
  "responseTime": 5,
  "timestamp": "2025-08-12T17:30:00.000Z"
}
```

---

### 4. **GET `/stream`** - Stream en Tiempo Real (SSE)

Server-Sent Events para actualizaciones automáticas cada 5 segundos.

**Uso en JavaScript:**

```javascript
const eventSource = new EventSource('/api/v1/dashboard/stream');

eventSource.onmessage = function (event) {
  const metrics = JSON.parse(event.data);
  // Actualizar UI con métricas en tiempo real
  updateDashboard(metrics);
};

eventSource.onerror = function (error) {
  console.error('SSE error:', error);
};
```

---

### 5. **GET `/info`** - Información de la API

Obtiene documentación y ejemplos de uso de la API.

---

## 🚀 Ejemplos de Uso

### Fetch con JavaScript Vanilla

```javascript
// Obtener métricas actuales
async function getCurrentMetrics() {
  try {
    const response = await fetch('/api/v1/dashboard/metrics');
    const data = await response.json();

    if (data.success) {
      console.log('Métricas actuales:', data.data);
      return data.data;
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Obtener datos históricos para gráficos
async function getHistoricalData(timeRange = '1h') {
  try {
    const response = await fetch(`/api/v1/dashboard/historical?timeRange=${timeRange}`);
    const data = await response.json();

    if (data.success) {
      // Los datos están listos para Chart.js
      const chartData = {
        labels: data.data.timestamps,
        datasets: [
          {
            label: 'Requests',
            data: data.data.series.requests,
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.1)',
          },
          {
            label: 'Response Time (ms)',
            data: data.data.series.responseTime,
            borderColor: 'rgb(255, 99, 132)',
            backgroundColor: 'rgba(255, 99, 132, 0.1)',
          },
        ],
      };

      return chartData;
    }
  } catch (error) {
    console.error('Error:', error);
  }
}
```

### React Hook Personalizado

```javascript
import { useState, useEffect } from 'react';

function useDashboardMetrics() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const eventSource = new EventSource('/api/v1/dashboard/stream');

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setMetrics(data);
      setLoading(false);
    };

    eventSource.onerror = (error) => {
      setError(error);
      setLoading(false);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return { metrics, loading, error };
}

// Uso en componente
function Dashboard() {
  const { metrics, loading, error } = useDashboardMetrics();

  if (loading) return <div>Cargando métricas...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>Dashboard</h1>
      <div>Estado: {metrics.system.health}</div>
      <div>Requests: {metrics.http.totalRequests}</div>
      <div>Memoria: {metrics.system.memory.percentage}%</div>
    </div>
  );
}
```

### Chart.js Integration

```javascript
async function createRequestsChart() {
  const ctx = document.getElementById('requestsChart').getContext('2d');
  const data = await getHistoricalData('6h');

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.timestamps.map((ts) => new Date(ts).toLocaleTimeString()),
      datasets: [
        {
          label: 'Requests per Minute',
          data: data.series.requests,
          borderColor: 'rgb(54, 162, 235)',
          backgroundColor: 'rgba(54, 162, 235, 0.1)',
          tension: 0.4,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'HTTP Requests en Tiempo Real',
        },
      },
      scales: {
        y: {
          beginAtZero: true,
        },
      },
    },
  });
}
```

## 🔧 Estados de Salud del Sistema

| Estado     | Descripción                                | Color       |
| ---------- | ------------------------------------------ | ----------- |
| `healthy`  | Sistema funcionando normalmente            | 🟢 Verde    |
| `warning`  | Uso alto de recursos (>75% memoria/CPU)    | 🟡 Amarillo |
| `critical` | Uso crítico de recursos (>90% memoria/CPU) | 🔴 Rojo     |

## 📝 Notas de Implementación

1. **CORS**: Las APIs tienen CORS habilitado para frontends externos
2. **Rate Limiting**: Aplicado para prevenir abuso
3. **Cache**: Responses cacheados por 30 segundos para optimizar performance
4. **Error Handling**: Manejo robusto de errores con logging estructurado
5. **SSE**: Conexiones automáticamente cerradas en caso de error
6. **Históricos**: Datos mantenidos por 100 puntos (aprox. 50 minutos con intervalos de 30s)

## 🎯 Recomendaciones para el Frontend

1. **Usa SSE** para actualizaciones en tiempo real en lugar de polling
2. **Implementa fallbacks** para cuando SSE no esté disponible
3. **Cachea datos históricos** para evitar requests innecesarios
4. **Maneja estados de loading** para mejor UX
5. **Implementa retry logic** para requests fallidos
6. **Usa Chart.js o similar** - los datos están optimizados para estas librerías

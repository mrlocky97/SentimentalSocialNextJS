# Guía de Implementación Frontend - Sistema de Scraping Avanzado

## 🎯 Resumen del Sistema

Has implementado un sistema de scraping avanzado que puede manejar **1000+ tweets** sin errores de rate limiting. El sistema incluye:

- **API REST** para gestión de trabajos
- **WebSocket** para progreso en tiempo real  
- **Queue System** con Redis o fallback simple
- **Batch Processing** para evitar límites de API

## 📡 API Endpoints Disponibles

### 1. **Crear Job de Scraping**
```bash
POST /api/v1/scraping/advanced/job
```

**Request Body:**
```json
{
  "type": "hashtag|user|search",
  "query": "javascript",
  "targetCount": 1000,
  "campaignId": "mi-campana-2024",
  "priority": "high|medium|low",
  "options": {
    "includeReplies": false,
    "includeRetweets": true,
    "maxTweets": 1000
  }
}
```

**Response:**
```json
{
  "success": true,
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Scraping job created successfully",
  "estimatedTime": 900,
  "websocketUrl": "/socket.io/"
}
```

### 2. **Obtener Progreso del Job**
```bash
GET /api/v1/scraping/advanced/job/{jobId}
```

**Response:**
```json
{
  "success": true,
  "progress": {
    "jobId": "550e8400-e29b-41d4-a716-446655440000",
    "current": 450,
    "total": 1000,
    "percentage": 45.0,
    "currentBatch": 18,
    "totalBatches": 40,
    "status": "running",
    "tweetsCollected": 450,
    "estimatedTimeRemaining": 420,
    "errors": [],
    "throughput": 2.5
  }
}
```

### 3. **Listar Jobs del Usuario**
```bash
GET /api/v1/scraping/advanced/jobs?status=running
```

### 4. **Cancelar Job**
```bash
POST /api/v1/scraping/advanced/job/{jobId}/cancel
```

### 5. **Estadísticas del Sistema**
```bash
GET /api/v1/scraping/advanced/stats
```

## 🔧 Implementación Frontend

### 1. **Servicio Frontend (React/Next.js)**

```typescript
// services/advancedScrapingService.ts
import io, { Socket } from 'socket.io-client';

export interface ScrapingJobRequest {
  type: 'hashtag' | 'user' | 'search';
  query: string;
  targetCount: number;
  campaignId: string;
  priority?: 'high' | 'medium' | 'low';
  options?: {
    includeReplies?: boolean;
    includeRetweets?: boolean;
    maxTweets?: number;
  };
}

export interface JobProgress {
  jobId: string;
  current: number;
  total: number;
  percentage: number;
  currentBatch: number;
  totalBatches: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  tweetsCollected: number;
  estimatedTimeRemaining?: number;
  errors: string[];
  throughput?: number;
}

class AdvancedScrapingService {
  private socket: Socket | null = null;
  private baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  
  /**
   * Conectar a WebSocket para recibir actualizaciones en tiempo real
   */
  connectWebSocket(): Promise<Socket> {
    return new Promise((resolve, reject) => {
      this.socket = io(this.baseUrl);
      
      this.socket.on('connect', () => {
        console.log('✅ Conectado a WebSocket');
        resolve(this.socket!);
      });
      
      this.socket.on('connect_error', (error) => {
        console.error('❌ Error de conexión WebSocket:', error);
        reject(error);
      });
    });
  }

  /**
   * Crear un nuevo job de scraping
   */
  async createScrapingJob(jobData: ScrapingJobRequest): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/v1/scraping/advanced/job`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Agregar headers de autenticación si es necesario
        // 'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(jobData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.jobId;
  }

  /**
   * Suscribirse a actualizaciones de progreso de un job
   */
  subscribeToJobProgress(
    jobId: string,
    onProgress: (progress: JobProgress) => void,
    onCompleted: (result: any) => void,
    onFailed: (error: string) => void
  ): void {
    if (!this.socket) {
      throw new Error('WebSocket no conectado. Llama a connectWebSocket() primero.');
    }

    // Suscribirse al job específico
    this.socket.emit('subscribe-to-job', { jobId });

    // Escuchar eventos de progreso
    this.socket.on('job-progress', (data: JobProgress) => {
      if (data.jobId === jobId) {
        onProgress(data);
      }
    });

    this.socket.on('job-completed', (data: any) => {
      if (data.jobId === jobId) {
        onCompleted(data);
      }
    });

    this.socket.on('job-failed', (data: any) => {
      if (data.jobId === jobId) {
        onFailed(data.error);
      }
    });
  }

  /**
   * Obtener progreso actual de un job
   */
  async getJobProgress(jobId: string): Promise<JobProgress> {
    const response = await fetch(`${this.baseUrl}/api/v1/scraping/advanced/job/${jobId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.progress;
  }

  /**
   * Cancelar un job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/api/v1/scraping/advanced/job/${jobId}/cancel`, {
      method: 'POST',
    });

    return response.ok;
  }

  /**
   * Obtener lista de jobs del usuario
   */
  async getUserJobs(status?: string): Promise<JobProgress[]> {
    const url = new URL(`${this.baseUrl}/api/v1/scraping/advanced/jobs`);
    if (status) url.searchParams.set('status', status);

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.jobs;
  }

  /**
   * Desconectar WebSocket
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const advancedScrapingService = new AdvancedScrapingService();
```

### 2. **Hook de React para Scraping**

```typescript
// hooks/useAdvancedScraping.ts
import { useState, useEffect, useCallback } from 'react';
import { advancedScrapingService, JobProgress, ScrapingJobRequest } from '../services/advancedScrapingService';

export const useAdvancedScraping = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [activeJobs, setActiveJobs] = useState<Map<string, JobProgress>>(new Map());
  const [isCreatingJob, setIsCreatingJob] = useState(false);

  // Conectar a WebSocket al montar el componente
  useEffect(() => {
    const connectWebSocket = async () => {
      try {
        await advancedScrapingService.connectWebSocket();
        setIsConnected(true);
      } catch (error) {
        console.error('Error conectando WebSocket:', error);
        setIsConnected(false);
      }
    };

    connectWebSocket();

    // Cleanup al desmontar
    return () => {
      advancedScrapingService.disconnect();
      setIsConnected(false);
    };
  }, []);

  /**
   * Crear un nuevo job de scraping
   */
  const createJob = useCallback(async (jobData: ScrapingJobRequest): Promise<string> => {
    setIsCreatingJob(true);
    
    try {
      const jobId = await advancedScrapingService.createScrapingJob(jobData);
      
      // Suscribirse inmediatamente a las actualizaciones
      advancedScrapingService.subscribeToJobProgress(
        jobId,
        (progress) => {
          setActiveJobs(prev => new Map(prev.set(jobId, progress)));
        },
        (result) => {
          console.log('Job completado:', result);
          // Opcional: remover de trabajos activos después de un tiempo
          setTimeout(() => {
            setActiveJobs(prev => {
              const newMap = new Map(prev);
              newMap.delete(jobId);
              return newMap;
            });
          }, 10000); // Remover después de 10 segundos
        },
        (error) => {
          console.error('Job falló:', error);
        }
      );

      return jobId;
    } finally {
      setIsCreatingJob(false);
    }
  }, []);

  /**
   * Cancelar un job
   */
  const cancelJob = useCallback(async (jobId: string): Promise<boolean> => {
    const success = await advancedScrapingService.cancelJob(jobId);
    if (success) {
      setActiveJobs(prev => {
        const newMap = new Map(prev);
        newMap.delete(jobId);
        return newMap;
      });
    }
    return success;
  }, []);

  return {
    isConnected,
    activeJobs: Array.from(activeJobs.values()),
    isCreatingJob,
    createJob,
    cancelJob,
  };
};
```

### 3. **Componente de UI para Scraping**

```tsx
// components/AdvancedScrapingPanel.tsx
import React, { useState } from 'react';
import { useAdvancedScraping } from '../hooks/useAdvancedScraping';

export const AdvancedScrapingPanel: React.FC = () => {
  const { isConnected, activeJobs, isCreatingJob, createJob, cancelJob } = useAdvancedScraping();
  
  const [formData, setFormData] = useState({
    type: 'hashtag' as 'hashtag' | 'user' | 'search',
    query: '',
    targetCount: 100,
    campaignId: '',
    priority: 'medium' as 'high' | 'medium' | 'low',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const jobId = await createJob({
        ...formData,
        options: {
          includeReplies: false,
          includeRetweets: true,
        },
      });
      
      console.log('Job creado:', jobId);
      
      // Limpiar formulario
      setFormData(prev => ({
        ...prev,
        query: '',
        campaignId: '',
      }));
    } catch (error) {
      console.error('Error creando job:', error);
      alert('Error al crear el trabajo de scraping');
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Estado de Conexión */}
      <div className="flex items-center space-x-2">
        <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
        <span className="text-sm">
          {isConnected ? 'Conectado en tiempo real' : 'Desconectado'}
        </span>
      </div>

      {/* Formulario de Creación */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Crear Job de Scraping Avanzado</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tipo</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                className="w-full border rounded px-3 py-2"
              >
                <option value="hashtag">Hashtag</option>
                <option value="user">Usuario</option>
                <option value="search">Búsqueda</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Consulta</label>
              <input
                type="text"
                value={formData.query}
                onChange={(e) => setFormData(prev => ({ ...prev, query: e.target.value }))}
                placeholder="javascript, @username, o consulta de búsqueda"
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Cantidad Objetivo</label>
              <input
                type="number"
                value={formData.targetCount}
                onChange={(e) => setFormData(prev => ({ ...prev, targetCount: parseInt(e.target.value) }))}
                min="1"
                max="10000"
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Prioridad</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
                className="w-full border rounded px-3 py-2"
              >
                <option value="high">Alta</option>
                <option value="medium">Media</option>
                <option value="low">Baja</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">ID de Campaña</label>
              <input
                type="text"
                value={formData.campaignId}
                onChange={(e) => setFormData(prev => ({ ...prev, campaignId: e.target.value }))}
                placeholder="mi-campana-2024"
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isCreatingJob || !isConnected}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isCreatingJob ? 'Creando...' : 'Crear Job de Scraping'}
          </button>
        </form>
      </div>

      {/* Lista de Jobs Activos */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold mb-4">Jobs Activos ({activeJobs.length})</h3>
        
        {activeJobs.length === 0 ? (
          <p className="text-gray-500">No hay trabajos activos</p>
        ) : (
          <div className="space-y-4">
            {activeJobs.map((job) => (
              <div key={job.jobId} className="border rounded p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-medium">Job: {job.jobId.slice(-8)}</h4>
                    <p className="text-sm text-gray-600">
                      Estado: <span className={`capitalize ${
                        job.status === 'running' ? 'text-blue-600' :
                        job.status === 'completed' ? 'text-green-600' :
                        job.status === 'failed' ? 'text-red-600' :
                        'text-yellow-600'
                      }`}>{job.status}</span>
                    </p>
                  </div>
                  
                  {job.status === 'running' && (
                    <button
                      onClick={() => cancelJob(job.jobId)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Cancelar
                    </button>
                  )}
                </div>

                {/* Barra de Progreso */}
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${job.percentage}%` }}
                  ></div>
                </div>

                {/* Estadísticas */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Progreso:</span>
                    <p className="font-medium">{job.percentage.toFixed(1)}%</p>
                  </div>
                  
                  <div>
                    <span className="text-gray-600">Tweets:</span>
                    <p className="font-medium">{job.tweetsCollected}/{job.total}</p>
                  </div>
                  
                  <div>
                    <span className="text-gray-600">Batch:</span>
                    <p className="font-medium">{job.currentBatch}/{job.totalBatches}</p>
                  </div>
                  
                  {job.estimatedTimeRemaining && (
                    <div>
                      <span className="text-gray-600">ETA:</span>
                      <p className="font-medium">{formatTime(Math.round(job.estimatedTimeRemaining))}</p>
                    </div>
                  )}
                </div>

                {/* Errores */}
                {job.errors.length > 0 && (
                  <div className="mt-2">
                    <span className="text-red-600 text-sm">Errores recientes:</span>
                    <ul className="text-sm text-red-600 ml-4">
                      {job.errors.slice(-3).map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
```

## 🚀 Características Principales

### ✅ **Capacidades del Sistema:**
- **Scraping masivo**: Hasta 10,000 tweets por job
- **Progreso en tiempo real**: WebSocket para actualizaciones instantáneas
- **Rate limiting inteligente**: Evita errores 429 automáticamente
- **Batch processing**: Procesa en lotes para mejor rendimiento
- **Fallback robusto**: Funciona con o sin Redis
- **Multi-usuario**: Soporte para múltiples usuarios simultáneos

### 📊 **Métricas en Tiempo Real:**
- Porcentaje de progreso
- Tweets recolectados vs objetivo
- Batch actual vs total de batches
- Tiempo estimado de finalización
- Throughput (tweets por segundo)
- Lista de errores

### 🎯 **Casos de Uso:**
1. **Análisis de hashtags trending**: `#javascript`, `#AI`, etc.
2. **Monitoreo de usuarios**: `@username` específicos
3. **Investigación de mercado**: Búsquedas por palabras clave
4. **Análisis de sentimientos**: Grandes volúmenes de datos
5. **Estudios académicos**: Datasets para investigación

## 📝 **Próximos Pasos de Implementación:**

1. **Instalar dependencias frontend**:
```bash
npm install socket.io-client
```

2. **Configurar variables de entorno**:
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

3. **Integrar los componentes** en tu aplicación existente

4. **Personalizar el diseño** según tu UI/UX

5. **Agregar autenticación** si es necesario

¿Te gustaría que implemente alguna funcionalidad específica o necesitas ayuda con la integración en alguna parte particular de tu frontend?

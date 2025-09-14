# Solución al Problema de Timeout en Frontend

## 🚨 **Problema Identificado**

El frontend Angular está experimentando errores de timeout al hacer scraping de más de 50 tweets:

```
🔥 Backend API Error [POST http://localhost:3001/api/v1/scraping/hashtag]: TimeoutErrorImpl
Timeout has occurred
```

**Causa:** El timeout del frontend está configurado muy bajo (probablemente 30-60 segundos) para operaciones de scraping que pueden tomar varios minutos.

---

## 🎯 **Soluciones Implementadas**

### **1. Backend: Progreso en Tiempo Real (✅ Completado)**

He implementado un sistema de progreso en tiempo real que permite al frontend mostrar el avance del scraping sin timeouts:

#### **Servicio de Progreso** (`src/services/scraping-progress.service.ts`)
```typescript
export interface ScrapingProgress {
  campaignId: string;
  totalTweets: number;
  scrapedTweets: number;
  currentPhase: 'initializing' | 'scraping' | 'analyzing' | 'completed' | 'error';
  message: string;
  percentage: number;
  timeElapsed: number;
  estimatedTimeRemaining?: number;
}
```

#### **Integración en Twitter Scraper** (✅ Completado)
- Actualizaciones de progreso cada 10 tweets
- Estimación de tiempo restante
- Fases de progreso: inicialización → scraping → análisis → completado

---

## 🔧 **Soluciones para el Frontend**

### **Opción A: Timeout Dinámico (Recomendado)**

En tu `backend-api.service.ts` del frontend:

```typescript
import { timeout } from 'rxjs/operators';

class BackendApiService {
  
  // Timeout dinámico basado en el número de tweets
  private getTimeoutForScraping(maxTweets: number): number {
    if (maxTweets <= 50) return 60000;   // 1 minuto
    if (maxTweets <= 200) return 180000; // 3 minutos  
    if (maxTweets <= 500) return 300000; // 5 minutos
    return 600000; // 10 minutos para 1000+ tweets
  }

  scrapeHashtag(data: any): Observable<any> {
    const timeoutMs = this.getTimeoutForScraping(data.maxTweets || 100);
    
    return this.http.post(`${this.apiUrl}/scraping/hashtag`, data)
      .pipe(
        timeout(timeoutMs),
        retry(2),
        catchError(this.handleError)
      );
  }
}
```

### **Opción B: WebSocket + Respuesta Inmediata (Mejor UX)**

```typescript
// 1. El endpoint devuelve inmediatamente el campaign ID
scrapeHashtag(data: any): Observable<any> {
  return this.http.post(`${this.apiUrl}/scraping/hashtag/start`, data)
    .pipe(
      timeout(30000), // Solo 30s para iniciar
      map(response => ({
        ...response,
        isAsync: true // Indica que el scraping continúa en background
      }))
    );
}

// 2. WebSocket para recibir progreso en tiempo real
subscribeToScrapingProgress(campaignId: string): Observable<ScrapingProgress> {
  return this.socketService.listen(`scraping-progress-${campaignId}`);
}
```

---

## 📦 **Implementación Completa**

### **1. WebSocket Server Setup**

En tu `server.ts` principal:

```typescript
import { Server } from 'socket.io';
import { scrapingProgressService } from './services/scraping-progress.service';

// Configurar WebSocket
const io = new Server(server, {
  cors: { origin: "http://localhost:4200" }
});

scrapingProgressService.initialize(io);

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('join-campaign', (campaignId: string) => {
    socket.join(`campaign-${campaignId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});
```

### **2. Endpoint Asíncrono**

En tu controlador de scraping:

```typescript
// POST /api/v1/scraping/hashtag/async
export const scrapHashtagAsync = async (req: Request, res: Response) => {
  try {
    const { hashtag, maxTweets = 100, ...otherOptions } = req.body;
    
    // Crear campaña inmediatamente
    const campaign = await campaignService.create({
      ...req.body,
      status: 'processing'
    });

    // Responder inmediatamente con el ID
    res.json({
      success: true,
      campaignId: campaign._id,
      message: 'Scraping started',
      estimatedDuration: Math.ceil(maxTweets / 10) // Estimación en segundos
    });

    // Procesar en background
    processScrapingInBackground(campaign._id, hashtag, {
      ...otherOptions,
      maxTweets,
      campaignId: campaign._id
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

async function processScrapingInBackground(campaignId: string, hashtag: string, options: any) {
  try {
    const scraper = new TwitterRealScraperService();
    const result = await scraper.scrapeByHashtag(hashtag, options);
    
    // Marcar como completado
    await campaignService.updateStatus(campaignId, 'completed', result);
    scrapingProgressService.completeProgress(campaignId);
    
  } catch (error) {
    await campaignService.updateStatus(campaignId, 'error', { error: error.message });
    scrapingProgressService.errorProgress(campaignId, error.message);
  }
}
```

### **3. Frontend Angular**

```typescript
// Service
export class ScrapingService {
  constructor(
    private http: HttpClient,
    private socketService: SocketService
  ) {}

  async startHashtagScraping(data: any): Promise<{campaignId: string, progress$: Observable<ScrapingProgress>}> {
    // Iniciar scraping
    const response = await this.http.post<any>(`${this.apiUrl}/scraping/hashtag/async`, data).toPromise();
    
    // Suscribirse al progreso
    const progress$ = this.socketService.listen<ScrapingProgress>(`scraping-progress-${response.campaignId}`);
    
    return {
      campaignId: response.campaignId,
      progress$
    };
  }
}

// Component
export class CampaignComponent {
  async onCreateCampaign() {
    try {
      this.loading = true;
      
      const { campaignId, progress$ } = await this.scrapingService.startHashtagScraping(this.formData);
      
      // Mostrar progreso en tiempo real
      progress$.subscribe(progress => {
        this.scrapingProgress = progress;
        this.progressPercentage = progress.percentage;
        this.progressMessage = progress.message;
        
        if (progress.currentPhase === 'completed') {
          this.onScrapingCompleted(campaignId);
        } else if (progress.currentPhase === 'error') {
          this.onScrapingError(progress.message);
        }
      });
      
    } catch (error) {
      this.handleError(error);
    } finally {
      this.loading = false;
    }
  }
}
```

---

## ⚡ **Solución Rápida (15 minutos)**

Si quieres una solución inmediata sin WebSockets:

```typescript
// En tu backend-api.service.ts del frontend
scrapeHashtag(data: any): Observable<any> {
  const maxTweets = data.maxTweets || 100;
  const timeoutMs = Math.max(300000, maxTweets * 3000); // Mínimo 5 min, +3s por tweet
  
  return this.http.post(`${this.apiUrl}/scraping/hashtag`, data)
    .pipe(
      timeout(timeoutMs),
      retry(1),
      catchError(this.handleError)
    );
}
```

---

## 🎯 **Recomendación Final**

**Para solución inmediata:** Aumenta el timeout a 5-10 minutos
**Para mejor UX:** Implementa WebSockets + respuesta asíncrona + progreso en tiempo real

¿Cuál prefieres implementar primero?
# Sistema Unificado de Análisis de Sentimiento

Esta carpeta contiene el núcleo del sistema unificado de análisis de sentimiento, desarrollado según el ADR-001.

## Arquitectura

El sistema de análisis de sentimiento sigue una arquitectura de tres capas:

1. **Engine (Motor)**: Lógica pura de análisis, sin efectos secundarios
2. **Orchestrator (Orquestador)**: Manejo de caché, circuit breaker, y métricas
3. **Types (Tipos)**: Definiciones de tipos comunes para garantizar la consistencia

## Componentes Principales

### 1. SentimentAnalysisEngine (engine.ts)

Motor puro de análisis de sentimiento que combina:
- Análisis basado en reglas
- Análisis de machine learning (Naive Bayes)
- Análisis contextual (sarcasmo, intensificadores, etc.)
- Integración con BERT (opcional)

```typescript
// Ejemplo de uso directo (no recomendado en código de aplicación)
import { SentimentAnalysisEngine } from "../lib/sentiment/engine";

const engine = new SentimentAnalysisEngine();
const result = await engine.analyze({ text: "Great product!", language: "en" });
```

### 2. SentimentAnalysisOrchestrator (orchestrator.ts)

Orquestador que añade características operacionales al motor:
- Sistema de caché con TTL
- Circuit breaker para manejar fallos
- Métricas de rendimiento
- Conversión de formatos

```typescript
// Ejemplo de uso (nivel intermedio)
import { SentimentAnalysisOrchestrator } from "../lib/sentiment/orchestrator";

const orchestrator = new SentimentAnalysisOrchestrator();
const result = await orchestrator.analyzeText({ text: "Great product!" });
```

### 3. Types (types.ts)

Definiciones de tipos para todo el sistema:
- `AnalysisRequest`: Parámetros de entrada para análisis
- `AnalysisResult`: Estructura de resultado estandarizada
- `SentimentOrchestrator`: Contrato para orquestadores
- `AnalyzerEngine`: Contrato para motores de análisis

## Uso Recomendado

Para la mayoría de casos, se recomienda usar el `TweetSentimentAnalysisManager` que es una fachada sobre el orquestador:

```typescript
import { tweetSentimentAnalysisManager } from "../services/tweet-sentiment-analysis.manager.service";

// Para un único tweet
const result = await tweetSentimentAnalysisManager.analyzeTweet(tweet);

// Para un lote de tweets
const results = await tweetSentimentAnalysisManager.analyzeTweetsBatch(tweets);
```

Para casos especiales que requieren acceso directo al orquestador:

```typescript
const orchestrator = tweetSentimentAnalysisManager.getOrchestrator();
const result = await orchestrator.analyzeText({ text: "...", language: "en" });
```

## Flujo de Procesamiento

1. Los datos de entrada (tweets o texto) se validan y convierten al formato adecuado
2. Se consulta la caché para ver si ya existe un resultado previo
3. Si no está en caché, se verifica si el circuit breaker está abierto
4. Se invoca al motor de análisis para el procesamiento
5. El resultado se almacena en caché para futuras consultas
6. Se registran métricas de rendimiento
7. Se devuelve el resultado al cliente

## Evolución Futura

El sistema está diseñado para permitir:
- Reemplazo sencillo del motor de análisis
- Ajuste de parámetros de caché y circuit breaker
- Integración de nuevos modelos (BERT, modelos personalizados, etc.)
- Monitoreo detallado del rendimiento

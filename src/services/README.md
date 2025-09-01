# Servicios de Análisis de Sentimiento

Este directorio contiene los servicios relacionados con el análisis de sentimiento en SentimentalSocial.

## Arquitectura Actual

La arquitectura del sistema de análisis de sentimiento sigue el ADR-001 "Unify sentiment services" y se organiza en las siguientes capas:

### 1. Capa de Análisis Puro (Core Analysis)

- **SentimentAnalysisEngine** (`src/lib/sentiment/engine.ts`): Motor de análisis puro que implementa la lógica central de análisis de sentimiento.
- **AdvancedHybridAnalyzer** (`src/services/advanced-hybrid-analyzer.service.ts`): Implementa el enfoque híbrido con ajuste automático de pesos.
- **NaiveBayesSentimentService** (`src/services/naive-bayes-sentiment.service.ts`): Implementación del algoritmo Naive Bayes para clasificación de sentimiento.
- **BertSentimentAnalyzerService** (`src/services/bert-sentiment-analyzer.service.ts`): Integración de modelos BERT para análisis avanzado.

### 2. Capa de Orquestación (Orchestration)

- **SentimentAnalysisOrchestrator** (`src/lib/sentiment/orchestrator.ts`): Maneja cachés, circuit breakers y métricas alrededor del motor de análisis.
- **TweetSentimentAnalysisManager** (`src/services/tweet-sentiment-analysis.manager.service.ts`): Orquestador principal que coordina el proceso de análisis.

### 3. Capa de Persistencia (Persistence)

- **ModelPersistenceManager** (`src/services/model-persistence.service.ts`): Maneja el guardado y carga de modelos entrenados.

### 4. Servicios Archivados (Deprecated)

Los siguientes servicios han sido archivados y no deben usarse en código nuevo:

- **EnhancedSentimentService** (`src/services/archived/enhanced-sentiment.service.ts`)
- **FixedNaiveBayesService** (`src/services/archived/fixed-naive-bayes.service.ts`)
- **SentimentService** (`src/services/sentiment.service.ts`) - En proceso de depreciación

## Uso Recomendado

Para análisis de sentimiento en nuevas implementaciones, se recomienda:

```typescript
// Importar el gestor principal
import { tweetSentimentAnalysisManager } from "../services/tweet-sentiment-analysis.manager.service";

// Para un solo tweet
const analysis = await tweetSentimentAnalysisManager.analyzeTweet(tweet);

// Para un lote de tweets
const analyses = await tweetSentimentAnalysisManager.analyzeTweetsBatch(tweets);

// Para acceder al orquestador para operaciones avanzadas
const orchestrator = tweetSentimentAnalysisManager.getOrchestrator();
```

## Flujo de Procesamiento

1. Los datos de entrada (tweets o texto) se validan y convierten al formato adecuado.
2. Se pasan al orquestador para procesar.
3. El orquestador verifica la caché y aplica políticas de circuit breaking.
4. El motor de análisis realiza el procesamiento principal.
5. Se combinan los resultados de varios analizadores (reglas, ML, etc.).
6. Se devuelve el resultado final con métricas y detalles.

## Notas sobre la Migración

La consolidación está en proceso siguiendo el ADR-001. El servicio SentimentService está siendo gradualmente deprecado a favor de TweetSentimentAnalysisManager.

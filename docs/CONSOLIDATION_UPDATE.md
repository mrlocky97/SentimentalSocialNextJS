# SentimentalSocial - Sistema Consolidado de Análisis de Sentimiento

## 🔄 Actualización: Consolidación de Servicios de Análisis de Sentimiento (Septiembre 2025)

Hemos completado una consolidación importante de los servicios de análisis de sentimiento siguiendo el ADR-001 "Unify sentiment services". Esta refactorización simplifica la arquitectura, mejora el rendimiento y facilita futuras extensiones del sistema.

### 🏗️ Nueva Arquitectura del Sistema de Análisis de Sentimiento

```
📁 Sentiment Analysis System/
├── 🧠 Core Analysis (src/lib/sentiment)
│   ├── engine.ts - Motor puro de análisis sin efectos laterales
│   ├── orchestrator.ts - Gestión de caché, circuit breaker y métricas
│   └── types.ts - Interfaces y tipos comunes
├── 🔌 Services (src/services)
│   ├── tweet-sentiment-analysis.manager.service.ts - Fachada principal
│   ├── naive-bayes-sentiment.service.ts - Clasificador Naive Bayes optimizado
│   ├── bert-sentiment-analyzer.service.ts - Integración con modelos BERT
│   ├── advanced-hybrid-analyzer.service.ts - Análisis híbrido con pesos dinámicos
│   ├── model-persistence.service.ts - Persistencia de modelos
│   └── sentiment.service.ts - Fachada de compatibilidad (deprecada)
└── 📚 Archived Services (src/services/archived)
    ├── fixed-naive-bayes.service.ts - Implementación antigua
    └── enhanced-sentiment.service.ts - Servicio redundante
```

### 🚀 Mejoras Implementadas

- ✅ **Arquitectura Limpia**: Separación clara entre análisis puro y orquestación
- ✅ **Sistema de Caché**: Implementación eficiente para resultados frecuentes
- ✅ **Circuit Breaker**: Mayor resiliencia ante fallos
- ✅ **Métricas Detalladas**: Visibilidad completa del rendimiento
- ✅ **Integración con BERT**: Soporte para modelos avanzados
- ✅ **Consolidación de Código**: Eliminación de duplicados y redundancias

### 💻 Uso Recomendado

Para implementaciones nuevas, utilizar la interfaz unificada:

```typescript
import { tweetSentimentAnalysisManager } from "./services/tweet-sentiment-analysis.manager.service";

// Análisis individual
const result = await tweetSentimentAnalysisManager.analyzeTweet(tweet);

// Análisis en lote
const results = await tweetSentimentAnalysisManager.analyzeTweetsBatch(tweets);
```

Para acceso a características avanzadas:

```typescript
// Acceso al orquestador
const orchestrator = tweetSentimentAnalysisManager.getOrchestrator();

// Activar análisis BERT para casos complejos
await orchestrator.initializeBertModel();
orchestrator.setBertEnabled(true);

// Análisis con configuración personalizada
const result = await orchestrator.analyzeText({
  text: "Este producto es fantástico!",
  language: "es",
  allowSarcasmDetection: true
});
```

### 📋 Plan de Migración

1. El servicio `SentimentService` está marcado como deprecado pero sigue funcionando
2. Las llamadas existentes seguirán funcionando mientras se migran al nuevo sistema
3. Los servicios redundantes han sido archivados en `src/services/archived`
4. Se recomienda migrar gradualmente todo el código a usar `TweetSentimentAnalysisManager`

Para más detalles, consulte:
- `src/services/README.md` - Documentación de los servicios actuales
- `src/lib/sentiment/README.md` - Documentación del motor de análisis
- `src/services/archived/README.md` - Información sobre servicios archivados
- `docs/adr/ADR-001-unify-sentiment-services.md` - ADR con el diseño original

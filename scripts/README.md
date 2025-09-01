# Scripts para SentimentalSocial

Este directorio contiene scripts útiles para entrenar, evaluar y administrar diversas funcionalidades de la aplicación SentimentalSocial.

## Sistema de Análisis de Sentimiento (Actuales)

### `train-enhanced-model.ts`

Script oficial para entrenar el modelo de sentimientos con el dataset multilingüe mejorado. Este script guarda el modelo entrenado en `data/models/naive_bayes_classifier.json`.

**Uso:**
```bash
npx tsx scripts/train-enhanced-model.ts
```

**Funcionalidades:**
- Carga el dataset multilingüe mejorado
- Entrena el modelo Naive Bayes con el dataset completo
- Guarda el modelo entrenado para su uso en producción
- Realiza pruebas básicas con el modelo entrenado

### `run-sentiment-analysis.ts`

Script para probar el modelo entrenado con textos individuales o conjuntos de datos de prueba personalizados.

**Uso:**
```bash
# Probar con un texto específico:
npx tsx scripts/run-sentiment-analysis.ts "Tu texto para analizar aquí"

# Probar con datasets personalizados:
npx tsx scripts/run-sentiment-analysis.ts
```

**Funcionalidades:**
- Carga el modelo entrenado desde disco
- Analiza textos individuales o datasets completos
- Proporciona métricas detalladas de precisión para cada categoría de texto
- Muestra señales lingüísticas detectadas (emojis, sarcasmo, etc.)

## Scripts de Utilidad (Siguen siendo útiles)

### `encrypt-twitter-creds.ts`

Script para encriptar credenciales de Twitter para su uso seguro en la aplicación.

**Uso:**
```bash
npx tsx scripts/encrypt-twitter-creds.ts
```

### `test-env-validation.ts`

Script para validar que las variables de entorno necesarias estén configuradas correctamente.

**Uso:**
```bash
npx tsx scripts/test-env-validation.ts
```

### `train-model-kfold.ts`

Script para entrenar y evaluar el modelo utilizando validación cruzada k-fold.

**Uso:**
```bash
npx tsx scripts/train-model-kfold.ts
```

## Scripts Archivados (Ya no se utilizan)

> Nota: Los siguientes scripts han sido reemplazados por versiones mejoradas y ya no se utilizan activamente:

- `test-bert.js`: Reemplazado por el sistema híbrido actual.
- `test-bert-advanced.js`: Reemplazado por el sistema híbrido actual.
- `train-model.ts`: Reemplazado por `train-enhanced-model.ts` con dataset mejorado.

## Sistema Híbrido

El sistema híbrido de análisis de sentimientos está implementado principalmente en:

- `src/services/advanced-hybrid-analyzer.service.ts`: Core del sistema híbrido con algoritmos de combinación.
- `src/services/tweet-sentiment-analysis.manager.service.ts`: Gestor que integra los componentes.

La documentación completa del sistema híbrido se encuentra en `docs/HYBRID_SYSTEM_README.md`.

## Requisitos Previos

Para ejecutar estos scripts, asegúrate de:

1. Tener instaladas todas las dependencias del proyecto (`npm install`)
2. Tener configuradas las variables de entorno necesarias en `.env.local`
3. Para scripts TS, usar `npx tsx` como se muestra en los ejemplos

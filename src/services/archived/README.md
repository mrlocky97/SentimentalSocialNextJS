# Servicios Archivados

Este directorio contiene servicios que han sido reemplazados o consolidados como parte del proceso de refactorización del sistema de análisis de sentimientos.

## Razón del archivado

Estos servicios fueron parte de las iteraciones anteriores del sistema de análisis de sentimientos, pero han sido reemplazados por implementaciones más eficientes y unificadas siguiendo el ADR-001 "Unify sentiment services".

## Servicios archivados

### 1. `fixed-naive-bayes.service.ts`
- **Fecha de archivo**: 1 de septiembre de 2025
- **Razón**: Funcionalidad duplicada con la implementación mejorada en `NaiveBayesSentimentService`
- **Reemplazado por**: `NaiveBayesSentimentService` (src/services/naive-bayes-sentiment.service.ts)

### 2. `enhanced-sentiment.service.ts`
- **Fecha de archivo**: 1 de septiembre de 2025
- **Razón**: Funcionalidad consolidada en `SentimentAnalysisEngine` y `SentimentAnalysisOrchestrator`
- **Reemplazado por**: La combinación de `SentimentAnalysisEngine` (src/lib/sentiment/engine.ts) y `SentimentAnalysisOrchestrator` (src/lib/sentiment/orchestrator.ts)

## Transición

Los servicios en este directorio se mantienen para referencia histórica, pero no deben ser importados o utilizados en código nuevo. Cualquier código que anteriormente dependía de estos servicios debe actualizarse para utilizar las implementaciones actuales.

# Scripts del Sistema de Análisis de Sentimientos

Este directorio contiene los scripts relacionados con el sistema de análisis de sentimientos. A continuación se describe el propósito de cada script y su estado actual.

## Scripts Activos

### Evaluación y Testing

- **evaluate-accuracy.ts**: Script avanzado para evaluación completa del modelo con métricas detalladas (matrices de confusión, F1-score, etc.).
- **test-enhanced-system.ts**: Prueba rápida del sistema de análisis de sentimientos mejorado.
- **test-model-integration.ts**: Prueba la integración del modelo en el sistema completo.

### Entrenamiento y Actualización

- **update-system-enhanced-model.ts**: Script para actualizar el sistema con el modelo mejorado (usado ocasionalmente para actualizaciones de modelo).

## Scripts Archivados

Los scripts obsoletos o poco utilizados se han movido a la carpeta `archived/` para mantener una estructura más clara. Estos scripts se mantienen por referencia histórica pero no forman parte del flujo de trabajo actual.

## Scripts Principales (fuera de esta carpeta)

Los scripts principales para el entrenamiento y pruebas diarias se encuentran en el directorio raíz `scripts/`:

- **scripts/train-enhanced-model.ts**: Script actual para entrenar el modelo con dataset multilingüe.
- **scripts/run-sentiment-analysis.ts**: Script para probar el modelo con textos o datasets.

## Sistema Híbrido

El sistema híbrido de análisis de sentimientos está implementado principalmente en:

- **src/services/advanced-hybrid-analyzer.service.ts**: Core del sistema híbrido con algoritmos de combinación.
- **src/services/tweet-sentiment-analysis.manager.service.ts**: Gestor que integra los componentes.

La documentación completa del sistema híbrido se encuentra en `docs/HYBRID_SYSTEM_README.md`.

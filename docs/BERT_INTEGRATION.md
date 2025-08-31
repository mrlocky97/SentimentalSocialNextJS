# Integración de BERT en el Sistema Híbrido de Análisis de Sentimiento

Este documento describe la integración del modelo BERT (Bidirectional Encoder Representations from Transformers) en el sistema híbrido de análisis de sentimiento de SentimentalSocial.

## Visión General

El sistema existente combinaba tres motores principales:
- **Motor basado en reglas**: Análisis léxico y heurístico
- **Motor Naive Bayes**: Clasificación estadística basada en aprendizaje automático
- **Motor híbrido avanzado**: Combinación ponderada de los motores anteriores

La nueva integración añade un modelo BERT para mejorar la precisión del análisis, especialmente en casos con contexto complejo y significado sutil.

## Arquitectura del Sistema con BERT

![Arquitectura del Sistema](./bert-architecture.png)

### Componentes Principales

1. **BertSentimentAnalyzerService**: Servicio que encapsula la funcionalidad del modelo BERT
   - Carga del modelo pre-entrenado
   - Tokenización y preparación de textos
   - Inferencia y normalización de resultados

2. **SentimentAnalysisEngine**: Motor central que coordina todos los analizadores
   - Inicialización perezosa de BERT (bajo demanda)
   - Configuración para habilitar/deshabilitar BERT
   - Integración de BERT en el flujo de análisis

3. **AdvancedHybridAnalyzer**: Mejorado para soportar pesos personalizados
   - Método `predictWithCustomWeights` para combinar múltiples modelos
   - Normalización automática de pesos
   - Detección de características contextuales

4. **SentimentAnalysisOrchestrator**: Orquestador con soporte para BERT
   - Métodos para inicializar y configurar BERT
   - Manejo de caché y circuit breaker con BERT
   - Interfaz unificada para todos los motores

## Flujo de Análisis de Sentimiento con BERT

1. El cliente envía un texto para analizar
2. El orquestador verifica si BERT está habilitado
3. Los motores de análisis procesan el texto en paralelo:
   - El motor basado en reglas analiza patrones léxicos
   - Naive Bayes clasifica según su modelo entrenado
   - BERT procesa el texto con su modelo transformador pre-entrenado
4. El motor híbrido avanzado combina los resultados con pesos configurados:
   - 25% para el motor basado en reglas
   - 25% para Naive Bayes
   - 50% para BERT (peso mayor por su precisión superior)
5. Se aplican ajustes contextuales (sarcasmo, emojis, etc.)
6. El sistema devuelve el resultado final con:
   - Etiqueta de sentimiento (positivo, negativo, neutral)
   - Puntuación numérica (-1 a 1)
   - Confianza (0 a 1)
   - Desglose de señales y emociones

## Inicialización de BERT

El modelo BERT se inicializa bajo demanda para optimizar el uso de recursos:

```typescript
// Inicializar BERT desde la API
POST /api/sentiment/initialize-bert
{
  "enableAfterLoad": true
}
```

O desde el código:

```typescript
const orchestrator = new SentimentAnalysisOrchestrator();
await orchestrator.initializeBertModel(true);
```

## Ponderación de Motores

El sistema utiliza una estrategia de ponderación personalizable:

```typescript
// Configuración de pesos predeterminada
{
  naive: 0.25,    // Modelo Naive Bayes
  rule: 0.25,     // Motor basado en reglas
  bert: 0.5       // Modelo BERT
}
```

Los pesos pueden ajustarse automáticamente según características del texto como:
- Longitud y complejidad
- Presencia de sarcasmo o ironía
- Uso de emojis
- Intensidad emocional

## Ventajas del Sistema Híbrido con BERT

1. **Mayor precisión**: BERT entiende mejor el contexto y las relaciones semánticas
2. **Flexibilidad**: El sistema puede funcionar con o sin BERT habilitado
3. **Mejor manejo de casos complejos**: Análisis mejorado de sarcasmo, negación y subtexto
4. **Arquitectura modular**: Fácil de extender con nuevos modelos o técnicas
5. **Equilibrio entre precisión y rendimiento**: Configuración ajustable según necesidades

## Consideraciones Técnicas

- **Requisitos de memoria**: BERT requiere más recursos que los modelos anteriores
- **Tiempo de inferencia**: El análisis con BERT es más lento pero más preciso
- **Compatibilidad**: El sistema mantiene la API existente para compatibilidad
- **Escalabilidad**: El diseño permite despliegues en contenedores y equilibrio de carga

## Próximos Pasos

- Evaluación comparativa del rendimiento con y sin BERT
- Afinamiento del modelo BERT con datos específicos del dominio
- Implementación de análisis por lotes optimizado para BERT
- Exploración de modelos más ligeros basados en la arquitectura de transformadores

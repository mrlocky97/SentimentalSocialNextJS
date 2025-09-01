# Entrenamiento del Modelo de Análisis de Sentimiento con Dataset Mejorado

Este documento explica cómo entrenar el modelo de análisis de sentimiento utilizando el dataset mejorado para SentimentalSocial.

## Scripts Creados

Se han creado dos nuevos scripts para trabajar con el modelo entrenado:

1. **`scripts/train-enhanced-model.ts`** - Entrena el modelo con el dataset multilingüe completo
2. **`scripts/run-sentiment-analysis.ts`** - Permite probar el modelo con textos personalizados

## Cómo Entrenar el Modelo

Para entrenar el modelo con el dataset mejorado:

```bash
npx tsx scripts/train-enhanced-model.ts
```

Este script realizará las siguientes acciones:
- Cargar el conjunto de datos multilingüe (aproximadamente 4000 ejemplos)
- Mostrar estadísticas del dataset (distribución de etiquetas)
- Entrenar el TweetSentimentAnalysisManager con los datos
- Guardar el modelo entrenado a disco
- Probar el modelo con ejemplos variados

## Cómo Probar el Modelo Entrenado

Para probar el modelo con texto personalizado:

```bash
npx tsx scripts/run-sentiment-analysis.ts "Tu texto a analizar aquí"
```

Si no se proporciona un texto, el script ejecutará una serie de ejemplos predefinidos.

## Resultados del Entrenamiento

El entrenamiento generó los siguientes resultados:

- **Dataset utilizado**: MultilingualSentimentDataset con 4000 ejemplos
- **Distribución**: 33.3% positivos, 33.3% negativos, 33.4% neutrales
- **Tiempo de entrenamiento**: ~47ms
- **Ubicación del modelo guardado**: `data/models/naive_bayes_classifier.json`

## Integración en el Sistema

El modelo entrenado se integra automáticamente con el sistema existente ya que:

1. Utiliza el `TweetSentimentAnalysisManager` que ya está en producción
2. Se guarda en la ubicación estándar que el sistema busca al iniciar
3. Se utiliza el servicio de persistencia para mantener consistencia con el resto del sistema

## Estructura del Modelo

El modelo entrenado mantiene la siguiente estructura:
- Vocabulario: ~1104 palabras clave
- Ejemplos positivos: 1333
- Ejemplos negativos: 1333
- Ejemplos neutrales: 1334
- Total de documentos: 4000

## Mejoras Futuras

Para mejorar aún más el modelo, se podría:

1. Implementar validación cruzada para evaluar la precisión
2. Ampliar el dataset con más ejemplos específicos del dominio
3. Ajustar parámetros de suavizado para mejorar las predicciones

## Notas Adicionales

El sistema usa la clase `NaiveBayesSentimentService` que se actualiza automáticamente cuando se inicializa el servicio. Se modificó la implementación para usar correctamente el dataset multilingüe.

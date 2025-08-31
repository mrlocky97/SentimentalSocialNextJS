# Scripts de Prueba para SentimentalSocial

Este directorio contiene scripts útiles para probar y administrar diversas funcionalidades de la aplicación SentimentalSocial.

## Scripts para Análisis de Sentimiento

### `test-bert.js`

Script básico para inicializar el modelo BERT y probar el análisis de sentimiento.

**Uso:**
```bash
node scripts/test-bert.js
```

**Funcionalidades:**
- Inicializa el modelo BERT
- Realiza una prueba simple de análisis de sentimiento

### `test-bert-advanced.js`

Script avanzado para probar a fondo la integración de BERT en el sistema de análisis de sentimiento.

**Uso:**
```bash
node scripts/test-bert-advanced.js
```

**Funcionalidades:**
- Inicializa el modelo BERT
- Prueba el análisis de sentimiento con diversos tipos de texto:
  - Textos positivos y negativos
  - Textos en español e inglés
  - Textos con sarcasmo
  - Textos con emojis
  - Textos con sentimiento mixto
- Compara los diferentes métodos de análisis (basado en reglas, Naive Bayes, avanzado)
- Muestra estadísticas detalladas sobre el análisis

## Scripts de Entrenamiento

### `train-model.ts`

Script para entrenar el modelo de análisis de sentimiento con el conjunto de datos predeterminado.

**Uso:**
```bash
npm run ts-node scripts/train-model.ts
```

### `train-model-kfold.ts`

Script para entrenar y evaluar el modelo utilizando validación cruzada k-fold.

**Uso:**
```bash
npm run ts-node scripts/train-model-kfold.ts
```

## Scripts de Utilidad

### `encrypt-twitter-creds.ts`

Script para encriptar credenciales de Twitter para su uso seguro en la aplicación.

**Uso:**
```bash
npm run ts-node scripts/encrypt-twitter-creds.ts
```

### `test-env-validation.ts`

Script para validar que las variables de entorno necesarias estén configuradas correctamente.

**Uso:**
```bash
npm run ts-node scripts/test-env-validation.ts
```

## Requisitos Previos

Para ejecutar estos scripts, asegúrate de:

1. Tener instaladas todas las dependencias del proyecto (`npm install`)
2. Tener configuradas las variables de entorno necesarias en `.env.local`
3. Para scripts TS, usar `ts-node` o compilar primero con `npm run build`
4. Para pruebas de BERT, configurar `HUGGINGFACE_API_KEY` en `.env.local` (opcional, funciona en modo demo sin API key)

## Notas Adicionales

- Los scripts de prueba de BERT requieren que el servidor esté en ejecución (`npm run start`)
- Para los scripts de entrenamiento, se recomienda tener un buen conjunto de datos de entrenamiento
- Para más detalles sobre la integración de BERT, consulta `docs/BERT_INTEGRATION.md`

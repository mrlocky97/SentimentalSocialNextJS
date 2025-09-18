export const features = {
  ENABLE_SCRAPING: (process.env.ENABLE_SCRAPING || "false") === "true",
  TRAIN_MODEL_ON_START:
    (process.env.TRAIN_MODEL_ON_START || "false") === "true",
  ENABLE_SWAGGER_UI: (process.env.ENABLE_SWAGGER_UI || "false") === "true",
  ENABLE_BERT: (process.env.ENABLE_BERT || "true") === "true",
  
  // 🛠️ REFACTORING FLAGS - Fase 1: Consolidación de Servicios
  USE_UNIFIED_SENTIMENT_ORCHESTRATOR: (process.env.USE_UNIFIED_SENTIMENT_ORCHESTRATOR || "true") === "true",
  ENABLE_LEGACY_SENTIMENT_SERVICES: (process.env.ENABLE_LEGACY_SENTIMENT_SERVICES || "false") === "true",
  
  // 🛠️ REFACTORING FLAGS - Fase 2: Mappers y Validadores
  ENABLE_SENTIMENT_MAPPERS_V2: (process.env.ENABLE_SENTIMENT_MAPPERS_V2 || "true") === "true",
  ENABLE_UNIFIED_VALIDATORS: (process.env.ENABLE_UNIFIED_VALIDATORS || "true") === "true",
};

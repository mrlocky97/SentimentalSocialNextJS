export const features = {
  ENABLE_SCRAPING: (process.env.ENABLE_SCRAPING || "false") === "true",
  TRAIN_MODEL_ON_START:
    (process.env.TRAIN_MODEL_ON_START || "false") === "true",
  ENABLE_SWAGGER_UI: (process.env.ENABLE_SWAGGER_UI || "false") === "true",
};

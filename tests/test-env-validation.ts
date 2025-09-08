import dotenv from "dotenv";
import { logger } from "../src/lib/observability/logger";
dotenv.config({ path: [".env.local", ".env"] });

import { validateEnv } from "../src/lib/config/validate-env";

try {
  validateEnv();
  logger.info("✅ Todas las variables requeridas están presentes");
} catch (error) {
  logger.error("❌ Error en validación:", { error });
  process.exit(1);
}

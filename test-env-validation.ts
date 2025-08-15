import dotenv from "dotenv";
dotenv.config({ path: [".env.local", ".env"] });

import { validateEnv } from "./src/lib/config/validate-env";

try {
  validateEnv();
  console.log("✅ Todas las variables requeridas están presentes");
} catch (error) {
  console.error("❌ Error en validación:", error);
  process.exit(1);
}

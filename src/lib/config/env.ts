/**
 * Environment Configuration
 * Carga las variables de entorno desde .env.local
 */

import { config } from "dotenv";
import { resolve } from "path";

// Cargar variables de entorno desde .env.local
const envPath = resolve(process.cwd(), ".env.local");
config({ path: envPath });

export const env = {
  // Database
  MONGODB_URI: process.env.MONGODB_URI,

  // Application
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT || "3000"),
  APP_URL: process.env.APP_URL || "http://localhost:3000",

  // Authentication
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "24h",
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || "12"),

  // API
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:3000",
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || "5242880"),

  // Redis
  REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",
  CACHE_TTL: parseInt(process.env.CACHE_TTL || "3600"),
} as const;

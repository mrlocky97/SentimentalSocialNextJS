/**
 * Environment Variables Validation
 * Validates required environment variables at startup
 */

const required = ["MONGODB_URI", "JWT_SECRET"];

export function validateEnv() {
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error("Missing ENV:", missing.join(", "));
    process.exit(1);
  }
}

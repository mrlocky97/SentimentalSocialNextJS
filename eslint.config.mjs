// ESLint v9 flat config - Configuración básica y menos molesta
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "coverage/**",
      ".next/**",
      "public/**",
      "backup/**",
      "temp/**",
      "*.js", // Ignora archivos JS en la raíz
    ],
  },
  // Configuración básica de JavaScript
  js.configs.recommended,
  // Configuración básica de TypeScript (solo recommended, no strict)
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        console: true,
        process: true,
        __dirname: true,
        __filename: true,
        module: true,
        require: true,
      },
    },
    rules: {
      // Desactivar reglas molestas
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "warn", // Solo advertencia, no error
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unsafe-function-type": "off",
      "@typescript-eslint/no-require-imports": "off",
      
      // Mantener solo reglas básicas importantes
      "no-console": "off", // Permitir console.log
      "no-debugger": "warn",
      "no-duplicate-case": "error",
      "no-unreachable": "warn",
      "no-undef": "off", // TypeScript ya maneja esto
    },
  },
];

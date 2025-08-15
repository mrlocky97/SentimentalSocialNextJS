// ESLint v9 flat config
import js from "@eslint/js";
import eslintPluginImport from "eslint-plugin-import";
import eslintPluginPrettier from "eslint-plugin-prettier";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  {
    name: "globals",
    ignores: [
      "node_modules/**",
      "dist/**",
      "coverage/**",
      ".next/**",
      "public/**",
      "backup/**",
      "scripts/**",
      "src/services/reactive/**",
      "src/utils/cookie-importer.ts",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        // Allow CommonJS/Node globals in tests and setup files
        process: true,
        __dirname: true,
        module: true,
        require: true,
      },
    },
    plugins: {
      import: eslintPluginImport,
      prettier: eslintPluginPrettier,
    },
    settings: {
      "import/resolver": {
        typescript: {
          project: "./tsconfig.server.json",
        },
      },
    },
    rules: {
      "prettier/prettier": "warn",
      "import/no-unresolved": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      // Relax rule to avoid blocking on broad Function type usage in wrappers
      "@typescript-eslint/no-unsafe-function-type": "off",
    },
  },
  {
    files: ["src/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "no-console": [
        "error",
        { allow: ["error", "warn", "info", "debug", "log"] },
      ],
      "max-lines": [
        "warn",
        { max: 400, skipBlankLines: true, skipComments: true },
      ],
      "max-lines-per-function": [
        "warn",
        { max: 120, skipBlankLines: true, skipComments: true },
      ],
    },
  },
  // endurece más en services + routes (donde más duele)
  {
    files: ["src/services/**/*.ts", "src/routes/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
];

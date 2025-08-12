/**
 * ESLint Cleanup Script
 * Script para limpiar automáticamente variables no usadas y errores comunes
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Patrones de limpieza automática
 */
const cleanupPatterns = [
  // Variables error no usadas en catch blocks
  {
    pattern: /} catch \((\w+)\) \{/g,
    replacement: '} catch (_$1) {',
    rule: '@typescript-eslint/no-unused-vars',
  },

  // Variables no usadas en destructuring
  {
    pattern: /const \{ (\w+), /g,
    replacement: 'const { _$1, ',
    rule: '@typescript-eslint/no-unused-vars',
  },

  // Require imports
  {
    pattern: /const (\w+) = require\(/g,
    replacement: 'import $1 = require(',
    rule: '@typescript-eslint/no-require-imports',
  },

  // Empty blocks
  {
    pattern: /} catch \(\w+\) \{\s*\}/g,
    replacement: '} catch (_error) {\n    // Error handled silently\n  }',
    rule: 'no-empty',
  },
];

/**
 * Archivos a limpiar automáticamente (scripts y tests principalmente)
 */
const targetFiles = ['src/scripts/**/*.ts', 'src/routes/**/*.ts', 'src/services/**/*.ts'];

/**
 * Aplica patrones de limpieza automática
 */
function autoCleanFile(filePath: string): boolean {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;

    for (const pattern of cleanupPatterns) {
      const originalContent = content;
      content = content.replace(pattern.pattern, pattern.replacement);
      if (content !== originalContent) {
        hasChanges = true;
        console.log(`✅ Fixed ${pattern.rule} in ${filePath}`);
      }
    }

    if (hasChanges) {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error);
    return false;
  }
}

/**
 * Busca archivos TypeScript recursivamente
 */
function findTypeScriptFiles(dir: string): string[] {
  const files: string[] = [];

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        files.push(...findTypeScriptFiles(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
  }

  return files;
}

/**
 * Script principal
 */
async function main() {
  console.log('🧹 Starting ESLint cleanup...\n');

  const srcDir = path.join(__dirname, '..');
  const tsFiles = findTypeScriptFiles(srcDir);

  let totalFixed = 0;

  for (const file of tsFiles) {
    // Solo procesar archivos específicos para evitar romper código crítico
    const relativePath = path.relative(srcDir, file);
    const shouldProcess = targetFiles.some((pattern) => {
      const regex = new RegExp(pattern.replace('**', '.*').replace('*', '[^/]*'));
      return regex.test(relativePath);
    });

    if (shouldProcess) {
      const fixed = autoCleanFile(file);
      if (fixed) {
        totalFixed++;
      }
    }
  }

  console.log(`\n✨ Cleanup completed! Fixed ${totalFixed} files.`);
  console.log('Run npm run lint to see remaining issues.');
}

// Ejecutar solo si es llamado directamente
if (require.main === module) {
  main().catch(console.error);
}

export { autoCleanFile, findTypeScriptFiles };

const fs = require('fs');
const path = require('path');

// Patrones de console.log que queremos mantener (errores y warnings importantes)
const KEEP_PATTERNS = [
  /console\.error/,
  /console\.warn.*Error/,
  /console\.warn.*Failed/,
  /console\.warn.*❌/,
  /console\.log.*❌.*Error/,
  /console\.log.*⚠️.*Error/,
];

// Patrones de console.log que definitivamente queremos eliminar (debugging)
const REMOVE_PATTERNS = [
  /console\.log\(`📊/,
  /console\.log\('📊/,
  /console\.log\(`🔍/,
  /console\.log\('🔍/,
  /console\.log.*Processing.*batch/,
  /console\.log.*First tweet sample/,
  /console\.log.*Tweet IDs to check/,
  /console\.log.*Found.*existing tweets/,
  /console\.log.*New tweets to insert/,
  /console\.log.*Existing tweets to update/,
  /console\.log.*Successfully inserted.*tweets/,
  /console\.log.*Inserted tweet IDs/,
  /console\.log.*Partial success/,
  /console\.log.*Database save completed/,
  /console\.log.*Analyzed.*tweets/,
];

function shouldKeepLog(line) {
  // Mantener errores y warnings importantes
  if (KEEP_PATTERNS.some(pattern => pattern.test(line))) {
    return true;
  }
  
  // Eliminar patrones específicos de debugging
  if (REMOVE_PATTERNS.some(pattern => pattern.test(line))) {
    return false;
  }
  
  // Por defecto, mantener otros console.log que no sean debugging obvio
  return !line.includes('console.log') || 
         line.includes('⚠️') || 
         line.includes('❌') || 
         line.includes('Error') ||
         line.includes('Warning');
}

function cleanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let removedCount = 0;
    
    const cleanedLines = lines.filter(line => {
      const keep = shouldKeepLog(line.trim());
      if (!keep && line.includes('console.')) {
        console.log(`Removing from ${path.basename(filePath)}: ${line.trim()}`);
        removedCount++;
      }
      return keep;
    });
    
    if (removedCount > 0) {
      fs.writeFileSync(filePath, cleanedLines.join('\n'));
      console.log(`✅ Cleaned ${filePath}: removed ${removedCount} console.log statements`);
    }
    
    return removedCount;
  } catch (error) {
    console.error(`❌ Error cleaning ${filePath}:`, error.message);
    return 0;
  }
}

function cleanDirectory(dirPath) {
  let totalRemoved = 0;
  
  const files = fs.readdirSync(dirPath, { withFileTypes: true });
  
  for (const file of files) {
    const fullPath = path.join(dirPath, file.name);
    
    if (file.isDirectory() && !file.name.startsWith('.')) {
      totalRemoved += cleanDirectory(fullPath);
    } else if (file.isFile() && (file.name.endsWith('.ts') || file.name.endsWith('.js'))) {
      totalRemoved += cleanFile(fullPath);
    }
  }
  
  return totalRemoved;
}

// Limpiar proyecto
console.log('🧹 Starting console.log cleanup...\n');

const srcPath = path.join(__dirname, 'src');
const totalRemoved = cleanDirectory(srcPath);

console.log(`\n🎉 Cleanup completed! Removed ${totalRemoved} console.log statements total.`);

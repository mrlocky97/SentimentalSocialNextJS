#!/bin/bash

# Ejecuta el script de evaluación del sistema unificado de análisis de sentimiento
# Este script se encarga de ejecutar la evaluación completa del sistema consolidado
# y generar un informe de resultados en el directorio docs/tfg-evaluation-results

echo "🚀 Iniciando evaluación del sistema unificado de análisis de sentimiento..."

# Comprobar si estamos en la carpeta raíz del proyecto
if [ ! -f "package.json" ]; then
    echo "❌ Error: Este script debe ejecutarse desde la raíz del proyecto"
    exit 1
fi

# Compilar el proyecto primero
echo "🔧 Compilando el proyecto..."
npm run build

# Verificar si la compilación fue exitosa
if [ $? -ne 0 ]; then
    echo "❌ Error: La compilación falló"
    exit 1
fi

# Ejecutar el script de evaluación
echo "📊 Ejecutando evaluación..."
node dist/scripts/evaluate-unified-sentiment-system.js

# Verificar si la evaluación fue exitosa
if [ $? -ne 0 ]; then
    echo "❌ Error: La evaluación falló"
    exit 1
fi

echo "✅ Evaluación completada con éxito"
echo "📄 Los resultados se han guardado en docs/tfg-evaluation-results/"

# Opcional: Mostrar el último archivo de resultados
LATEST_RESULT=$(ls -t docs/tfg-evaluation-results/unified-sentiment-evaluation-*.json | head -n 1)

if [ -n "$LATEST_RESULT" ]; then
    echo "📝 Último archivo de resultados: $LATEST_RESULT"
    
    # Opcional: Mostrar un resumen simple
    echo "📈 Resumen de resultados:"
    grep -A 1 "accuracy" "$LATEST_RESULT" | head -n 2
fi

echo "🏁 Proceso completado"

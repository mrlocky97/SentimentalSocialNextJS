@echo off
REM Ejecuta el script de evaluación del sistema unificado de análisis de sentimiento
REM Este script es la versión para Windows del script evaluate-unified-system.sh

echo 🚀 Iniciando evaluación del sistema unificado de análisis de sentimiento...

REM Comprobar si estamos en la carpeta raíz del proyecto
if not exist "package.json" (
    echo ❌ Error: Este script debe ejecutarse desde la raíz del proyecto
    exit /b 1
)

REM Compilar el proyecto primero
echo 🔧 Compilando el proyecto...
call npm run build

REM Verificar si la compilación fue exitosa
if %ERRORLEVEL% neq 0 (
    echo ❌ Error: La compilación falló
    exit /b 1
)

REM Ejecutar el script de evaluación
echo 📊 Ejecutando evaluación...
node dist/scripts/evaluate-unified-sentiment-system.js

REM Verificar si la evaluación fue exitosa
if %ERRORLEVEL% neq 0 (
    echo ❌ Error: La evaluación falló
    exit /b 1
)

echo ✅ Evaluación completada con éxito
echo 📄 Los resultados se han guardado en docs/tfg-evaluation-results/

echo 🏁 Proceso completado

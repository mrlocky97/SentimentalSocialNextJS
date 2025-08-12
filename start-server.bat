@echo off
echo === Limpiando archivos de compilacion ===
if exist dist rmdir /s /q dist
if exist tsconfig.tsbuildinfo del tsconfig.tsbuildinfo

echo === Compilando TypeScript ===
npx tsc -p tsconfig.server.json

echo === Iniciando servidor ===
if exist dist\server.js (
    node dist\server.js
) else (
    echo Error: No se pudo compilar el servidor
    pause
)

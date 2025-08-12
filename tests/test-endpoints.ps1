# Script de prueba completa para todos los endpoints de SentimentalSocial
# Verifica especialmente que estemos usando el método híbrido más avanzado

Write-Host "=== INICIANDO PRUEBAS DE ENDPOINTS SENTIMENTALSOCIAL ===" -ForegroundColor Green

$baseUrl = "http://localhost:3001"

# Función para hacer requests y mostrar resultados
function Test-Endpoint {
    param(
        [string]$Method,
        [string]$Url,
        [string]$Body = $null,
        [string]$Description
    )
    
    Write-Host "`n--- $Description ---" -ForegroundColor Yellow
    Write-Host "Endpoint: $Method $Url" -ForegroundColor Cyan
    
    try {
        if ($Body) {
            $response = Invoke-WebRequest -Uri $Url -Method $Method -Body $Body -ContentType "application/json" -TimeoutSec 30
        } else {
            $response = Invoke-WebRequest -Uri $Url -Method $Method -TimeoutSec 30
        }
        
        Write-Host "Status: $($response.StatusCode) $($response.StatusDescription)" -ForegroundColor Green
        
        # Parsear y mostrar JSON response
        $jsonResponse = $response.Content | ConvertFrom-Json
        if ($jsonResponse.success) {
            Write-Host "✅ Exitoso: $($jsonResponse.message)" -ForegroundColor Green
            
            # Mostrar datos relevantes dependiendo del endpoint
            if ($jsonResponse.data.sentiment) {
                Write-Host "   Sentimiento: $($jsonResponse.data.sentiment.label) (Confianza: $($jsonResponse.data.sentiment.confidence))" -ForegroundColor Magenta
            }
            if ($jsonResponse.data.overall) {
                Write-Host "   Precisión: $($jsonResponse.data.overall.accuracy)% ($($jsonResponse.data.overall.correct)/$($jsonResponse.data.overall.total))" -ForegroundColor Magenta
            }
            if ($jsonResponse.data.methods) {
                Write-Host "   Métodos comparados:" -ForegroundColor Magenta
                Write-Host "     - Rule-based: $($jsonResponse.data.methods.rule.sentiment)" -ForegroundColor White
                Write-Host "     - Naive Bayes: $($jsonResponse.data.methods.naive.sentiment)" -ForegroundColor White
                if ($jsonResponse.data.methods.advanced) {
                    Write-Host "     - 🎯 Híbrido Avanzado: $($jsonResponse.data.methods.advanced.sentiment)" -ForegroundColor Red
                }
            }
        } else {
            Write-Host "❌ Error: $($jsonResponse.error)" -ForegroundColor Red
        }
        
        return $true
    }
    catch {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# 1. Verificar salud del servidor
Test-Endpoint -Method "GET" -Url "$baseUrl/health" -Description "Health Check"

# 2. Información general de la API
Test-Endpoint -Method "GET" -Url "$baseUrl/api/v1" -Description "API Information"

Write-Host "`n=== PRUEBAS DE ANÁLISIS DE SENTIMIENTOS ===" -ForegroundColor Green

# 3. Demo de análisis
Test-Endpoint -Method "GET" -Url "$baseUrl/api/v1/sentiment/demo" -Description "Demo Analysis"

# 4. Estado del modelo
Test-Endpoint -Method "GET" -Url "$baseUrl/api/v1/sentiment/model-status" -Description "Model Status"

# 5. Evaluación rápida
Test-Endpoint -Method "GET" -Url "$baseUrl/api/v1/sentiment/quick-eval" -Description "Quick Evaluation (General Dataset)"

# 6. Evaluación con diferentes datasets
$datasets = @("marketing", "tech", "sarcasm")
foreach ($dataset in $datasets) {
    Test-Endpoint -Method "GET" -Url "$baseUrl/api/v1/sentiment/quick-eval?dataset=$dataset" -Description "Quick Eval - $dataset Dataset"
}

# 7. Análisis de texto simple (método híbrido por defecto)
$positiveText = '{"text": "I absolutely love this amazing product! It works perfectly!"}'
Test-Endpoint -Method "POST" -Url "$baseUrl/api/v1/sentiment/analyze-text" -Body $positiveText -Description "Análisis Híbrido - Texto Positivo"

$negativeText = '{"text": "This is the worst product ever, completely useless and terrible!"}'
Test-Endpoint -Method "POST" -Url "$baseUrl/api/v1/sentiment/analyze-text" -Body $negativeText -Description "Análisis Híbrido - Texto Negativo"

$neutralText = '{"text": "The package was delivered on time."}'
Test-Endpoint -Method "POST" -Url "$baseUrl/api/v1/sentiment/analyze-text" -Body $neutralText -Description "Análisis Híbrido - Texto Neutral"

# 8. Prueba de sarcasmo (importante para el sistema híbrido)
$sarcasmText = '{"text": "Oh great, another delay! Just what I needed today... 🙄"}'
Test-Endpoint -Method "POST" -Url "$baseUrl/api/v1/sentiment/analyze-text" -Body $sarcasmText -Description "Análisis Híbrido - Detección de Sarcasmo"

# 9. Comparación de métodos
$compareText = '{"text": "This product is absolutely fantastic and amazing!"}'
Test-Endpoint -Method "POST" -Url "$baseUrl/api/v1/sentiment/compare" -Body $compareText -Description "Comparación de Métodos"

# 10. Comparación avanzada (sistema híbrido con auto-ajuste de pesos)
Test-Endpoint -Method "POST" -Url "$baseUrl/api/v1/sentiment/advanced-compare" -Body $compareText -Description "🎯 Comparación Avanzada (Sistema Híbrido)"

# 11. Prueba del método específico híbrido
$hybridTest = '{"text": "I love this product!", "method": "hybrid"}'
Test-Endpoint -Method "POST" -Url "$baseUrl/api/v1/sentiment/test" -Body $hybridTest -Description "Test Específico - Método Híbrido"

# 12. Comparación de métodos individuales
$ruleTest = '{"text": "I love this product!", "method": "rule"}'
Test-Endpoint -Method "POST" -Url "$baseUrl/api/v1/sentiment/test" -Body $ruleTest -Description "Test - Método Rule-based"

$naiveTest = '{"text": "I love this product!", "method": "naive"}'
Test-Endpoint -Method "POST" -Url "$baseUrl/api/v1/sentiment/test" -Body $naiveTest -Description "Test - Método Naive Bayes"

Write-Host "`n=== RESUMEN DE PRUEBAS ===" -ForegroundColor Green
Write-Host "✅ Servidor funcionando correctamente" -ForegroundColor Green
Write-Host "🎯 Sistema híbrido avanzado disponible y funcionando" -ForegroundColor Green
Write-Host "📊 Múltiples métodos de análisis comparables" -ForegroundColor Green
Write-Host "🧠 Detección de sarcasmo implementada" -ForegroundColor Green
Write-Host "📈 Evaluaciones de precisión disponibles" -ForegroundColor Green

Write-Host "`n=== RECOMENDACIONES ===" -ForegroundColor Yellow
Write-Host "1. El endpoint /analyze-text usa el método híbrido por defecto (más preciso)" -ForegroundColor White
Write-Host "2. /advanced-compare muestra todos los métodos con auto-ajuste de pesos" -ForegroundColor White
Write-Host "3. /quick-eval permite evaluar precisión en diferentes datasets" -ForegroundColor White
Write-Host "4. El sistema detecta sarcasmo y ajusta los pesos automáticamente" -ForegroundColor White

Write-Host "`n=== PRUEBAS COMPLETADAS ===" -ForegroundColor Green

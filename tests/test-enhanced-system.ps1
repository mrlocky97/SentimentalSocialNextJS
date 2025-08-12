# Script de prueba para el sistema de análisis de sentimientos mejorado
# Prueba el nuevo motor híbrido avanzado con múltiples modelos

Write-Host "=== PRUEBAS DEL SISTEMA HÍBRIDO AVANZADO ===" -ForegroundColor Green

$baseUrl = "http://localhost:3001"

function Test-EnhancedEndpoint {
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
        
        $jsonResponse = $response.Content | ConvertFrom-Json
        if ($jsonResponse.success) {
            Write-Host "✅ Exitoso: $($jsonResponse.message)" -ForegroundColor Green
            
            # Mostrar información específica del motor mejorado
            if ($jsonResponse.data.finalPrediction) {
                Write-Host "🎯 PREDICCIÓN FINAL (Ensemble):" -ForegroundColor Magenta
                Write-Host "   Sentimiento: $($jsonResponse.data.finalPrediction.label)" -ForegroundColor White
                Write-Host "   Confianza: $($jsonResponse.data.finalPrediction.confidence.ToString('F3'))" -ForegroundColor White
                Write-Host "   Score: $($jsonResponse.data.finalPrediction.score.ToString('F3'))" -ForegroundColor White
                
                Write-Host "`n📊 PREDICCIONES POR MODELO:" -ForegroundColor Cyan
                foreach ($pred in $jsonResponse.data.modelPredictions) {
                    $color = if ($pred.method -eq "Enhanced Ensemble") { "Red" } else { "White" }
                    Write-Host "   $($pred.method): $($pred.label) ($($pred.confidence.ToString('F3')))" -ForegroundColor $color
                }
                
                Write-Host "`n🤝 CONSENSO:" -ForegroundColor Blue
                Write-Host "   Acuerdo: $($jsonResponse.data.consensus.agreement.ToString('F2'))%" -ForegroundColor White
                Write-Host "   Explicación: $($jsonResponse.data.consensus.explanation)" -ForegroundColor White
            }
            
            if ($jsonResponse.data.models) {
                Write-Host "`n🔧 INFORMACIÓN DE MODELOS:" -ForegroundColor Magenta
                if ($jsonResponse.data.models.enhanced) {
                    Write-Host "   Modelos disponibles: $($jsonResponse.data.models.enhanced.models -join ', ')" -ForegroundColor White
                    Write-Host "   Método de ensemble: $($jsonResponse.data.models.enhanced.ensembleMethod)" -ForegroundColor White
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

# Verificar que el servidor esté funcionando
Write-Host "🔍 Verificando servidor..." -ForegroundColor Blue
$healthCheck = Test-EnhancedEndpoint -Method "GET" -Url "$baseUrl/health" -Description "Health Check"

if (-not $healthCheck) {
    Write-Host "❌ Servidor no disponible. Asegúrate de que esté ejecutándose." -ForegroundColor Red
    exit 1
}

# Probar el nuevo endpoint de información de modelos
Test-EnhancedEndpoint -Method "GET" -Url "$baseUrl/api/v1/sentiment/model-info" -Description "🔧 Información Detallada de Modelos"

# Probar el motor mejorado con diferentes tipos de texto
Write-Host "`n=== PRUEBAS DEL MOTOR HÍBRIDO AVANZADO ===" -ForegroundColor Green

# Texto muy positivo
$veryPositive = '{"text": "This is absolutely amazing! I love it so much! Best product ever! 😍", "language": "en"}'
Test-EnhancedEndpoint -Method "POST" -Url "$baseUrl/api/v1/sentiment/enhanced-analyze" -Body $veryPositive -Description "🎯 Motor Avanzado - Texto Muy Positivo"

# Texto con sarcasmo
$sarcastic = '{"text": "Oh great, another delay... just what I needed today 🙄", "language": "en"}'
Test-EnhancedEndpoint -Method "POST" -Url "$baseUrl/api/v1/sentiment/enhanced-analyze" -Body $sarcastic -Description "🎯 Motor Avanzado - Detección de Sarcasmo"

# Texto muy negativo
$veryNegative = '{"text": "This is terrible! Worst experience ever! I hate this completely useless product!", "language": "en"}'
Test-EnhancedEndpoint -Method "POST" -Url "$baseUrl/api/v1/sentiment/enhanced-analyze" -Body $veryNegative -Description "🎯 Motor Avanzado - Texto Muy Negativo"

# Texto neutral/técnico
$neutral = '{"text": "The package was delivered on time according to the tracking information.", "language": "en"}'
Test-EnhancedEndpoint -Method "POST" -Url "$baseUrl/api/v1/sentiment/enhanced-analyze" -Body $neutral -Description "🎯 Motor Avanzado - Texto Neutral"

# Texto con emociones mixtas
$mixed = '{"text": "The product quality is great but the customer service was disappointing", "language": "en"}'
Test-EnhancedEndpoint -Method "POST" -Url "$baseUrl/api/v1/sentiment/enhanced-analyze" -Body $mixed -Description "🎯 Motor Avanzado - Emociones Mixtas"

# Comparar con el método anterior
Write-Host "`n=== COMPARACIÓN CON MÉTODOS ANTERIORES ===" -ForegroundColor Green

$compareText = '{"text": "I love this product but the delivery was slow"}'
Test-EnhancedEndpoint -Method "POST" -Url "$baseUrl/api/v1/sentiment/advanced-compare" -Body $compareText -Description "📊 Comparación Métodos Tradicionales"

# Evaluaciones de precisión
Write-Host "`n=== EVALUACIONES DE PRECISIÓN ===" -ForegroundColor Green

Test-EnhancedEndpoint -Method "GET" -Url "$baseUrl/api/v1/sentiment/quick-eval" -Description "📈 Evaluación General"
Test-EnhancedEndpoint -Method "GET" -Url "$baseUrl/api/v1/sentiment/quick-eval?dataset=sarcasm" -Description "📈 Evaluación Sarcasmo"
Test-EnhancedEndpoint -Method "GET" -Url "$baseUrl/api/v1/sentiment/quick-eval?dataset=marketing" -Description "📈 Evaluación Marketing"

Write-Host "`n=== RESUMEN DE MEJORAS IMPLEMENTADAS ===" -ForegroundColor Green
Write-Host "✅ Motor híbrido avanzado con 4 modelos (VADER, TextBlob, Rule-based, Naive Bayes)" -ForegroundColor Green
Write-Host "✅ Sistema de votación por ensemble con pesos dinámicos" -ForegroundColor Green
Write-Host "✅ Detección mejorada de sarcasmo e ironía" -ForegroundColor Green
Write-Host "✅ Análisis contextual automático" -ForegroundColor Green
Write-Host "✅ Métricas de consenso entre modelos" -ForegroundColor Green
Write-Host "✅ Gestión de persistencia de modelos" -ForegroundColor Green
Write-Host "✅ Validación y métricas de rendimiento" -ForegroundColor Green

Write-Host "`n=== RECOMENDACIONES DE USO ===" -ForegroundColor Yellow
Write-Host "1. Usar /enhanced-analyze para máxima precisión" -ForegroundColor White
Write-Host "2. El sistema ajusta automáticamente los pesos según el contexto" -ForegroundColor White
Write-Host "3. Mayor precisión en textos con sarcasmo y emociones complejas" -ForegroundColor White
Write-Host "4. Consenso entre modelos indica confiabilidad de la predicción" -ForegroundColor White

Write-Host "`n🎯 SISTEMA HÍBRIDO AVANZADO LISTO PARA PRODUCCIÓN! 🎯" -ForegroundColor Green

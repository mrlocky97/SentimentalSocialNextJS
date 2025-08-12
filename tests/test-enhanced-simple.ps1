# Script de prueba para el sistema de analisis de sentimientos mejorado

Write-Host "=== PRUEBAS DEL SISTEMA HIBRIDO AVANZADO ===" -ForegroundColor Green

$baseUrl = "http://localhost:3001"

function Test-EnhancedEndpoint {
    param(
        [string]$Method,
        [string]$Url,
        [string]$Body = $null,
        [string]$Description
    )
    
    Write-Host "`n--- $Description ---" -ForegroundColor Yellow
    
    try {
        if ($Body) {
            $response = Invoke-WebRequest -Uri $Url -Method $Method -Body $Body -ContentType "application/json" -TimeoutSec 30
        } else {
            $response = Invoke-WebRequest -Uri $Url -Method $Method -TimeoutSec 30
        }
        
        Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
        
        $jsonResponse = $response.Content | ConvertFrom-Json
        if ($jsonResponse.success) {
            Write-Host "Exitoso: $($jsonResponse.message)" -ForegroundColor Green
            
            # Mostrar informacion del motor mejorado
            if ($jsonResponse.data.finalPrediction) {
                Write-Host "PREDICCION FINAL:" -ForegroundColor Magenta
                Write-Host "   Sentimiento: $($jsonResponse.data.finalPrediction.label)" -ForegroundColor White
                Write-Host "   Confianza: $($jsonResponse.data.finalPrediction.confidence.ToString('F3'))" -ForegroundColor White
                
                Write-Host "PREDICCIONES POR MODELO:" -ForegroundColor Cyan
                foreach ($pred in $jsonResponse.data.modelPredictions) {
                    Write-Host "   $($pred.method): $($pred.label) ($($pred.confidence.ToString('F3')))" -ForegroundColor White
                }
                
                Write-Host "CONSENSO:" -ForegroundColor Blue
                Write-Host "   Acuerdo: $($jsonResponse.data.consensus.agreement.ToString('F2'))" -ForegroundColor White
                Write-Host "   $($jsonResponse.data.consensus.explanation)" -ForegroundColor White
            }
        } else {
            Write-Host "Error: $($jsonResponse.error)" -ForegroundColor Red
        }
        
        return $true
    }
    catch {
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Verificar servidor
Write-Host "Verificando servidor..." -ForegroundColor Blue
$healthCheck = Test-EnhancedEndpoint -Method "GET" -Url "$baseUrl/health" -Description "Health Check"

if (-not $healthCheck) {
    Write-Host "Servidor no disponible" -ForegroundColor Red
    exit 1
}

# Probar informacion de modelos
Test-EnhancedEndpoint -Method "GET" -Url "$baseUrl/api/v1/sentiment/model-info" -Description "Informacion de Modelos"

# Pruebas del motor avanzado
Write-Host "`n=== PRUEBAS DEL MOTOR HIBRIDO AVANZADO ===" -ForegroundColor Green

# Texto muy positivo
$veryPositive = '{"text": "This is absolutely amazing! I love it so much!", "language": "en"}'
Test-EnhancedEndpoint -Method "POST" -Url "$baseUrl/api/v1/sentiment/enhanced-analyze" -Body $veryPositive -Description "Motor Avanzado - Texto Muy Positivo"

# Texto con sarcasmo
$sarcastic = '{"text": "Oh great, another delay... just what I needed today", "language": "en"}'
Test-EnhancedEndpoint -Method "POST" -Url "$baseUrl/api/v1/sentiment/enhanced-analyze" -Body $sarcastic -Description "Motor Avanzado - Deteccion de Sarcasmo"

# Texto muy negativo
$veryNegative = '{"text": "This is terrible! Worst experience ever!", "language": "en"}'
Test-EnhancedEndpoint -Method "POST" -Url "$baseUrl/api/v1/sentiment/enhanced-analyze" -Body $veryNegative -Description "Motor Avanzado - Texto Muy Negativo"

# Evaluaciones de precision
Write-Host "`n=== EVALUACIONES DE PRECISION ===" -ForegroundColor Green
Test-EnhancedEndpoint -Method "GET" -Url "$baseUrl/api/v1/sentiment/quick-eval" -Description "Evaluacion General"

Write-Host "`n=== SISTEMA HIBRIDO AVANZADO COMPLETADO ===" -ForegroundColor Green

# 🧪 Tests de Endpoints Avanzados con PowerShell

# Configuración
$BaseURL = "http://localhost:3001"
$ApiURL = "$BaseURL/api/v1/scraping/advanced"

Write-Host "🔥 Iniciando pruebas de endpoints avanzados con PowerShell..." -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Yellow

# Función para hacer requests
function Invoke-ScrapingRequest {
    param(
        [string]$Name,
        [string]$Endpoint,
        [string]$Method = "GET",
        [hashtable]$Body = @{}
    )
    
    Write-Host ""
    Write-Host "📡 $Name" -ForegroundColor Cyan
    Write-Host "----------------------------" -ForegroundColor Gray
    
    try {
        $headers = @{'Content-Type' = 'application/json'}
        $url = "$ApiURL$Endpoint"
        
        if ($Method -eq "POST") {
            $bodyJson = $Body | ConvertTo-Json -Depth 10
            $response = Invoke-RestMethod -Uri $url -Method $Method -Headers $headers -Body $bodyJson
        } else {
            $response = Invoke-RestMethod -Uri $url -Method $Method -Headers $headers
        }
        
        $response | ConvertTo-Json -Depth 10 | Write-Host -ForegroundColor White
        return $response
    }
    catch {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# TEST 1: Crear job de hashtag con análisis
Write-Host "🏷️  TEST 1: Scraping de Hashtag con Análisis" -ForegroundColor Yellow

$hashtagJob = @{
    type = "hashtag"
    query = "tecnologia"
    targetCount = 100
    campaignId = "test_hashtag_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    analyzeSentiment = $true
    priority = "high"
}

$jobResponse = Invoke-ScrapingRequest -Name "Crear job de hashtag" -Endpoint "/job" -Method "POST" -Body $hashtagJob
$jobId = $jobResponse.jobId

if ($jobId) {
    Write-Host "✅ Job creado: $jobId" -ForegroundColor Green
    
    # Monitorear progreso
    Write-Host ""
    Write-Host "📊 Monitoreando progreso..." -ForegroundColor Cyan
    
    for ($i = 1; $i -le 10; $i++) {
        Write-Host "🔄 Check $i/10..." -ForegroundColor Yellow
        
        $progressResponse = Invoke-ScrapingRequest -Name "Progreso" -Endpoint "/job/$jobId/progress" -Method "GET"
        
        if ($progressResponse.progress) {
            $progress = $progressResponse.progress
            Write-Host "  📈 Progreso: $($progress.percentage)%" -ForegroundColor White
            Write-Host "  🔄 Fase: $($progress.phase)" -ForegroundColor White
            Write-Host "  📥 Tweets: $($progress.tweetsCollected)/$($progress.total)" -ForegroundColor White
            
            if ($progress.sentimentAnalyzed -gt 0) {
                Write-Host "  🧠 Analizados: $($progress.sentimentAnalyzed)" -ForegroundColor White
            }
            
            if ($progress.savedToDatabase -gt 0) {
                Write-Host "  💾 Guardados: $($progress.savedToDatabase)" -ForegroundColor White
            }
            
            if ($progress.percentage -eq 100) {
                Write-Host "✅ Job completado!" -ForegroundColor Green
                break
            }
        }
        
        Start-Sleep -Seconds 5
    }
} else {
    Write-Host "❌ Error creando job" -ForegroundColor Red
}

# TEST 2: Job de usuario sin análisis
Write-Host ""
Write-Host "👤 TEST 2: Scraping de Usuario SIN Análisis" -ForegroundColor Yellow

$userJob = @{
    type = "user"
    query = "github"
    targetCount = 50
    campaignId = "test_user_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    analyzeSentiment = $false
    priority = "medium"
}

Invoke-ScrapingRequest -Name "Crear job de usuario" -Endpoint "/job" -Method "POST" -Body $userJob

# TEST 3: Búsqueda con opciones avanzadas
Write-Host ""
Write-Host "🔍 TEST 3: Búsqueda con Opciones Avanzadas" -ForegroundColor Yellow

$searchJob = @{
    type = "search"
    query = "inteligencia artificial"
    targetCount = 200
    campaignId = "test_search_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    analyzeSentiment = $true
    priority = "urgent"
    options = @{
        includeReplies = $false
        includeRetweets = $false
        language = "es"
        maxAgeHours = 24
    }
}

$searchResponse = Invoke-ScrapingRequest -Name "Crear job de búsqueda" -Endpoint "/job" -Method "POST" -Body $searchJob
$searchJobId = $searchResponse.jobId

# TEST 4: Listar jobs
Write-Host ""
Write-Host "📋 TEST 4: Listar Jobs" -ForegroundColor Yellow
Invoke-ScrapingRequest -Name "Listar todos los jobs" -Endpoint "/jobs" -Method "GET"

# TEST 5: Estadísticas del sistema
Write-Host ""
Write-Host "📈 TEST 5: Estadísticas del Sistema" -ForegroundColor Yellow
Invoke-ScrapingRequest -Name "Estadísticas" -Endpoint "/stats" -Method "GET"

# TEST 6: Health check
Write-Host ""
Write-Host "🏥 TEST 6: Health Check" -ForegroundColor Yellow
Invoke-ScrapingRequest -Name "Health check" -Endpoint "/health" -Method "GET"

# TEST 7: Cancelar job si existe
if ($searchJobId) {
    Write-Host ""
    Write-Host "❌ TEST 7: Cancelar Job" -ForegroundColor Yellow
    
    $cancelBody = @{
        userId = "test_user"
    }
    
    Invoke-ScrapingRequest -Name "Cancelar job $searchJobId" -Endpoint "/job/$searchJobId/cancel" -Method "POST" -Body $cancelBody
}

Write-Host ""
Write-Host "🎉 Pruebas completadas!" -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Yellow
Write-Host "💡 Para monitoreo en tiempo real, usa el cliente WebSocket:" -ForegroundColor Cyan
Write-Host "   node scripts/test-websocket-client.js" -ForegroundColor White
Write-Host ""
Write-Host "🌐 También puedes usar cualquier cliente WebSocket para conectar a:" -ForegroundColor Cyan
Write-Host "   ws://localhost:3001/socket.io/" -ForegroundColor White
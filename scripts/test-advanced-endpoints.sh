#!/bin/bash

# 🚀 Scripts de Ejemplo para Endpoints Avanzados
# Usar: chmod +x test-advanced-endpoints.sh && ./test-advanced-endpoints.sh

BASE_URL="http://localhost:3001"
API_URL="$BASE_URL/api/v1/scraping/advanced"

echo "🔥 Iniciando pruebas de endpoints avanzados..."
echo "================================================"

# Función para hacer requests y mostrar respuesta
make_request() {
    local name="$1"
    local endpoint="$2"
    local method="$3"
    local data="$4"
    
    echo
    echo "📡 $name"
    echo "----------------------------"
    
    if [ "$method" = "POST" ]; then
        response=$(curl -s -X POST "$API_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    else
        response=$(curl -s "$API_URL$endpoint")
    fi
    
    echo "$response" | jq '.' 2>/dev/null || echo "$response"
    echo
}

# 1. Crear job básico de hashtag
echo "🏷️  TEST 1: Scraping de Hashtag con Análisis"
JOB_DATA='{
  "type": "hashtag",
  "query": "tecnologia",
  "targetCount": 100,
  "campaignId": "test_hashtag_'$(date +%s)'",
  "analyzeSentiment": true,
  "priority": "high"
}'

response=$(curl -s -X POST "$API_URL/job" \
    -H "Content-Type: application/json" \
    -d "$JOB_DATA")

echo "$response" | jq '.'
JOB_ID=$(echo "$response" | jq -r '.jobId')

if [ "$JOB_ID" != "null" ] && [ "$JOB_ID" != "" ]; then
    echo "✅ Job creado: $JOB_ID"
    
    # 2. Monitorear progreso
    echo
    echo "📊 Monitoreando progreso..."
    for i in {1..10}; do
        echo "🔄 Check $i/10..."
        progress_response=$(curl -s "$API_URL/job/$JOB_ID/progress")
        echo "$progress_response" | jq '.progress | {percentage, phase, tweetsCollected, sentimentAnalyzed, savedToDatabase}'
        
        percentage=$(echo "$progress_response" | jq -r '.progress.percentage // 0')
        if [ "$percentage" = "100" ]; then
            echo "✅ Job completado!"
            break
        fi
        
        sleep 5
    done
else
    echo "❌ Error creando job"
fi

# 3. Crear job de usuario sin análisis
echo
echo "👤 TEST 2: Scraping de Usuario SIN Análisis"
USER_JOB_DATA='{
  "type": "user",
  "query": "github",
  "targetCount": 50,
  "campaignId": "test_user_'$(date +%s)'",
  "analyzeSentiment": false,
  "priority": "medium"
}'

make_request "Crear job de usuario" "/job" "POST" "$USER_JOB_DATA"

# 4. Crear job de búsqueda con opciones avanzadas
echo "🔍 TEST 3: Búsqueda con Opciones Avanzadas"
SEARCH_JOB_DATA='{
  "type": "search",
  "query": "inteligencia artificial",
  "targetCount": 200,
  "campaignId": "test_search_'$(date +%s)'",
  "analyzeSentiment": true,
  "priority": "urgent",
  "options": {
    "includeReplies": false,
    "includeRetweets": false,
    "language": "es",
    "maxAgeHours": 24
  }
}'

search_response=$(curl -s -X POST "$API_URL/job" \
    -H "Content-Type: application/json" \
    -d "$SEARCH_JOB_DATA")

echo "$search_response" | jq '.'
SEARCH_JOB_ID=$(echo "$search_response" | jq -r '.jobId')

# 5. Listar jobs
echo "📋 TEST 4: Listar Jobs"
make_request "Listar todos los jobs" "/jobs" "GET"

# 6. Ver estadísticas del sistema
echo "📈 TEST 5: Estadísticas del Sistema"
make_request "Estadísticas" "/stats" "GET"

# 7. Health check
echo "🏥 TEST 6: Health Check"
make_request "Health check" "/health" "GET"

# 8. Cancelar job si existe
if [ "$SEARCH_JOB_ID" != "null" ] && [ "$SEARCH_JOB_ID" != "" ]; then
    echo "❌ TEST 7: Cancelar Job"
    CANCEL_DATA='{"userId": "test_user"}'
    make_request "Cancelar job $SEARCH_JOB_ID" "/job/$SEARCH_JOB_ID/cancel" "POST" "$CANCEL_DATA"
fi

echo
echo "🎉 Pruebas completadas!"
echo "================================================"
echo "💡 Para monitoreo en tiempo real, conecta a:"
echo "   WebSocket: ws://localhost:3001/socket.io/"
echo "   Evento: 'subscribe' con {jobId: 'tu-job-id'}"
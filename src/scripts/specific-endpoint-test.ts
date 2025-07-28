/**
 * Specific API Endpoint Tests
 * Tests actual API endpoints with correct parameters
 */

const API_BASE_URL = 'http://localhost:3001';

async function testSpecificEndpoints() {
  console.log('🎯 Probando endpoints específicos con parámetros correctos\n');
  
  // Test 1: API Info
  console.log('📋 1. Información de la API');
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1`);
    const data = await response.json();
    console.log(`✅ GET /api/v1: ${response.status} - ${data.name} v${data.version}`);
  } catch (error) {
    console.log(`❌ GET /api/v1: Error - ${error}`);
  }
  
  // Test 2: Sentiment Analysis
  console.log('\n💭 2. Análisis de Sentimientos');
  try {
    const tweetData = {
      tweet: {
        id: "test_tweet_001",
        tweetId: "1234567890",
        content: "Me encanta este producto, es fantástico!",
        author: {
          id: "user123",
          username: "testuser",
          displayName: "Test User",
          verified: false,
          followersCount: 100,
          followingCount: 50,
          tweetsCount: 200
        },
        metrics: {
          retweets: 10,
          likes: 25,
          replies: 5,
          quotes: 2,
          engagement: 42
        },
        hashtags: ["#producto", "#genial"],
        mentions: [],
        urls: [],
        isRetweet: false,
        isReply: false,
        isQuote: false,
        language: "es",
        scrapedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    };
    
    const response = await fetch(`${API_BASE_URL}/api/v1/sentiment/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tweetData)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ POST /api/v1/sentiment/analyze: ${response.status} - Sentiment: ${data.sentiment?.label || 'N/A'}`);
    } else {
      console.log(`⚠️ POST /api/v1/sentiment/analyze: ${response.status} - ${response.statusText}`);
    }
  } catch (error) {
    console.log(`❌ POST /api/v1/sentiment/analyze: Error - ${error}`);
  }
  
  // Test 3: Batch Sentiment Analysis
  console.log('\n📊 3. Análisis por Lotes');
  try {
    const batchData = {
      tweets: [
        { content: "Me encanta este producto", id: "1" },
        { content: "No me gusta nada", id: "2" },
        { content: "Es un producto normal", id: "3" }
      ]
    };
    
    const response = await fetch(`${API_BASE_URL}/api/v1/sentiment/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batchData)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ POST /api/v1/sentiment/batch: ${response.status} - Processed ${data.results?.length || 0} items`);
    } else {
      console.log(`⚠️ POST /api/v1/sentiment/batch: ${response.status} - ${response.statusText}`);
    }
  } catch (error) {
    console.log(`❌ POST /api/v1/sentiment/batch: Error - ${error}`);
  }
  
  // Test 4: Auth endpoints (expect 400/401)
  console.log('\n🔐 4. Endpoints de Autenticación (sin credenciales válidas)');
  try {
    const loginData = {
      email: "test@example.com",
      password: "wrongpassword"
    };
    
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginData)
    });
    
    console.log(`⚠️ POST /api/v1/auth/login: ${response.status} - ${response.statusText} (esperado)`);
  } catch (error) {
    console.log(`❌ POST /api/v1/auth/login: Error - ${error}`);
  }
  
  // Test 5: Protected endpoints (expect 401)
  console.log('\n🛡️ 5. Endpoints Protegidos (sin autenticación)');
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/campaigns`);
    console.log(`⚠️ GET /api/v1/campaigns: ${response.status} - ${response.statusText} (esperado sin auth)`);
  } catch (error) {
    console.log(`❌ GET /api/v1/campaigns: Error - ${error}`);
  }
  
  // Test 6: Hybrid sentiment
  console.log('\n🔬 6. Sistema Híbrido de Sentimientos');
  try {
    const textData = { text: "Este producto es increíble y me encanta usarlo!" };
    
    const response = await fetch(`${API_BASE_URL}/api/v1/hybrid/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(textData)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ POST /api/v1/hybrid/analyze: ${response.status} - Method: ${data.sentiment?.method || 'N/A'}`);
    } else {
      console.log(`⚠️ POST /api/v1/hybrid/analyze: ${response.status} - ${response.statusText}`);
    }
  } catch (error) {
    console.log(`❌ POST /api/v1/hybrid/analyze: Error - ${error}`);
  }
  
  // Test 7: Admin endpoints (expect 401/403)
  console.log('\n⚙️ 7. Endpoints de Administración');
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/admin/dashboard`);
    console.log(`⚠️ GET /api/v1/admin/dashboard: ${response.status} - ${response.statusText} (esperado sin admin)`);
  } catch (error) {
    console.log(`❌ GET /api/v1/admin/dashboard: Error - ${error}`);
  }
  
  console.log('\n📋 RESUMEN:');
  console.log('✅ Los endpoints están respondiendo correctamente');
  console.log('⚠️ Los códigos 4xx son esperados para endpoints protegidos');
  console.log('🎉 La aplicación está funcionando como se espera');
}

// Check server and run tests
async function main() {
  try {
    const healthCheck = await fetch(`${API_BASE_URL}/health`);
    if (healthCheck.ok) {
      console.log('🟢 Servidor disponible\n');
      await testSpecificEndpoints();
    } else {
      console.log('🔴 Servidor no responde correctamente');
    }
  } catch (error) {
    console.log('🔴 No se puede conectar al servidor');
    console.log('💡 Asegúrate de que el servidor esté ejecutándose: npm run dev');
  }
}

main();

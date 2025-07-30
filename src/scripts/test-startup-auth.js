#!/usr/bin/env node

/**
 * Script de prueba para verificar la autenticación de Twitter al inicio del servidor
 * Este script prueba el nuevo sistema donde Twitter se autentica durante el startup del servidor
 */

const axios = require('axios');

const baseUrl = 'http://localhost:3001/api/v1/scraping';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testStartupAuth() {
  console.log('🧪 Iniciando pruebas de autenticación al startup...\n');

  try {
    // 1. Verificar estado de autenticación al startup
    console.log('1️⃣ Verificando estado de autenticación al startup...');
    
    const statusResponse = await axios.get(`${baseUrl}/status`);
    const status = statusResponse.data;
    
    console.log('📊 Estado de autenticación:');
    console.log(`   - Startup Auth: ${status.data.real_scraper_status.startup_authentication.ready ? '✅ Listo' : '❌ Fallido'}`);
    console.log(`   - Runtime Monitor: ${status.data.real_scraper_status.authentication_monitoring.status === 'active' ? '✅ Activo' : '❌ Inactivo'}`);
    console.log(`   - Credenciales: ${status.data.real_scraper_status.startup_authentication.has_credentials ? '✅ Configuradas' : '❌ Faltantes'}`);
    
    if (status.data.real_scraper_status.startup_authentication.error) {
      console.log(`   - Error: ${status.data.real_scraper_status.startup_authentication.error}`);
    }
    
    console.log('');

    // 2. Si startup auth falló, intentar re-autenticación
    if (!status.data.real_scraper_status.startup_authentication.ready) {
      console.log('2️⃣ Autenticación inicial falló, intentando re-autenticación...');
      
      try {
        const reauthResponse = await axios.post(`${baseUrl}/reauth`);
        console.log(`   - Re-auth resultado: ${reauthResponse.data.success ? '✅ Exitoso' : '❌ Fallido'}`);
        console.log(`   - Mensaje: ${reauthResponse.data.message}`);
        
        if (reauthResponse.data.data.error) {
          console.log(`   - Error: ${reauthResponse.data.data.error}`);
        }
        
        // Esperar un poco y verificar estado nuevamente
        await delay(2000);
        const newStatusResponse = await axios.get(`${baseUrl}/status`);
        const newStatus = newStatusResponse.data;
        
        console.log('📊 Estado después de re-autenticación:');
        console.log(`   - Startup Auth: ${newStatus.data.real_scraper_status.startup_authentication.ready ? '✅ Listo' : '❌ Fallido'}`);
        
        if (newStatus.data.real_scraper_status.startup_authentication.error) {
          console.log(`   - Error: ${newStatus.data.real_scraper_status.startup_authentication.error}`);
        }
        
      } catch (reauthError) {
        console.log(`   - ❌ Error en re-autenticación: ${reauthError.message}`);
      }
      
      console.log('');
    }

    // 3. Probar scraping rápido con autenticación pre-hecha
    console.log('3️⃣ Probando scraping con autenticación pre-hecha...');
    
    const startTime = Date.now();
    
    try {
      const scrapingResponse = await axios.post(`${baseUrl}/scraping`, {
        query: 'machine learning',
        maxResults: 3,
        language: 'en'
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      console.log(`   - ✅ Scraping exitoso en ${responseTime}ms`);
      console.log(`   - Resultados: ${scrapingResponse.data.data.length} tweets`);
      console.log(`   - Primer tweet: "${scrapingResponse.data.data[0]?.text?.substring(0, 50) || 'N/A'}..."`);
      
      if (responseTime < 5000) {
        console.log('   - 🚀 ¡Respuesta rápida! (< 5 segundos)');
      } else {
        console.log('   - 🐌 Respuesta lenta (>= 5 segundos)');
      }
      
    } catch (scrapingError) {
      console.log(`   - ❌ Error en scraping: ${scrapingError.message}`);
      
      if (scrapingError.response?.data) {
        console.log(`   - Detalles: ${JSON.stringify(scrapingError.response.data, null, 2)}`);
      }
    }
    
    console.log('');

    // 4. Probar múltiples idiomas rápidamente
    console.log('4️⃣ Probando múltiples idiomas con autenticación pre-hecha...');
    
    const languages = ['en', 'es', 'fr', 'de'];
    const languageNames = {
      'en': 'Inglés',
      'es': 'Español', 
      'fr': 'Francés',
      'de': 'Alemán'
    };
    
    for (const lang of languages) {
      try {
        const langStartTime = Date.now();
        
        const response = await axios.post(`${baseUrl}/scraping`, {
          query: lang === 'en' ? 'technology' : 
                 lang === 'es' ? 'tecnología' :
                 lang === 'fr' ? 'technologie' : 'technologie',
          maxResults: 2,
          language: lang
        });
        
        const langEndTime = Date.now();
        const langResponseTime = langEndTime - langStartTime;
        
        console.log(`   - ${languageNames[lang]}: ✅ ${response.data.data.length} tweets en ${langResponseTime}ms`);
        
      } catch (langError) {
        console.log(`   - ${languageNames[lang]}: ❌ Error: ${langError.message}`);
      }
    }

    console.log('\n🎉 Pruebas de autenticación al startup completadas!');

  } catch (error) {
    console.error('❌ Error general en las pruebas:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Asegúrate de que el servidor esté ejecutándose en puerto 3001');
      console.log('   Ejecuta: npm run dev');
    }
  }
}

// Ejecutar las pruebas
testStartupAuth().catch(console.error);

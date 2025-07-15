/**
 * Database Connection Test Script
 * Script para verificar la conexión a MongoDB
 */

// Cargar variables de entorno primero
import '../lib/config/env';
import MongoDBConnection from '../lib/database/connection';
import { UserModel } from '../models/User.model';
import { TweetModel } from '../models/Tweet.model';
import { CampaignModel } from '../models/Campaign.model';

export async function testDatabaseConnection() {
  console.log('🔍 Iniciando prueba de conexión a la base de datos...');
  
  try {
    // 1. Conectar a MongoDB
    console.log('1️⃣ Conectando a MongoDB...');
    const db = MongoDBConnection.getInstance();
    await db.connect();
    console.log('✅ Conexión a MongoDB exitosa');

    // 2. Verificar estado de la conexión
    console.log('2️⃣ Verificando estado de la conexión...');
    const isReady = db.isConnectionReady();
    const healthCheck = await db.healthCheck();
    console.log(`📊 Estado de conexión: ${isReady ? 'CONECTADO' : 'DESCONECTADO'}`);
    console.log(`🏥 Health check: ${healthCheck ? 'SALUDABLE' : 'CON PROBLEMAS'}`);

    // 3. Obtener información de la base de datos
    console.log('3️⃣ Obteniendo información de la base de datos...');
    const mongoose = db.getConnection();
    const dbName = mongoose.connection.db?.databaseName || 'N/A';
    console.log(`📊 Nombre de la base de datos: ${dbName}`);

    // 4. Probar la creación de índices en los modelos
    console.log('4️⃣ Verificando índices de los modelos...');
    
    let userIndexes: unknown[] = [];
    let tweetIndexes: unknown[] = [];
    let campaignIndexes: unknown[] = [];

    try {
      console.log('   📋 Verificando modelo User...');
      userIndexes = await UserModel.listIndexes();
      console.log(`   ✅ User: ${userIndexes.length} índices encontrados`);
    } catch {
      console.log('   ℹ️ User: Colección no existe aún (normal en base de datos nueva)');
    }

    try {
      console.log('   📋 Verificando modelo Tweet...');
      tweetIndexes = await TweetModel.listIndexes();
      console.log(`   ✅ Tweet: ${tweetIndexes.length} índices encontrados`);
    } catch {
      console.log('   ℹ️ Tweet: Colección no existe aún (normal en base de datos nueva)');
    }

    try {
      console.log('   📋 Verificando modelo Campaign...');
      campaignIndexes = await CampaignModel.listIndexes();
      console.log(`   ✅ Campaign: ${campaignIndexes.length} índices encontrados`);
    } catch {
      console.log('   ℹ️ Campaign: Colección no existe aún (normal en base de datos nueva)');
    }

    // 5. Crear un usuario de prueba (temporal)
    console.log('5️⃣ Probando operaciones CRUD...');
    
    // Generar un email único para evitar duplicados
    const timestamp = Date.now();
    const testUser = new UserModel({
      email: `test${timestamp}@sentimentalsocial.com`,
      username: `test_user_${timestamp}`,
      displayName: 'Usuario de Prueba',
      passwordHash: 'hashedpassword123',
    });

    console.log('   📝 Guardando usuario de prueba...');
    const savedUser = await testUser.save();
    console.log(`   ✅ Usuario creado con ID: ${savedUser._id}`);

    // 6. Crear una campaña de prueba
    const testCampaign = new CampaignModel({
      name: `Campaña de Prueba ${timestamp}`,
      description: 'Esta es una campaña de prueba para verificar la conexión',
      keywords: ['test', 'prueba'],
      hashtags: ['testing', 'mongodb'],
      startDate: new Date(),
      createdBy: savedUser._id,
      status: 'draft',
    });

    console.log('   📝 Guardando campaña de prueba...');
    const savedCampaign = await testCampaign.save();
    console.log(`   ✅ Campaña creada con ID: ${savedCampaign._id}`);

    // 7. Crear un tweet de prueba
    const testTweet = new TweetModel({
      tweetId: `test${timestamp}`,
      content: 'Este es un tweet de prueba para verificar la conexión a MongoDB #testing',
      author: {
        id: `test_user_${timestamp}`,
        username: `test_user_${timestamp}`,
        displayName: 'Usuario Test',
      },
      tweetCreatedAt: new Date(),
      campaignId: savedCampaign._id,
      sentiment: {
        score: 0.8,
        classification: 'positive',
        confidence: 0.95,
      },
      engagement: {
        likes: 10,
        retweets: 5,
        replies: 2,
        shares: 1,
      },
    });

    console.log('   📝 Guardando tweet de prueba...');
    const savedTweet = await testTweet.save();
    console.log(`   ✅ Tweet creado con ID: ${savedTweet._id}`);

    // 8. Verificar relaciones
    console.log('6️⃣ Verificando relaciones entre modelos...');
    
    const campaignWithTweets = await CampaignModel.findById(savedCampaign._id);
    if (campaignWithTweets) {
      console.log(`   ✅ Campaña encontrada: ${campaignWithTweets.name}`);
    }

    const tweetsForCampaign = await TweetModel.find({ campaignId: savedCampaign._id });
    console.log(`   ✅ Tweets encontrados para la campaña: ${tweetsForCampaign.length}`);

    // 9. Limpiar datos de prueba
    console.log('7️⃣ Limpiando datos de prueba...');
    await TweetModel.findByIdAndDelete(savedTweet._id);
    await CampaignModel.findByIdAndDelete(savedCampaign._id);
    await UserModel.findByIdAndDelete(savedUser._id);
    console.log('   ✅ Datos de prueba eliminados');

    // 10. Estadísticas finales
    console.log('8️⃣ Estadísticas de la base de datos:');
    const userCount = await UserModel.countDocuments();
    const campaignCount = await CampaignModel.countDocuments();
    const tweetCount = await TweetModel.countDocuments();
    
    console.log(`   👥 Usuarios en la base de datos: ${userCount}`);
    console.log(`   📊 Campañas en la base de datos: ${campaignCount}`);
    console.log(`   🐦 Tweets en la base de datos: ${tweetCount}`);

    console.log('\n🎉 ¡Prueba de conexión completada exitosamente!');
    console.log('✅ La base de datos está funcionando correctamente');
    console.log('✅ Todos los modelos están configurados apropiadamente');
    console.log('✅ Las operaciones CRUD funcionan sin problemas');

    return {
      success: true,
      connection: isReady,
      dbName,
      healthCheck,
      stats: {
        users: userCount,
        campaigns: campaignCount,
        tweets: tweetCount,
      },
      indexes: {
        user: userIndexes.length,
        tweet: tweetIndexes.length,
        campaign: campaignIndexes.length,
      }
    };

  } catch (error) {
    console.error('❌ Error durante la prueba de conexión:');
    console.error(error);
    
    if (error instanceof Error) {
      console.error(`📝 Mensaje: ${error.message}`);
      if (error.stack) {
        console.error(`🔍 Stack trace: ${error.stack}`);
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  } finally {
    // Opcional: cerrar conexión al final
    // await MongoDBConnection.getInstance().disconnect();
  }
}

// Función auxiliar para ejecutar la prueba desde terminal
export async function runConnectionTest() {
  const result = await testDatabaseConnection();
  
  if (result.success) {
    console.log('\n📊 Resumen de la prueba:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🔗 Conexión: ${result.connection ? 'EXITOSA' : 'FALLIDA'}`);
    console.log(`🏥 Health Check: ${result.healthCheck ? 'SALUDABLE' : 'CON PROBLEMAS'}`);
    console.log(`📊 Base de datos: ${result.dbName || 'N/A'}`);
    console.log(`📈 Estadísticas:`);
    console.log(`   👥 Usuarios: ${result.stats?.users || 0}`);
    console.log(`   📊 Campañas: ${result.stats?.campaigns || 0}`);
    console.log(`   🐦 Tweets: ${result.stats?.tweets || 0}`);
    console.log(`🔍 Índices creados:`);
    console.log(`   User: ${result.indexes?.user || 0}`);
    console.log(`   Tweet: ${result.indexes?.tweet || 0}`);
    console.log(`   Campaign: ${result.indexes?.campaign || 0}`);
    process.exit(0);
  } else {
    console.log('\n❌ La prueba de conexión falló');
    console.log(`📝 Error: ${result.error}`);
    process.exit(1);
  }
}

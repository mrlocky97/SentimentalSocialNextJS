/**
 * Script completo para probar persistencia de datos
 */

import dotenv from "dotenv";
dotenv.config({ path: [".env.local", ".env"] });

import mongoose from "mongoose";
import DatabaseConnection from "../src/lib/database/connection";
import { TweetModel } from "../src/models/Tweet.model";
import { TweetDatabaseService } from "../src/services/tweet-database.service";
import { Tweet } from "../src/types/twitter";

async function testCompletePersistence() {
  console.log("🔍 Iniciando pruebas completas de persistencia...");
  
  try {
    // 1. Conectar a MongoDB
    console.log("\n1. 🔌 Conectando a MongoDB...");
    await DatabaseConnection.connect();
    const healthCheck = await DatabaseConnection.healthCheck();
    console.log("✅ Estado de conexión:", {
      connected: healthCheck.connected,
      database: healthCheck.database
    });
    
    // 2. Verificar estado inicial
    console.log("\n2. 📊 Estado inicial de la base de datos:");
    const initialCount = await TweetModel.countDocuments();
    console.log(`Tweets existentes: ${initialCount}`);
    
    // 3. Probar guardado directo con Mongoose
    console.log("\n3. 💾 Probando guardado directo con Mongoose...");
    
    const directTweet = new TweetModel({
      tweetId: `test_${Date.now()}`,
      content: "Tweet de prueba directo con Mongoose",
      author: {
        id: "direct_user_123",
        username: "directuser",
        displayName: "Direct User",
        verified: false,
        followersCount: 100,
        followingCount: 50,
        tweetsCount: 10,
      },
      metrics: {
        likes: 5,
        retweets: 2,
        replies: 1,
        quotes: 0,
        engagement: 0,
      },
      hashtags: ["test", "mongoose"],
      mentions: [],
      urls: [],
      mediaUrls: [],
      isRetweet: false,
      isReply: false,
      isQuote: false,
      language: "es",
      tweetCreatedAt: new Date(),
      scrapedAt: new Date(),
    });
    
    const savedDirectTweet = await directTweet.save();
    console.log("✅ Tweet directo guardado:", {
      id: savedDirectTweet._id,
      tweetId: savedDirectTweet.tweetId
    });
    
    // 4. Verificar que se guardó
    const countAfterDirect = await TweetModel.countDocuments();
    console.log(`📊 Tweets después del guardado directo: ${countAfterDirect}`);
    
    // 5. Probar el servicio TweetDatabaseService
    console.log("\n4. 🔧 Probando TweetDatabaseService...");
    const tweetService = new TweetDatabaseService();
    
    const serviceTweet: Tweet = {
      id: `service_${Date.now()}`,
      tweetId: `service_${Date.now()}`,
      content: "Tweet de prueba usando TweetDatabaseService",
      author: {
        id: "service_user_123",
        username: "serviceuser",
        displayName: "Service User",
        verified: false,
        followersCount: 200,
        followingCount: 100,
        tweetsCount: 20,
      },
      metrics: {
        likes: 10,
        retweets: 3,
        replies: 2,
        quotes: 1,
        engagement: 0,
      },
      hashtags: ["service", "test"],
      mentions: [],
      urls: [],
      mediaUrls: [],
      isRetweet: false,
      isReply: false,
      isQuote: false,
      language: "es",
      createdAt: new Date(),
      scrapedAt: new Date(),
      updatedAt: new Date(),
    };
    
    console.log("💾 Guardando con TweetDatabaseService...");
    const serviceResult = await tweetService.saveTweet(serviceTweet, "test-campaign");
    console.log("📊 Resultado del servicio:", serviceResult);
    
    // 6. Verificar después del servicio
    const countAfterService = await TweetModel.countDocuments();
    console.log(`📊 Tweets después del servicio: ${countAfterService}`);
    
    // 7. Probar guardado masivo
    console.log("\n5. 📦 Probando guardado masivo...");
    const bulkTweets: Tweet[] = [
      {
        id: `bulk_1_${Date.now()}`,
        tweetId: `bulk_1_${Date.now()}`,
        content: "Tweet bulk 1",
        author: {
          id: "bulk_user_1",
          username: "bulkuser1",
          displayName: "Bulk User 1",
          verified: false,
          followersCount: 50,
          followingCount: 25,
          tweetsCount: 5,
        },
        metrics: { likes: 1, retweets: 0, replies: 0, quotes: 0, engagement: 0 },
        hashtags: ["bulk", "test"],
        mentions: [],
        urls: [],
        mediaUrls: [],
        isRetweet: false,
        isReply: false,
        isQuote: false,
        language: "es",
        createdAt: new Date(),
        scrapedAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: `bulk_2_${Date.now()}`,
        tweetId: `bulk_2_${Date.now()}`,
        content: "Tweet bulk 2",
        author: {
          id: "bulk_user_2",
          username: "bulkuser2",
          displayName: "Bulk User 2",
          verified: false,
          followersCount: 75,
          followingCount: 40,
          tweetsCount: 8,
        },
        metrics: { likes: 2, retweets: 1, replies: 0, quotes: 0, engagement: 0 },
        hashtags: ["bulk", "test"],
        mentions: [],
        urls: [],
        mediaUrls: [],
        isRetweet: false,
        isReply: false,
        isQuote: false,
        language: "es",
        createdAt: new Date(),
        scrapedAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    
    console.log("💾 Guardando lote de tweets...");
    const bulkResult = await tweetService.saveTweetsBulk(bulkTweets, "bulk-test-campaign");
    console.log("📊 Resultado del guardado masivo:", {
      success: bulkResult.success,
      totalProcessed: bulkResult.totalProcessed,
      saved: bulkResult.saved,
      errors: bulkResult.errors,
      errorMessages: bulkResult.errorMessages
    });
    
    // 8. Verificar conteo final
    const finalCount = await TweetModel.countDocuments();
    console.log(`📊 Total de tweets al final: ${finalCount}`);
    
    // 9. Mostrar algunos tweets guardados
    if (finalCount > 0) {
      console.log("\n6. 📄 Tweets guardados:");
      const savedTweets = await TweetModel.find()
        .select('tweetId content author.username')
        .limit(5)
        .lean();
      
      savedTweets.forEach((tweet, index) => {
        console.log(`${index + 1}. ${tweet.tweetId} (@${tweet.author?.username}): ${tweet.content?.substring(0, 50)}...`);
      });
    }
    
    // 10. Verificar estadísticas
    console.log("\n7. 📈 Obteniendo estadísticas...");
    const stats = await tweetService.getStorageStats();
    console.log("Estadísticas finales:", stats);
    
    console.log("\n✅ ¡Todas las pruebas completadas exitosamente!");
    console.log(`🎯 Resumen: Se guardaron ${finalCount} tweets en total`);
    
  } catch (error) {
    console.error("\n❌ Error durante las pruebas:", error);
    
    if (error instanceof mongoose.Error.ValidationError) {
      console.error("📋 Errores de validación:");
      Object.keys(error.errors).forEach(field => {
        console.error(`  - ${field}: ${error.errors[field].message}`);
      });
    }
  } finally {
    await DatabaseConnection.disconnect();
    console.log("📴 Desconectado de MongoDB");
    process.exit(0);
  }
}

testCompletePersistence();

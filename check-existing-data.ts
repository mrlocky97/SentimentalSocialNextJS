/**
 * Script simple para verificar datos existentes en MongoDB
 */

import dotenv from "dotenv";
dotenv.config({ path: [".env.local", ".env"] });

import mongoose from "mongoose";
import { TweetModel } from "./src/models/Tweet.model";
import DatabaseConnection from "./src/lib/database/connection";

async function checkExistingData() {
  try {
    console.log("🔌 Conectando a MongoDB...");
    await DatabaseConnection.connect();
    
    // Contar documentos totales
    const totalCount = await TweetModel.countDocuments();
    console.log(`📊 Total de tweets en DB: ${totalCount}`);
    
    if (totalCount > 0) {
      // Obtener algunos ejemplos
      const sampleTweets = await TweetModel.find().limit(3).select('tweetId content author.username').lean();
      console.log("\n📄 Ejemplos de tweets existentes:");
      sampleTweets.forEach((tweet, index) => {
        console.log(`${index + 1}. ID: "${tweet.tweetId}" - Username: "${tweet.author?.username}" - Content: "${(tweet.content || '').substring(0, 50)}..."`);
      });
      
      // Verificar qué tipo de IDs tenemos
      console.log("\n🔍 Analizando tipos de tweetId...");
      const numericIds = await TweetModel.countDocuments({ tweetId: { $regex: /^\d+$/ } });
      const nonNumericIds = await TweetModel.countDocuments({ tweetId: { $not: { $regex: /^\d+$/ } } });
      
      console.log(`- IDs numéricos: ${numericIds}`);
      console.log(`- IDs no numéricos: ${nonNumericIds}`);
      
      if (nonNumericIds > 0) {
        const examples = await TweetModel.find({ tweetId: { $not: { $regex: /^\d+$/ } } })
          .limit(3)
          .select('tweetId')
          .lean();
        console.log("📋 Ejemplos de IDs no numéricos:");
        examples.forEach(tweet => {
          console.log(`  - "${tweet.tweetId}"`);
        });
      }
    } else {
      console.log("📭 No hay tweets en la base de datos");
    }
    
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await DatabaseConnection.disconnect();
    console.log("📴 Desconectado");
    process.exit(0);
  }
}

checkExistingData();

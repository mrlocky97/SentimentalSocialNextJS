// Test script for enhanced sentiment analysis
import { SentimentAnalysisService } from './src/services/sentiment-analysis.service';

async function testEnhancedSentimentAnalysis() {
  const service = new SentimentAnalysisService();

  // Test cases to verify our improvements in 4 languages
  const testCases = [
    {
      text: "I'm soooo happy!!! This is amazing :D",
      description: "English positive with repetitions and emoticons"
    },
    {
      text: "Me siento muy triste hoy :(  No puedo más...",
      description: "Spanish negative with emoticons"
    },
    {
      text: "This is absolutely terrible! I hate it so much!!! Disgusting!!!",
      description: "Strong negative with multiple emotions"
    },
    {
      text: "wow that's incredible! I'm so surprised and amazed",
      description: "Surprise and joy mixed"
    },
    {
      text: "No estoy nada contento con esto, qué asco",
      description: "Spanish negative with disgust"
    },
    {
      text: "can't believe this happened... i'm devastated and heartbroken",
      description: "Contractions with sadness"
    },
    {
      text: "xq haces esto??? me siento sperr mal T_T",
      description: "Spanish informal text with repetitions and emoticons"
    },
    {
      text: "Ich bin sehr glücklich! Das ist wunderbar und fantastisch!",
      description: "German positive with intensifiers"
    },
    {
      text: "Das ist schrecklich und furchtbar. Ich bin sehr enttäuscht.",
      description: "German negative with disappointment"
    },
    {
      text: "Je suis très heureux! C'est magnifique et extraordinaire!",
      description: "French positive with joy"
    },
    {
      text: "C'est terrible et dégoûtant. Je déteste ça complètement.",
      description: "French negative with disgust and hate"
    },
    {
      text: "Quelle surprise incroyable! Je suis totalement stupéfait!",
      description: "French surprise with amazement"
    }
  ];

  console.log('🧪 TESTING ENHANCED MULTILINGUAL SENTIMENT ANALYSIS SYSTEM\n');
  console.log('🌍 Supporting 4 languages: English, Spanish, German, French');
  console.log('=' .repeat(80));

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n📋 Test ${i + 1}: ${testCase.description}`);
    console.log(`📝 Text: "${testCase.text}"`);
    console.log('─'.repeat(60));
    
    try {
      const result = await service.analyze(testCase.text);
      
      console.log(`💭 Sentiment: ${result.sentiment.label} (${result.sentiment.score.toFixed(3)})`);
      console.log(`📊 Confidence: ${(result.sentiment.confidence * 100).toFixed(1)}%`);
      console.log(`🌍 Language: ${result.language.toUpperCase()}`);
      
      if (result.sentiment.emotions) {
        console.log(`🎭 Emotions:`);
        Object.entries(result.sentiment.emotions).forEach(([emotion, value]) => {
          if (typeof value === 'number' && value > 0.1) { // Only show significant emotions
            console.log(`   ${emotion}: ${(value * 100).toFixed(1)}%`);
          }
        });
      }
      
      if (result.keywords.length > 0) {
        console.log(`🔑 Keywords: ${result.keywords.slice(0, 5).join(', ')}`);
      }
      
    } catch (error) {
      console.error(`❌ Error: ${error}`);
    }
  }

  console.log('\n' + '=' .repeat(80));
  console.log('✅ Testing complete!');
}

// Run the test
testEnhancedSentimentAnalysis();

#!/usr/bin/env node

/**
 * Project Setup Script
 * Helps new developers configure the SentimentalSocial project
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function setupProject() {
  console.log('🚀 SentimentalSocial Project Setup');
  console.log('=====================================\n');

  // Check if .env.local exists
  const envPath = path.join(process.cwd(), '.env.local');
  
  if (!fs.existsSync(envPath)) {
    console.log('📝 Creating .env.local file...');
    
    const mongoUri = await askQuestion('Enter MongoDB URI (or press Enter for default): ');
    const defaultMongo = mongoUri || 'mongodb://localhost:27017/sentimentalsocial';
    
    const twitterUsername = await askQuestion('Twitter Username (optional): ');
    const twitterPassword = await askQuestion('Twitter Password (optional): ');
    const twitterEmail = await askQuestion('Twitter Email (optional): ');

    const envContent = `# Database Configuration
MONGODB_URI=${defaultMongo}

# Twitter API Credentials (Optional - for real scraping)
TWITTER_USERNAME=${twitterUsername}
TWITTER_PASSWORD=${twitterPassword}
TWITTER_EMAIL=${twitterEmail}
TWITTER_2FA_SECRET=

# Server Configuration
NODE_ENV=development
PORT=3001

# Security
JWT_SECRET=your_jwt_secret_here_change_in_production
BCRYPT_ROUNDS=12

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info

# API Configuration
API_BASE_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000

# OpenAI Configuration (Optional)
OPENAI_API_KEY=your_openai_api_key_here

# Analytics (Optional)
ANALYTICS_ENABLED=false
`;

    fs.writeFileSync(envPath, envContent);
    console.log('✅ Created .env.local file');
  } else {
    console.log('✅ .env.local already exists');
  }

  // Check if manual-cookies.json exists
  const cookiesPath = path.join(process.cwd(), 'manual-cookies.json');
  
  if (!fs.existsSync(cookiesPath)) {
    console.log('\n📝 Creating manual-cookies.json template...');
    
    const cookieTemplate = {
      "cookies": [
        {
          "name": "auth_token",
          "value": "your_auth_token_here",
          "domain": ".x.com",
          "path": "/",
          "secure": true,
          "httpOnly": true,
          "sameSite": "None"
        },
        {
          "name": "ct0",
          "value": "your_ct0_token_here",
          "domain": ".x.com",
          "path": "/",
          "secure": true,
          "httpOnly": false,
          "sameSite": "Lax"
        },
        {
          "name": "guest_id",
          "value": "your_guest_id_here",
          "domain": ".x.com",
          "path": "/",
          "secure": true,
          "httpOnly": false,
          "sameSite": "None"
        }
      ],
      "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "timestamp": null,
      "isValid": true
    };

    fs.writeFileSync(cookiesPath, JSON.stringify(cookieTemplate, null, 2));
    console.log('✅ Created manual-cookies.json template');
  } else {
    console.log('✅ manual-cookies.json already exists');
  }

  console.log('\n🎯 Setup Complete!');
  console.log('\nNext steps:');
  console.log('1. Install dependencies: npm install');
  console.log('2. Start MongoDB service');
  console.log('3. For real Twitter scraping: Edit manual-cookies.json with your Twitter cookies');
  console.log('4. Import cookies: node import-cookies.js');
  console.log('5. Start development server: npm run dev');
  console.log('\nFor detailed Twitter authentication setup, see: TWITTER_AUTHENTICATION.md');
  
  rl.close();
}

setupProject().catch(console.error);

#!/usr/bin/env node

/**
 * Twitter Credentials Encryption Utility
 * Script to encrypt Twitter credentials for secure storage
 */

import { credentialsEncryption } from '../src/lib/security/credentials-encryption';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

function askPassword(question: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(question);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    let password = '';

    process.stdin.on('data', (key) => {
      const char = key.toString();

      if (char === '\n' || char === '\r' || char === '\u0004') {
        // Enter or Ctrl+D
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdout.write('\n');
        resolve(password);
      } else if (char === '\u0003') {
        // Ctrl+C
        process.stdout.write('\n');
        process.exit(1);
      } else if (char === '\b' || char === '\u007f') {
        // Backspace
        if (password.length > 0) {
          password = password.slice(0, -1);
          process.stdout.write('\b \b');
        }
      } else {
        password += char;
        process.stdout.write('*');
      }
    });
  });
}

async function main() {
  console.log('🔒 Twitter Credentials Encryption Utility');
  console.log('==========================================\n');

  try {
    // Get Twitter credentials
    console.log('Enter your Twitter credentials to encrypt:');
    const email = await askQuestion('Twitter Email: ');
    const username = await askQuestion('Twitter Username: ');
    const password = await askPassword('Twitter Password: ');

    if (!email || !username || !password) {
      console.error('❌ All credentials are required');
      process.exit(1);
    }

    // Get or generate master password
    console.log('\nMaster password options:');
    console.log('1. Generate a secure master password');
    console.log('2. Enter your own master password');

    const choice = await askQuestion('Choose option (1 or 2): ');

    let masterPassword: string;

    if (choice === '1') {
      masterPassword = credentialsEncryption.generateMasterPassword();
      console.log('\n🔑 Generated master password:');
      console.log('📋 SAVE THIS SECURELY - YOU WILL NEED IT TO DECRYPT:');
      console.log(`   ${masterPassword}`);
      console.log('\n⚠️  Store this password in your password manager or secure location!');

      const confirm = await askQuestion('\nHave you saved the master password? (yes/no): ');
      if (confirm.toLowerCase() !== 'yes') {
        console.log('❌ Please save the master password before continuing');
        process.exit(1);
      }
    } else if (choice === '2') {
      masterPassword = await askPassword('Enter master password: ');

      const validation = credentialsEncryption.validateMasterPassword(masterPassword);
      if (!validation.valid) {
        console.log('\n❌ Master password validation failed:');
        validation.errors.forEach((error) => console.log(`   - ${error}`));
        process.exit(1);
      }
    } else {
      console.error('❌ Invalid choice');
      process.exit(1);
    }

    // Encrypt credentials
    console.log('\n🔄 Encrypting credentials...');
    const encrypted = credentialsEncryption.encryptTwitterCredentials(
      email,
      username,
      password,
      masterPassword
    );

    // Save encrypted credentials
    const outputPath = path.join(process.cwd(), 'encrypted-twitter-creds.json');
    fs.writeFileSync(outputPath, JSON.stringify(encrypted, null, 2));

    console.log(`✅ Credentials encrypted and saved to: ${outputPath}`);

    // Update .env.example
    const envExamplePath = path.join(process.cwd(), '.env.example');
    if (fs.existsSync(envExamplePath)) {
      let envContent = fs.readFileSync(envExamplePath, 'utf8');

      if (!envContent.includes('TWITTER_MASTER_PASSWORD')) {
        envContent += '\n# Twitter Credentials Encryption (Secure Method)\n';
        envContent += 'TWITTER_MASTER_PASSWORD=your-master-password-here\n';
        fs.writeFileSync(envExamplePath, envContent);
        console.log('📝 Updated .env.example with TWITTER_MASTER_PASSWORD');
      }
    }

    console.log('\n📋 Next steps:');
    console.log('1. Add TWITTER_MASTER_PASSWORD to your .env file');
    console.log('2. Remove TWITTER_EMAIL, TWITTER_USERNAME, TWITTER_PASSWORD from .env');
    console.log('3. Add encrypted-twitter-creds.json to .gitignore if not already there');
    console.log('\n🔒 Your Twitter credentials are now encrypted and secure!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n👋 Goodbye!');
  process.exit(0);
});

main();

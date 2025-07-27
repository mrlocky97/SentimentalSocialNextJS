#!/usr/bin/env node

/**
 * Production Readiness Validation Script
 * Validates that the project is ready for production deployment
 */

const fs = require('fs');
const path = require('path');

function validateProject() {
  console.log('🔍 Validating SentimentalSocial Production Readiness');
  console.log('===================================================\n');

  let isValid = true;
  const warnings = [];
  const errors = [];

  // Check required files
  const requiredFiles = [
    'package.json',
    'tsconfig.json', 
    'tsconfig.server.json',
    '.env.example',
    'manual-cookies.json',
    'import-cookies.js',
    'setup.js',
    'TWITTER_AUTHENTICATION.md',
    'README.md'
  ];

  console.log('📁 Checking required files...');
  requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`  ✅ ${file}`);
    } else {
      console.log(`  ❌ ${file} - MISSING`);
      errors.push(`Missing required file: ${file}`);
      isValid = false;
    }
  });

  // Check source structure
  console.log('\n📂 Checking source structure...');
  const requiredDirs = [
    'src',
    'src/routes',
    'src/services', 
    'src/types',
    'src/models',
    'src/middleware'
  ];

  requiredDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      console.log(`  ✅ ${dir}/`);
    } else {
      console.log(`  ❌ ${dir}/ - MISSING`);
      errors.push(`Missing required directory: ${dir}`);
      isValid = false;
    }
  });

  // Check key services
  console.log('\n🔧 Checking core services...');
  const coreServices = [
    'src/services/twitter-real-scraper.service.ts',
    'src/services/twitter-scraper.service.ts',
    'src/services/twitter-cookie-manager.service.ts',
    'src/services/tweet-sentiment-analysis.manager.ts'
  ];

  coreServices.forEach(service => {
    if (fs.existsSync(service)) {
      console.log(`  ✅ ${path.basename(service)}`);
    } else {
      console.log(`  ❌ ${path.basename(service)} - MISSING`);
      errors.push(`Missing core service: ${service}`);
      isValid = false;
    }
  });

  // Check environment setup
  console.log('\n⚙️  Checking environment configuration...');
  
  if (fs.existsSync('.env.local')) {
    console.log('  ✅ .env.local exists');
    
    // Check if MongoDB URI is configured
    const envContent = fs.readFileSync('.env.local', 'utf8');
    if (envContent.includes('MONGODB_URI=mongodb://')) {
      console.log('  ✅ MongoDB URI configured');
    } else {
      console.log('  ⚠️  MongoDB URI not properly configured');
      warnings.push('MongoDB URI should be properly configured in .env.local');
    }
  } else {
    console.log('  ⚠️  .env.local not found (will use defaults)');
    warnings.push('Create .env.local for custom configuration');
  }

  // Check package.json scripts
  console.log('\n📜 Checking package.json scripts...');
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const requiredScripts = ['dev', 'build', 'start', 'setup', 'import-cookies'];
  
  requiredScripts.forEach(script => {
    if (packageJson.scripts && packageJson.scripts[script]) {
      console.log(`  ✅ npm run ${script}`);
    } else {
      console.log(`  ❌ npm run ${script} - MISSING`);
      errors.push(`Missing npm script: ${script}`);
      isValid = false;
    }
  });

  // Check dependencies
  console.log('\n📦 Checking critical dependencies...');
  const criticalDeps = [
    '@the-convocation/twitter-scraper',
    'express',
    'mongoose',
    'swagger-jsdoc',
    'swagger-ui-express'
  ];

  criticalDeps.forEach(dep => {
    if (packageJson.dependencies && packageJson.dependencies[dep]) {
      console.log(`  ✅ ${dep}`);
    } else {
      console.log(`  ❌ ${dep} - MISSING`);
      errors.push(`Missing critical dependency: ${dep}`);
      isValid = false;
    }
  });

  // Check TypeScript configuration
  console.log('\n🔧 Checking TypeScript configuration...');
  if (fs.existsSync('tsconfig.server.json')) {
    console.log('  ✅ Server TypeScript config');
  } else {
    console.log('  ❌ Server TypeScript config - MISSING');
    errors.push('Missing tsconfig.server.json');
    isValid = false;
  }

  // Final validation
  console.log('\n' + '='.repeat(50));
  
  if (isValid) {
    console.log('🎉 PROJECT VALIDATION PASSED!');
    console.log('✅ Ready for production deployment');
    
    if (warnings.length > 0) {
      console.log('\n⚠️  Warnings (optional improvements):');
      warnings.forEach(warning => console.log(`  - ${warning}`));
    }
    
    console.log('\n🚀 Next steps:');
    console.log('  1. Run: npm install');
    console.log('  2. Run: npm run setup (if first time)');
    console.log('  3. Configure Twitter cookies (optional)');
    console.log('  4. Run: npm run dev');
    
  } else {
    console.log('❌ PROJECT VALIDATION FAILED!');
    console.log('🔧 Errors that must be fixed:');
    errors.forEach(error => console.log(`  - ${error}`));
    
    if (warnings.length > 0) {
      console.log('\n⚠️  Additional warnings:');
      warnings.forEach(warning => console.log(`  - ${warning}`));
    }
  }
  
  return isValid;
}

// Run validation
const isValid = validateProject();
process.exit(isValid ? 0 : 1);

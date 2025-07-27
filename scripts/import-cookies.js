/**
 * Quick Cookie Import Script
 */

const fs = require('fs');
const path = require('path');

// Simulate TwitterCookieManager functionality
function importCookies() {
  const manualCookiesPath = path.join(process.cwd(), 'manual-cookies.json');
  const targetCookiesPath = path.join(process.cwd(), 'cookies.json');

  try {
    if (!fs.existsSync(manualCookiesPath)) {
      console.log('❌ manual-cookies.json not found');
      return false;
    }

    const cookieData = JSON.parse(fs.readFileSync(manualCookiesPath, 'utf8'));
    
    // Add timestamp and expiration
    const sessionData = {
      ...cookieData,
      timestamp: Date.now(),
      expirationTime: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    };

    // Write to cookies.json (the file the system reads)
    fs.writeFileSync(targetCookiesPath, JSON.stringify(sessionData, null, 2));
    
    console.log('✅ Successfully imported manual cookies!');
    console.log('🍪 Saved', cookieData.cookies.length, 'cookies');
    console.log('📁 Saved to:', targetCookiesPath);
    console.log('⏰ Valid for 24 hours');
    
    // Show which cookies were imported
    cookieData.cookies.forEach(cookie => {
      console.log(`  - ${cookie.name}: ${cookie.value.substring(0, 20)}...`);
    });
    
    return true;
  } catch (error) {
    console.error('❌ Error importing cookies:', error.message);
    return false;
  }
}

// Run the import
importCookies();

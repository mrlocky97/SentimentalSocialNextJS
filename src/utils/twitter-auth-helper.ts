/**
 * Twitter Authentication Helper
 * Manual login tool to generate and save cookies
 */

import { TwitterCookieManager } from '../services/twitter-cookie-manager.service';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

interface AuthResult {
  success: boolean;
  message: string;
  cookiesSaved?: boolean;
}

export class TwitterAuthHelper {
  private cookieManager: TwitterCookieManager;

  constructor() {
    this.cookieManager = new TwitterCookieManager();
  }

  /**
   * Attempt manual Twitter authentication with improved error handling
   */
  async authenticateManually(): Promise<AuthResult> {
    console.log('🔐 Starting Twitter manual authentication...');
    
    try {
      // Import twitter scraper
      const { Scraper } = await import('@the-convocation/twitter-scraper');
      
      // Check if we already have valid cookies
      if (this.cookieManager.hasValidSession()) {
        console.log('✅ Found existing valid session cookies');
        return {
          success: true,
          message: 'Valid session already exists'
        };
      }

      // Get credentials
      const username = process.env.TWITTER_USERNAME;
      const password = process.env.TWITTER_PASSWORD;
      const email = process.env.TWITTER_EMAIL;

      if (!username || !password || !email) {
        return {
          success: false,
          message: 'Missing Twitter credentials in environment variables'
        };
      }

      console.log(`📧 Using email: ${email}`);
      console.log(`👤 Using username: ${username}`);

      // Create scraper with specific configuration for authentication
      const scraper = new Scraper({
        transform: {
          request: (input: any, init: any) => {
            if (init) {
              init.headers = {
                ...init.headers,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
              };
            }
            return [input, init];
          },
        },
      });

      console.log('⏳ Attempting login... (this may take 10-30 seconds)');
      
      // Add delay before login attempt
      await this.delay(2000);

      // Attempt login
      await scraper.login(username, password, email);
      
      console.log('✅ Login successful! Extracting cookies...');

      // Extract and save cookies
      await this.cookieManager.extractCookiesFromScraper(scraper);
      
      // Verify the cookies work
      const isLoggedIn = await scraper.isLoggedIn();
      
      if (isLoggedIn) {
        console.log('🍪 Cookies saved and verified successfully!');
        return {
          success: true,
          message: 'Authentication successful and cookies saved',
          cookiesSaved: true
        };
      } else {
        console.log('⚠️ Login completed but verification failed');
        return {
          success: false,
          message: 'Login completed but verification failed'
        };
      }

    } catch (error) {
      console.error('❌ Authentication error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('Forbidden')) {
          return {
            success: false,
            message: 'Twitter blocked the login attempt. Try again later or use different credentials.'
          };
        } else if (error.message.includes('rate limit')) {
          return {
            success: false,
            message: 'Rate limited. Please wait before trying again.'
          };
        } else if (error.message.includes('credentials')) {
          return {
            success: false,
            message: 'Invalid credentials. Please check username, password, and email.'
          };
        }
      }

      return {
        success: false,
        message: `Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Test existing cookies
   */
  async testExistingCookies(): Promise<AuthResult> {
    console.log('🧪 Testing existing cookies...');
    
    try {
      if (!this.cookieManager.hasValidSession()) {
        return {
          success: false,
          message: 'No valid session cookies found'
        };
      }

      const { Scraper } = await import('@the-convocation/twitter-scraper');
      
      const scraper = new Scraper({
        transform: {
          request: (input: any, init: any) => {
            // Add cookies manually to headers
            if (init && this.cookieManager.hasValidSession()) {
              const cookieHeader = this.cookieManager.getCookiesAsString();
              init.headers = {
                ...init.headers,
                'Cookie': cookieHeader,
              };
            }
            return [input, init];
          },
        },
      });

      const isLoggedIn = await scraper.isLoggedIn();
      
      if (isLoggedIn) {
        console.log('✅ Existing cookies are valid!');
        return {
          success: true,
          message: 'Existing cookies are valid and working'
        };
      } else {
        console.log('❌ Existing cookies are invalid');
        this.cookieManager.clearCookies();
        return {
          success: false,
          message: 'Existing cookies are invalid, cleared them'
        };
      }

    } catch (error) {
      console.error('❌ Cookie test error:', error);
      return {
        success: false,
        message: `Cookie test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get authentication status
   */
  getAuthStatus() {
    const hasSession = this.cookieManager.hasValidSession();
    const cookies = this.cookieManager.getCookies();
    
    return {
      hasValidSession: hasSession,
      cookieCount: cookies ? cookies.length : 0,
      sessionInfo: hasSession ? {
        timestamp: this.cookieManager.getSessionTimestamp(),
        userAgent: this.cookieManager.getUserAgent(),
        ageMinutes: this.cookieManager.getSessionAgeMinutes()
      } : null
    };
  }

  /**
   * Clear all cookies and session data
   */
  clearSession(): AuthResult {
    try {
      this.cookieManager.clearCookies();
      console.log('🧹 Session cleared successfully');
      return {
        success: true,
        message: 'Session cleared successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to clear session: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Import cookies from another project
   */
  importCookies(cookiesFilePath: string): AuthResult {
    try {
      if (!require('fs').existsSync(cookiesFilePath)) {
        return {
          success: false,
          message: `Cookies file not found: ${cookiesFilePath}`
        };
      }

      const cookiesData = require('fs').readFileSync(cookiesFilePath, 'utf8');
      const parsedData = JSON.parse(cookiesData);

      // Validate the structure
      if (!parsedData.cookies || !Array.isArray(parsedData.cookies)) {
        return {
          success: false,
          message: 'Invalid cookies file format'
        };
      }

      // Copy the file to our project
      require('fs').writeFileSync(
        require('path').join(process.cwd(), 'cookies.json'),
        cookiesData
      );

      // Reload cookies in our manager
      this.cookieManager = new TwitterCookieManager();

      console.log(`🍪 Imported ${parsedData.cookies.length} cookies successfully`);

      return {
        success: true,
        message: `Successfully imported ${parsedData.cookies.length} cookies`,
        cookiesSaved: true
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to import cookies: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI interface when run directly
if (require.main === module) {
  const helper = new TwitterAuthHelper();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'login':
      helper.authenticateManually().then(result => {
        console.log(`\n📋 Result: ${result.message}`);
        process.exit(result.success ? 0 : 1);
      });
      break;
      
    case 'test':
      helper.testExistingCookies().then(result => {
        console.log(`\n📋 Result: ${result.message}`);
        process.exit(result.success ? 0 : 1);
      });
      break;
      
    case 'status':
      const status = helper.getAuthStatus();
      console.log('\n📊 Authentication Status:');
      console.log(`   Valid Session: ${status.hasValidSession}`);
      console.log(`   Cookie Count: ${status.cookieCount}`);
      if (status.sessionInfo && status.sessionInfo.timestamp) {
        console.log(`   Session Created: ${new Date(status.sessionInfo.timestamp).toLocaleString()}`);
        console.log(`   Session Age: ${status.sessionInfo.ageMinutes} minutes`);
        console.log(`   User Agent: ${status.sessionInfo.userAgent}`);
      }
      break;
      
    case 'clear':
      const clearResult = helper.clearSession();
      console.log(`\n📋 Result: ${clearResult.message}`);
      break;
      
    case 'import':
      const filePath = process.argv[3];
      if (!filePath) {
        console.log('❌ Please provide the path to the cookies file');
        console.log('Usage: npm run auth import /path/to/cookies.json');
        process.exit(1);
      }
      const importResult = helper.importCookies(filePath);
      console.log(`\n📋 Result: ${importResult.message}`);
      process.exit(importResult.success ? 0 : 1);
      break;
      
    default:
      console.log('🔐 Twitter Authentication Helper');
      console.log('\nAvailable commands:');
      console.log('  npm run auth login  - Attempt manual login');
      console.log('  npm run auth test   - Test existing cookies');
      console.log('  npm run auth status - Show authentication status');
      console.log('  npm run auth clear  - Clear session');
      console.log('  npm run auth import <path> - Import cookies from file');
      break;
  }
}

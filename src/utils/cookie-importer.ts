/**
 * Interactive Cookie Importer
 * Helps users import Twitter cookies more easily
 */

import fs from 'fs';
import path from 'path';

export class CookieImporter {
  /**
   * Create a template cookies.json file for manual editing
   */
  static createTemplate(): void {
    const template = {
      cookies: [
        {
          name: 'auth_token',
          value: 'REPLACE_WITH_YOUR_AUTH_TOKEN',
          domain: '.twitter.com',
          path: '/',
          httpOnly: true,
          secure: true,
          sameSite: 'None',
        },
        {
          name: 'ct0',
          value: 'REPLACE_WITH_YOUR_CT0_TOKEN',
          domain: '.twitter.com',
          path: '/',
          httpOnly: false,
          secure: true,
          sameSite: 'Lax',
        },
        {
          name: 'twid',
          value: 'REPLACE_WITH_YOUR_TWID',
          domain: '.twitter.com',
          path: '/',
          httpOnly: true,
          secure: true,
          sameSite: 'None',
        },
        {
          name: '_twitter_sess',
          value: 'REPLACE_WITH_YOUR_TWITTER_SESS',
          domain: '.twitter.com',
          path: '/',
          httpOnly: true,
          secure: true,
          sameSite: 'None',
        },
      ],
      timestamp: Date.now(),
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      isValid: true,
      expirationTime: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    };

    const templatePath = path.join(process.cwd(), 'cookies-template.json');
    fs.writeFileSync(templatePath, JSON.stringify(template, null, 2));
  }

  /**
   * Validate a cookies file
   */
  static validateCookieFile(filePath: string): { valid: boolean; message: string; details?: any } {
    try {
      if (!fs.existsSync(filePath)) {
        return { valid: false, message: `File not found: ${filePath}` };
      }

      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);

      // Check basic structure
      if (!data.cookies || !Array.isArray(data.cookies)) {
        return { valid: false, message: 'Invalid format: missing cookies array' };
      }

      if (data.cookies.length === 0) {
        return { valid: false, message: 'No cookies found in file' };
      }

      // Check for essential cookies
      const cookieNames = data.cookies.map((c: any) => c.name);
      const requiredCookies = ['auth_token', 'ct0'];
      const missingRequired = requiredCookies.filter((name) => !cookieNames.includes(name));

      if (missingRequired.length > 0) {
        return {
          valid: false,
          message: `Missing required cookies: ${missingRequired.join(', ')}`,
          details: { found: cookieNames, missing: missingRequired },
        };
      }

      // Check for placeholder values
      const placeholderCookies = data.cookies.filter(
        (c: any) =>
          c.value.includes('REPLACE_WITH') || c.value.includes('YOUR_') || c.value.length < 10
      );

      if (placeholderCookies.length > 0) {
        return {
          valid: false,
          message: `Found placeholder values in: ${placeholderCookies.map((c: any) => c.name).join(', ')}`,
          details: { placeholders: placeholderCookies.map((c: any) => c.name) },
        };
      }

      // Check expiration
      const now = Date.now();
      if (data.expirationTime && data.expirationTime < now) {
        return {
          valid: false,
          message: 'Cookies have expired',
          details: { expired: new Date(data.expirationTime).toLocaleString() },
        };
      }

      return {
        valid: true,
        message: `Valid cookie file with ${data.cookies.length} cookies`,
        details: {
          cookieCount: data.cookies.length,
          cookieNames: cookieNames,
          timestamp: new Date(data.timestamp).toLocaleString(),
          expiration: data.expirationTime
            ? new Date(data.expirationTime).toLocaleString()
            : 'No expiration',
        },
      };
    } catch (error) {
      return {
        valid: false,
        message: `Error reading file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Convert browser exported cookies to our format
   */
  static convertBrowserCookies(
    browserCookiesPath: string,
    outputPath?: string
  ): { success: boolean; message: string } {
    try {
      const content = fs.readFileSync(browserCookiesPath, 'utf8');
      let browserData;

      // Try to parse different formats
      try {
        browserData = JSON.parse(content);
      } catch {
        return { success: false, message: 'Invalid JSON format' };
      }

      // Handle different browser export formats
      let cookies: any[] = [];

      // Chrome Cookie Editor format
      if (Array.isArray(browserData)) {
        cookies = browserData.filter(
          (cookie: any) => cookie.domain && cookie.domain.includes('twitter.com')
        );
      }
      // Other formats
      else if (browserData.cookies && Array.isArray(browserData.cookies)) {
        cookies = browserData.cookies.filter(
          (cookie: any) => cookie.domain && cookie.domain.includes('twitter.com')
        );
      } else {
        return { success: false, message: 'Unrecognized cookie format' };
      }

      if (cookies.length === 0) {
        return { success: false, message: 'No Twitter cookies found in the file' };
      }

      // Convert to our format
      const convertedData = {
        cookies: cookies.map((cookie) => ({
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain,
          path: cookie.path || '/',
          httpOnly: cookie.httpOnly || false,
          secure: cookie.secure || false,
          sameSite: cookie.sameSite || 'Lax',
        })),
        timestamp: Date.now(),
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        isValid: true,
        expirationTime: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      };

      const finalPath = outputPath || path.join(process.cwd(), 'cookies.json');
      fs.writeFileSync(finalPath, JSON.stringify(convertedData, null, 2));

      return {
        success: true,
        message: `Successfully converted ${cookies.length} cookies to ${finalPath}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error converting cookies: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Quick setup wizard
   */
  static setupWizard(): void {
    console.log('4. ❌ Exit\n');
  }
}

// CLI interface
if (require.main === module) {
  const command = process.argv[2];
  const filePath = process.argv[3];

  switch (command) {
    case 'template':
      CookieImporter.createTemplate();
      break;

    case 'validate':
      if (!filePath) {
        console.log('❌ Please provide a file path');
        process.exit(1);
      }
      const validation = CookieImporter.validateCookieFile(filePath);
      console.log(validation.valid ? '✅' : '❌', validation.message);
      if (validation.details) {
      }
      process.exit(validation.valid ? 0 : 1);
      break;

    case 'convert':
      if (!filePath) {
        console.log('❌ Please provide a file path');
        process.exit(1);
      }
      const conversion = CookieImporter.convertBrowserCookies(filePath);
      console.log(conversion.success ? '✅' : '❌', conversion.message);
      process.exit(conversion.success ? 0 : 1);
      break;

    case 'wizard':
      CookieImporter.setupWizard();
      break;

    default:
      break;
  }
}

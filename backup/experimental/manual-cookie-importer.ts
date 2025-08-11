/**
 * Manual Cookie Importer
 * Tool to easily import Twitter cookies into the system
 */

import { TwitterCookieManager } from '../services/twitter-cookie-manager.service';
import * as fs from 'fs';
import * as path from 'path';

export class ManualCookieImporter {
  private cookieManager: TwitterCookieManager;

  constructor() {
    this.cookieManager = new TwitterCookieManager();
  }

  /**
   * Import cookies from manual-cookies.json file
   */
  async importFromManualFile(): Promise<boolean> {
    const manualCookiesPath = path.join(process.cwd(), 'manual-cookies.json');

    try {
      if (!fs.existsSync(manualCookiesPath)) {
        return false;
      }

      const cookieData = JSON.parse(fs.readFileSync(manualCookiesPath, 'utf8'));

      // Validate that cookies have been filled in
      const hasValidCookies = cookieData.cookies.some(
        (cookie: any) => !cookie.value.includes('PEGA_AQUI')
      );

      if (!hasValidCookies) {
        return false;
      }

      // Set current timestamp
      cookieData.timestamp = Date.now();
      cookieData.expirationTime = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

      // Import into cookie manager
      this.cookieManager.storeCookies(cookieData.cookies, cookieData.userAgent);

      return true;
    } catch (error) {
      console.error('❌ Error importing cookies:', error);
      return false;
    }
  }

  /**
   * Import cookies from clipboard (JSON format)
   */
  async importFromJSON(cookiesJSON: string): Promise<boolean> {
    try {
      const cookieData = JSON.parse(cookiesJSON);

      cookieData.timestamp = Date.now();
      cookieData.expirationTime = Date.now() + 24 * 60 * 60 * 1000;

      this.cookieManager.storeCookies(cookieData.cookies, cookieData.userAgent);

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Quick test to verify cookies work
   */
  async testCookies(): Promise<boolean> {
    try {
      if (!this.cookieManager.hasValidSession()) {
        return false;
      }

      const status = this.cookieManager.getSessionStatus();

      return true;
    } catch (error) {
      return false;
    }
  }
}

// CLI usage
if (require.main === module) {
  const importer = new ManualCookieImporter();

  importer.importFromManualFile().then((success) => {
    if (success) {
      importer.testCookies();
    }
  });
}

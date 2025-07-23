/**
 * Twitter Authentication Routes
 * Separate authentication system for Twitter scraping
 */

import { Router, Request, Response } from 'express';
import { TwitterAuthHelper } from '../utils/twitter-auth-helper';
import { TwitterCookieManager } from '../services/twitter-cookie-manager.service';
import { authenticateToken, AuthenticatedRequest } from '../middleware/express-auth';
import fs from 'fs/promises';
import path from 'path';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Twitter Authentication
 *   description: Twitter authentication and session management for scraping
 */

/**
 * @swagger
 * /api/v1/twitter-auth/login:
 *   post:
 *     summary: Login to Twitter
 *     description: Authenticate with Twitter using environment credentials
 *     tags: [Twitter Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Authentication failed
 *       500:
 *         description: Server error
 */
router.post('/login', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log(`🔐 User ${req.user?.id} attempting Twitter login`);

    const authHelper = new TwitterAuthHelper();
    const result = await authHelper.authenticateManually();

    if (result.success) {
      res.json({
        success: true,
        message: 'Twitter authentication successful',
        cookiesSaved: result.cookiesSaved
      });
    } else {
      res.status(401).json({
        success: false,
        message: result.message || 'Authentication failed'
      });
    }
  } catch (error) {
    console.error('Twitter login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during Twitter authentication'
    });
  }
});

/**
 * @swagger
 * /api/v1/twitter-auth/import-cookies:
 *   post:
 *     summary: Import Twitter cookies manually
 *     description: Import Twitter session cookies extracted from browser
 *     tags: [Twitter Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cookiesFilePath:
 *                 type: string
 *                 description: Path to manual-cookies.json file
 *             required:
 *               - cookiesFilePath
 *     responses:
 *       200:
 *         description: Cookies imported successfully
 *       400:
 *         description: Invalid cookie format
 *       500:
 *         description: Server error
 */
router.post('/import-cookies', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log(`🍪 User ${req.user?.id} importing Twitter cookies`);

    // Use the manual cookie importer utility
    const { ManualCookieImporter } = await import('../utils/manual-cookie-importer');
    const importer = new ManualCookieImporter();
    const success = await importer.importFromManualFile();

    if (success) {
      res.json({
        success: true,
        message: 'Cookies imported successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to import cookies - check manual-cookies.json file'
      });
    }
  } catch (error) {
    console.error('Cookie import error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during cookie import'
    });
  }
});

/**
 * @swagger
 * /api/v1/twitter-auth/status:
 *   get:
 *     summary: Check Twitter authentication status
 *     description: Check if Twitter session is active and valid
 *     tags: [Twitter Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Authentication status retrieved
 */
router.get('/status', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const cookieManager = new TwitterCookieManager();
    const hasSession = cookieManager.hasValidSession();
    const cookies = cookieManager.getCookies();

    res.json({
      success: true,
      authenticated: hasSession,
      cookieCount: cookies ? cookies.length : 0,
      sessionValid: hasSession
    });
  } catch (error) {
    console.error('Twitter auth status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check authentication status'
    });
  }
});

/**
 * @swagger
 * /api/v1/twitter-auth/logout:
 *   post:
 *     summary: Logout from Twitter
 *     description: Clear Twitter session and cookies
 *     tags: [Twitter Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post('/logout', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log(`🚪 User ${req.user?.id} logging out from Twitter`);

    const cookieManager = new TwitterCookieManager();
    cookieManager.clearCookies();

    res.json({
      success: true,
      message: 'Twitter logout successful'
    });
  } catch (error) {
    console.error('Twitter logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to logout from Twitter'
    });
  }
});

/**
 * @swagger
 * /api/v1/twitter-auth/validate-cookies:
 *   get:
 *     summary: Validate current Twitter cookies
 *     description: Test if current Twitter session cookies are still valid
 *     tags: [Twitter Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cookie validation completed
 */
router.get('/validate-cookies', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log(`🧪 User ${req.user?.id} validating Twitter cookies`);

    const cookieManager = new TwitterCookieManager();
    const hasSession = cookieManager.hasValidSession();

    res.json({
      success: true,
      message: hasSession ? 'Cookies are valid' : 'No valid session found',
      valid: hasSession
    });
  } catch (error) {
    console.error('Twitter cookie validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate Twitter cookies'
    });
  }
});

/**
 * @swagger
 * /api/v1/twitter-auth/session-info:
 *   get:
 *     summary: Get detailed session information
 *     description: Get comprehensive information about current Twitter session
 *     tags: [Twitter Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Session information retrieved
 */
router.get('/session-info', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const cookieManager = new TwitterCookieManager();
    const cookies = cookieManager.getCookies();
    const hasSession = cookieManager.hasValidSession();

    // Check if manual cookies file exists
    const manualCookiesPath = path.join(process.cwd(), 'manual-cookies.json');
    let hasManualCookies = false;
    try {
      await fs.access(manualCookiesPath);
      hasManualCookies = true;
    } catch {
      hasManualCookies = false;
    }

    res.json({
      success: true,
      sessionInfo: {
        authenticated: hasSession,
        cookieCount: cookies ? cookies.length : 0,
        hasManualCookies,
        cookieNames: cookies ? cookies.map(c => c.name) : [],
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Twitter session info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve session information'
    });
  }
});

export default router;

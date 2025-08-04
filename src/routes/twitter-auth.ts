/**
 * Twitter Authentication Routes
 * Separate authentication system for Twitter scraping
 */

import { Router, Request, Response } from 'express';
// REMOVED: TwitterAuthHelper moved to backup (legacy manual auth)
// import { TwitterAuthHelper } from '../utils/twitter-auth-helper';
import { TwitterAuthManager } from '../services/twitter-auth-manager.service'; // Consolidated
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

    const authManager = TwitterAuthManager.getInstance();
    
    // Force re-initialization if needed
    await authManager.initializeOnStartup();
    const sessionInfo = authManager.getSessionInfo();

    if (sessionInfo.authenticated) {
      res.json({
        success: true,
        message: 'Twitter authentication successful',
        authenticated: true,
        cookieCount: sessionInfo.cookieCount
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Twitter authentication failed - check credentials'
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
// REMOVED: Manual cookie import endpoint (replaced by automatic TwitterAuthManager)
// This functionality is now handled automatically via TwitterAuthManager.initializeOnStartup()

/*
router.post('/import-cookies', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  // This endpoint has been removed - TwitterAuthManager handles authentication automatically
  res.status(410).json({
    success: false,
    message: 'Manual cookie import no longer supported - authentication is automatic'
  });
});
*/

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
    const authManager = TwitterAuthManager.getInstance();
    const sessionInfo = authManager.getSessionInfo();

    res.json({
      success: true,
      authenticated: sessionInfo.authenticated,
      cookieCount: sessionInfo.cookieCount,
      sessionValid: sessionInfo.authenticated,
      expiresAt: sessionInfo.expiresAt
    });
  } catch (error) {
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

    const authManager = TwitterAuthManager.getInstance();
    authManager.clearSession();

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

    const authManager = TwitterAuthManager.getInstance();
    const hasSession = authManager.hasValidSession();

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
    const authManager = TwitterAuthManager.getInstance();
    const sessionInfo = authManager.getSessionInfo();

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
        authenticated: sessionInfo.authenticated,
        cookieCount: sessionInfo.cookieCount,
        hasManualCookies,
        expiresAt: sessionInfo.expiresAt,
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

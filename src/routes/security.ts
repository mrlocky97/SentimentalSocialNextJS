/**
 * Security Status Routes
 * Endpoints for monitoring security status and token blacklist
 */

import { Router } from 'express';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../middleware/express-auth';
import { tokenBlacklistService } from '../lib/security/token-blacklist';

const router = Router();

/**
 * @swagger
 * /api/v1/security/status:
 *   get:
 *     summary: Get security system status
 *     description: Get overview of security systems and token blacklist statistics
 *     tags: [Security]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Security status retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     tokenBlacklist:
 *                       type: object
 *                       properties:
 *                         totalBlacklisted:
 *                           type: number
 *                         activeBlacklisted:
 *                           type: number
 *                         oldestEntry:
 *                           type: string
 *                           format: date-time
 *                     jwtSecurity:
 *                       type: object
 *                       properties:
 *                         secretConfigured:
 *                           type: boolean
 *                         tokenExpiry:
 *                           type: string
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *       403:
 *         description: Forbidden - admin access required
 */
router.get('/status', authenticateToken, requireRole(['admin']), (req: AuthenticatedRequest, res) => {
  try {
    const blacklistStats = tokenBlacklistService.getStats();
    
    const securityStatus = {
      tokenBlacklist: blacklistStats,
      jwtSecurity: {
        secretConfigured: !!process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32,
        tokenExpiry: process.env.JWT_EXPIRES_IN || '1h'
      },
      credentialsEncryption: {
        masterPasswordConfigured: !!process.env.TWITTER_MASTER_PASSWORD,
        encryptedCredsAvailable: require('fs').existsSync('encrypted-twitter-creds.json')
      },
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: securityStatus,
      message: 'Security status retrieved successfully'
    });

  } catch (error) {
    console.error('Security status error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve security status',
        code: 'SECURITY_STATUS_ERROR',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/security/blacklist-token:
 *   post:
 *     summary: Manually blacklist a token
 *     description: Manually add a token to the blacklist (admin only)
 *     tags: [Security]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - userId
 *             properties:
 *               token:
 *                 type: string
 *                 description: JWT token to blacklist
 *               userId:
 *                 type: string
 *                 description: User ID associated with token
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *                 description: Token expiration time (optional)
 *     responses:
 *       200:
 *         description: Token blacklisted successfully
 *       400:
 *         description: Invalid request
 *       403:
 *         description: Forbidden - admin access required
 */
router.post('/blacklist-token', authenticateToken, requireRole(['admin']), (req: AuthenticatedRequest, res) => {
  try {
    const { token, userId, expiresAt } = req.body;

    if (!token || !userId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Token and userId are required',
          code: 'MISSING_REQUIRED_FIELDS',
          timestamp: new Date().toISOString()
        }
      });
    }

    const tokenExpiresAt = expiresAt ? new Date(expiresAt) : new Date(Date.now() + 60 * 60 * 1000); // 1 hour default
    tokenBlacklistService.blacklistToken(token, userId, tokenExpiresAt);

    res.json({
      success: true,
      message: 'Token blacklisted successfully',
      data: {
        tokenBlacklisted: true,
        expiresAt: tokenExpiresAt.toISOString(),
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Manual token blacklist error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to blacklist token',
        code: 'BLACKLIST_TOKEN_ERROR',
        timestamp: new Date().toISOString()
      }
    });
  }
});

export default router;

/**
 * Twitter Authentication Middleware
 * Optional middleware to check Twitter authentication status
 */

import { NextFunction, Request, Response } from 'express';
import { TwitterAuthManager } from '../services/twitter-auth-manager.service';

// Extend Request interface to include Twitter auth info
export interface TwitterAuthenticatedRequest extends Request {
  twitterAuth?: {
    authenticated: boolean;
    hasValidSession: boolean;
    cookieCount: number;
  };
}

/**
 * Optional Twitter authentication check
 * Adds Twitter auth info to request but doesn't block the request
 */
export const checkTwitterAuth = async (
  req: TwitterAuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authManager = TwitterAuthManager.getInstance();
    const sessionInfo = authManager.getSessionInfo();

    // Add Twitter auth info to request
    req.twitterAuth = {
      authenticated: !!sessionInfo.authenticated,
      hasValidSession: !!sessionInfo.authenticated,
      cookieCount: sessionInfo.cookieCount || 0,
    };

    // Always continue to next middleware
    next();
  } catch (error) {
    console.error('Error checking Twitter auth:', error);

    // Set default values and continue
    req.twitterAuth = {
      authenticated: false,
      hasValidSession: false,
      cookieCount: 0,
    };

    next();
  }
};

/**
 * Require Twitter authentication
 * Blocks request if Twitter is not authenticated
 */
export const requireTwitterAuth = async (
  req: TwitterAuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authManager = TwitterAuthManager.getInstance();
    const sessionInfo = authManager.getSessionInfo();

    if (!sessionInfo.authenticated) {
      res.status(401).json({
        success: false,
        message: 'Twitter authentication required',
        error: 'NO_TWITTER_AUTH',
        suggestion:
          'Authenticate via /api/v1/twitter-auth/login (and ensure credentials or encrypted creds are configured)',
      });
      return;
    }

    // Add Twitter auth info to request
    req.twitterAuth = {
      authenticated: true,
      hasValidSession: true,
      cookieCount: sessionInfo.cookieCount || 0,
    };

    next();
  } catch (error) {
    console.error('Error requiring Twitter auth:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking Twitter authentication',
    });
  }
};

/**
 * Twitter authentication status utility
 */
export class TwitterAuthStatus {
  static async getStatus(): Promise<{
    authenticated: boolean;
    hasValidSession: boolean;
    cookieCount: number;
    suggestion?: string;
  }> {
    try {
      const authManager = TwitterAuthManager.getInstance();
      const sessionInfo = authManager.getSessionInfo();

      return {
        authenticated: !!sessionInfo.authenticated,
        hasValidSession: !!sessionInfo.authenticated,
        cookieCount: sessionInfo.cookieCount || 0,
        suggestion: sessionInfo.authenticated
          ? undefined
          : 'Authenticate via /api/v1/twitter-auth/login (configure TWITTER_* envs or encrypted creds)',
      };
    } catch (error) {
      console.error('Error getting Twitter auth status:', error);
      return {
        authenticated: false,
        hasValidSession: false,
        cookieCount: 0,
        suggestion: 'Error checking authentication status',
      };
    }
  }
}

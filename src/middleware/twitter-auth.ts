/**
 * Twitter Authentication Middleware
 * Optional middleware to check Twitter authentication status
 */

import { Request, Response, NextFunction } from 'express';
import { TwitterCookieManager } from '../services/twitter-cookie-manager.service';

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
    const cookieManager = new TwitterCookieManager();
    const hasValidSession = cookieManager.hasValidSession();
    const cookies = cookieManager.getCookies();

    // Add Twitter auth info to request
    req.twitterAuth = {
      authenticated: hasValidSession,
      hasValidSession,
      cookieCount: cookies ? cookies.length : 0
    };

    // Always continue to next middleware
    next();
  } catch (error) {
    console.error('Error checking Twitter auth:', error);
    
    // Set default values and continue
    req.twitterAuth = {
      authenticated: false,
      hasValidSession: false,
      cookieCount: 0
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
    const cookieManager = new TwitterCookieManager();
    const hasValidSession = cookieManager.hasValidSession();

    if (!hasValidSession) {
      res.status(401).json({
        success: false,
        message: 'Twitter authentication required',
        error: 'NO_TWITTER_AUTH',
        suggestion: 'Please authenticate with Twitter first using /api/v1/twitter-auth/login or /api/v1/twitter-auth/import-cookies'
      });
      return;
    }

    // Add Twitter auth info to request
    const cookies = cookieManager.getCookies();
    req.twitterAuth = {
      authenticated: true,
      hasValidSession: true,
      cookieCount: cookies ? cookies.length : 0
    };

    next();
  } catch (error) {
    console.error('Error requiring Twitter auth:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking Twitter authentication'
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
      const cookieManager = new TwitterCookieManager();
      const hasValidSession = cookieManager.hasValidSession();
      const cookies = cookieManager.getCookies();

      return {
        authenticated: hasValidSession,
        hasValidSession,
        cookieCount: cookies ? cookies.length : 0,
        suggestion: hasValidSession 
          ? undefined 
          : 'Please authenticate with Twitter using /api/v1/twitter-auth/login or /api/v1/twitter-auth/import-cookies'
      };
    } catch (error) {
      console.error('Error getting Twitter auth status:', error);
      return {
        authenticated: false,
        hasValidSession: false,
        cookieCount: 0,
        suggestion: 'Error checking authentication status'
      };
    }
  }
}

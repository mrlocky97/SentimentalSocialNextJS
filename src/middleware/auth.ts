/**
 * Authentication Middleware
 * Following Single Responsibility Principle - only handles authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '../types/api';

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string;
    email: string;
    username: string;
  };
}

/**
 * JWT Token verification (mock implementation)
 */
function verifyToken(token: string): { userId: string; email: string; username: string } | null {
  try {
    // In a real app, you would verify the JWT token here
    // For now, just return a mock user
    if (token === 'valid-token') {
      return {
        userId: '1',
        email: 'user@example.com',
        username: 'testuser',
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Authentication middleware
 */
export function withAuth(handler: (req: AuthenticatedRequest) => Promise<NextResponse>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const authHeader = request.headers.get('authorization');
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Missing or invalid authorization header',
          },
          timestamp: new Date().toISOString(),
        }, { status: 401 });
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      const user = verifyToken(token);

      if (!user) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired token',
          },
          timestamp: new Date().toISOString(),
        }, { status: 401 });
      }

      // Add user to request
      const authenticatedRequest = request as AuthenticatedRequest;
      authenticatedRequest.user = {
        id: user.userId,
        email: user.email,
        username: user.username,
      };

      return await handler(authenticatedRequest);

    } catch (error) {
      console.error('Authentication error:', error);
      
      return NextResponse.json<ApiResponse>({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
        timestamp: new Date().toISOString(),
      }, { status: 500 });
    }
  };
}

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
export function withOptionalAuth(handler: (req: AuthenticatedRequest) => Promise<NextResponse>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const authHeader = request.headers.get('authorization');
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const user = verifyToken(token);

        if (user) {
          const authenticatedRequest = request as AuthenticatedRequest;
          authenticatedRequest.user = {
            id: user.userId,
            email: user.email,
            username: user.username,
          };
        }
      }

      return await handler(request as AuthenticatedRequest);

    } catch (error) {
      console.error('Optional authentication error:', error);
      // Continue without authentication on error
      return await handler(request as AuthenticatedRequest);
    }
  };
}

/**
 * Rate limiting middleware
 */
interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
}

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function withRateLimit(options: RateLimitOptions) {
  return function(handler: (req: NextRequest) => Promise<NextResponse>) {
    return async (request: NextRequest): Promise<NextResponse> => {
      try {
        const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
        const now = Date.now();
        const key = `${clientIP}-${Math.floor(now / options.windowMs)}`;

        const current = rateLimitStore.get(key) || { count: 0, resetTime: now + options.windowMs };

        if (current.count >= options.maxRequests) {
          return NextResponse.json<ApiResponse>({
            success: false,
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Too many requests, please try again later',
            },
            timestamp: new Date().toISOString(),
          }, { 
            status: 429,
            headers: {
              'X-RateLimit-Limit': options.maxRequests.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': current.resetTime.toString(),
            }
          });
        }

        current.count++;
        rateLimitStore.set(key, current);

        // Clean up old entries
        if (Math.random() < 0.01) { // 1% chance to clean up
          for (const [key, value] of rateLimitStore.entries()) {
            if (value.resetTime < now) {
              rateLimitStore.delete(key);
            }
          }
        }

        const response = await handler(request);
        
        // Add rate limit headers
        response.headers.set('X-RateLimit-Limit', options.maxRequests.toString());
        response.headers.set('X-RateLimit-Remaining', (options.maxRequests - current.count).toString());
        response.headers.set('X-RateLimit-Reset', current.resetTime.toString());

        return response;

      } catch (error) {
        console.error('Rate limiting error:', error);
        return await handler(request);
      }
    };
  };
}

/**
 * CORS middleware
 */
export function withCORS(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    const response = await handler(request);

    // Add CORS headers to response
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    return response;
  };
}

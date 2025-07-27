/**
 * Express JWT Authentication Middleware
 * Handles JWT token verification and user authentication for Express routes
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend Request interface to include user
export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: string;
        fullName: string;
    };
}

interface JwtPayload {
    id: string;
    email: string;
    role: string;
    fullName: string;
    iat?: number;
    exp?: number;
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

/**
 * Middleware to verify JWT tokens
 */
export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        res.status(401).json({
            success: false,
            error: {
                message: 'Access token is required',
                code: 'TOKEN_REQUIRED',
                timestamp: new Date().toISOString(),
            },
        });
        return;
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
        req.user = {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role,
            fullName: decoded.fullName,
        };
        next();
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            res.status(401).json({
                success: false,
                error: {
                    message: 'Access token has expired',
                    code: 'TOKEN_EXPIRED',
                    timestamp: new Date().toISOString(),
                },
            });
            return;
        }

        if (error instanceof jwt.JsonWebTokenError) {
            res.status(401).json({
                success: false,
                error: {
                    message: 'Invalid access token',
                    code: 'INVALID_TOKEN',
                    timestamp: new Date().toISOString(),
                },
            });
            return;
        }

        res.status(500).json({
            success: false,
            error: {
                message: 'Token verification failed',
                code: 'TOKEN_VERIFICATION_FAILED',
                timestamp: new Date().toISOString(),
            },
        });
    }
};

/**
 * Middleware to check user roles
 */
export const requireRole = (allowedRoles: string[]) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: {
                    message: 'Authentication required',
                    code: 'AUTHENTICATION_REQUIRED',
                    timestamp: new Date().toISOString(),
                },
            });
            return;
        }

        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({
                success: false,
                error: {
                    message: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
                    code: 'INSUFFICIENT_PERMISSIONS',
                    timestamp: new Date().toISOString(),
                    requiredRoles: allowedRoles,
                    userRole: req.user.role,
                },
            });
            return;
        }

        next();
    };
};

/**
 * Optional authentication middleware - doesn't fail if no token
 */
export const optionalAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        next();
        return;
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
        req.user = {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role,
            fullName: decoded.fullName,
        };
    } catch {
        // Silently ignore invalid tokens for optional auth
    }

    next();
};

/**
 * Generate JWT token
 */
export const generateToken = (payload: Omit<JwtPayload, 'iat' | 'exp'>): string => {
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: '1h', // 1 hour
    });
};

/**
 * Generate refresh token
 */
export const generateRefreshToken = (payload: Omit<JwtPayload, 'iat' | 'exp'>): string => {
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: '7d', // 7 days
    });
};

/**
 * Verify refresh token
 */
export const verifyRefreshToken = (token: string): JwtPayload | null => {
    try {
        return jwt.verify(token, JWT_SECRET) as JwtPayload;
    } catch {
        return null;
    }
};

/**
 * Admin only middleware
 */
export const requireAdmin = requireRole(['admin']);

/**
 * Manager or Admin middleware
 */
export const requireManagerOrAdmin = requireRole(['manager', 'admin']);

/**
 * Analyst or higher middleware
 */
export const requireAnalystOrHigher = requireRole(['analyst', 'manager', 'admin']);

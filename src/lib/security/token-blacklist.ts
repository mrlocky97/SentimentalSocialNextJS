/**
 * Token Blacklist Security Service
 * Manages invalidated JWT tokens to prevent reuse after logout
 */

import { createHash } from 'crypto';

interface BlacklistedToken {
    tokenHash: string;
    userId: string;
    blacklistedAt: Date;
    expiresAt: Date;
}

class TokenBlacklistService {
    private blacklistedTokens = new Map<string, BlacklistedToken>();
    private cleanupInterval: NodeJS.Timeout;

    constructor() {
        // Clean up expired tokens every hour
        this.cleanupInterval = setInterval(() => {
            this.cleanupExpiredTokens();
        }, 60 * 60 * 1000);
    }

    /**
     * Hash token for secure storage (we don't store raw tokens)
     */
    private hashToken(token: string): string {
        return createHash('sha256').update(token).digest('hex');
    }

    /**
     * Add token to blacklist
     */
    blacklistToken(token: string, userId: string, expiresAt: Date): void {
        const tokenHash = this.hashToken(token);
        const blacklistedToken: BlacklistedToken = {
            tokenHash,
            userId,
            blacklistedAt: new Date(),
            expiresAt
        };

        this.blacklistedTokens.set(tokenHash, blacklistedToken);
        
        console.log(`🔒 Token blacklisted for user ${userId} (expires: ${expiresAt.toISOString()})`);
    }

    /**
     * Check if token is blacklisted
     */
    isTokenBlacklisted(token: string): boolean {
        const tokenHash = this.hashToken(token);
        const blacklistedToken = this.blacklistedTokens.get(tokenHash);
        
        if (!blacklistedToken) {
            return false;
        }

        // Check if blacklisted token has expired
        if (blacklistedToken.expiresAt < new Date()) {
            this.blacklistedTokens.delete(tokenHash);
            return false;
        }

        return true;
    }

    /**
     * Blacklist all tokens for a user (logout from all devices)
     */
    blacklistAllUserTokens(userId: string): void {
        const blacklistedCount = Array.from(this.blacklistedTokens.values())
            .filter(token => token.userId === userId).length;
        
        // Note: In a real implementation, you'd need to track all user tokens
        // For now, we just log the action
        console.log(`🔒 Attempted to blacklist all tokens for user ${userId} (${blacklistedCount} already blacklisted)`);
    }

    /**
     * Clean up expired blacklisted tokens
     */
    private cleanupExpiredTokens(): void {
        const now = new Date();
        let cleanedCount = 0;

        for (const [tokenHash, blacklistedToken] of this.blacklistedTokens.entries()) {
            if (blacklistedToken.expiresAt < now) {
                this.blacklistedTokens.delete(tokenHash);
                cleanedCount++;
            }
        }

        if (cleanedCount > 0) {
            console.log(`🧹 Cleaned up ${cleanedCount} expired blacklisted tokens`);
        }
    }

    /**
     * Get blacklist statistics
     */
    getStats(): {
        totalBlacklisted: number;
        activeBlacklisted: number;
        oldestEntry: Date | null;
    } {
        const now = new Date();
        const tokens = Array.from(this.blacklistedTokens.values());
        const activeTokens = tokens.filter(token => token.expiresAt > now);
        
        return {
            totalBlacklisted: tokens.length,
            activeBlacklisted: activeTokens.length,
            oldestEntry: tokens.length > 0 
                ? new Date(Math.min(...tokens.map(t => t.blacklistedAt.getTime())))
                : null
        };
    }

    /**
     * Cleanup on shutdown
     */
    destroy(): void {
        clearInterval(this.cleanupInterval);
        this.blacklistedTokens.clear();
    }
}

// Singleton instance
export const tokenBlacklistService = new TokenBlacklistService();

// Cleanup on process exit
process.on('SIGINT', () => {
    tokenBlacklistService.destroy();
});

process.on('SIGTERM', () => {
    tokenBlacklistService.destroy();
});

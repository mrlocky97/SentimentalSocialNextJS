/**
 * Token Service
 * Handles password reset tokens and email verification tokens
 */

import * as crypto from "crypto";
import * as jwt from "jsonwebtoken";

export interface ResetTokenPayload {
  userId: string;
  email: string;
  type: "password-reset" | "email-verification";
  expiresAt: Date;
}

export interface VerificationTokenPayload {
  userId: string;
  email: string;
  type: "email-verification";
  expiresAt: Date;
}

export class TokenService {
  private readonly SECRET = process.env.JWT_SECRET || "fallback-secret";
  private readonly RESET_TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour
  private readonly VERIFICATION_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Generate password reset token
   */
  generatePasswordResetToken(userId: string, email: string): string {
    const payload: ResetTokenPayload = {
      userId,
      email,
      type: "password-reset",
      expiresAt: new Date(Date.now() + this.RESET_TOKEN_EXPIRY),
    };

    return jwt.sign(payload, this.SECRET, {
      expiresIn: "1h",
      issuer: "sentimentalsocial",
      subject: "password-reset",
    });
  }

  /**
   * Generate email verification token
   */
  generateEmailVerificationToken(userId: string, email: string): string {
    const payload: VerificationTokenPayload = {
      userId,
      email,
      type: 'email-verification',
      expiresAt: new Date(Date.now() + this.VERIFICATION_TOKEN_EXPIRY)
    };

    return jwt.sign(payload, this.SECRET, {
      expiresIn: '24h',
      issuer: 'sentimentalsocial',
      subject: 'email-verification'
    });
  }

  /**
   * Verify password reset token
   */
  verifyPasswordResetToken(token: string): ResetTokenPayload {
    try {
      const decoded = jwt.verify(token, this.SECRET, {
        issuer: 'sentimentalsocial',
        subject: 'password-reset'
      }) as ResetTokenPayload;

      if (decoded.type !== 'password-reset') {
        throw new Error('Invalid token type');
      }

      if (new Date() > new Date(decoded.expiresAt)) {
        throw new Error('Token expired');
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid reset token');
      }
      throw error;
    }
  }

  /**
   * Verify email verification token
   */
  verifyEmailVerificationToken(token: string): VerificationTokenPayload {
    try {
      const decoded = jwt.verify(token, this.SECRET, {
        issuer: 'sentimentalsocial',
        subject: 'email-verification'
      }) as VerificationTokenPayload;

      if (decoded.type !== 'email-verification') {
        throw new Error('Invalid token type');
      }

      if (new Date() > new Date(decoded.expiresAt)) {
        throw new Error('Token expired');
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid verification token');
      }
      throw error;
    }
  }

  /**
   * Generate secure random token (alternative to JWT for simpler use cases)
   */
  generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}

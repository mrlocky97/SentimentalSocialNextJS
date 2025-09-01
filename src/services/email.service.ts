/**
 * Email Service
 * Handles sending emails for password reset and email verification
 */

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export class EmailService {
  private readonly FROM_EMAIL =
    process.env.FROM_EMAIL || "noreply@sentimentalsocial.com";
  private readonly APP_URL = process.env.APP_URL || "http://localhost:3000";

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
  ): Promise<boolean> {
    try {
      const resetUrl = `${this.APP_URL}/reset-password?token=${resetToken}`;

      const emailOptions: EmailOptions = {
        to: email,
        subject: "Password Reset - SentimentalSocial",
        text: `
Hello,

You requested a password reset for your SentimentalSocial account.

Click the following link to reset your password:
${resetUrl}

This link will expire in 1 hour.

If you did not request this password reset, please ignore this email.

Best regards,
SentimentalSocial Team
        `,
        html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #333;">Password Reset Request</h2>
  <p>Hello,</p>
  <p>You requested a password reset for your SentimentalSocial account.</p>
  <p>Click the button below to reset your password:</p>
  <div style="text-align: center; margin: 20px 0;">
    <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a>
  </div>
  <p><small>Or copy and paste this link: ${resetUrl}</small></p>
  <p><strong>This link will expire in 1 hour.</strong></p>
  <p>If you did not request this password reset, please ignore this email.</p>
  <hr>
  <p><small>Best regards,<br>SentimentalSocial Team</small></p>
</div>
        `,
      };

      // For now, we'll just log the email instead of actually sending it
      // In production, you would integrate with a service like SendGrid, AWS SES, etc.
      console.log("📧 Password reset email would be sent to:", email);
      console.log("🔗 Reset URL:", resetUrl);
      console.log("📄 Email content:", emailOptions);

      return true;
    } catch (error) {
      console.error("Failed to send password reset email:", error);
      return false;
    }
  }

  /**
   * Send email verification email
   */
  async sendEmailVerificationEmail(
    email: string,
    verificationToken: string,
  ): Promise<boolean> {
    try {
      const verificationUrl = `${this.APP_URL}/verify-email?token=${verificationToken}`;

      const emailOptions: EmailOptions = {
        to: email,
        subject: "Email Verification - SentimentalSocial",
        text: `
Hello,

Welcome to SentimentalSocial! Please verify your email address to complete your account setup.

Click the following link to verify your email:
${verificationUrl}

This link will expire in 24 hours.

If you did not create this account, please ignore this email.

Best regards,
SentimentalSocial Team
        `,
        html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #333;">Welcome to SentimentalSocial!</h2>
  <p>Hello,</p>
  <p>Thank you for creating an account with SentimentalSocial. Please verify your email address to complete your account setup.</p>
  <div style="text-align: center; margin: 20px 0;">
    <a href="${verificationUrl}" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Verify Email</a>
  </div>
  <p><small>Or copy and paste this link: ${verificationUrl}</small></p>
  <p><strong>This link will expire in 24 hours.</strong></p>
  <p>If you did not create this account, please ignore this email.</p>
  <hr>
  <p><small>Best regards,<br>SentimentalSocial Team</small></p>
</div>
        `,
      };

      // For now, we'll just log the email instead of actually sending it
      console.log("📧 Verification email would be sent to:", email);
      console.log("🔗 Verification URL:", verificationUrl);
      console.log("📄 Email content:", emailOptions);

      return true;
    } catch (error) {
      console.error("Failed to send verification email:", error);
      return false;
    }
  }

  /**
   * Send generic email
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      // For now, we'll just log the email
      console.log("📧 Email would be sent:", options);
      return true;
    } catch (error) {
      console.error("Failed to send email:", error);
      return false;
    }
  }
}

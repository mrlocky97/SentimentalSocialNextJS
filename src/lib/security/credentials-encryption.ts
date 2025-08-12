/**
 * Credentials Encryption Service
 * Encrypts sensitive credentials using AES-256-GCM
 */

import { createCipher, createDecipher, randomBytes, createHash } from "crypto";

interface EncryptedCredentials {
  encrypted: string;
  iv: string;
  tag: string;
}

class CredentialsEncryptionService {
  private readonly algorithm = "aes-256-gcm";
  private readonly keyDerivationSalt = "sentimentalsocial-salt-2025";

  /**
   * Derive encryption key from master password
   */
  private deriveKey(masterPassword: string): Buffer {
    return createHash("sha256")
      .update(masterPassword + this.keyDerivationSalt)
      .digest();
  }

  /**
   * Encrypt credentials
   */
  encrypt(plaintext: string, masterPassword: string): EncryptedCredentials {
    try {
      const key = this.deriveKey(masterPassword);
      const iv = randomBytes(16);

      const cipher = createCipher(this.algorithm, key);

      let encrypted = cipher.update(plaintext, "utf8", "hex");
      encrypted += cipher.final("hex");

      // Get authentication tag for GCM mode
      const tag = (cipher as any).getAuthTag
        ? (cipher as any).getAuthTag().toString("hex")
        : "";

      return {
        encrypted,
        iv: iv.toString("hex"),
        tag,
      };
    } catch (error) {
      console.error("🔒 Encryption error:", error);
      throw new Error("Failed to encrypt credentials");
    }
  }

  /**
   * Decrypt credentials
   */
  decrypt(encryptedData: EncryptedCredentials, masterPassword: string): string {
    try {
      const key = this.deriveKey(masterPassword);
      const decipher = createDecipher(this.algorithm, key);

      // Set auth tag for GCM mode
      if (encryptedData.tag && (decipher as any).setAuthTag) {
        (decipher as any).setAuthTag(Buffer.from(encryptedData.tag, "hex"));
      }

      let decrypted = decipher.update(encryptedData.encrypted, "hex", "utf8");
      decrypted += decipher.final("utf8");

      return decrypted;
    } catch (error) {
      console.error("🔒 Decryption error:", error);
      throw new Error(
        "Failed to decrypt credentials - invalid master password or corrupted data",
      );
    }
  }

  /**
   * Encrypt Twitter credentials safely
   */
  encryptTwitterCredentials(
    email: string,
    username: string,
    password: string,
    masterPassword: string,
  ): {
    email: EncryptedCredentials;
    username: EncryptedCredentials;
    password: EncryptedCredentials;
  } {
    return {
      email: this.encrypt(email, masterPassword),
      username: this.encrypt(username, masterPassword),
      password: this.encrypt(password, masterPassword),
    };
  }

  /**
   * Decrypt Twitter credentials safely
   */
  decryptTwitterCredentials(
    encryptedCredentials: {
      email: EncryptedCredentials;
      username: EncryptedCredentials;
      password: EncryptedCredentials;
    },
    masterPassword: string,
  ): {
    email: string;
    username: string;
    password: string;
  } {
    return {
      email: this.decrypt(encryptedCredentials.email, masterPassword),
      username: this.decrypt(encryptedCredentials.username, masterPassword),
      password: this.decrypt(encryptedCredentials.password, masterPassword),
    };
  }

  /**
   * Generate a secure master password
   */
  generateMasterPassword(): string {
    return randomBytes(32).toString("base64");
  }

  /**
   * Validate master password strength
   */
  validateMasterPassword(password: string): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (password.length < 16) {
      errors.push("Master password must be at least 16 characters long");
    }

    if (!/[A-Z]/.test(password)) {
      errors.push("Master password must contain at least one uppercase letter");
    }

    if (!/[a-z]/.test(password)) {
      errors.push("Master password must contain at least one lowercase letter");
    }

    if (!/[0-9]/.test(password)) {
      errors.push("Master password must contain at least one number");
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
      errors.push(
        "Master password must contain at least one special character",
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Singleton instance
export const credentialsEncryption = new CredentialsEncryptionService();

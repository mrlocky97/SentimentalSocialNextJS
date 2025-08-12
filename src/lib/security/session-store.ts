import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "crypto";
import fs from "fs";
import path from "path";
import { SessionData, TwitterCookie } from "../../types/twitter";

/**
 * Secure session store for Twitter cookies (AES-256-GCM at rest)
 */
export class SecureSessionStore {
  private static instance: SecureSessionStore;
  private readonly filePath = path.join(
    process.cwd(),
    "twitter-session.encrypted.json",
  );
  private readonly algo = "aes-256-gcm";
  private readonly salt = "sentimentalsocial-tw-session-2025";

  static getInstance(): SecureSessionStore {
    if (!SecureSessionStore.instance) {
      SecureSessionStore.instance = new SecureSessionStore();
    }
    return SecureSessionStore.instance;
  }

  private getKey(): Buffer | null {
    const mpw = process.env.TWITTER_MASTER_PASSWORD;
    if (!mpw || mpw.length < 12) return null;
    return scryptSync(mpw, this.salt, 32);
  }

  private isExpired(session: SessionData): boolean {
    const ttlHours = Number(process.env.TWITTER_SESSION_TTL_HOURS || 24);
    const hardExpireAt = session.timestamp + ttlHours * 60 * 60 * 1000;

    // If cookies have explicit expiry, ensure none are expired
    const now = Date.now();
    const cookiesExpired = (session.cookies || []).some((c: TwitterCookie) =>
      typeof c.expires === "number" ? now > c.expires * 1000 : false,
    );

    return now > hardExpireAt || cookiesExpired || now > session.expirationTime;
  }

  private needsRotation(session: SessionData): boolean {
    const rotateHours = Number(process.env.TWITTER_SESSION_ROTATE_HOURS || 12);
    return Date.now() - session.timestamp > rotateHours * 60 * 60 * 1000;
  }

  load(): { session: SessionData | null; rotate: boolean } {
    try {
      if (!fs.existsSync(this.filePath))
        return { session: null, rotate: false };

      const key = this.getKey();
      if (!key) {
        // Without key, refuse to read sensitive data
        return { session: null, rotate: false };
      }

      const payload = JSON.parse(fs.readFileSync(this.filePath, "utf8")) as {
        iv: string;
        tag: string;
        ciphertext: string;
        createdAt: number;
      };

      const iv = Buffer.from(payload.iv, "hex");
      const tag = Buffer.from(payload.tag, "hex");
      const decipher = createDecipheriv(this.algo, key, iv);
      decipher.setAuthTag(tag);
      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(payload.ciphertext, "hex")),
        decipher.final(),
      ]).toString("utf8");

      const session: SessionData = JSON.parse(decrypted);

      if (this.isExpired(session)) {
        this.clear();
        return { session: null, rotate: false };
      }

      return { session, rotate: this.needsRotation(session) };
    } catch {
      // On any error, don’t leak partial data
      this.clear();
      return { session: null, rotate: false };
    }
  }

  save(session: SessionData): void {
    try {
      const key = this.getKey();
      if (!key) {
        // If no master password, avoid writing secrets to disk
        return;
      }

      const iv = randomBytes(12);
      const cipher = createCipheriv(this.algo, key, iv);
      const plaintext = Buffer.from(JSON.stringify(session), "utf8");
      const ciphertext = Buffer.concat([
        cipher.update(plaintext),
        cipher.final(),
      ]);
      const tag = cipher.getAuthTag();

      const payload = {
        iv: iv.toString("hex"),
        tag: tag.toString("hex"),
        ciphertext: ciphertext.toString("hex"),
        createdAt: Date.now(),
      };

      fs.writeFileSync(this.filePath, JSON.stringify(payload, null, 2), {
        encoding: "utf8",
      });
    } catch {
      // If save fails, ensure nothing partial remains
      this.clear();
      throw new Error("Failed to save encrypted session");
    }
  }

  clear(): void {
    try {
      if (fs.existsSync(this.filePath)) fs.unlinkSync(this.filePath);
    } catch {
      // ignore cleanup errors
    }
  }
}

export const secureSessionStore = SecureSessionStore.getInstance();

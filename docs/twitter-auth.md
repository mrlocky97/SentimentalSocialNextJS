# Twitter Authentication Guide

This project supports cookie-based authentication for @the-convocation/twitter-scraper and a secure encrypted credential flow.

## Options

- Encrypted credentials (recommended in prod)
- Manual cookie import (fastest in dev)
- Env vars (deprecated; dev only)

## Encrypted Credentials (recommended)

1. Prepare creds.json (not committed):

{
"username": "your_twitter_username",
"password": "your_password",
"email": "you@example.com",
"twoFASecret": "optional_2fa_secret"
}

2. Generate master password and encrypt:

npm run encrypt-twitter-creds

Follow prompts; an encrypted file will be created (e.g., encrypted-twitter-creds.json). Set TWITTER_MASTER_PASSWORD in .env.local.

3. App will decrypt on startup and initialize a session; cookies are stored in an AES-256-GCM encrypted session store with rotation and TTL.

## Manual Cookie Import (dev)

1. Export cookies from your logged-in twitter.com session using your browser. Save as manual-cookies.json in the project root.

2. Import into the secure session store:

npm run cookie-helper

3. Verify:

curl http://localhost:3001/api/twitter-auth/status

Expect status ok and authenticated: true.

## Environment Variables (deprecated)

TWITTER_USERNAME, TWITTER_PASSWORD, TWITTER_EMAIL, TWITTER_2FA_SECRET can be set in .env.local for development only. The service will try env first if encrypted creds are missing.

## Operational Notes

- Sessions auto-rotate (TWITTER_SESSION_ROTATE_HOURS) and expire (TWITTER_SESSION_TTL_HOURS)
- Swagger UI is disabled by default in production; gate it with basic auth if enabled
- CORS must be restricted in production via CORS_ORIGIN (comma-separated list)
- Encrypted session store refuses operations without TWITTER_MASTER_PASSWORD in production

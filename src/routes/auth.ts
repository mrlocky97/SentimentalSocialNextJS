/**
 * Authentication Routes - MODULARIZED
 * This file now imports from the modular auth system for better maintainability
 *
 * REFACTORED: Previously 958 lines, now imports from:
 * - ./modules/auth/handlers.ts - Authentication handlers (8 endpoints)
 * - ./modules/auth/middleware.ts - Validation and security middleware
 * - ./modules/auth/index.ts - Complete route definitions with Swagger docs
 *
 * This modular approach reduces complexity and improves:
 * - Code organization and separation of concerns
 * - Testability of individual components
 * - Reusability of handlers and middleware
 * - Maintainability through focused modules
 */

// Import and re-export the complete modular auth routes
import authRoutes from "./modules/auth/index";

// Default export for compatibility with server.ts
export default authRoutes;

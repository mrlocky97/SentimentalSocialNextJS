/**
 * Campaign Routes - MODULARIZED
 * This file now imports from the modular campaign system for better maintainability
 *
 * REFACTORED: Previously 872 lines, now imports from:
 * - ./modules/campaigns/handlers.ts - Campaign handlers (7 endpoints)
 * - ./modules/campaigns/middleware.ts - Validation and security middleware
 * - ./modules/campaigns/index.ts - Complete route definitions with Swagger docs
 *
 * This modular approach reduces complexity and improves:
 * - Code organization and separation of concerns
 * - Testability of individual components
 * - Reusability of handlers and middleware
 * - Maintainability through focused modules
 */

// Import and re-export the complete modular campaign routes
import campaignRoutes from "./modules/campaigns/index";

// Default export for compatibility with server.ts
export default campaignRoutes;

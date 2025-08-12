/**
 * Sentiment Analysis Routes - MODULAR VERSION
 *
 * This file now imports and uses the modular sentiment routes structure
 * from src/routes/modules/sentiment/ for better maintainability and organization.
 *
 * REFACTORING COMPLETED - Step 8.5
 * - Moved from 809-line monolithic file to modular structure
 * - Separated concerns: handlers, middleware, routes
 * - Maintained backward compatibility
 * - Improved code organization and maintainability
 */

import { Router } from "express";
import sentimentRoutes from "./modules/sentiment";

const router = Router();

// Mount the modular sentiment routes
router.use("/", sentimentRoutes);

export default router;

import { Router } from "express";
import {
    authenticateToken,
    requireRole,
} from "../../../middleware/express-auth";
import {
    createUser,
    deleteUser,
    getProfile,
    getUserById,
    getUsers,
    updateProfile,
    updateUser,
} from "./handlers";
import {
    sanitizeUpdateBody,
    stripForbiddenProfileFields,
    validateCreateUserBody,
    validateUserIdParam,
} from "./middleware";

const router = Router();

// Minimal swagger tag reference (full docs kept in original large file removed)
/**
 * @swagger
 * tags:
 *   - name: Users
 *     description: User management
 */

router.get("/", authenticateToken, requireRole(["admin", "manager"]), getUsers);
router.post(
  "/",
  authenticateToken,
  requireRole(["admin"]),
  validateCreateUserBody,
  createUser,
);
router.get("/profile", authenticateToken, getProfile);
router.put(
  "/profile",
  authenticateToken,
  stripForbiddenProfileFields,
  updateProfile,
);
router.get(
  "/:id",
  authenticateToken,
  requireRole(["admin", "manager"]),
  validateUserIdParam,
  getUserById,
);
router.put(
  "/:id",
  authenticateToken,
  requireRole(["admin"]),
  validateUserIdParam,
  sanitizeUpdateBody,
  updateUser,
);
router.delete(
  "/:id",
  authenticateToken,
  requireRole(["admin"]),
  validateUserIdParam,
  deleteUser,
);

export default router;

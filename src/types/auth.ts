/**
 * Authentication-related types and interfaces
 * Defines data structures for auth operations
 */

import { UserRole } from "../enums/user.enum";

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
  username: string;
  role?: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthResponse {
  user: Omit<import("./user").User, "password">;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

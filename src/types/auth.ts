/**
 * Authentication Types
 * Types for user authentication and authorization
 */

import { Role } from '@/enums/auth.enum';

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
  username: string;
  role?: Role;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthResponse {
  user: Omit<import('./user').User, 'password'>;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

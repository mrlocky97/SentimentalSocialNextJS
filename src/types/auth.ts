/**
 * Authentication Types
 * Types for user authentication and authorization
 */

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
  username: string;
  role?: 'admin' | 'manager' | 'analyst' | 'onlyView' | 'client';
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

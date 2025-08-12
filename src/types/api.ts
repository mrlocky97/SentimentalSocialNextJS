/**
 * API-related types and interfaces
 * Defines data structures for API requests and responses
 */

import { Order } from '../enums/api.enum';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
  timestamp: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  field?: string; // For validation errors
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: Order;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface DatabaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// API Route Handler Types
export interface RouteContext {
  params: Record<string, string>;
  searchParams: Record<string, string | string[]>;
}

export interface AuthenticatedRouteContext extends RouteContext {
  user: {
    id: string;
    email: string;
    username: string;
  };
}

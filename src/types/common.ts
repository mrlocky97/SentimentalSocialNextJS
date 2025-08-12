/**
 * Common types and interfaces
 * Shared data structures used across the application
 */

import { Order } from '../enums/api.enum';

export interface PaginationOptions {
  offset?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: Order;
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    timestamp: string;
  };
}

export interface ErrorDetails {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
  path?: string;
}

export type SortOrder = 'asc' | 'desc' | 1 | -1;

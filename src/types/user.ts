/**
 * User Types with Role-Based Access Control
 * Updated for marketing analytics platform
 */

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatar?: string;
  role: UserRole;
  permissions: Permission[];
  organizationId?: string;
  isActive: boolean;
  isVerified: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type UserRole =
  | 'admin' // Full system access
  | 'manager' // Can create/manage campaigns
  | 'analyst' // Can view and analyze data
  | 'onlyView' // Read-only access
  | 'client'; // Limited client access

export type Permission =
  // Campaign permissions
  | 'campaigns:create'
  | 'campaigns:edit'
  | 'campaigns:delete'
  | 'campaigns:view'
  | 'campaigns:start_scraping'
  | 'campaigns:export_data'

  // Analytics permissions
  | 'analytics:view'
  | 'analytics:export'
  | 'analytics:advanced'

  // User management
  | 'users:create'
  | 'users:edit'
  | 'users:delete'
  | 'users:view'
  | 'users:assign_roles'

  // System administration
  | 'system:settings'
  | 'system:logs'
  | 'system:backup'
  | 'system:monitoring'

  // Data access
  | 'data:export'
  | 'data:delete'
  | 'data:bulk_operations';

export interface RoleDefinition {
  role: UserRole;
  name: string;
  description: string;
  permissions: Permission[];
  level: number; // Hierarchy level (higher = more permissions)
}

// Default role definitions
export const ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    role: 'admin',
    name: 'Administrator',
    description: 'Full system access and user management',
    level: 100,
    permissions: [
      'campaigns:create',
      'campaigns:edit',
      'campaigns:delete',
      'campaigns:view',
      'campaigns:start_scraping',
      'campaigns:export_data',
      'analytics:view',
      'analytics:export',
      'analytics:advanced',
      'users:create',
      'users:edit',
      'users:delete',
      'users:view',
      'users:assign_roles',
      'system:settings',
      'system:logs',
      'system:backup',
      'system:monitoring',
      'data:export',
      'data:delete',
      'data:bulk_operations',
    ],
  },
  {
    role: 'manager',
    name: 'Campaign Manager',
    description: 'Can create and manage marketing campaigns',
    level: 75,
    permissions: [
      'campaigns:create',
      'campaigns:edit',
      'campaigns:view',
      'campaigns:start_scraping',
      'campaigns:export_data',
      'analytics:view',
      'analytics:export',
      'analytics:advanced',
      'users:view',
      'data:export',
    ],
  },
  {
    role: 'analyst',
    name: 'Data Analyst',
    description: 'Can analyze data and generate reports',
    level: 50,
    permissions: [
      'campaigns:view',
      'analytics:view',
      'analytics:export',
      'analytics:advanced',
      'data:export',
    ],
  },
  {
    role: 'onlyView',
    name: 'View Only',
    description: 'Read-only access to campaigns and basic analytics',
    level: 25,
    permissions: ['campaigns:view', 'analytics:view'],
  },
  {
    role: 'client',
    name: 'Client',
    description: 'Limited access for external clients',
    level: 10,
    permissions: ['campaigns:view', 'analytics:view'],
  },
];

// Authentication related interfaces
export interface UserAuth {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  isActive: boolean;
  organizationId?: string;
}

export interface CreateUserRequest {
  email: string;
  username: string;
  displayName: string;
  password: string;
  role: UserRole;
  organizationId?: string;
}

export interface UpdateUserRequest {
  displayName?: string;
  avatar?: string;
  role?: UserRole;
  permissions?: Permission[];
  isActive?: boolean;
  organizationId?: string;
}

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  role: UserRole;
  permissions: Permission[];
  organizationId?: string;
  campaignsCount: number;
  lastLoginAt?: Date;
}

export interface UserSession {
  userId: string;
  email: string;
  username: string;
  role: UserRole;
  permissions: Permission[];
  organizationId?: string;
  expiresAt: Date;
}

// Organization/Team support
export interface Organization {
  id: string;
  name: string;
  description?: string;
  settings: OrganizationSettings;
  ownerId: string;
  memberCount: number;
  campaignCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationSettings {
  maxCampaigns: number;
  maxUsersPerCampaign: number;
  dataRetentionDays: number;
  allowedDomains?: string[]; // Email domains allowed to join
  features: {
    advancedAnalytics: boolean;
    realTimeMonitoring: boolean;
    apiAccess: boolean;
    customReports: boolean;
  };
}

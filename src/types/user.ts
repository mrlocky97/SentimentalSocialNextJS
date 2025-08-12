/**
 * User-related types and interfaces
 * Defines data structures for user management
 */

import { Permission, UserRole } from '../enums/user.enum';

// Re-export enums for easier access
export { Permission, UserRole };

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
    role: UserRole.ADMIN,
    name: 'Administrator',
    description: 'Full system access and user management',
    level: 100,
    permissions: [
      Permission.CAMPAIGNS_CREATE,
      Permission.CAMPAIGNS_EDIT,
      Permission.CAMPAIGNS_DELETE,
      Permission.CAMPAIGNS_VIEW,
      Permission.CAMPAIGNS_START_SCRAPING,
      Permission.CAMPAIGNS_EXPORT_DATA,
      Permission.ANALYTICS_VIEW,
      Permission.ANALYTICS_EXPORT,
      Permission.ANALYTICS_ADVANCED,
      Permission.USERS_CREATE,
      Permission.USERS_EDIT,
      Permission.USERS_DELETE,
      Permission.USERS_VIEW,
      Permission.USERS_ASSIGN_ROLES,
      Permission.SYSTEM_SETTINGS,
      Permission.SYSTEM_LOGS,
      Permission.SYSTEM_BACKUP,
      Permission.SYSTEM_MONITORING,
      Permission.DATA_EXPORT,
      Permission.DATA_DELETE,
      Permission.DATA_BULK_OPERATIONS,
    ],
  },
  {
    role: UserRole.MANAGER,
    name: 'Campaign Manager',
    description: 'Can create and manage marketing campaigns',
    level: 75,
    permissions: [
      Permission.CAMPAIGNS_CREATE,
      Permission.CAMPAIGNS_EDIT,
      Permission.CAMPAIGNS_VIEW,
      Permission.CAMPAIGNS_START_SCRAPING,
      Permission.CAMPAIGNS_EXPORT_DATA,
      Permission.ANALYTICS_VIEW,
      Permission.ANALYTICS_EXPORT,
      Permission.ANALYTICS_ADVANCED,
      Permission.USERS_VIEW,
      Permission.DATA_EXPORT,
    ],
  },
  {
    role: UserRole.ANALYST,
    name: 'Data Analyst',
    description: 'Can analyze data and generate reports',
    level: 50,
    permissions: [
      Permission.CAMPAIGNS_VIEW,
      Permission.ANALYTICS_VIEW,
      Permission.ANALYTICS_EXPORT,
      Permission.ANALYTICS_ADVANCED,
      Permission.DATA_EXPORT,
    ],
  },
  {
    role: UserRole.ONLY_VIEW,
    name: 'View Only',
    description: 'Read-only access to campaigns and basic analytics',
    level: 25,
    permissions: [Permission.CAMPAIGNS_VIEW, Permission.ANALYTICS_VIEW],
  },
  {
    role: UserRole.CLIENT,
    name: 'Client',
    description: 'Limited access for external clients',
    level: 10,
    permissions: [Permission.CAMPAIGNS_VIEW, Permission.ANALYTICS_VIEW],
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

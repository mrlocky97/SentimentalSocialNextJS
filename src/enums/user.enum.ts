export enum UserRole {
  ADMIN = "admin", // Full system access
  MANAGER = "manager", // Can create/manage campaigns
  ANALYST = "analyst", // Can view and analyze data
  ONLY_VIEW = "onlyView", // Read-only access
  CLIENT = "client", // Limited client access
}

export enum Permission {
  // Full system administration
  ADMIN = "admin",

  // Campaign permissions
  CAMPAIGNS_CREATE = "campaigns:create",
  CAMPAIGNS_EDIT = "campaigns:edit",
  CAMPAIGNS_DELETE = "campaigns:delete",
  CAMPAIGNS_VIEW = "campaigns:view",
  CAMPAIGNS_START_SCRAPING = "campaigns:start_scraping",
  CAMPAIGNS_EXPORT_DATA = "campaigns:export_data",

  // Analytics permissions
  ANALYTICS_VIEW = "analytics:view",
  ANALYTICS_EXPORT = "analytics:export",
  ANALYTICS_ADVANCED = "analytics:advanced",

  // User management
  USERS_CREATE = "users:create",
  USERS_EDIT = "users:edit",
  USERS_DELETE = "users:delete",
  USERS_VIEW = "users:view",
  USERS_ASSIGN_ROLES = "users:assign_roles",

  // System administration
  SYSTEM_SETTINGS = "system:settings",
  SYSTEM_LOGS = "system:logs",
  SYSTEM_BACKUP = "system:backup",
  SYSTEM_MONITORING = "system:monitoring",

  // Data access
  DATA_EXPORT = "data:export",
  DATA_DELETE = "data:delete",
  DATA_BULK_OPERATIONS = "data:bulk_operations",
}

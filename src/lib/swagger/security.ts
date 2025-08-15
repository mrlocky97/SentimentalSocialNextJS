// Security schemes for OpenAPI
export const securitySchemes = {
  bearerAuth: {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
    description: "JWT token for API authentication",
  },
  apiKey: {
    type: "apiKey",
    in: "header",
    name: "X-API-Key",
    description: "API Key for external integrations",
  },
} as const;

export const globalSecurity = [{ bearerAuth: [] }];

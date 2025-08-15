import swaggerJsdoc from "swagger-jsdoc";
import { paths } from "./paths";
import { schemas } from "./schemas";
import { globalSecurity, securitySchemes } from "./security";

// JSDoc scan globs
const apiGlobs = [
  "./src/routes/*.ts",
  "./src/controllers/*.ts",
  "./src/middleware/*.ts",
];

export function buildSwaggerSpec() {
  const options: swaggerJsdoc.Options = {
    definition: {
      openapi: "3.0.0",
      info: {
        title: "SentimentalSocial API",
        version: "1.0.0",
        description:
          "API for Twitter Sentiment Analysis and Marketing Analytics Platform",
        contact: {
          name: "SentimentalSocial Team",
          email: "api@sentimentalsocial.com",
        },
        license: { name: "MIT", url: "https://opensource.org/licenses/MIT" },
      },
      servers: [
        { url: "http://localhost:3001", description: "Development server" },
        {
          url: "https://api.sentimentalsocial.com",
          description: "Production server",
        },
      ],
      components: {
        securitySchemes: securitySchemes as any,
        schemas: schemas as any,
      },
      security: globalSecurity as any,
      paths: paths as any,
    },
    apis: apiGlobs,
  };
  return swaggerJsdoc(options);
}

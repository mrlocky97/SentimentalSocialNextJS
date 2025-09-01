import swaggerJsdoc from "swagger-jsdoc";
import { paths } from "./paths";
import { schemas } from "./schemas";
import { globalSecurity, securitySchemes } from "./security";

// JSDoc scan globs
const apiGlobs = [
  "./src/routes/*.ts",
  "./src/routes/**/*.ts",
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

  // Build the complete spec
  const spec = swaggerJsdoc(options);

  // Filter out internal routes and tags
  return filterInternalEndpoints(spec);
}

function filterInternalEndpoints(spec: any) {
  // Filter out internal paths
  if (spec.paths) {
    Object.keys(spec.paths).forEach((pathKey) => {
      const pathItem = spec.paths[pathKey];
      Object.keys(pathItem).forEach((method) => {
        const operation = pathItem[method];
        if (operation && operation["x-internal"] === true) {
          delete pathItem[method];
        }
      });

      // Remove empty path objects
      if (Object.keys(pathItem).length === 0) {
        delete spec.paths[pathKey];
      }
    });
  }

  // Filter out internal tags
  if (spec.tags) {
    spec.tags = spec.tags.filter((tag: any) => tag["x-internal"] !== true);
  }

  return spec;
}

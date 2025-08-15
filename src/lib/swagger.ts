// Slim Swagger orchestrator – original monolith replaced by modular build in ./swagger
// Builds and exports the OpenAPI specification using modular components (schemas, security, paths)
import { buildSwaggerSpec } from "./swagger/init";

const specs = buildSwaggerSpec();

export default specs;

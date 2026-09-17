import {
  extendZodWithOpenApi,
  OpenApiGeneratorV3,
  OpenAPIRegistry,
} from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
});

export const generateOpenAPIDocument = () => {
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: '3.0.0',
    info: {
      title: 'Figvibe API',
      version: '1.0.0',
      description: 'Figvibe E-commerce REST API',
    },

    servers: [
      { url: '/api/v1', description: 'API Version 1' },
      { url: '/', description: 'Root (Health Check)' },
    ],
    tags: [
      { name: 'Health', description: 'Health check endpoints' },
      { name: 'Auth', description: 'Authentication endpoints' },
      {
        name: 'Category',
        description: 'Category management',
      },
      { name: 'Brand', description: 'Brand management' },
      { name: 'Fabric', description: 'Fabric management' },
    ],
  });
};

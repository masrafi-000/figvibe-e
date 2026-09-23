import {
  extendZodWithOpenApi,
  OpenApiGeneratorV3,
  OpenAPIRegistry,
} from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import { registerAuthDocs } from '../modules/auth/auth.docs';
import { registerHealthDocs } from '../modules/health/health.docs';

extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
});

let docsInitialized = false;

const initDocs = () => {
  if (docsInitialized) return;
  registerHealthDocs(registry);
  registerAuthDocs(registry);
  docsInitialized = true;
};

export const generateOpenAPIDocument = () => {
  initDocs();
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: '3.0.0',
    info: {
      title: 'Figvibe API',
      version: '1.0.0',
      description: 'Figvibe E-commerce REST API',
    },

    servers: [
      { url: '/', description: 'Current Server' },
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

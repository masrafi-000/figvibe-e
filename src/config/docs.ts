import {
  extendZodWithOpenApi,
  OpenApiGeneratorV3,
  OpenAPIRegistry,
} from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import { registerAuthDocs } from '../modules/auth/auth.docs';
import { registerCartDocs } from '../modules/cart/cart.docs';
import { registerHealthDocs } from '../modules/health/health.docs';
import { registerOrderDocs } from '../modules/order/order.docs';
import { registerPosDocs } from '../modules/pos/pos.docs';
import { registerUserDocs } from '../modules/user/user.docs';

extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
  description: 'Enter your JWT access token (Bearer <token>)',
});

let docsInitialized = false;

const initDocs = () => {
  if (docsInitialized) return;
  registerHealthDocs(registry);
  registerAuthDocs(registry);
  registerUserDocs(registry);
  registerCartDocs(registry);
  registerOrderDocs(registry);
  registerPosDocs(registry);
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
      description: 'Figvibe E-commerce & Staff Management REST API',
    },

    servers: [{ url: '/', description: 'Current Server' }],
    tags: [
      { name: 'Health', description: 'Server and database health status' },
      {
        name: 'Auth',
        description: 'Registration, login, OAuth, sessions, and tokens',
      },
      {
        name: 'Users',
        description: 'User account management, status, and role assignments',
      },
      {
        name: 'Roles',
        description: 'Role creation, updating, and permission mapping',
      },
      { name: 'Permissions', description: 'System permission definitions' },
      {
        name: 'Cart',
        description:
          'Shopping cart management, item quantities, and stock availability',
      },
      {
        name: 'Orders',
        description:
          'Customer order placement, checkout, status transitions, and address management',
      },
      {
        name: 'POS & Physical Store Sales',
        description:
          'In-store order creation, cash/digital payments, salesman tracking, and store delivery',
      },
    ],
  });
};

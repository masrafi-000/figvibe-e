import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

export const registerHealthDocs = (registry: OpenAPIRegistry): void => {
  registry.registerPath({
    method: 'get',
    path: '/health',
    tags: ['Health'],
    summary: 'Health check endpoint',
    responses: {
      200: {
        description: 'Health status response',
        content: {
          'application/json': {
            schema: z.object({
              status: z.string(),
              timestamp: z.string(),
              uptime: z.number(),
              database: z.string(),
              redis: z.string(),
            }),
          },
        },
      },
    },
  });
};

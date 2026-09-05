import path from 'path';
import { defineConfig } from 'prisma/config';
import { env } from './src/config/env.ts';

export default defineConfig({
  schema: path.join('prisma', 'schema'),
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env.DATABASE_URL,
  },
});

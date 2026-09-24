import {
  extendZodWithOpenApi,
  type OpenAPIRegistry,
} from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { ZCILogin, ZCIRegister } from './auth.schema';

extendZodWithOpenApi(z);

export const registerAuthDocs = (registry: OpenAPIRegistry): void => {
  const ZCIUserResponse = registry.register(
    'UserResponse',
    z.object({
      id: z.string(),
      email: z.string(),
      firstName: z.string().nullable().optional(),
      lastName: z.string().nullable().optional(),
      username: z.string().nullable().optional(),
      phone: z.string().nullable().optional(),
      role: z.string(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
    }),
  );

  const ZCIAuthResponse = registry.register(
    'AuthResponse',
    z.object({
      success: z.boolean(),
      message: z.string(),
      data: z.object({
        user: ZCIUserResponse,
      }),
    }),
  );

  // Register
  registry.registerPath({
    method: 'post',
    path: '/api/v1/auth/register',
    tags: ['Auth'],
    summary: 'Register a new user',
    request: {
      body: {
        content: {
          'application/json': {
            schema: ZCIRegister,
          },
        },
      },
    },
    responses: {
      201: {
        description: 'Account registered successfully',
        content: {
          'application/json': {
            schema: ZCIAuthResponse,
          },
        },
      },
      400: { description: 'Validation error' },
      409: { description: 'Email or Username already in use' },
    },
  });

  // Login
  registry.registerPath({
    method: 'post',
    path: '/api/v1/auth/login',
    tags: ['Auth'],
    summary: 'Log in with email and password',
    request: {
      body: {
        content: {
          'application/json': {
            schema: ZCILogin,
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Logged in successfully',
        content: {
          'application/json': {
            schema: ZCIAuthResponse,
          },
        },
      },
      401: { description: 'Invalid email or password' },
    },
  });

  // Google OAuth
  registry.registerPath({
    method: 'get',
    path: '/api/v1/auth/google',
    tags: ['Auth'],
    summary: 'Initiate Google OAuth authentication',
    responses: {
      302: { description: 'Redirect to Google authentication server' },
    },
  });

  // Google OAuth Callback
  registry.registerPath({
    method: 'get',
    path: '/api/v1/auth/google/callback',
    tags: ['Auth'],
    summary: 'Google OAuth callback handler',
    responses: {
      302: { description: 'Redirect to frontend after authentication' },
    },
  });

  // Refresh
  registry.registerPath({
    method: 'post',
    path: '/api/v1/auth/refresh',
    tags: ['Auth'],
    summary: 'Refresh access token via refresh token cookie',
    responses: {
      200: {
        description: 'Token refreshed successfully',
        content: {
          'application/json': {
            schema: ZCIAuthResponse,
          },
        },
      },
      401: { description: 'Refresh token invalid or expired' },
    },
  });

  // Logout
  registry.registerPath({
    method: 'post',
    path: '/api/v1/auth/logout',
    tags: ['Auth'],
    summary: 'Log out current session and revoke tokens',
    responses: {
      200: {
        description: 'Logged out successfully',
        content: {
          'application/json': {
            schema: z.object({
              success: z.boolean(),
              message: z.string(),
            }),
          },
        },
      },
    },
  });

  // Me
  registry.registerPath({
    method: 'get',
    path: '/api/v1/auth/me',
    tags: ['Auth'],
    summary: 'Get currently authenticated user profile',
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'Current user profile details',
        content: {
          'application/json': {
            schema: z.object({
              success: z.boolean(),
              data: z.object({
                user: ZCIUserResponse,
              }),
            }),
          },
        },
      },
      401: { description: 'Authentication required' },
    },
  });
};

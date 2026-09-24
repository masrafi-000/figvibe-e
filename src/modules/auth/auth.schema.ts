import { z } from 'zod';

export const ZCIRegister = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
  username: z.string().min(3, 'Username must be at least 3 characters long').optional(),
  phone: z.string().optional(),
});
export type ZCTRegister = z.infer<typeof ZCIRegister>;

export const ZCILogin = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type ZCTLogin = z.infer<typeof ZCILogin>;

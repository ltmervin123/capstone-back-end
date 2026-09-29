import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username or email is required'),
  password: z.string().trim().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().trim().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters').max(200),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

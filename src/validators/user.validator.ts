import { z } from 'zod';

export const staffPermissionsSchema = z.object({
  dashboard: z.boolean(),
  employees: z.boolean(),
  attendance: z.boolean(),
  payroll: z.boolean(),
  leaves: z.boolean(),
  talentAcquisition: z.boolean(),
  aiSearch: z.boolean(),
  reports: z.boolean(),
  feedback: z.boolean().optional(),
});

export const createStaffUserBodySchema = z.object({
  username: z.string().trim().min(1, 'Username is required').max(80),
  email: z.string().trim().email('A valid email is required').max(200),
  password: z.string().min(6, 'Password must be at least 6 characters').max(200),
  role: z.enum(['ADMIN', 'HR']),
  permissions: staffPermissionsSchema.optional(),
});

export const updateUserStatusBodySchema = z.object({
  isActive: z.boolean(),
});

export const updateUserPermissionsBodySchema = z.object({
  permissions: staffPermissionsSchema,
});

export const updateUserPasswordBodySchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters').max(200),
});

export type CreateStaffUserInput = z.infer<typeof createStaffUserBodySchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusBodySchema>;
export type UpdateUserPermissionsInput = z.infer<typeof updateUserPermissionsBodySchema>;
export type UpdateUserPasswordInput = z.infer<typeof updateUserPasswordBodySchema>;

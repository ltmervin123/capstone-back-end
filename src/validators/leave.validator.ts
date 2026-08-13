import { z } from 'zod';

export const LEAVE_TYPE_VALUES = [
  'Leave Credits',
  'Maternity Leave',
  'Leave for Victims of VAW-C',
  'Paternity Leave',
  'Solo Parents Leave',
  'Study Leave',
  'Special Leave',
  'Authorized Absence',
  'Authorized Undertime',
] as const;

export const createLeaveBodySchema = z.object({
  employeeNumber: z
    .string()
    .trim()
    .min(1, 'Employee ID is required')
    .max(50)
    .transform((value) => value.toUpperCase()),
  type: z.enum(LEAVE_TYPE_VALUES),
  startDate: z.string().trim().min(1, 'Start date is required'),
  endDate: z.string().trim().min(1, 'End date is required'),
  numberOfDays: z.coerce.number().int().min(1, 'Number of days must be at least 1').max(365),
  timeFrom: z.string().trim().max(40).optional().default(''),
  timeTo: z.string().trim().max(40).optional().default(''),
  reason: z.string().trim().min(1, 'Please enter a valid reason for the leave.').max(2000),
});

export type CreateLeaveInput = z.infer<typeof createLeaveBodySchema>;

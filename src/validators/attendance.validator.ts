import { z } from 'zod';

const optionalTimeSchema = z
  .string()
  .trim()
  .optional()
  .default('')
  .refine((value) => value === '' || /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(value), {
    message: 'Time must be HH:mm',
  });

export const createAttendanceBodySchema = z.object({
  employeeNumber: z
    .string()
    .trim()
    .min(1, 'Employee ID is required')
    .max(50)
    .transform((value) => value.toUpperCase()),
  date: z.string().trim().min(1, 'Date is required'),
  timeIn: optionalTimeSchema,
  timeOut: optionalTimeSchema,
  status: z.enum(['Present', 'Late', 'Absent', 'On Leave']),
  remarks: z.string().trim().max(500).optional().default(''),
});

export type CreateAttendanceInput = z.infer<typeof createAttendanceBodySchema>;

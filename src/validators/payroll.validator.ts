import { z } from 'zod';
import { CutoffType } from '../generated/prisma/index.js';

export const createPayrollRunSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    cutoffType: z.nativeEnum(CutoffType).default(CutoffType.MONTHLY),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be in YYYY-MM-DD format'),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'endDate must be in YYYY-MM-DD format'),
  })
  .refine(
    (data) => new Date(data.startDate) <= new Date(data.endDate),
    {
      message: 'startDate must be before or equal to endDate',
      path: ['endDate'],
    }
  );

export type CreatePayrollRunInput = z.infer<typeof createPayrollRunSchema>;

export const adjustPayrollRecordSchema = z.object({
  daysWorked: z.number().int().min(0).max(31).optional(),
  functionalRate: z.number().min(0).optional(),
  allowances: z.number().min(0).optional(),
  gasoline: z.number().min(0).optional(),
  tardinessMinutes: z.number().int().min(0).optional(),
  cashAdvance: z.number().min(0).optional(),
  sssDeduction: z.number().min(0).optional(),
  philHealthDeduction: z.number().min(0).optional(),
  pagIbigDeduction: z.number().min(0).optional(),
  taxWithheld: z.number().min(0).optional(),
  otherDeductions: z.number().min(0).optional(),
});

export type AdjustPayrollRecordInput = z.infer<typeof adjustPayrollRecordSchema>;

import { z } from 'zod';

export const FEEDBACK_CATEGORY_VALUES = [
  'General Feedback / Suggestion',
  'Leave Inquiry',
  'Payroll Inquiry',
  'Workplace Suggestion',
  'Confidential HR Concern',
] as const;

export const createFeedbackBodySchema = z.object({
  category: z.enum(FEEDBACK_CATEGORY_VALUES),
  subject: z.string().trim().min(1, 'Please enter a subject for your feedback.').max(200),
  message: z.string().trim().min(1, 'Please enter your feedback message.').max(5000),
  isAnonymous: z.boolean().optional().default(false),
});

export type CreateFeedbackInput = z.infer<typeof createFeedbackBodySchema>;

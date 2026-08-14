import { z } from 'zod';

export const FEEDBACK_CATEGORY_VALUES = [
  'General Feedback / Suggestion',
  'Leave Inquiry',
  'Payroll Inquiry',
  'Workplace Suggestion',
  'Confidential HR Concern',
] as const;

export const FEEDBACK_STATUS_VALUES = ['New', 'Under Review', 'Resolved'] as const;

export const createFeedbackBodySchema = z.object({
  category: z.enum(FEEDBACK_CATEGORY_VALUES),
  subject: z.string().trim().min(1, 'Please enter a subject for your feedback.').max(200),
  message: z.string().trim().min(1, 'Please enter your feedback message.').max(5000),
  isAnonymous: z.boolean().optional().default(false),
});

export const updateFeedbackStatusBodySchema = z.object({
  status: z.enum(FEEDBACK_STATUS_VALUES),
});

export const replyFeedbackBodySchema = z.object({
  adminResponse: z.string().trim().min(1, 'Please enter a response for the employee.').max(5000),
  status: z.enum(FEEDBACK_STATUS_VALUES),
});

export type CreateFeedbackInput = z.infer<typeof createFeedbackBodySchema>;
export type UpdateFeedbackStatusInput = z.infer<typeof updateFeedbackStatusBodySchema>;
export type ReplyFeedbackInput = z.infer<typeof replyFeedbackBodySchema>;

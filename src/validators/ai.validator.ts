import { z } from 'zod';

export const chatMessageItemSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().max(10000),
});

export const streamChatBodySchema = z.object({
  message: z.string().trim().min(1, 'Message is required').max(2000),
  history: z.array(chatMessageItemSchema).optional(),
});

export type StreamChatBodyInput = z.infer<typeof streamChatBodySchema>;

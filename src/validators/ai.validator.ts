import { z } from 'zod';

export const chatMessageItemSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().max(10000),
});

export const streamChatBodySchema = z.object({
  message: z.string().trim().min(1, 'Message is required').max(2000),
  conversationId: z.string().trim().min(1).optional(),
  history: z.array(chatMessageItemSchema).optional(),
});

export const renameConversationSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(255, 'Title is too long'),
});

export const conversationIdParamSchema = z.object({
  id: z.string().trim().min(1, 'Conversation ID is required'),
});

export type StreamChatBodyInput = z.infer<typeof streamChatBodySchema>;
export type RenameConversationInput = z.infer<typeof renameConversationSchema>;

import type { Prisma } from '../generated/prisma/index.js';
import { AiMessageRole } from '../generated/prisma/index.js';
import { prisma } from '../lib/prisma.js';

export async function listConversationsByUserId(userId: string) {
  return prisma.aiConversation.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: { messages: true },
      },
      messages: {
        take: 1,
        orderBy: { createdAt: 'desc' },
        select: {
          content: true,
          role: true,
          createdAt: true,
        },
      },
    },
  });
}

export async function findConversationById(id: string, userId: string) {
  return prisma.aiConversation.findFirst({
    where: { id, userId },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });
}

export async function createConversation(data: { userId: string; title: string }) {
  return prisma.aiConversation.create({
    data: {
      userId: data.userId,
      title: data.title,
    },
  });
}

export async function updateConversationTitle(id: string, userId: string, title: string) {
  return prisma.aiConversation.updateMany({
    where: { id, userId },
    data: { title },
  });
}

export async function deleteConversation(id: string, userId: string) {
  return prisma.aiConversation.deleteMany({
    where: { id, userId },
  });
}

export async function deleteAllConversations(userId: string) {
  return prisma.aiConversation.deleteMany({
    where: { userId },
  });
}

export async function createMessage(data: {
  conversationId: string;
  role: AiMessageRole;
  content: string;
  sourcesUsed?: Prisma.InputJsonValue;
}) {
  const createData: Prisma.AiMessageUncheckedCreateInput = {
    conversationId: data.conversationId,
    role: data.role,
    content: data.content,
    ...(data.sourcesUsed !== undefined ? { sourcesUsed: data.sourcesUsed } : {}),
  };

  const [message] = await prisma.$transaction([
    prisma.aiMessage.create({
      data: createData,
    }),
    prisma.aiConversation.update({
      where: { id: data.conversationId },
      data: { updatedAt: new Date() },
    }),
  ]);

  return message;
}

export async function getRecentMessages(conversationId: string, limit: number = 10) {
  const messages = await prisma.aiMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return messages.reverse();
}

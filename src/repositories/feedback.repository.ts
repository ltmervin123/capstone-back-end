import type { Prisma } from '../generated/prisma/index.js';
import { prisma } from '../lib/prisma.js';

export type FeedbackRecord = Prisma.FeedbackItemGetPayload<object>;

export async function listFeedback(): Promise<FeedbackRecord[]> {
  return prisma.feedbackItem.findMany({
    orderBy: [{ createdAt: 'desc' }],
  });
}

export async function listFeedbackBySenderUserId(senderUserId: string): Promise<FeedbackRecord[]> {
  return prisma.feedbackItem.findMany({
    where: { senderUserId },
    orderBy: [{ createdAt: 'desc' }],
  });
}

export async function createFeedback(params: {
  record: {
    senderUserId: string;
    senderEmployeeId: string | null;
    senderName: string;
    senderEmail: string;
    category: string;
    subject: string;
    message: string;
    isAnonymous: boolean;
  };
  audit: {
    userId: string;
    username: string;
    action: string;
    details: string;
    ipAddress?: string;
  };
}): Promise<FeedbackRecord> {
  return prisma.$transaction(async (tx) => {
    const created = await tx.feedbackItem.create({
      data: params.record,
    });

    const auditData: Prisma.AuditLogUncheckedCreateInput = {
      userId: params.audit.userId,
      username: params.audit.username,
      action: params.audit.action,
      entityType: 'FeedbackItem',
      entityId: created.id,
      details: params.audit.details,
      ipAddress: params.audit.ipAddress ?? null,
    };

    await tx.auditLog.create({
      data: auditData,
    });

    return created;
  });
}

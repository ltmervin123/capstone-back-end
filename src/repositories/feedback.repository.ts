import type { FeedbackStatus, Prisma } from '../generated/prisma/index.js';
import { prisma } from '../lib/prisma.js';

const feedbackInclude = {
  senderEmployee: {
    select: { employeeNumber: true, profilePictureUrl: true },
  },
} satisfies Prisma.FeedbackItemInclude;

export type FeedbackRecord = Prisma.FeedbackItemGetPayload<{
  include: typeof feedbackInclude;
}>;

export async function listFeedback(): Promise<FeedbackRecord[]> {
  return prisma.feedbackItem.findMany({
    include: feedbackInclude,
    orderBy: [{ createdAt: 'desc' }],
  });
}

export async function listFeedbackBySenderUserId(senderUserId: string): Promise<FeedbackRecord[]> {
  return prisma.feedbackItem.findMany({
    where: { senderUserId },
    include: feedbackInclude,
    orderBy: [{ createdAt: 'desc' }],
  });
}

export async function findById(id: string): Promise<FeedbackRecord | null> {
  return prisma.feedbackItem.findUnique({
    where: { id },
    include: feedbackInclude,
  });
}

type FeedbackAudit = {
  userId: string;
  username: string;
  action: string;
  details: string;
  ipAddress?: string;
};

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
  audit: FeedbackAudit;
}): Promise<FeedbackRecord> {
  return prisma.$transaction(async (tx) => {
    const created = await tx.feedbackItem.create({
      data: params.record,
      include: feedbackInclude,
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

export async function updateFeedback(params: {
  id: string;
  data: {
    status: FeedbackStatus;
    adminResponse?: string | null;
    respondedById: string;
    employeeNotifiedAt: Date;
  };
  audit: FeedbackAudit;
}): Promise<FeedbackRecord> {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.feedbackItem.update({
      where: { id: params.id },
      data: params.data,
      include: feedbackInclude,
    });

    const auditData: Prisma.AuditLogUncheckedCreateInput = {
      userId: params.audit.userId,
      username: params.audit.username,
      action: params.audit.action,
      entityType: 'FeedbackItem',
      entityId: updated.id,
      details: params.audit.details,
      ipAddress: params.audit.ipAddress ?? null,
    };

    await tx.auditLog.create({
      data: auditData,
    });

    return updated;
  });
}

export async function deleteFeedback(params: {
  id: string;
  audit: FeedbackAudit;
}): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const auditData: Prisma.AuditLogUncheckedCreateInput = {
      userId: params.audit.userId,
      username: params.audit.username,
      action: params.audit.action,
      entityType: 'FeedbackItem',
      entityId: params.id,
      details: params.audit.details,
      ipAddress: params.audit.ipAddress ?? null,
    };

    await tx.auditLog.create({
      data: auditData,
    });

    await tx.feedbackItem.delete({
      where: { id: params.id },
    });
  });
}

export async function markNotificationsRead(senderUserId: string): Promise<number> {
  const result = await prisma.feedbackItem.updateMany({
    where: {
      senderUserId,
      employeeNotifiedAt: { not: null },
    },
    data: {
      employeeReadAt: new Date(),
    },
  });

  return result.count;
}

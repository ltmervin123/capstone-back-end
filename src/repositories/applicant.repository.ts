import type { ApplicantStatus, Prisma } from '../generated/prisma/index.js';
import { prisma } from '../lib/prisma.js';

export type ApplicantWithRelations = Prisma.ApplicantGetPayload<{
  include: {
    department: { select: { id: true; name: true } };
  };
}>;

const applicantInclude = {
  department: { select: { id: true, name: true } },
} satisfies Prisma.ApplicantInclude;

export async function listApplicants(): Promise<ApplicantWithRelations[]> {
  return prisma.applicant.findMany({
    include: applicantInclude,
    orderBy: [{ appliedDate: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function findById(id: string): Promise<ApplicantWithRelations | null> {
  return prisma.applicant.findUnique({
    where: { id },
    include: applicantInclude,
  });
}

export async function createApplicant(params: {
  record: {
    fullName: string;
    email: string;
    phone: string;
    positionApplied: string;
    departmentId: string | null;
    status: ApplicantStatus;
    appliedDate: Date;
    resumeUrl: string | null;
    notes: string | null;
    updatedById: string;
  };
  audit: {
    userId: string;
    username: string;
    action: string;
    details: string;
    ipAddress?: string;
  };
}): Promise<ApplicantWithRelations> {
  return prisma.$transaction(async (tx) => {
    const created = await tx.applicant.create({
      data: params.record,
      include: applicantInclude,
    });

    const auditData: Prisma.AuditLogUncheckedCreateInput = {
      userId: params.audit.userId,
      username: params.audit.username,
      action: params.audit.action,
      entityType: 'Applicant',
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

export async function updateApplicant(params: {
  id: string;
  record: {
    fullName: string;
    email: string;
    phone: string;
    positionApplied: string;
    departmentId: string | null;
    status: ApplicantStatus;
    appliedDate: Date;
    resumeUrl: string | null;
    notes: string | null;
    updatedById: string;
  };
  audit: {
    userId: string;
    username: string;
    action: string;
    details: string;
    ipAddress?: string;
  };
}): Promise<ApplicantWithRelations> {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.applicant.update({
      where: { id: params.id },
      data: params.record,
      include: applicantInclude,
    });

    const auditData: Prisma.AuditLogUncheckedCreateInput = {
      userId: params.audit.userId,
      username: params.audit.username,
      action: params.audit.action,
      entityType: 'Applicant',
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

export async function deleteApplicant(params: {
  id: string;
  audit: {
    userId: string;
    username: string;
    action: string;
    details: string;
    ipAddress?: string;
  };
}): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const auditData: Prisma.AuditLogUncheckedCreateInput = {
      userId: params.audit.userId,
      username: params.audit.username,
      action: params.audit.action,
      entityType: 'Applicant',
      entityId: params.id,
      details: params.audit.details,
      ipAddress: params.audit.ipAddress ?? null,
    };

    await tx.auditLog.create({
      data: auditData,
    });

    await tx.applicant.delete({
      where: { id: params.id },
    });
  });
}

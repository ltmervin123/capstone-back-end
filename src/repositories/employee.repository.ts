import {
  EmploymentChangeType,
  Role,
  type Employee,
  type EmployeeStatus,
  type Prisma,
  type Sex,
} from '../generated/prisma/index.js';
import { prisma } from '../lib/prisma.js';

export type EmployeeWithDepartment = Prisma.EmployeeGetPayload<{
  include: {
    department: { select: { id: true; name: true } };
    documentChecklist: {
      include: {
        documentType: { select: { id: true; name: true; categoryId: true } };
      };
    };
    documents: {
      include: {
        documentType: { select: { id: true; name: true; categoryId: true } };
      };
    };
  };
}>;

const employeeDetailInclude = {
  department: { select: { id: true, name: true } },
  documentChecklist: {
    include: {
      documentType: { select: { id: true, name: true, categoryId: true } },
    },
  },
  documents: {
    include: {
      documentType: { select: { id: true, name: true, categoryId: true } },
    },
  },
} satisfies Prisma.EmployeeInclude;

export async function findDepartmentByName(name: string) {
  return prisma.department.findUnique({ where: { name } });
}

export async function findByEmployeeNumber(employeeNumber: string): Promise<Employee | null> {
  return prisma.employee.findUnique({ where: { employeeNumber } });
}

export async function findByEmployeeNumberWithDetails(
  employeeNumber: string,
): Promise<EmployeeWithDepartment | null> {
  return prisma.employee.findUnique({
    where: { employeeNumber },
    include: employeeDetailInclude,
  });
}

export async function findByEmail(email: string): Promise<Employee | null> {
  return prisma.employee.findUnique({ where: { email } });
}

export async function findByEmailExcludingId(email: string, excludeId: string): Promise<Employee | null> {
  return prisma.employee.findFirst({
    where: { email, NOT: { id: excludeId } },
  });
}

export async function findDocumentType(categoryId: string, name: string) {
  return prisma.documentType.findUnique({
    where: {
      categoryId_name: { categoryId, name },
    },
  });
}

export async function listEmployees(): Promise<EmployeeWithDepartment[]> {
  return prisma.employee.findMany({
    include: employeeDetailInclude,
    orderBy: [{ surname: 'asc' }, { firstName: 'asc' }],
  });
}

export async function listEmployeesWithoutLogin(): Promise<Employee[]> {
  return prisma.employee.findMany({
    where: { user: null },
    orderBy: [{ surname: 'asc' }, { firstName: 'asc' }],
  });
}

export async function createEmployeeWithDocuments(params: {
  employee: {
    employeeNumber: string;
    surname: string;
    firstName: string;
    middleName: string | null;
    dateOfBirth: Date;
    sex: Sex;
    maritalStatus: string;
    religion: string | null;
    homeAddress: string;
    contactNumber: string;
    email: string;
    profilePictureUrl: string | null;
    departmentId: string;
    position: string;
    employmentDate: Date;
    serviceDuration: string | null;
    status: EmployeeStatus;
    educationLevel: string | null;
    bachelorsDegree: string | null;
    mastersStatus: string | null;
    mastersDegreeName: string | null;
    doctorateStatus: string | null;
    functionalRate: number | null;
    gasolineAllowance: number | null;
    cashAdvanceBalance: number | null;
    employeeShare: number | null;
    createdById: string;
  };
  checklistItems: Array<{ documentTypeId: string; isCompleted: boolean; completedById: string }>;
  documents: Array<{
    documentTypeId: string | null;
    fileName: string;
    filePath: string;
    mimeType: string;
    fileSizeBytes: number;
    uploadedById: string;
  }>;
  audit: {
    userId: string;
    username: string;
    action: string;
    details: string;
    ipAddress?: string;
  };
  account: {
    username: string;
    email: string;
    passwordHash: string;
    permissions: Prisma.InputJsonValue;
  };
}): Promise<EmployeeWithDepartment> {
  return prisma.$transaction(async (tx) => {
    const createData: Prisma.EmployeeUncheckedCreateInput = {
      ...params.employee,
    };

    if (params.checklistItems.length > 0) {
      createData.documentChecklist = {
        create: params.checklistItems.map((item) => ({
          documentTypeId: item.documentTypeId,
          isCompleted: item.isCompleted,
          completedAt: item.isCompleted ? new Date() : null,
          completedById: item.isCompleted ? item.completedById : null,
        })),
      };
    }

    if (params.documents.length > 0) {
      createData.documents = {
        create: params.documents.map((doc) => ({
          documentTypeId: doc.documentTypeId,
          fileName: doc.fileName,
          filePath: doc.filePath,
          mimeType: doc.mimeType,
          fileSizeBytes: doc.fileSizeBytes,
          uploadedById: doc.uploadedById,
        })),
      };
    }

    const created = await tx.employee.create({
      data: createData,
      include: employeeDetailInclude,
    });

    await tx.user.create({
      data: {
        username: params.account.username,
        email: params.account.email,
        passwordHash: params.account.passwordHash,
        role: Role.EMPLOYEE,
        isActive: true,
        isApproved: true,
        permissions: params.account.permissions,
        employeeId: created.employeeNumber,
      },
    });

    const auditData: Prisma.AuditLogUncheckedCreateInput = {
      userId: params.audit.userId,
      username: params.audit.username,
      action: params.audit.action,
      entityType: 'Employee',
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

export async function updateEmployeeWithDocuments(params: {
  employeeId: string;
  employee: {
    surname: string;
    firstName: string;
    middleName: string | null;
    dateOfBirth: Date;
    sex: Sex;
    maritalStatus: string;
    religion: string | null;
    homeAddress: string;
    contactNumber: string;
    email: string;
    profilePictureUrl: string | null;
    departmentId: string;
    position: string;
    employmentDate: Date;
    serviceDuration: string | null;
    status: EmployeeStatus;
    educationLevel: string | null;
    bachelorsDegree: string | null;
    mastersStatus: string | null;
    mastersDegreeName: string | null;
    doctorateStatus: string | null;
    functionalRate: number | null;
    gasolineAllowance: number | null;
    cashAdvanceBalance: number | null;
    employeeShare: number | null;
    updatedById: string;
  };
  checklistItems: Array<{ documentTypeId: string; isCompleted: boolean; completedById: string }>;
  documentsToCreate: Array<{
    documentTypeId: string | null;
    fileName: string;
    filePath: string;
    mimeType: string;
    fileSizeBytes: number;
    uploadedById: string;
  }>;
  documentsToUpdate: Array<{
    id: string;
    fileName: string;
    filePath: string;
    mimeType: string;
    fileSizeBytes: number;
    uploadedById: string;
  }>;
  documentIdsToDelete: string[];
  audit: {
    userId: string;
    username: string;
    action: string;
    details: string;
    ipAddress?: string;
  };
}): Promise<EmployeeWithDepartment> {
  return prisma.$transaction(async (tx) => {
    await tx.employee.update({
      where: { id: params.employeeId },
      data: params.employee,
    });

    for (const item of params.checklistItems) {
      await tx.employeeDocumentChecklist.upsert({
        where: {
          employeeId_documentTypeId: {
            employeeId: params.employeeId,
            documentTypeId: item.documentTypeId,
          },
        },
        create: {
          employeeId: params.employeeId,
          documentTypeId: item.documentTypeId,
          isCompleted: item.isCompleted,
          completedAt: item.isCompleted ? new Date() : null,
          completedById: item.isCompleted ? item.completedById : null,
        },
        update: {
          isCompleted: item.isCompleted,
          completedAt: item.isCompleted ? new Date() : null,
          completedById: item.isCompleted ? item.completedById : null,
        },
      });
    }

    const completedTypeIds = params.checklistItems
      .filter((item) => item.isCompleted)
      .map((item) => item.documentTypeId);

    await tx.employeeDocumentChecklist.updateMany({
      where: {
        employeeId: params.employeeId,
        isCompleted: true,
        ...(completedTypeIds.length > 0 ? { documentTypeId: { notIn: completedTypeIds } } : {}),
      },
      data: {
        isCompleted: false,
        completedAt: null,
        completedById: null,
      },
    });

    if (params.documentIdsToDelete.length > 0) {
      await tx.employeeDocument.deleteMany({
        where: { id: { in: params.documentIdsToDelete } },
      });
    }

    for (const doc of params.documentsToUpdate) {
      await tx.employeeDocument.update({
        where: { id: doc.id },
        data: {
          fileName: doc.fileName,
          filePath: doc.filePath,
          mimeType: doc.mimeType,
          fileSizeBytes: doc.fileSizeBytes,
          uploadedById: doc.uploadedById,
          uploadedAt: new Date(),
        },
      });
    }

    if (params.documentsToCreate.length > 0) {
      await tx.employeeDocument.createMany({
        data: params.documentsToCreate.map((doc) => ({
          employeeId: params.employeeId,
          documentTypeId: doc.documentTypeId,
          fileName: doc.fileName,
          filePath: doc.filePath,
          mimeType: doc.mimeType,
          fileSizeBytes: doc.fileSizeBytes,
          uploadedById: doc.uploadedById,
        })),
      });
    }

    const auditData: Prisma.AuditLogUncheckedCreateInput = {
      userId: params.audit.userId,
      username: params.audit.username,
      action: params.audit.action,
      entityType: 'Employee',
      entityId: params.employeeId,
      details: params.audit.details,
      ipAddress: params.audit.ipAddress ?? null,
    };

    await tx.auditLog.create({
      data: auditData,
    });

    return tx.employee.findUniqueOrThrow({
      where: { id: params.employeeId },
      include: employeeDetailInclude,
    });
  });
}

export async function deleteEmployeeWithRelatedRecords(params: {
  employeeId: string;
  audit: {
    userId: string;
    username: string;
    action: string;
    details: string;
    ipAddress?: string;
  };
}): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.feedbackItem.deleteMany({
      where: { senderEmployeeId: params.employeeId },
    });

    const auditData: Prisma.AuditLogUncheckedCreateInput = {
      userId: params.audit.userId,
      username: params.audit.username,
      action: params.audit.action,
      entityType: 'Employee',
      entityId: params.employeeId,
      details: params.audit.details,
      ipAddress: params.audit.ipAddress ?? null,
    };

    await tx.auditLog.create({
      data: auditData,
    });

    await tx.employee.delete({
      where: { id: params.employeeId },
    });
  });
}

export interface PromotionDocumentAttachment {
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface CreatePromotionParams {
  employeeId: string;
  previousPosition: string;
  newPosition: string;
  previousDepartmentId: string;
  newDepartmentId: string;
  effectiveDate: Date;
  newFunctionalRate?: number | undefined;
  remarks: string;
  isApproved: boolean;
  actorUserId: string;
  actorUsername: string;
  ipAddress?: string | undefined;
  auditDetails: string;
  document?: PromotionDocumentAttachment | undefined;
}

export async function listEmployeePromotions(employeeId: string) {
  return prisma.employmentStatusChange.findMany({
    where: {
      employeeId,
      changeType: EmploymentChangeType.PROMOTION,
    },
    include: {
      employee: {
        select: {
          id: true,
          employeeNumber: true,
          firstName: true,
          surname: true,
          position: true,
          department: { select: { id: true, name: true } },
        },
      },
      previousDepartment: { select: { id: true, name: true } },
      newDepartment: { select: { id: true, name: true } },
      approvedBy: { select: { id: true, username: true } },
      createdBy: { select: { id: true, username: true } },
    },
    orderBy: { effectiveDate: 'desc' },
  });
}

export async function createPromotionRecord(params: CreatePromotionParams) {
  return prisma.$transaction(async (tx) => {
    // 1. Create employment status change record
    const statusChange = await tx.employmentStatusChange.create({
      data: {
        employeeId: params.employeeId,
        changeType: EmploymentChangeType.PROMOTION,
        effectiveDate: params.effectiveDate,
        previousPosition: params.previousPosition,
        newPosition: params.newPosition,
        previousDepartmentId: params.previousDepartmentId,
        newDepartmentId: params.newDepartmentId,
        remarks: params.remarks,
        approvedById: params.isApproved ? params.actorUserId : null,
        createdById: params.actorUserId,
      },
      include: {
        previousDepartment: { select: { id: true, name: true } },
        newDepartment: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, username: true } },
        createdBy: { select: { id: true, username: true } },
      },
    });

    // 2. If approved directly, update employee record
    if (params.isApproved) {
      const updateData: Prisma.EmployeeUpdateInput = {
        position: params.newPosition,
        department: { connect: { id: params.newDepartmentId } },
      };
      if (params.newFunctionalRate !== undefined && params.newFunctionalRate !== null) {
        updateData.functionalRate = params.newFunctionalRate;
      }
      await tx.employee.update({
        where: { id: params.employeeId },
        data: updateData,
      });
    }

    // 3. If supporting document uploaded, attach and update 201 checklist
    if (params.document) {
      const docType = await tx.documentType.findUnique({
        where: {
          categoryId_name: {
            categoryId: 'administrative',
            name: 'Promotion or Salary Adjustment Documents',
          },
        },
      });

      if (docType) {
        await tx.employeeDocument.create({
          data: {
            employeeId: params.employeeId,
            documentTypeId: docType.id,
            filePath: params.document.url,
            fileName: params.document.fileName,
            fileSizeBytes: params.document.fileSize,
            mimeType: params.document.mimeType,
            uploadedById: params.actorUserId,
          },
        });

        await tx.employeeDocumentChecklist.upsert({
          where: {
            employeeId_documentTypeId: {
              employeeId: params.employeeId,
              documentTypeId: docType.id,
            },
          },
          update: {
            isCompleted: true,
            completedAt: new Date(),
            completedById: params.actorUserId,
          },
          create: {
            employeeId: params.employeeId,
            documentTypeId: docType.id,
            isCompleted: true,
            completedAt: new Date(),
            completedById: params.actorUserId,
          },
        });
      }
    }

    // 4. Create audit log
    await tx.auditLog.create({
      data: {
        userId: params.actorUserId,
        username: params.actorUsername,
        action: params.isApproved ? 'Promoted employee' : 'Submitted promotion recommendation',
        entityType: 'Employee',
        entityId: params.employeeId,
        details: params.auditDetails,
        ipAddress: params.ipAddress ?? null,
      },
    });

    return statusChange;
  });
}

export async function approvePromotionRecord(params: {
  employeeId: string;
  promotionId: string;
  actorUserId: string;
  actorUsername: string;
  ipAddress?: string | undefined;
}) {
  return prisma.$transaction(async (tx) => {
    const promo = await tx.employmentStatusChange.findFirst({
      where: {
        id: params.promotionId,
        employeeId: params.employeeId,
        changeType: EmploymentChangeType.PROMOTION,
      },
      include: {
        employee: true,
      },
    });

    if (!promo) {
      throw new Error('Promotion record not found');
    }

    if (promo.approvedById) {
      throw new Error('Promotion record is already approved');
    }

    // 1. Mark promotion as approved
    const updatedPromo = await tx.employmentStatusChange.update({
      where: { id: promo.id },
      data: {
        approvedById: params.actorUserId,
      },
      include: {
        previousDepartment: { select: { id: true, name: true } },
        newDepartment: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, username: true } },
        createdBy: { select: { id: true, username: true } },
      },
    });

    // 2. Update employee's active position and department
    const employeeUpdateData: Prisma.EmployeeUpdateInput = {};
    if (promo.newPosition) {
      employeeUpdateData.position = promo.newPosition;
    }
    if (promo.newDepartmentId) {
      employeeUpdateData.department = { connect: { id: promo.newDepartmentId } };
    }
    // Check if remarks mention salary update
    const salaryMatch = promo.remarks?.match(/(?:new salary|functional rate|rate):\s*(?:₱|PHP)?\s*([\d,]+(?:\.\d+)?)/i);
    const matchVal = salaryMatch?.[1];
    if (matchVal) {
      const parsedRate = parseFloat(matchVal.replace(/,/g, ''));
      if (!isNaN(parsedRate) && parsedRate > 0) {
        employeeUpdateData.functionalRate = parsedRate;
      }
    }

    if (Object.keys(employeeUpdateData).length > 0) {
      await tx.employee.update({
        where: { id: params.employeeId },
        data: employeeUpdateData,
      });
    }

    // 3. Create audit log
    await tx.auditLog.create({
      data: {
        userId: params.actorUserId,
        username: params.actorUsername,
        action: 'Approved employee promotion',
        entityType: 'Employee',
        entityId: params.employeeId,
        details: `${promo.employee.employeeNumber} — ${promo.employee.firstName} ${promo.employee.surname} promotion to ${promo.newPosition || 'New Role'} approved by ${params.actorUsername}.`,
        ipAddress: params.ipAddress ?? null,
      },
    });

    return updatedPromo;
  });
}

export async function deletePendingPromotionRecord(params: {
  employeeId: string;
  promotionId: string;
  actorUserId: string;
  actorUsername: string;
  ipAddress?: string | undefined;
}) {
  return prisma.$transaction(async (tx) => {
    const promo = await tx.employmentStatusChange.findFirst({
      where: {
        id: params.promotionId,
        employeeId: params.employeeId,
        changeType: EmploymentChangeType.PROMOTION,
      },
      include: {
        employee: true,
      },
    });

    if (!promo) {
      throw new Error('Promotion record not found');
    }

    if (promo.approvedById) {
      throw new Error('Cannot delete an already approved promotion');
    }

    await tx.employmentStatusChange.delete({
      where: { id: promo.id },
    });

    await tx.auditLog.create({
      data: {
        userId: params.actorUserId,
        username: params.actorUsername,
        action: 'Discarded promotion recommendation',
        entityType: 'Employee',
        entityId: params.employeeId,
        details: `Promotion recommendation for ${promo.employee.employeeNumber} (${promo.employee.firstName} ${promo.employee.surname}) to ${promo.newPosition || 'New Role'} was discarded.`,
        ipAddress: params.ipAddress ?? null,
      },
    });

    return { id: promo.id, success: true };
  });
}

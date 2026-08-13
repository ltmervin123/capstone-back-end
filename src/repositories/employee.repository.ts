import type { Employee, EmployeeStatus, Prisma, Sex } from '../generated/prisma/index.js';
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

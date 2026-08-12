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

export async function findByEmail(email: string): Promise<Employee | null> {
  return prisma.employee.findUnique({ where: { email } });
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

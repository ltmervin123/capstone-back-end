import path from 'node:path';
import type { Express } from 'express';
import { EmployeeStatus, Sex } from '../generated/prisma/index.js';
import { AppError } from '../errors/AppError.js';
import * as employeeRepository from '../repositories/employee.repository.js';
import * as userRepository from '../repositories/user.repository.js';
import {
  employeeDocumentDir,
  employeeProfileDir,
  persistStagedFile,
  removePaths,
  toPublicAssetUrl,
} from '../utils/fileStorage.js';
import type {
  CreateEmployeeInput,
  DocumentLabelInput,
} from '../validators/employee.validator.js';

type UploadedFiles = {
  profilePicture?: Express.Multer.File[];
  documents?: Express.Multer.File[];
};

function mapSex(sex: CreateEmployeeInput['sex']): Sex {
  switch (sex) {
    case 'Male':
      return Sex.MALE;
    case 'Female':
      return Sex.FEMALE;
    default:
      return Sex.OTHER;
  }
}

function mapStatus(status: CreateEmployeeInput['status']): EmployeeStatus {
  switch (status) {
    case 'Inactive':
      return EmployeeStatus.INACTIVE;
    case 'Retired':
      return EmployeeStatus.RETIRED;
    default:
      return EmployeeStatus.ACTIVE;
  }
}

function mapSexToFrontend(sex: Sex): 'Male' | 'Female' | 'Other' {
  switch (sex) {
    case Sex.MALE:
      return 'Male';
    case Sex.FEMALE:
      return 'Female';
    default:
      return 'Other';
  }
}

function mapStatusToFrontend(status: EmployeeStatus): 'Active' | 'Inactive' | 'Retired' {
  switch (status) {
    case EmployeeStatus.INACTIVE:
      return 'Inactive';
    case EmployeeStatus.RETIRED:
      return 'Retired';
    default:
      return 'Active';
  }
}

function parseDate(value: string, fieldName: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AppError(400, `Invalid ${fieldName}`, 'VALIDATION_ERROR');
  }
  return date;
}

function emptyChecklist() {
  return {
    personalInfo: {} as Record<string, boolean>,
    educational: {} as Record<string, boolean>,
    employment: {} as Record<string, boolean>,
    government: {} as Record<string, boolean>,
    training: {} as Record<string, boolean>,
    administrative: {} as Record<string, boolean>,
  };
}

function toFrontendEmployee(employee: Awaited<ReturnType<typeof employeeRepository.listEmployees>>[number]) {
  const checklist = emptyChecklist();
  const attachments = {
    personalInfo: {} as Record<string, string>,
    educational: {} as Record<string, string>,
    employment: {} as Record<string, string>,
    government: {} as Record<string, string>,
    training: {} as Record<string, string>,
    administrative: {} as Record<string, string>,
  };

  for (const item of employee.documentChecklist) {
    const categoryId = item.documentType.categoryId as keyof typeof checklist;
    if (categoryId in checklist) {
      checklist[categoryId][item.documentType.name] = item.isCompleted;
    }
  }

  for (const doc of employee.documents) {
    if (!doc.documentType) continue;
    const categoryId = doc.documentType.categoryId as keyof typeof attachments;
    if (categoryId in attachments) {
      const url = toPublicAssetUrl(doc.filePath);
      if (url) {
        attachments[categoryId][doc.documentType.name] = url;
      }
    }
  }

  return {
    id: employee.employeeNumber,
    dbId: employee.id,
    surname: employee.surname,
    firstName: employee.firstName,
    middleName: employee.middleName ?? '',
    dateOfBirth: employee.dateOfBirth.toISOString().slice(0, 10),
    sex: mapSexToFrontend(employee.sex),
    maritalStatus: employee.maritalStatus,
    religion: employee.religion ?? '',
    homeAddress: employee.homeAddress,
    contactNumber: employee.contactNumber,
    email: employee.email,
    position: employee.position,
    department: employee.department.name,
    serviceDuration: employee.serviceDuration ?? '',
    employmentDate: employee.employmentDate.toISOString().slice(0, 10),
    bachelorsDegree: employee.bachelorsDegree ?? '',
    mastersStatus: employee.mastersStatus ?? '',
    doctorateStatus: employee.doctorateStatus ?? '',
    mastersDegreeName: employee.mastersDegreeName ?? '',
    educationLevel: employee.educationLevel ?? '',
    profilePicture: toPublicAssetUrl(employee.profilePictureUrl),
    checklist,
    attachments,
    status: mapStatusToFrontend(employee.status),
    functionalRate: employee.functionalRate ? Number(employee.functionalRate) : 0,
    gasoline: employee.gasolineAllowance ? Number(employee.gasolineAllowance) : 0,
    cashAdvance: employee.cashAdvanceBalance ? Number(employee.cashAdvanceBalance) : 0,
    employeeShare: employee.employeeShare ? Number(employee.employeeShare) : 0,
    updatedAt: employee.updatedAt.getTime(),
  };
}

export async function listEmployees() {
  const employees = await employeeRepository.listEmployees();
  return employees.map(toFrontendEmployee);
}

export async function createEmployee(params: {
  input: CreateEmployeeInput;
  documentLabels: DocumentLabelInput[];
  files: UploadedFiles;
  actorUserId: string;
  ipAddress?: string;
}) {
  const { input, documentLabels, files, actorUserId, ipAddress } = params;
  const persistedAbsolutePaths: string[] = [];

  const actor = await userRepository.findById(actorUserId);
  if (!actor) {
    throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
  }

  const department = await employeeRepository.findDepartmentByName(input.department);
  if (!department || !department.isActive) {
    throw new AppError(400, `Department not found: ${input.department}`, 'DEPARTMENT_NOT_FOUND');
  }

  const existingNumber = await employeeRepository.findByEmployeeNumber(input.employeeNumber);
  if (existingNumber) {
    throw new AppError(409, 'Employee ID already exists', 'EMPLOYEE_NUMBER_EXISTS');
  }

  const existingEmail = await employeeRepository.findByEmail(input.email);
  if (existingEmail) {
    throw new AppError(409, 'Employee email already exists', 'EMPLOYEE_EMAIL_EXISTS');
  }

  const profileFile = files.profilePicture?.[0];
  const documentFiles = files.documents ?? [];

  if (documentFiles.length !== documentLabels.length) {
    throw new AppError(
      400,
      'Each uploaded document must include a matching label (category + item)',
      'DOCUMENT_LABEL_MISMATCH',
    );
  }

  const checklistItems: Array<{
    documentTypeId: string;
    isCompleted: boolean;
    completedById: string;
  }> = [];
  const seenChecklistTypes = new Set<string>();

  const checklist = input.checklist;
  for (const [categoryId, items] of Object.entries(checklist)) {
    for (const [itemName, isChecked] of Object.entries(items)) {
      if (!isChecked) continue;
      const documentType = await employeeRepository.findDocumentType(categoryId, itemName);
      if (!documentType) {
        throw new AppError(
          400,
          `Unknown checklist item: ${categoryId} / ${itemName}`,
          'INVALID_CHECKLIST_ITEM',
        );
      }
      if (!seenChecklistTypes.has(documentType.id)) {
        seenChecklistTypes.add(documentType.id);
        checklistItems.push({
          documentTypeId: documentType.id,
          isCompleted: true,
          completedById: actorUserId,
        });
      }
    }
  }

  try {
    let profilePictureUrl: string | null = null;

    if (profileFile) {
      const profileDir = employeeProfileDir(input.employeeNumber);
      const saved = await persistStagedFile({
        stagedPath: profileFile.path,
        destinationDir: profileDir,
        originalName: profileFile.originalname,
      });
      persistedAbsolutePaths.push(path.join(profileDir, saved.storedFileName));
      profilePictureUrl = saved.relativePath;
    }

    const documents: Array<{
      documentTypeId: string | null;
      fileName: string;
      filePath: string;
      mimeType: string;
      fileSizeBytes: number;
      uploadedById: string;
    }> = [];

    for (let i = 0; i < documentFiles.length; i++) {
      const file = documentFiles[i]!;
      const label = documentLabels[i]!;
      const documentType = await employeeRepository.findDocumentType(label.categoryId, label.itemName);
      if (!documentType) {
        throw new AppError(
          400,
          `Unknown document type: ${label.categoryId} / ${label.itemName}`,
          'INVALID_DOCUMENT_TYPE',
        );
      }

      const destDir = employeeDocumentDir(input.employeeNumber, label.categoryId);
      const saved = await persistStagedFile({
        stagedPath: file.path,
        destinationDir: destDir,
        originalName: file.originalname,
      });
      persistedAbsolutePaths.push(path.join(destDir, saved.storedFileName));

      documents.push({
        documentTypeId: documentType.id,
        fileName: file.originalname,
        filePath: saved.relativePath,
        mimeType: file.mimetype,
        fileSizeBytes: file.size,
        uploadedById: actorUserId,
      });

      if (!seenChecklistTypes.has(documentType.id)) {
        seenChecklistTypes.add(documentType.id);
        checklistItems.push({
          documentTypeId: documentType.id,
          isCompleted: true,
          completedById: actorUserId,
        });
      }
    }

    const created = await employeeRepository.createEmployeeWithDocuments({
      employee: {
        employeeNumber: input.employeeNumber,
        surname: input.surname,
        firstName: input.firstName,
        middleName: input.middleName || null,
        dateOfBirth: parseDate(input.dateOfBirth, 'date of birth'),
        sex: mapSex(input.sex),
        maritalStatus: input.maritalStatus,
        religion: input.religion || null,
        homeAddress: input.homeAddress,
        contactNumber: input.contactNumber,
        email: input.email,
        profilePictureUrl,
        departmentId: department.id,
        position: input.position,
        employmentDate: parseDate(input.employmentDate, 'employment date'),
        serviceDuration: input.serviceDuration || null,
        status: mapStatus(input.status),
        educationLevel: input.educationLevel || null,
        bachelorsDegree: input.bachelorsDegree || null,
        mastersStatus: input.mastersStatus || null,
        mastersDegreeName: input.mastersDegreeName || null,
        doctorateStatus: input.doctorateStatus || null,
        functionalRate: input.functionalRate,
        gasolineAllowance: input.gasoline,
        cashAdvanceBalance: input.cashAdvance,
        employeeShare: input.employeeShare,
        createdById: actorUserId,
      },
      checklistItems,
      documents,
      audit: {
        userId: actorUserId,
        username: actor.username,
        action: 'Created employee record',
        details: `${input.employeeNumber} — ${input.firstName} ${input.surname}`,
        ...(ipAddress ? { ipAddress } : {}),
      },
    });

    return toFrontendEmployee(created);
  } catch (error) {
    await removePaths(persistedAbsolutePaths);
    throw error;
  }
}

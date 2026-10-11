import type { Express } from 'express';
import { EmployeeStatus, Sex } from '../generated/prisma/index.js';
import { AppError } from '../errors/AppError.js';
import * as employeeRepository from '../repositories/employee.repository.js';
import * as userRepository from '../repositories/user.repository.js';
import { permissionsToJson, type UserPermissions } from '../types/auth.js';
import { hashPassword } from '../utils/crypto.js';
import {
  destroyCloudinaryUploads,
  destroyCloudinaryUrls,
  destroyEmployeeCloudFolder,
  employeeDocumentCloudFolder,
  employeeProfileCloudFolder,
  uploadBufferToCloudinary,
  type CloudinaryUploadResult,
} from '../utils/cloudinaryStorage.js';
import { toPublicAssetUrl } from '../utils/fileStorage.js';
import type {
  CreateEmployeeInput,
  DocumentLabelInput,
} from '../validators/employee.validator.js';

type UploadedFiles = {
  profilePicture?: Express.Multer.File[];
  documents?: Express.Multer.File[];
};

const DEFAULT_EMPLOYEE_PERMISSIONS: UserPermissions = {
  dashboard: false,
  employees: false,
  attendance: true,
  payroll: true,
  leaves: true,
  talentAcquisition: false,
  aiSearch: false,
  reports: false,
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

async function ensureMissingEmployeeLogins(): Promise<void> {
  const missing = await employeeRepository.listEmployeesWithoutLogin();
  if (missing.length === 0) {
    return;
  }

  console.log(`Creating login accounts for ${missing.length} employees...`);

  const employeeNumbers = missing.map((employee) => employee.employeeNumber);
  const emails = missing.map((employee) => employee.email);
  const conflicts = await userRepository.listConflictingLogins({
    emails,
    usernames: employeeNumbers,
    employeeIds: employeeNumbers,
  });

  const takenEmails = new Set(conflicts.map((user) => user.email));
  const takenUsernames = new Set(conflicts.map((user) => user.username));
  const takenEmployeeIds = new Set(
    conflicts.map((user) => user.employeeId).filter((employeeId): employeeId is string => Boolean(employeeId)),
  );

  const permissions = permissionsToJson(DEFAULT_EMPLOYEE_PERMISSIONS);

  for (const employee of missing) {
    if (
      takenEmails.has(employee.email) ||
      takenUsernames.has(employee.employeeNumber) ||
      takenEmployeeIds.has(employee.employeeNumber)
    ) {
      continue;
    }

    try {
      await userRepository.createEmployeeLogin({
        username: employee.employeeNumber,
        email: employee.email,
        passwordHash: await hashPassword(employee.email),
        employeeId: employee.employeeNumber,
        permissions,
      });
      takenEmails.add(employee.email);
      takenUsernames.add(employee.employeeNumber);
      takenEmployeeIds.add(employee.employeeNumber);
    } catch (error) {
      console.error(
        `Failed to create login for employee ${employee.employeeNumber}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }
}

export async function provisionEmployeeLogins(): Promise<void> {
  await ensureMissingEmployeeLogins();
}

export async function listEmployees() {
  await ensureMissingEmployeeLogins();
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
  const uploadedCloudAssets: CloudinaryUploadResult[] = [];

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

  const existingLogin = await userRepository.findByUsernameOrEmail(input.email);
  if (existingLogin) {
    throw new AppError(
      409,
      'A login account already uses this email',
      'USER_EMAIL_EXISTS',
    );
  }

  const existingUsername = await userRepository.findByUsernameOrEmail(input.employeeNumber);
  if (existingUsername) {
    throw new AppError(
      409,
      'A login account already uses this employee ID as a username',
      'USER_USERNAME_EXISTS',
    );
  }

  const existingLinkedAccount = await userRepository.findByEmployeeId(input.employeeNumber);
  if (existingLinkedAccount) {
    throw new AppError(
      409,
      'A login account is already linked to this employee ID',
      'USER_EMPLOYEE_LINK_EXISTS',
    );
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
      if (!profileFile.buffer?.length) {
        throw new AppError(400, 'Profile picture upload is empty', 'INVALID_FILE');
      }
      const uploaded = await uploadBufferToCloudinary({
        buffer: profileFile.buffer,
        folder: employeeProfileCloudFolder(input.employeeNumber),
        originalName: profileFile.originalname,
      });
      uploadedCloudAssets.push(uploaded);
      profilePictureUrl = uploaded.url;
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

      if (!file.buffer?.length) {
        throw new AppError(400, 'Document upload is empty', 'INVALID_FILE');
      }

      const uploaded = await uploadBufferToCloudinary({
        buffer: file.buffer,
        folder: employeeDocumentCloudFolder(input.employeeNumber, label.categoryId),
        originalName: file.originalname,
      });
      uploadedCloudAssets.push(uploaded);

      documents.push({
        documentTypeId: documentType.id,
        fileName: file.originalname,
        filePath: uploaded.url,
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
      account: {
        username: input.employeeNumber,
        email: input.email,
        passwordHash: await hashPassword(input.email),
        permissions: permissionsToJson(DEFAULT_EMPLOYEE_PERMISSIONS),
      },
      audit: {
        userId: actorUserId,
        username: actor.username,
        action: 'Created employee record',
        details: `${input.employeeNumber} — ${input.firstName} ${input.surname}. Login account created.`,
        ...(ipAddress ? { ipAddress } : {}),
      },
    });

    return toFrontendEmployee(created);
  } catch (error) {
    await destroyCloudinaryUploads(uploadedCloudAssets);
    throw error;
  }
}

function documentsForType(
  employee: Awaited<ReturnType<typeof employeeRepository.findByEmployeeNumberWithDetails>>,
  documentTypeId: string,
) {
  return (employee?.documents ?? []).filter((doc) => doc.documentTypeId === documentTypeId);
}

export async function updateEmployee(params: {
  employeeNumber: string;
  input: CreateEmployeeInput;
  documentLabels: DocumentLabelInput[];
  removedDocuments: DocumentLabelInput[];
  removeProfilePicture: boolean;
  files: UploadedFiles;
  actorUserId: string;
  ipAddress?: string;
}) {
  const {
    employeeNumber,
    input,
    documentLabels,
    removedDocuments,
    removeProfilePicture,
    files,
    actorUserId,
    ipAddress,
  } = params;
  const uploadedCloudAssets: CloudinaryUploadResult[] = [];
  const staleCloudinaryUrls: string[] = [];

  const actor = await userRepository.findById(actorUserId);
  if (!actor) {
    throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
  }

  const existing = await employeeRepository.findByEmployeeNumberWithDetails(employeeNumber);
  if (!existing) {
    throw new AppError(404, 'Employee not found', 'EMPLOYEE_NOT_FOUND');
  }

  if (input.employeeNumber !== employeeNumber) {
    throw new AppError(400, 'Employee ID cannot be changed', 'EMPLOYEE_NUMBER_IMMUTABLE');
  }

  const department = await employeeRepository.findDepartmentByName(input.department);
  if (!department || !department.isActive) {
    throw new AppError(400, `Department not found: ${input.department}`, 'DEPARTMENT_NOT_FOUND');
  }

  const emailOwner = await employeeRepository.findByEmailExcludingId(input.email, existing.id);
  if (emailOwner) {
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

  const replacementKeys = new Set(
    documentLabels.map((label) => `${label.categoryId}::${label.itemName}`),
  );
  const removals = removedDocuments.filter(
    (label) => !replacementKeys.has(`${label.categoryId}::${label.itemName}`),
  );

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
    let profilePictureUrl = existing.profilePictureUrl;
    if (profileFile) {
      if (!profileFile.buffer?.length) {
        throw new AppError(400, 'Profile picture upload is empty', 'INVALID_FILE');
      }
      const uploaded = await uploadBufferToCloudinary({
        buffer: profileFile.buffer,
        folder: employeeProfileCloudFolder(employeeNumber),
        originalName: profileFile.originalname,
      });
      uploadedCloudAssets.push(uploaded);
      if (existing.profilePictureUrl) {
        staleCloudinaryUrls.push(existing.profilePictureUrl);
      }
      profilePictureUrl = uploaded.url;
    } else if (removeProfilePicture && existing.profilePictureUrl) {
      staleCloudinaryUrls.push(existing.profilePictureUrl);
      profilePictureUrl = null;
    }

    const documentIdsToDelete: string[] = [];
    const documentsToCreate: Array<{
      documentTypeId: string | null;
      fileName: string;
      filePath: string;
      mimeType: string;
      fileSizeBytes: number;
      uploadedById: string;
    }> = [];
    const documentsToUpdate: Array<{
      id: string;
      fileName: string;
      filePath: string;
      mimeType: string;
      fileSizeBytes: number;
      uploadedById: string;
    }> = [];

    for (const label of removals) {
      const documentType = await employeeRepository.findDocumentType(label.categoryId, label.itemName);
      if (!documentType) {
        throw new AppError(
          400,
          `Unknown document type: ${label.categoryId} / ${label.itemName}`,
          'INVALID_DOCUMENT_TYPE',
        );
      }

      for (const doc of documentsForType(existing, documentType.id)) {
        documentIdsToDelete.push(doc.id);
        staleCloudinaryUrls.push(doc.filePath);
      }
    }

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

      if (!file.buffer?.length) {
        throw new AppError(400, 'Document upload is empty', 'INVALID_FILE');
      }

      const uploaded = await uploadBufferToCloudinary({
        buffer: file.buffer,
        folder: employeeDocumentCloudFolder(employeeNumber, label.categoryId),
        originalName: file.originalname,
      });
      uploadedCloudAssets.push(uploaded);

      const existingDocs = documentsForType(existing, documentType.id).filter(
        (doc) => !documentIdsToDelete.includes(doc.id),
      );
      const [primary, ...extras] = existingDocs;

      if (primary) {
        staleCloudinaryUrls.push(primary.filePath);
        documentsToUpdate.push({
          id: primary.id,
          fileName: file.originalname,
          filePath: uploaded.url,
          mimeType: file.mimetype,
          fileSizeBytes: file.size,
          uploadedById: actorUserId,
        });
        for (const extra of extras) {
          documentIdsToDelete.push(extra.id);
          staleCloudinaryUrls.push(extra.filePath);
        }
      } else {
        documentsToCreate.push({
          documentTypeId: documentType.id,
          fileName: file.originalname,
          filePath: uploaded.url,
          mimeType: file.mimetype,
          fileSizeBytes: file.size,
          uploadedById: actorUserId,
        });
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

    const updated = await employeeRepository.updateEmployeeWithDocuments({
      employeeId: existing.id,
      employee: {
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
        updatedById: actorUserId,
      },
      checklistItems,
      documentsToCreate,
      documentsToUpdate,
      documentIdsToDelete,
      audit: {
        userId: actorUserId,
        username: actor.username,
        action: 'Updated employee record',
        details: `${employeeNumber} — ${input.firstName} ${input.surname}`,
        ...(ipAddress ? { ipAddress } : {}),
      },
    });

    await destroyCloudinaryUrls(staleCloudinaryUrls);
    return toFrontendEmployee(updated);
  } catch (error) {
    await destroyCloudinaryUploads(uploadedCloudAssets);
    throw error;
  }
}

export async function deleteEmployee(params: {
  employeeNumber: string;
  actorUserId: string;
  ipAddress?: string;
}) {
  const { employeeNumber, actorUserId, ipAddress } = params;

  const actor = await userRepository.findById(actorUserId);
  if (!actor) {
    throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
  }

  const existing = await employeeRepository.findByEmployeeNumberWithDetails(employeeNumber);
  if (!existing) {
    throw new AppError(404, 'Employee not found', 'EMPLOYEE_NOT_FOUND');
  }

  const cloudinaryUrls = [
    existing.profilePictureUrl,
    ...existing.documents.map((doc) => doc.filePath),
  ];

  await employeeRepository.deleteEmployeeWithRelatedRecords({
    employeeId: existing.id,
    audit: {
      userId: actorUserId,
      username: actor.username,
      action: 'Deleted employee record',
      details: `${existing.employeeNumber} — ${existing.firstName} ${existing.surname}`,
      ...(ipAddress ? { ipAddress } : {}),
    },
  });

  await destroyCloudinaryUrls(cloudinaryUrls);
  await destroyEmployeeCloudFolder(existing.employeeNumber);

  return { employeeNumber: existing.employeeNumber };
}

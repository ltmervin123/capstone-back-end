import { ApplicantStatus, Role } from '../generated/prisma/index.js';
import { AppError } from '../errors/AppError.js';
import * as applicantRepository from '../repositories/applicant.repository.js';
import * as employeeRepository from '../repositories/employee.repository.js';
import * as userRepository from '../repositories/user.repository.js';
import type {
  CreateApplicantInput,
  UpdateApplicantInput,
} from '../validators/applicant.validator.js';

const STATUS_TO_DB: Record<CreateApplicantInput['status'], ApplicantStatus> = {
  Applied: ApplicantStatus.APPLIED,
  Interviewing: ApplicantStatus.INTERVIEWING,
  Offered: ApplicantStatus.OFFERED,
  'Accepted/Hired': ApplicantStatus.HIRED,
  Rejected: ApplicantStatus.REJECTED,
};

const STATUS_TO_FRONTEND: Record<ApplicantStatus, CreateApplicantInput['status']> = {
  [ApplicantStatus.APPLIED]: 'Applied',
  [ApplicantStatus.INTERVIEWING]: 'Interviewing',
  [ApplicantStatus.OFFERED]: 'Offered',
  [ApplicantStatus.HIRED]: 'Accepted/Hired',
  [ApplicantStatus.REJECTED]: 'Rejected',
};

function parseDate(value: string, fieldName: string): Date {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new AppError(400, `Invalid ${fieldName}`, 'VALIDATION_ERROR');
  }
  return date;
}

function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}

function toFrontendApplicant(
  record: Awaited<ReturnType<typeof applicantRepository.listApplicants>>[number],
) {
  return {
    id: record.id,
    name: record.fullName,
    email: record.email,
    phone: record.phone,
    position: record.positionApplied,
    department: record.department?.name ?? '',
    status: STATUS_TO_FRONTEND[record.status],
    appliedDate: record.appliedDate.toISOString().slice(0, 10),
    resumeUrl: record.resumeUrl ?? '',
    notes: record.notes ?? '',
  };
}

async function requireHrActor(actorUserId: string) {
  const actor = await userRepository.findById(actorUserId);
  if (!actor) {
    throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
  }

  if (actor.role !== Role.ADMIN && actor.role !== Role.HR) {
    throw new AppError(403, 'Forbidden', 'FORBIDDEN');
  }

  return actor;
}

async function resolveDepartmentId(departmentName: string | undefined): Promise<string | null> {
  const name = departmentName?.trim() ?? '';
  if (!name) {
    return null;
  }

  const department = await employeeRepository.findDepartmentByName(name);
  if (!department) {
    throw new AppError(400, 'Department not found', 'DEPARTMENT_NOT_FOUND');
  }

  return department.id;
}

async function toApplicantRecord(input: CreateApplicantInput | UpdateApplicantInput, actorUserId: string) {
  return {
    fullName: input.name,
    email: input.email.toLowerCase(),
    phone: input.phone,
    positionApplied: input.position,
    departmentId: await resolveDepartmentId(input.department),
    status: STATUS_TO_DB[input.status],
    appliedDate: parseDate(input.appliedDate, 'applied date'),
    resumeUrl: emptyToNull(input.resumeUrl),
    notes: emptyToNull(input.notes),
    updatedById: actorUserId,
  };
}

export async function listApplicants(actorUserId: string) {
  await requireHrActor(actorUserId);
  const records = await applicantRepository.listApplicants();
  return records.map(toFrontendApplicant);
}

export async function createApplicant(params: {
  input: CreateApplicantInput;
  actorUserId: string;
  ipAddress?: string;
}) {
  const { input, actorUserId, ipAddress } = params;
  const actor = await requireHrActor(actorUserId);
  const record = await toApplicantRecord(input, actorUserId);

  const created = await applicantRepository.createApplicant({
    record,
    audit: {
      userId: actorUserId,
      username: actor.username,
      action: 'Created applicant',
      details: `${input.name} — ${input.position} (${input.status})`,
      ...(ipAddress ? { ipAddress } : {}),
    },
  });

  return toFrontendApplicant(created);
}

export async function updateApplicant(params: {
  applicantId: string;
  input: UpdateApplicantInput;
  actorUserId: string;
  ipAddress?: string;
}) {
  const { applicantId, input, actorUserId, ipAddress } = params;
  const actor = await requireHrActor(actorUserId);

  const existing = await applicantRepository.findById(applicantId);
  if (!existing) {
    throw new AppError(404, 'Applicant not found', 'APPLICANT_NOT_FOUND');
  }

  const record = await toApplicantRecord(input, actorUserId);

  const updated = await applicantRepository.updateApplicant({
    id: existing.id,
    record,
    audit: {
      userId: actorUserId,
      username: actor.username,
      action: 'Updated applicant',
      details: `${input.name} — ${input.position} (${input.status})`,
      ...(ipAddress ? { ipAddress } : {}),
    },
  });

  return toFrontendApplicant(updated);
}

export async function deleteApplicant(params: {
  applicantId: string;
  actorUserId: string;
  ipAddress?: string;
}) {
  const { applicantId, actorUserId, ipAddress } = params;
  const actor = await requireHrActor(actorUserId);

  const existing = await applicantRepository.findById(applicantId);
  if (!existing) {
    throw new AppError(404, 'Applicant not found', 'APPLICANT_NOT_FOUND');
  }

  await applicantRepository.deleteApplicant({
    id: existing.id,
    audit: {
      userId: actorUserId,
      username: actor.username,
      action: 'Deleted applicant',
      details: `${existing.fullName} — ${existing.positionApplied}`,
      ...(ipAddress ? { ipAddress } : {}),
    },
  });

  return { id: existing.id };
}

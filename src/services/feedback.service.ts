import { FeedbackStatus, Role } from '../generated/prisma/index.js';
import { AppError } from '../errors/AppError.js';
import * as employeeRepository from '../repositories/employee.repository.js';
import * as feedbackRepository from '../repositories/feedback.repository.js';
import * as userRepository from '../repositories/user.repository.js';
import type { CreateFeedbackInput } from '../validators/feedback.validator.js';

function mapStatusToFrontend(status: FeedbackStatus): 'New' | 'Under Review' | 'Resolved' {
  switch (status) {
    case FeedbackStatus.UNDER_REVIEW:
      return 'Under Review';
    case FeedbackStatus.RESOLVED:
      return 'Resolved';
    default:
      return 'New';
  }
}

function toFrontendFeedback(record: Awaited<ReturnType<typeof feedbackRepository.listFeedback>>[number]) {
  return {
    id: record.id,
    senderUserId: record.senderUserId ?? undefined,
    senderName: record.senderName,
    senderEmail: record.senderEmail,
    senderEmployeeId: record.senderEmployeeId ?? undefined,
    category: record.category,
    subject: record.subject,
    message: record.message,
    isAnonymous: record.isAnonymous,
    status: mapStatusToFrontend(record.status),
    adminResponse: record.adminResponse ?? undefined,
    createdAt: record.createdAt.getTime(),
    updatedAt: record.updatedAt.getTime(),
  };
}

export async function listFeedback(actorUserId: string) {
  const actor = await userRepository.findById(actorUserId);
  if (!actor) {
    throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
  }

  if (actor.role === Role.EMPLOYEE) {
    const records = await feedbackRepository.listFeedbackBySenderUserId(actor.id);
    return records.map(toFrontendFeedback);
  }

  if (actor.role !== Role.ADMIN && actor.role !== Role.HR) {
    throw new AppError(403, 'Forbidden', 'FORBIDDEN');
  }

  const records = await feedbackRepository.listFeedback();
  return records.map(toFrontendFeedback);
}

export async function createFeedback(params: {
  input: CreateFeedbackInput;
  actorUserId: string;
  ipAddress?: string;
}) {
  const { input, actorUserId, ipAddress } = params;

  const actor = await userRepository.findById(actorUserId);
  if (!actor) {
    throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
  }

  if (actor.role !== Role.EMPLOYEE) {
    throw new AppError(403, 'Only employees can send feedback', 'FORBIDDEN');
  }

  let senderEmployeeId: string | null = null;
  if (actor.employeeId) {
    const employee = await employeeRepository.findByEmployeeNumber(actor.employeeId);
    senderEmployeeId = employee?.id ?? null;
  }

  const isAnonymous = input.isAnonymous;
  const senderName = isAnonymous ? 'Anonymous Employee' : actor.username;
  const senderEmail = isAnonymous ? 'anonymous@normi.edu.ph' : actor.email;

  const created = await feedbackRepository.createFeedback({
    record: {
      senderUserId: actor.id,
      senderEmployeeId: isAnonymous ? null : senderEmployeeId,
      senderName,
      senderEmail,
      category: input.category,
      subject: input.subject,
      message: input.message,
      isAnonymous,
    },
    audit: {
      userId: actorUserId,
      username: actor.username,
      action: 'Submitted feedback',
      details: isAnonymous
        ? `Anonymous — ${input.category}: ${input.subject}`
        : `${actor.username} — ${input.category}: ${input.subject}`,
      ...(ipAddress ? { ipAddress } : {}),
    },
  });

  return toFrontendFeedback(created);
}

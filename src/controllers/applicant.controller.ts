import type { NextFunction, Request, Response } from 'express';
import { Role } from '../generated/prisma/index.js';
import { AppError } from '../errors/AppError.js';
import * as applicantService from '../services/applicant.service.js';
import type {
  CreateApplicantInput,
  UpdateApplicantInput,
} from '../validators/applicant.validator.js';

function requireHrUser(req: Request) {
  if (!req.user) {
    throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
  }

  if (req.user.role !== Role.ADMIN && req.user.role !== Role.HR) {
    throw new AppError(403, 'Forbidden', 'FORBIDDEN');
  }

  return req.user;
}

function requireApplicantId(req: Request) {
  const applicantId = String(req.params.id ?? '').trim();
  if (!applicantId) {
    throw new AppError(400, 'Applicant ID is required', 'VALIDATION_ERROR');
  }
  return applicantId;
}

export async function listApplicants(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const actor = requireHrUser(req);
    const applicants = await applicantService.listApplicants(actor.id);
    res.status(200).json({
      success: true,
      data: { applicants },
    });
  } catch (error) {
    next(error);
  }
}

export async function createApplicant(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const actor = requireHrUser(req);
    const applicant = await applicantService.createApplicant({
      input: req.body as CreateApplicantInput,
      actorUserId: actor.id,
      ...(req.ip ? { ipAddress: req.ip } : {}),
    });

    res.status(201).json({
      success: true,
      data: { applicant },
      message: 'Applicant created successfully',
    });
  } catch (error) {
    next(error);
  }
}

export async function updateApplicant(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const actor = requireHrUser(req);
    const applicant = await applicantService.updateApplicant({
      applicantId: requireApplicantId(req),
      input: req.body as UpdateApplicantInput,
      actorUserId: actor.id,
      ...(req.ip ? { ipAddress: req.ip } : {}),
    });

    res.status(200).json({
      success: true,
      data: { applicant },
      message: 'Applicant updated successfully',
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteApplicant(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const actor = requireHrUser(req);
    const result = await applicantService.deleteApplicant({
      applicantId: requireApplicantId(req),
      actorUserId: actor.id,
      ...(req.ip ? { ipAddress: req.ip } : {}),
    });

    res.status(200).json({
      success: true,
      data: result,
      message: 'Applicant deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}

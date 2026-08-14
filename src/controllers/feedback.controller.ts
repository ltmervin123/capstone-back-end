import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError.js';
import * as feedbackService from '../services/feedback.service.js';
import type { CreateFeedbackInput } from '../validators/feedback.validator.js';

export async function listFeedback(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const records = await feedbackService.listFeedback(req.user.id);
    res.status(200).json({
      success: true,
      data: { records },
    });
  } catch (error) {
    next(error);
  }
}

export async function createFeedback(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const record = await feedbackService.createFeedback({
      input: req.body as CreateFeedbackInput,
      actorUserId: req.user.id,
      ...(req.ip ? { ipAddress: req.ip } : {}),
    });

    res.status(201).json({
      success: true,
      data: { record },
      message: 'Feedback submitted successfully',
    });
  } catch (error) {
    next(error);
  }
}

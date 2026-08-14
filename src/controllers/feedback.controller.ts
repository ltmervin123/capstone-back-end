import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError.js';
import * as feedbackService from '../services/feedback.service.js';
import type { CreateFeedbackInput, ReplyFeedbackInput, UpdateFeedbackStatusInput } from '../validators/feedback.validator.js';

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

export async function updateFeedbackStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const feedbackId = String(req.params.id ?? '').trim();
    if (!feedbackId) {
      throw new AppError(400, 'Feedback ID is required', 'VALIDATION_ERROR');
    }

    const record = await feedbackService.updateFeedbackStatus({
      feedbackId,
      input: req.body as UpdateFeedbackStatusInput,
      actorUserId: req.user.id,
      ...(req.ip ? { ipAddress: req.ip } : {}),
    });

    res.status(200).json({
      success: true,
      data: { record },
      message: 'Feedback status updated',
    });
  } catch (error) {
    next(error);
  }
}

export async function replyToFeedback(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const feedbackId = String(req.params.id ?? '').trim();
    if (!feedbackId) {
      throw new AppError(400, 'Feedback ID is required', 'VALIDATION_ERROR');
    }

    const record = await feedbackService.replyToFeedback({
      feedbackId,
      input: req.body as ReplyFeedbackInput,
      actorUserId: req.user.id,
      ...(req.ip ? { ipAddress: req.ip } : {}),
    });

    res.status(200).json({
      success: true,
      data: { record },
      message: 'Response saved successfully',
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteFeedback(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const feedbackId = String(req.params.id ?? '').trim();
    if (!feedbackId) {
      throw new AppError(400, 'Feedback ID is required', 'VALIDATION_ERROR');
    }

    const result = await feedbackService.deleteFeedback({
      feedbackId,
      actorUserId: req.user.id,
      ...(req.ip ? { ipAddress: req.ip } : {}),
    });

    res.status(200).json({
      success: true,
      data: result,
      message: 'Feedback message deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}

export async function markNotificationsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const result = await feedbackService.markNotificationsRead(req.user.id);
    res.status(200).json({
      success: true,
      data: result,
      message: 'Notifications marked as read',
    });
  } catch (error) {
    next(error);
  }
}

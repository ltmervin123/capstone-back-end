import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError.js';
import * as aiService from '../services/ai.service.js';
import type { StreamChatBodyInput } from '../validators/ai.validator.js';

export async function streamChat(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    next(new AppError(401, 'Unauthorized', 'UNAUTHORIZED'));
    return;
  }

  const { message, history } = req.body as StreamChatBodyInput;

  // Configure response headers for Server-Sent Events (SSE)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable proxy buffering (Nginx, Render)
  res.flushHeaders?.();

  try {
    await aiService.streamChatWithDatabase({
      userId: req.user.id,
      message,
      history,
      res,
    });
  } catch (error) {
    next(error);
  }
}

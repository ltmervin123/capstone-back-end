import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError.js';
import * as aiService from '../services/ai.service.js';
import type { RenameConversationInput, StreamChatBodyInput } from '../validators/ai.validator.js';

export async function listConversations(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    next(new AppError(401, 'Unauthorized', 'UNAUTHORIZED'));
    return;
  }

  try {
    const conversations = await aiService.listUserConversations(req.user.id);
    res.json({ success: true, data: conversations });
  } catch (error) {
    next(error);
  }
}

export async function getConversation(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    next(new AppError(401, 'Unauthorized', 'UNAUTHORIZED'));
    return;
  }

  try {
    const conversation = await aiService.getUserConversation(req.params.id as string, req.user.id);
    res.json({ success: true, data: conversation });
  } catch (error) {
    next(error);
  }
}

export async function renameConversation(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    next(new AppError(401, 'Unauthorized', 'UNAUTHORIZED'));
    return;
  }

  const { title } = req.body as RenameConversationInput;

  try {
    const updated = await aiService.renameUserConversation(
      req.params.id as string,
      req.user.id,
      title
    );
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
}

export async function deleteConversation(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    next(new AppError(401, 'Unauthorized', 'UNAUTHORIZED'));
    return;
  }

  try {
    await aiService.deleteUserConversation(req.params.id as string, req.user.id);
    res.json({ success: true, message: 'Conversation deleted successfully' });
  } catch (error) {
    next(error);
  }
}

export async function clearAllConversations(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    next(new AppError(401, 'Unauthorized', 'UNAUTHORIZED'));
    return;
  }

  try {
    await aiService.clearAllUserConversations(req.user.id);
    res.json({ success: true, message: 'All conversations cleared successfully' });
  } catch (error) {
    next(error);
  }
}

export async function streamChat(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    next(new AppError(401, 'Unauthorized', 'UNAUTHORIZED'));
    return;
  }

  const { message, conversationId, history } = req.body as StreamChatBodyInput;

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
      conversationId,
      history,
      res,
    });
  } catch (error) {
    next(error);
  }
}

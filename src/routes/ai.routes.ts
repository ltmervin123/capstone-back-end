import { Router } from 'express';
import * as aiController from '../controllers/ai.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/authorize.middleware.js';
import { validateBody, validateParams } from '../middleware/validator.js';
import {
  conversationIdParamSchema,
  renameConversationSchema,
  streamChatBodySchema,
} from '../validators/ai.validator.js';

const router: Router = Router();

router.get(
  '/conversations',
  authenticate,
  requirePermission('aiSearch'),
  aiController.listConversations
);

router.delete(
  '/conversations',
  authenticate,
  requirePermission('aiSearch'),
  aiController.clearAllConversations
);

router.get(
  '/conversations/:id',
  authenticate,
  requirePermission('aiSearch'),
  validateParams(conversationIdParamSchema),
  aiController.getConversation
);

router.patch(
  '/conversations/:id',
  authenticate,
  requirePermission('aiSearch'),
  validateParams(conversationIdParamSchema),
  validateBody(renameConversationSchema),
  aiController.renameConversation
);

router.delete(
  '/conversations/:id',
  authenticate,
  requirePermission('aiSearch'),
  validateParams(conversationIdParamSchema),
  aiController.deleteConversation
);

router.post(
  '/chat/stream',
  authenticate,
  requirePermission('aiSearch'),
  validateBody(streamChatBodySchema),
  aiController.streamChat
);

export default router;

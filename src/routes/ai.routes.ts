import { Router } from 'express';
import { Role } from '../generated/prisma/index.js';
import * as aiController from '../controllers/ai.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRoles } from '../middleware/authorize.middleware.js';
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
  requireRoles(Role.ADMIN),
  aiController.listConversations
);

router.delete(
  '/conversations',
  authenticate,
  requireRoles(Role.ADMIN),
  aiController.clearAllConversations
);

router.get(
  '/conversations/:id',
  authenticate,
  requireRoles(Role.ADMIN),
  validateParams(conversationIdParamSchema),
  aiController.getConversation
);

router.patch(
  '/conversations/:id',
  authenticate,
  requireRoles(Role.ADMIN),
  validateParams(conversationIdParamSchema),
  validateBody(renameConversationSchema),
  aiController.renameConversation
);

router.delete(
  '/conversations/:id',
  authenticate,
  requireRoles(Role.ADMIN),
  validateParams(conversationIdParamSchema),
  aiController.deleteConversation
);

router.post(
  '/chat/stream',
  authenticate,
  requireRoles(Role.ADMIN),
  validateBody(streamChatBodySchema),
  aiController.streamChat
);

export default router;

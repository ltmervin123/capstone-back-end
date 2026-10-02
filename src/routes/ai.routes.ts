import { Router } from 'express';
import { Role } from '../generated/prisma/index.js';
import * as aiController from '../controllers/ai.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRoles } from '../middleware/authorize.middleware.js';
import { validateBody } from '../middleware/validator.js';
import { streamChatBodySchema } from '../validators/ai.validator.js';

const router: Router = Router();

router.post(
  '/chat/stream',
  authenticate,
  requireRoles(Role.ADMIN),
  validateBody(streamChatBodySchema),
  aiController.streamChat
);

export default router;

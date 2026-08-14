import { Router } from 'express';
import { Role } from '../generated/prisma/index.js';
import * as feedbackController from '../controllers/feedback.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRoles } from '../middleware/authorize.middleware.js';
import { validateBody } from '../middleware/validator.js';
import { createFeedbackBodySchema } from '../validators/feedback.validator.js';

const router: Router = Router();

router.get(
  '/',
  authenticate,
  requireRoles(Role.ADMIN, Role.HR, Role.EMPLOYEE),
  feedbackController.listFeedback,
);

router.post(
  '/',
  authenticate,
  requireRoles(Role.EMPLOYEE),
  validateBody(createFeedbackBodySchema),
  feedbackController.createFeedback,
);

export default router;

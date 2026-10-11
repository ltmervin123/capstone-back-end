import { Router } from 'express';
import { Role } from '../generated/prisma/index.js';
import * as feedbackController from '../controllers/feedback.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission, requireRoles } from '../middleware/authorize.middleware.js';
import { validateBody } from '../middleware/validator.js';
import { createFeedbackBodySchema, replyFeedbackBodySchema, updateFeedbackStatusBodySchema } from '../validators/feedback.validator.js';

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

router.patch(
  '/notifications/read',
  authenticate,
  requireRoles(Role.EMPLOYEE),
  feedbackController.markNotificationsRead,
);

router.patch(
  '/:id/status',
  authenticate,
  requireRoles(Role.ADMIN, Role.HR),
  requirePermission('feedback'),
  validateBody(updateFeedbackStatusBodySchema),
  feedbackController.updateFeedbackStatus,
);

router.patch(
  '/:id/reply',
  authenticate,
  requireRoles(Role.ADMIN, Role.HR),
  requirePermission('feedback'),
  validateBody(replyFeedbackBodySchema),
  feedbackController.replyToFeedback,
);

router.delete(
  '/:id',
  authenticate,
  requireRoles(Role.ADMIN, Role.HR),
  requirePermission('feedback'),
  feedbackController.deleteFeedback,
);

export default router;

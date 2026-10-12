import { Router } from 'express';
import { Role } from '../generated/prisma/index.js';
import * as leaveController from '../controllers/leave.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission, requireRoles } from '../middleware/authorize.middleware.js';
import { validateBody } from '../middleware/validator.js';
import { createLeaveBodySchema } from '../validators/leave.validator.js';

const router: Router = Router();

router.get(
  '/',
  authenticate,
  requirePermission('leaves'),
  leaveController.listLeaves,
);

router.post(
  '/',
  authenticate,
  requirePermission('leaves'),
  validateBody(createLeaveBodySchema),
  leaveController.createLeave,
);

router.patch(
  '/:id/approve',
  authenticate,
  requireRoles(Role.ADMIN, Role.HR),
  requirePermission('leaves'),
  leaveController.approveLeave,
);

router.patch(
  '/:id/reject',
  authenticate,
  requireRoles(Role.ADMIN, Role.HR),
  requirePermission('leaves'),
  leaveController.rejectLeave,
);

router.delete(
  '/:id',
  authenticate,
  requireRoles(Role.ADMIN, Role.HR),
  requirePermission('leaves'),
  leaveController.deleteLeave,
);

export default router;

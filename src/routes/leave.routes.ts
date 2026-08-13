import { Router } from 'express';
import { Role } from '../generated/prisma/index.js';
import * as leaveController from '../controllers/leave.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRoles } from '../middleware/authorize.middleware.js';
import { validateBody } from '../middleware/validator.js';
import { createLeaveBodySchema } from '../validators/leave.validator.js';

const router: Router = Router();

router.get(
  '/',
  authenticate,
  requireRoles(Role.ADMIN, Role.HR, Role.EMPLOYEE),
  leaveController.listLeaves,
);

router.post(
  '/',
  authenticate,
  requireRoles(Role.ADMIN, Role.HR, Role.EMPLOYEE),
  validateBody(createLeaveBodySchema),
  leaveController.createLeave,
);

export default router;

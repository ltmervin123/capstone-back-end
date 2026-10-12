import { Router } from 'express';
import { Role } from '../generated/prisma/index.js';
import * as attendanceController from '../controllers/attendance.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission, requireRoles } from '../middleware/authorize.middleware.js';
import { validateBody } from '../middleware/validator.js';
import { createAttendanceBodySchema } from '../validators/attendance.validator.js';

const router: Router = Router();

router.get(
  '/',
  authenticate,
  requirePermission('attendance'),
  attendanceController.listAttendance,
);

router.post(
  '/',
  authenticate,
  requireRoles(Role.ADMIN, Role.HR),
  requirePermission('attendance'),
  validateBody(createAttendanceBodySchema),
  attendanceController.createAttendance,
);

export default router;

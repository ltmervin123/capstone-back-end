import { Router } from 'express';
import { Role } from '../generated/prisma/index.js';
import * as payrollController from '../controllers/payroll.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission, requireRoles } from '../middleware/authorize.middleware.js';
import { validateBody } from '../middleware/validator.js';
import {
  adjustPayrollRecordSchema,
  createPayrollRunSchema,
} from '../validators/payroll.validator.js';

const router: Router = Router();

// Pay Runs
router.get(
  '/runs',
  authenticate,
  requireRoles(Role.ADMIN, Role.HR),
  requirePermission('payroll'),
  payrollController.listPayrollRuns
);

router.post(
  '/runs',
  authenticate,
  requireRoles(Role.ADMIN, Role.HR),
  requirePermission('payroll'),
  validateBody(createPayrollRunSchema),
  payrollController.createPayrollRun
);

router.get(
  '/runs/:id',
  authenticate,
  requireRoles(Role.ADMIN, Role.HR),
  requirePermission('payroll'),
  payrollController.getPayrollRunById
);

router.post(
  '/runs/:id/lock-attendance',
  authenticate,
  requireRoles(Role.ADMIN, Role.HR),
  requirePermission('payroll'),
  payrollController.lockAttendance
);

router.post(
  '/runs/:id/unlock-attendance',
  authenticate,
  requireRoles(Role.ADMIN, Role.HR),
  requirePermission('payroll'),
  payrollController.unlockAttendance
);

router.post(
  '/runs/:id/calculate',
  authenticate,
  requireRoles(Role.ADMIN, Role.HR),
  requirePermission('payroll'),
  payrollController.calculatePayrollRun
);

router.post(
  '/runs/:id/publish',
  authenticate,
  requireRoles(Role.ADMIN, Role.HR),
  requirePermission('payroll'),
  payrollController.publishPayrollRun
);

router.delete(
  '/runs/:id',
  authenticate,
  requireRoles(Role.ADMIN, Role.HR),
  requirePermission('payroll'),
  payrollController.deletePayrollRun
);

// Individual / Employee Payroll Records
router.get(
  '/records',
  authenticate,
  requirePermission('payroll'),
  payrollController.listPayrollRecords
);

router.get(
  '/records/:id',
  authenticate,
  requirePermission('payroll'),
  payrollController.getPayrollRecordById
);

router.patch(
  '/records/:id',
  authenticate,
  requireRoles(Role.ADMIN, Role.HR),
  requirePermission('payroll'),
  validateBody(adjustPayrollRecordSchema),
  payrollController.adjustPayrollRecord
);

export default router;

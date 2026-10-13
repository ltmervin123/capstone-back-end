import { Router } from 'express';
import { Role } from '../generated/prisma/index.js';
import * as employeeController from '../controllers/employee.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission, requireRoles } from '../middleware/authorize.middleware.js';
import {
  employeeCreateUpload,
  pdfDocumentUpload,
} from '../middleware/upload.middleware.js';

const router: Router = Router();

router.post(
  '/extract-document',
  authenticate,
  requireRoles(Role.ADMIN, Role.HR),
  requirePermission('employees'),
  pdfDocumentUpload,
  employeeController.extractEmployeeDocument,
);

router.get(
  '/',
  authenticate,
  requirePermission('employees'),
  employeeController.listEmployees,
);

router.post(
  '/',
  authenticate,
  requireRoles(Role.ADMIN, Role.HR),
  requirePermission('employees'),
  employeeCreateUpload,
  employeeController.createEmployee,
);

router.patch(
  '/:employeeNumber',
  authenticate,
  requireRoles(Role.ADMIN, Role.HR),
  requirePermission('employees'),
  employeeCreateUpload,
  employeeController.updateEmployee,
);

router.delete(
  '/:employeeNumber',
  authenticate,
  requireRoles(Role.ADMIN, Role.HR),
  requirePermission('employees'),
  employeeController.deleteEmployee,
);

// Promotion management endpoints
router.get(
  '/:employeeNumber/promotions',
  authenticate,
  requirePermission('employees'),
  employeeController.listEmployeePromotions,
);

router.post(
  '/:employeeNumber/promotions',
  authenticate,
  requireRoles(Role.ADMIN, Role.HR),
  requirePermission('employees'),
  pdfDocumentUpload,
  employeeController.promoteEmployee,
);

router.patch(
  '/:employeeNumber/promotions/:promotionId/approve',
  authenticate,
  requireRoles(Role.ADMIN),
  requirePermission('employees'),
  employeeController.approvePromotion,
);

router.delete(
  '/:employeeNumber/promotions/:promotionId',
  authenticate,
  requireRoles(Role.ADMIN),
  requirePermission('employees'),
  employeeController.deletePendingPromotion,
);

export default router;

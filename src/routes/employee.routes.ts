import { Router } from 'express';
import { Role } from '../generated/prisma/index.js';
import * as employeeController from '../controllers/employee.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRoles } from '../middleware/authorize.middleware.js';
import {
  employeeCreateUpload,
  pdfDocumentUpload,
} from '../middleware/upload.middleware.js';

const router: Router = Router();

router.post(
  '/extract-document',
  authenticate,
  requireRoles(Role.ADMIN, Role.HR),
  pdfDocumentUpload,
  employeeController.extractEmployeeDocument,
);

router.get(
  '/',
  authenticate,
  requireRoles(Role.ADMIN, Role.HR),
  employeeController.listEmployees,
);

router.post(
  '/',
  authenticate,
  requireRoles(Role.ADMIN, Role.HR),
  employeeCreateUpload,
  employeeController.createEmployee,
);

router.patch(
  '/:employeeNumber',
  authenticate,
  requireRoles(Role.ADMIN, Role.HR),
  employeeCreateUpload,
  employeeController.updateEmployee,
);

router.delete(
  '/:employeeNumber',
  authenticate,
  requireRoles(Role.ADMIN, Role.HR),
  employeeController.deleteEmployee,
);

export default router;

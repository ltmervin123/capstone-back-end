import { Router } from 'express';
import { Role } from '../generated/prisma/index.js';
import * as userController from '../controllers/user.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRoles } from '../middleware/authorize.middleware.js';
import { validateBody } from '../middleware/validator.js';
import {
  createStaffUserBodySchema,
  updateUserPasswordBodySchema,
  updateUserPermissionsBodySchema,
  updateUserStatusBodySchema,
} from '../validators/user.validator.js';

const router: Router = Router();

router.get('/', authenticate, requireRoles(Role.ADMIN), userController.listUsers);
router.get('/audit-logs', authenticate, requireRoles(Role.ADMIN), userController.listAuditLogs);
router.post(
  '/',
  authenticate,
  requireRoles(Role.ADMIN),
  validateBody(createStaffUserBodySchema),
  userController.createStaffUser,
);
router.patch('/:id/approve', authenticate, requireRoles(Role.ADMIN), userController.approveUser);
router.patch(
  '/:id/status',
  authenticate,
  requireRoles(Role.ADMIN),
  validateBody(updateUserStatusBodySchema),
  userController.updateUserStatus,
);
router.patch(
  '/:id/permissions',
  authenticate,
  requireRoles(Role.ADMIN),
  validateBody(updateUserPermissionsBodySchema),
  userController.updateUserPermissions,
);
router.patch(
  '/:id/password',
  authenticate,
  requireRoles(Role.ADMIN),
  validateBody(updateUserPasswordBodySchema),
  userController.updateUserPassword,
);
router.delete('/:id', authenticate, requireRoles(Role.ADMIN), userController.deleteUser);

export default router;

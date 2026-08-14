import { Router } from 'express';
import { Role } from '../generated/prisma/index.js';
import * as dashboardController from '../controllers/dashboard.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRoles } from '../middleware/authorize.middleware.js';

const router: Router = Router();

router.get(
  '/',
  authenticate,
  requireRoles(Role.ADMIN, Role.HR),
  dashboardController.getDashboardSummary,
);

export default router;

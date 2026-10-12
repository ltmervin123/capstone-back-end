import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/authorize.middleware.js';

const router: Router = Router();

router.get(
  '/',
  authenticate,
  requirePermission('dashboard'),
  dashboardController.getDashboardSummary,
);

export default router;

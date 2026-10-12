import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/authorize.middleware.js';
import * as reportController from '../controllers/report.controller.js';

const router: Router = Router();

router.get('/employment', authenticate, requirePermission('reports'), reportController.getEmploymentReport);
router.get('/promotions', authenticate, requirePermission('reports'), reportController.getPromotionReport);
router.get('/attendance', authenticate, requirePermission('reports'), reportController.getAttendanceReport);
router.get('/filters', authenticate, requirePermission('reports'), reportController.getReportFilters);

export default router;

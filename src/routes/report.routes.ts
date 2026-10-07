import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import * as reportController from '../controllers/report.controller.js';

const router: Router = Router();

router.get('/employment', authenticate, reportController.getEmploymentReport);
router.get('/promotions', authenticate, reportController.getPromotionReport);
router.get('/attendance', authenticate, reportController.getAttendanceReport);
router.get('/filters', authenticate, reportController.getReportFilters);

export default router;

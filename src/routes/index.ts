import { Router } from 'express';
import aiRoutes from './ai.routes.js';
import applicantRoutes from './applicant.routes.js';
import attendanceRoutes from './attendance.routes.js';
import authRoutes from './auth.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import employeeRoutes from './employee.routes.js';
import feedbackRoutes from './feedback.routes.js';
import leaveRoutes from './leave.routes.js';
import payrollRoutes from './payroll.routes.js';
import userRoutes from './user.routes.js';

const router: Router = Router();

router.use('/auth', authRoutes);
router.use('/ai', aiRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/employees', employeeRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/leaves', leaveRoutes);
router.use('/payroll', payrollRoutes);
router.use('/applicants', applicantRoutes);
router.use('/feedback', feedbackRoutes);
router.use('/users', userRoutes);

export default router;

import { Router } from 'express';
import attendanceRoutes from './attendance.routes.js';
import authRoutes from './auth.routes.js';
import employeeRoutes from './employee.routes.js';

const router: Router = Router();

router.use('/auth', authRoutes);
router.use('/employees', employeeRoutes);
router.use('/attendance', attendanceRoutes);

export default router;

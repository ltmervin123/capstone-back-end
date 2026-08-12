import { Router } from 'express';
import authRoutes from './auth.routes.js';
import employeeRoutes from './employee.routes.js';

const router: Router = Router();

router.use('/auth', authRoutes);
router.use('/employees', employeeRoutes);

export default router;

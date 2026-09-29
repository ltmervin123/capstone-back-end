import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { validateBody } from '../middleware/validator.js';
import { changePasswordSchema, loginSchema } from '../validators/auth.validator.js';

const router: Router = Router();

router.post('/login', authLimiter, validateBody(loginSchema), authController.login);
router.post('/logout', authController.logout);
router.post('/refresh', authController.refresh);
router.get('/me', authenticate, authController.me);
router.patch(
  '/password',
  authenticate,
  validateBody(changePasswordSchema),
  authController.changePassword,
);

export default router;

import { Router } from 'express';
import { Role } from '../generated/prisma/index.js';
import * as applicantController from '../controllers/applicant.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission, requireRoles } from '../middleware/authorize.middleware.js';
import { validateBody } from '../middleware/validator.js';
import {
  createApplicantBodySchema,
  updateApplicantBodySchema,
} from '../validators/applicant.validator.js';

const router: Router = Router();

router.get(
  '/',
  authenticate,
  requirePermission('talentAcquisition'),
  applicantController.listApplicants,
);

router.post(
  '/',
  authenticate,
  requireRoles(Role.ADMIN, Role.HR),
  requirePermission('talentAcquisition'),
  validateBody(createApplicantBodySchema),
  applicantController.createApplicant,
);

router.patch(
  '/:id',
  authenticate,
  requireRoles(Role.ADMIN, Role.HR),
  requirePermission('talentAcquisition'),
  validateBody(updateApplicantBodySchema),
  applicantController.updateApplicant,
);

router.delete(
  '/:id',
  authenticate,
  requireRoles(Role.ADMIN, Role.HR),
  requirePermission('talentAcquisition'),
  applicantController.deleteApplicant,
);

export default router;

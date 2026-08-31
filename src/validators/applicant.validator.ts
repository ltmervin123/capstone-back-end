import { z } from 'zod';

export const APPLICANT_STATUS_VALUES = [
  'Applied',
  'Interviewing',
  'Offered',
  'Accepted/Hired',
  'Rejected',
] as const;

const applicantFields = {
  name: z.string().trim().min(1, 'Applicant name is required').max(200),
  email: z.string().trim().email('A valid email is required').max(200),
  phone: z.string().trim().min(1, 'Phone number is required').max(50),
  position: z.string().trim().min(1, 'Position applied is required').max(200),
  department: z.string().trim().max(200).optional().default(''),
  status: z.enum(APPLICANT_STATUS_VALUES).optional().default('Applied'),
  appliedDate: z.string().trim().min(1, 'Applied date is required'),
  resumeUrl: z.string().trim().max(2000).optional().default(''),
  notes: z.string().trim().max(4000).optional().default(''),
};

export const createApplicantBodySchema = z.object(applicantFields);

export const updateApplicantBodySchema = z.object(applicantFields);

export type CreateApplicantInput = z.infer<typeof createApplicantBodySchema>;
export type UpdateApplicantInput = z.infer<typeof updateApplicantBodySchema>;

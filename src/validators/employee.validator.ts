import { z } from 'zod';

const checklistCategorySchema = z.record(z.string(), z.boolean()).default({});

export const createEmployeeBodySchema = z.object({
  employeeNumber: z
    .string()
    .trim()
    .min(1, 'Employee ID is required')
    .max(50)
    .transform((value) => value.toUpperCase()),
  surname: z.string().trim().min(1, 'Surname is required').max(100),
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  middleName: z.string().trim().max(100).optional().default(''),
  dateOfBirth: z.string().trim().min(1, 'Date of birth is required'),
  sex: z.enum(['Male', 'Female', 'Other']),
  maritalStatus: z.string().trim().min(1, 'Marital status is required').max(50),
  religion: z.string().trim().max(100).optional().default(''),
  homeAddress: z.string().trim().min(1, 'Home address is required').max(500),
  contactNumber: z.string().trim().min(1, 'Contact number is required').max(30),
  email: z.string().trim().email('Valid email is required').max(255),
  position: z.string().trim().min(1, 'Position is required').max(150),
  department: z.string().trim().min(1, 'Department is required').max(150),
  employmentDate: z.string().trim().min(1, 'Employment date is required'),
  serviceDuration: z.string().trim().max(100).optional().default(''),
  status: z.enum(['Active', 'Inactive', 'Retired']).default('Active'),
  educationLevel: z.string().trim().max(100).optional().default(''),
  bachelorsDegree: z.string().trim().max(150).optional().default(''),
  mastersStatus: z.string().trim().max(50).optional().default(''),
  mastersDegreeName: z.string().trim().max(150).optional().default(''),
  doctorateStatus: z.string().trim().max(50).optional().default(''),
  functionalRate: z.coerce.number().nonnegative().optional().default(0),
  gasoline: z.coerce.number().nonnegative().optional().default(0),
  cashAdvance: z.coerce.number().nonnegative().optional().default(0),
  employeeShare: z.coerce.number().nonnegative().optional().default(0),
  checklist: z
    .object({
      personalInfo: checklistCategorySchema,
      educational: checklistCategorySchema,
      employment: checklistCategorySchema,
      government: checklistCategorySchema,
      training: checklistCategorySchema,
      administrative: checklistCategorySchema,
    })
    .optional()
    .default({
      personalInfo: {},
      educational: {},
      employment: {},
      government: {},
      training: {},
      administrative: {},
    }),
});

export const documentLabelSchema = z.object({
  categoryId: z.enum([
    'personalInfo',
    'educational',
    'employment',
    'government',
    'training',
    'administrative',
  ]),
  itemName: z.string().trim().min(1),
});

export const documentLabelsSchema = z.array(documentLabelSchema);

export const updateEmployeeBodySchema = createEmployeeBodySchema;

export const removedDocumentsSchema = documentLabelsSchema;

export type CreateEmployeeInput = z.infer<typeof createEmployeeBodySchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeBodySchema>;
export type DocumentLabelInput = z.infer<typeof documentLabelSchema>;

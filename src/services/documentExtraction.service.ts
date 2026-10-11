import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env.js';
import { AppError } from '../errors/AppError.js';
import { DEPARTMENTS } from '../data/departments.js';

const anthropic = new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY,
});

export interface ExtractedEmployeeData {
  surname: string;
  firstName: string;
  middleName: string;
  dateOfBirth: string;
  sex: 'Male' | 'Female' | 'Other';
  maritalStatus: string;
  religion: string;
  homeAddress: string;
  contactNumber: string;
  email: string;
  position: string;
  department: string;
  employmentDate: string;
  serviceDuration: string;
  educationLevel: string;
  bachelorsDegree: string;
  mastersStatus: string;
  mastersDegreeName: string;
  doctorateStatus: string;
  documentType: 'PDS' | 'RESUME' | 'CV' | 'BIODATA';
  fileName: string;
}

interface AiExtractionRawResult {
  isValidEmployeeDocument: boolean;
  documentType: 'PDS' | 'RESUME' | 'CV' | 'BIODATA' | 'INVALID';
  rejectionReason: string | null;
  extracted?: Partial<ExtractedEmployeeData>;
}

const SYSTEM_PROMPT = `
You are an expert HR Document Intelligence Analyzer for Northern Mindanao Colleges, Inc. (NMC-HR).
Your task is to analyze uploaded PDF documents submitted by HR or Administrators when registering a new employee.

VALIDATION MANDATE:
1. First, inspect the document to determine if it is a legitimate employee or applicant record:
   - Acceptable formats: Civil Service Form No. 212 (Personal Data Sheet / PDS), Résumés, Curriculum Vitae (CV), or Bio-data forms.
   - Entry-level applicants, fresh graduates, or newly hired teachers with no prior employment history ARE VALID as long as their personal identity (name, contact info) and educational background are present.
2. If the PDF is NOT an employee profile (e.g. financial receipt, utility bill, invoice, bank slip, grade sheet, textbook chapter, random assignment, corrupted/blank file, or unrelated document):
   - Set "isValidEmployeeDocument": false
   - Set "documentType": "INVALID"
   - Provide a clear, polite "rejectionReason" describing what document was detected and explaining why it cannot be used for employee registration (e.g., "The uploaded document appears to be an electric bill or invoice, not an employee Personal Data Sheet (PDS) or resume.").
   - Do not populate extracted fields.

EXTRACTION MANDATE:
If "isValidEmployeeDocument" is true:
- "documentType": categorize as "PDS", "RESUME", "CV", or "BIODATA".
- Extract all identifiable information:
  * "surname": Candidate's family name / last name.
  * "firstName": Candidate's first name / given name.
  * "middleName": Middle name or middle initial (if none, empty string "").
  * "dateOfBirth": Date of birth in YYYY-MM-DD format (e.g. "1994-05-18"). If absent, "".
  * "sex": "Male", "Female", or "Other".
  * "maritalStatus": "Single", "Married", "Widowed", "Separated", etc. Defaults to "Single" if unspecified.
  * "religion": Religious affiliation (if unspecified, "").
  * "homeAddress": Complete residential address combining house/lot, street, barangay, city/municipality, and province.
  * "contactNumber": Mobile or landline contact number.
  * "email": Contact email address.
  * "position": Position applied for, current role, or professional title (e.g. "Instructor", "Administrative Assistant").
  * "department": MUST match one of the 24 official NMC departments listed below if a clear association exists. If no match is clear, return an empty string "":
    ${DEPARTMENTS.map((d) => `"${d}"`).join(', ')}
  * "employmentDate": Start or hiring date in YYYY-MM-DD format (if unavailable, use current date ${new Date().toISOString().slice(0, 10)}).
  * "serviceDuration": Calculated or declared service length (e.g. "3 Years" or "" if new hire).
  * "educationLevel": Highest educational attainment (e.g. "Bachelor's Degree", "Master's Degree", "Doctorate").
  * "bachelorsDegree": College degree / major (e.g. "Bachelor of Science in Information Technology").
  * "mastersStatus": "Completed", "Ongoing", or "".
  * "mastersDegreeName": Name of master's degree program if mentioned.
  * "doctorateStatus": "Completed", "Ongoing", or "".

OUTPUT FORMAT:
Return ONLY a valid JSON object matching this schema without any markdown formatting or commentary:
{
  "isValidEmployeeDocument": true,
  "documentType": "PDS",
  "rejectionReason": null,
  "extracted": {
    "surname": "...",
    "firstName": "...",
    "middleName": "...",
    "dateOfBirth": "YYYY-MM-DD",
    "sex": "Male",
    "maritalStatus": "Single",
    "religion": "...",
    "homeAddress": "...",
    "contactNumber": "...",
    "email": "...",
    "position": "...",
    "department": "...",
    "employmentDate": "YYYY-MM-DD",
    "serviceDuration": "...",
    "educationLevel": "...",
    "bachelorsDegree": "...",
    "mastersStatus": "...",
    "mastersDegreeName": "...",
    "doctorateStatus": "..."
  }
}
`;

export async function extractEmployeeFromPdf(
  buffer: Buffer,
  fileName: string
): Promise<ExtractedEmployeeData> {
  if (!buffer || buffer.length === 0) {
    throw new AppError(400, 'Uploaded PDF file is empty.', 'EMPTY_FILE');
  }

  const base64Data = buffer.toString('base64');

  let response: Anthropic.Message;
  try {
    response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64Data,
              },
            },
            {
              type: 'text',
              text: `Analyze this document ("${fileName}") and extract the employee registration profile as instructed.`,
            },
          ],
        },
      ],
    });
  } catch (err: unknown) {
    console.error('Anthropic document extraction error:', err);
    const message = err instanceof Error ? err.message : 'Failed to communicate with AI service.';
    throw new AppError(502, `AI document analysis failed: ${message}`, 'AI_SERVICE_ERROR');
  }

  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new AppError(500, 'AI extraction returned an empty response.', 'AI_RESPONSE_EMPTY');
  }

  let cleaned = textBlock.text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  let parsed: AiExtractionRawResult;
  try {
    parsed = JSON.parse(cleaned) as AiExtractionRawResult;
  } catch (parseErr) {
    console.error('Failed to parse Claude extraction response JSON:', cleaned, parseErr);
    throw new AppError(500, 'AI returned an unparseable response format.', 'AI_PARSE_ERROR');
  }

  if (!parsed.isValidEmployeeDocument) {
    const reason =
      parsed.rejectionReason ||
      'The uploaded document does not appear to be an employee Personal Data Sheet (PDS), resume, or bio-data.';
    throw new AppError(422, reason, 'INVALID_EMPLOYEE_DOCUMENT');
  }

  const ext = parsed.extracted ?? {};

  // Normalize sex
  let sex: 'Male' | 'Female' | 'Other' = 'Male';
  if (ext.sex === 'Female' || ext.sex === 'Other') {
    sex = ext.sex;
  }

  // Verify department exists in official list
  let department = ext.department ?? '';
  if (department && !DEPARTMENTS.includes(department as (typeof DEPARTMENTS)[number])) {
    department = '';
  }

  // Format birth date if present
  let dateOfBirth = ext.dateOfBirth ?? '';
  if (dateOfBirth) {
    const d = new Date(dateOfBirth);
    if (!Number.isNaN(d.getTime())) {
      dateOfBirth = d.toISOString().slice(0, 10);
    } else {
      dateOfBirth = '';
    }
  }

  // Format employment date
  let employmentDate = ext.employmentDate ?? '';
  if (employmentDate) {
    const d = new Date(employmentDate);
    if (!Number.isNaN(d.getTime())) {
      employmentDate = d.toISOString().slice(0, 10);
    } else {
      employmentDate = new Date().toISOString().slice(0, 10);
    }
  } else {
    employmentDate = new Date().toISOString().slice(0, 10);
  }

  const validDocTypes: Array<'PDS' | 'RESUME' | 'CV' | 'BIODATA'> = [
    'PDS',
    'RESUME',
    'CV',
    'BIODATA',
  ];
  const documentType = validDocTypes.includes(
    parsed.documentType as 'PDS' | 'RESUME' | 'CV' | 'BIODATA'
  )
    ? (parsed.documentType as 'PDS' | 'RESUME' | 'CV' | 'BIODATA')
    : 'PDS';

  return {
    surname: ext.surname ?? '',
    firstName: ext.firstName ?? '',
    middleName: ext.middleName ?? '',
    dateOfBirth,
    sex,
    maritalStatus: ext.maritalStatus || 'Single',
    religion: ext.religion ?? '',
    homeAddress: ext.homeAddress ?? '',
    contactNumber: ext.contactNumber ?? '',
    email: ext.email ?? '',
    position: ext.position ?? '',
    department,
    employmentDate,
    serviceDuration: ext.serviceDuration ?? '',
    educationLevel: ext.educationLevel ?? '',
    bachelorsDegree: ext.bachelorsDegree ?? '',
    mastersStatus: ext.mastersStatus ?? '',
    mastersDegreeName: ext.mastersDegreeName ?? '',
    doctorateStatus: ext.doctorateStatus ?? '',
    documentType,
    fileName,
  };
}

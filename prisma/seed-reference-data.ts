export { DEPARTMENTS } from '../src/data/departments.js';

export const DOCUMENT_CATEGORIES = [
  {
    id: 'personalInfo',
    title: 'A. Personal Information Documents',
    sortOrder: 1,
    items: [
      'Personal Data Sheet / Bio Data',
      'Updated Resume or Curriculum Vitae',
      'Birth Certificate (PSA Copy)',
      'Marriage Certificate (if applicable)',
      'Valid Government IDs',
      '2x2 or Passport Size ID Picture',
      'Emergency Contact Information',
    ],
  },
  {
    id: 'educational',
    title: 'B. Educational Credentials',
    sortOrder: 2,
    items: [
      'Diploma (College)',
      'Transcript of Records (TOR)',
      "Master's Degree Diploma / TOR (if applicable)",
      'Doctorate Degree Documents (if applicable)',
      'Professional License (PRC)',
      'Board Rating (if applicable)',
    ],
  },
  {
    id: 'employment',
    title: 'C. Employment Documents',
    sortOrder: 3,
    items: [
      'Application Letter',
      'Appointment Paper / Employment Contract',
      'Job Description',
      'Oath of Office (if applicable)',
      'Service Record',
    ],
  },
  {
    id: 'government',
    title: 'D. Government Mandatory Requirements',
    sortOrder: 4,
    items: [
      'SSS Number / SSS ID',
      'PhilHealth Number / ID',
      'Pag-IBIG Number / MDF',
      'TIN / BIR Form',
      'NBI Clearance',
      'Police Clearance',
      'Medical Certificate / Health Clearance',
    ],
  },
  {
    id: 'training',
    title: 'E. Training and Professional Development',
    sortOrder: 5,
    items: [
      'Certificates of Training',
      'Seminar Certificates',
      'Workshop Participation Certificates',
    ],
  },
  {
    id: 'administrative',
    title: 'F. Administrative and Performance Records',
    sortOrder: 6,
    items: [
      'Performance Evaluation Reports',
      'Promotion or Salary Adjustment Documents',
      'Commendations / Awards',
      'Disciplinary Records (if any)',
    ],
  },
] as const;

export const DEPARTMENTS = [
  'Office of the President',
  'School Administrator / Graduate School',
  'Accounting /Finance Department',
  'Quality Assurance Office',
  'Director for Academic Affairs',
  'CEAS',
  'CIT',
  'CBA',
  'CHM',
  'CCJE',
  'DSA',
  'Basic Education',
  'Registrar',
  'Research, Planning, & Extension',
  'NORMI Bookstore',
  'GSO',
  'Library',
  'Clinic',
  'Guidance',
  'Scholarship',
  'TVED',
  'MIS',
  'Admission and Testing',
  'DPO',
] as const;

const DUMMY_PEOPLE = [
  { firstName: 'Ana', surname: 'Reyes', middleName: 'Santos', sex: 'FEMALE' as const, position: 'Staff' },
  { firstName: 'Luis', surname: 'Garcia', middleName: 'Cruz', sex: 'MALE' as const, position: 'Officer' },
  { firstName: 'Mia', surname: 'Santos', middleName: 'Reyes', sex: 'FEMALE' as const, position: 'Assistant' },
  { firstName: 'Carlo', surname: 'Cruz', middleName: 'Garcia', sex: 'MALE' as const, position: 'Coordinator' },
  { firstName: 'Liza', surname: 'Torres', middleName: 'Mendoza', sex: 'FEMALE' as const, position: 'Specialist' },
] as const;

export interface DepartmentDummyAccount {
  department: (typeof DEPARTMENTS)[number];
  employeeNumber: string;
  email: string;
  firstName: string;
  surname: string;
  middleName: string;
  sex: 'MALE' | 'FEMALE';
  position: string;
  contactNumber: string;
}

/** Five stable dummy employees for every department. Username is the employee number. Password is the email. */
export function departmentDummyAccounts(): DepartmentDummyAccount[] {
  return DEPARTMENTS.flatMap((department, departmentIndex) => {
    const departmentCode = String(departmentIndex + 1).padStart(2, '0');

    return DUMMY_PEOPLE.map((person, personIndex) => {
      const slotCode = String(personIndex + 1).padStart(2, '0');
      return {
        department,
        employeeNumber: `D${departmentCode}-${slotCode}`,
        email: `d${departmentCode}.${slotCode}@normi.edu.ph`,
        firstName: person.firstName,
        surname: person.surname,
        middleName: person.middleName,
        sex: person.sex,
        position: person.position,
        contactNumber: `0917${departmentCode}${slotCode}000`,
      };
    });
  });
}

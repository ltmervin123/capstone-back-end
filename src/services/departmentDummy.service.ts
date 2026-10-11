import { isProduction } from '../config/env.js';
import { DEPARTMENTS, departmentDummyAccounts } from '../data/departments.js';
import * as departmentDummyRepository from '../repositories/departmentDummy.repository.js';

const DEMO_EMPLOYEE_NUMBERS = ['EMP001', 'EMP002', 'EMP003', 'EMP004', 'EMP005', 'EMP006'];

export async function ensureDepartmentDummyAccounts(): Promise<number> {
  if (isProduction) {
    return 0;
  }

  const departmentIds = new Map<string, string>();

  for (const name of DEPARTMENTS) {
    const department = await departmentDummyRepository.upsertDepartment(name);
    departmentIds.set(name, department.id);
  }

  const accounts = departmentDummyAccounts();
  const existingNumbers = await departmentDummyRepository.findExistingEmployeeNumbers(
    accounts.map((account) => account.employeeNumber),
  );

  const missing = accounts.flatMap((account) => {
    if (existingNumbers.has(account.employeeNumber)) {
      return [];
    }

    const departmentId = departmentIds.get(account.department);
    if (!departmentId) {
      return [];
    }

    return [
      {
        employeeNumber: account.employeeNumber,
        surname: account.surname,
        firstName: account.firstName,
        middleName: account.middleName,
        sex: account.sex,
        contactNumber: account.contactNumber,
        email: account.email,
        departmentId,
        position: account.position,
      },
    ];
  });

  const created = await departmentDummyRepository.createDummyEmployees(missing);

  const missingPictures = await departmentDummyRepository.listEmployeesMissingProfilePicture([
    ...accounts.map((account) => account.employeeNumber),
    ...DEMO_EMPLOYEE_NUMBERS,
  ]);
  const pictured = await departmentDummyRepository.assignProfilePictures(missingPictures);
  if (pictured > 0) {
    console.log(`✓ Assigned placeholder profile pictures to ${pictured} employees`);
  }

  return created;
}

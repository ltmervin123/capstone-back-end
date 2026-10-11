import { EmployeeStatus, Sex, type Prisma } from '../generated/prisma/index.js';
import { prisma } from '../lib/prisma.js';
import { placeholderProfileUrl } from '../utils/placeholderProfile.js';

export async function upsertDepartment(name: string): Promise<{ id: string }> {
  return prisma.department.upsert({
    where: { name },
    update: { isActive: true },
    create: { name },
    select: { id: true },
  });
}

export async function findExistingEmployeeNumbers(employeeNumbers: string[]): Promise<Set<string>> {
  if (employeeNumbers.length === 0) {
    return new Set();
  }

  const rows = await prisma.employee.findMany({
    where: { employeeNumber: { in: employeeNumbers } },
    select: { employeeNumber: true },
  });

  return new Set(rows.map((row) => row.employeeNumber));
}

export async function createDummyEmployees(
  employees: Array<{
    employeeNumber: string;
    surname: string;
    firstName: string;
    middleName: string;
    sex: 'MALE' | 'FEMALE';
    contactNumber: string;
    email: string;
    departmentId: string;
    position: string;
  }>,
): Promise<number> {
  if (employees.length === 0) {
    return 0;
  }

  const data: Prisma.EmployeeCreateManyInput[] = employees.map((employee) => ({
    employeeNumber: employee.employeeNumber,
    surname: employee.surname,
    firstName: employee.firstName,
    middleName: employee.middleName,
    dateOfBirth: new Date('1992-06-15'),
    sex: employee.sex === 'MALE' ? Sex.MALE : Sex.FEMALE,
    maritalStatus: 'Single',
    religion: 'Roman Catholic',
    homeAddress: 'Cagayan de Oro City, Misamis Oriental',
    contactNumber: employee.contactNumber,
    email: employee.email,
    profilePictureUrl: placeholderProfileUrl(employee.employeeNumber),
    departmentId: employee.departmentId,
    position: employee.position,
    employmentDate: new Date('2019-06-01'),
    serviceDuration: '7 Years',
    status: EmployeeStatus.ACTIVE,
    educationLevel: "Bachelor's Degree",
    bachelorsDegree: 'Bachelor of Science',
    functionalRate: 1200,
    gasolineAllowance: 500,
    cashAdvanceBalance: 0,
    employeeShare: 800,
  }));

  const result = await prisma.employee.createMany({
    data,
    skipDuplicates: true,
  });

  return result.count;
}

export async function listEmployeesMissingProfilePicture(
  employeeNumbers: string[],
): Promise<string[]> {
  if (employeeNumbers.length === 0) {
    return [];
  }

  const rows = await prisma.employee.findMany({
    where: {
      employeeNumber: { in: employeeNumbers },
      profilePictureUrl: null,
    },
    select: { employeeNumber: true },
  });

  return rows.map((row) => row.employeeNumber);
}

export async function assignProfilePictures(
  employeeNumbers: string[],
): Promise<number> {
  if (employeeNumbers.length === 0) {
    return 0;
  }

  const chunkSize = 25;
  for (let index = 0; index < employeeNumbers.length; index += chunkSize) {
    const chunk = employeeNumbers.slice(index, index + chunkSize);
    await prisma.$transaction(
      chunk.map((employeeNumber) =>
        prisma.employee.update({
          where: { employeeNumber },
          data: { profilePictureUrl: placeholderProfileUrl(employeeNumber) },
        }),
      ),
    );
  }

  return employeeNumbers.length;
}

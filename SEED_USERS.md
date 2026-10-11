# Seed Users (Development / Testing)

These accounts are created when you run:

```bash
pnpm prisma db seed
```

**Development only.** Do not use these passwords in production.

---

## Active accounts (can log in)

| Role | Username | Email | Password | Employee ID | Notes |
|------|----------|-------|----------|-------------|-------|
| Admin | `admin` | admin@normi.edu.ph | `AdminPassword123!` | — | Full access to all modules |
| HR | `hr_personnel` | hr@normi.edu.ph | `HrPassword123!` | — | Standard HR access (no payroll/reports/AI search) |
| Employee | `juan_delacruz` | juan.delacruz@normi.edu.ph | `juan.delacruz@normi.edu.ph` | EMP001 | Employee self-service access only. Password defaults to email. |

---

## Pending account (login blocked)

| Role | Username | Email | Password | Notes |
|------|----------|-------|----------|-------|
| HR | `maria_clara` | maria.clara@normi.edu.ph | `ClaraPassword123!` | Account exists but `isApproved: false` — login returns *"Your account is pending approval."* |

---

## Quick copy

```
admin / AdminPassword123!
hr_personnel / HrPassword123!
juan_delacruz / juan.delacruz@normi.edu.ph
maria_clara / ClaraPassword123!  (pending approval — cannot log in)
```

---

## Permission summary

### admin
- dashboard, employees, attendance, payroll, leaves, talentAcquisition, aiSearch, reports: **enabled**

### hr_personnel
- dashboard, employees, attendance, leaves, talentAcquisition: **enabled**
- payroll, aiSearch, reports: **disabled**

### juan_delacruz
- attendance, payroll, leaves: **enabled**
- dashboard, employees, talentAcquisition, aiSearch, reports: **disabled** (dashboard is HR/Admin only)

### maria_clara
- dashboard, employees, talentAcquisition: **enabled**
- attendance, payroll, leaves, aiSearch, reports: **disabled**
- **Not approved** — cannot sign in until an admin approves the account

---

## Department dummy accounts

The backend creates **5 employee logins in every department** the first time the development server starts, if those employee IDs are not already in the database. A later restart does not add them again.

Username is the employee ID. Password is the email. Each account has a placeholder profile picture, shown in the sidebar after an employee signs in.

| Code | Department | Usernames | Email / password |
|------|------------|-----------|------------------|
| D01 | Office of the President | `D01-01` … `D01-05` | `d01.01@normi.edu.ph` … `d01.05@normi.edu.ph` |
| D02 | School Administrator / Graduate School | `D02-01` … `D02-05` | `d02.01@normi.edu.ph` … `d02.05@normi.edu.ph` |
| D03 | Accounting /Finance Department | `D03-01` … `D03-05` | `d03.01@normi.edu.ph` … `d03.05@normi.edu.ph` |
| D04 | Quality Assurance Office | `D04-01` … `D04-05` | `d04.01@normi.edu.ph` … `d04.05@normi.edu.ph` |
| D05 | Director for Academic Affairs | `D05-01` … `D05-05` | `d05.01@normi.edu.ph` … `d05.05@normi.edu.ph` |
| D06 | CEAS | `D06-01` … `D06-05` | `d06.01@normi.edu.ph` … `d06.05@normi.edu.ph` |
| D07 | CIT | `D07-01` … `D07-05` | `d07.01@normi.edu.ph` … `d07.05@normi.edu.ph` |
| D08 | CBA | `D08-01` … `D08-05` | `d08.01@normi.edu.ph` … `d08.05@normi.edu.ph` |
| D09 | CHM | `D09-01` … `D09-05` | `d09.01@normi.edu.ph` … `d09.05@normi.edu.ph` |
| D10 | CCJE | `D10-01` … `D10-05` | `d10.01@normi.edu.ph` … `d10.05@normi.edu.ph` |
| D11 | DSA | `D11-01` … `D11-05` | `d11.01@normi.edu.ph` … `d11.05@normi.edu.ph` |
| D12 | Basic Education | `D12-01` … `D12-05` | `d12.01@normi.edu.ph` … `d12.05@normi.edu.ph` |
| D13 | Registrar | `D13-01` … `D13-05` | `d13.01@normi.edu.ph` … `d13.05@normi.edu.ph` |
| D14 | Research, Planning, & Extension | `D14-01` … `D14-05` | `d14.01@normi.edu.ph` … `d14.05@normi.edu.ph` |
| D15 | NORMI Bookstore | `D15-01` … `D15-05` | `d15.01@normi.edu.ph` … `d15.05@normi.edu.ph` |
| D16 | GSO | `D16-01` … `D16-05` | `d16.01@normi.edu.ph` … `d16.05@normi.edu.ph` |
| D17 | Library | `D17-01` … `D17-05` | `d17.01@normi.edu.ph` … `d17.05@normi.edu.ph` |
| D18 | Clinic | `D18-01` … `D18-05` | `d18.01@normi.edu.ph` … `d18.05@normi.edu.ph` |
| D19 | Guidance | `D19-01` … `D19-05` | `d19.01@normi.edu.ph` … `d19.05@normi.edu.ph` |
| D20 | Scholarship | `D20-01` … `D20-05` | `d20.01@normi.edu.ph` … `d20.05@normi.edu.ph` |
| D21 | TVED | `D21-01` … `D21-05` | `d21.01@normi.edu.ph` … `d21.05@normi.edu.ph` |
| D22 | MIS | `D22-01` … `D22-05` | `d22.01@normi.edu.ph` … `d22.05@normi.edu.ph` |
| D23 | Admission and Testing | `D23-01` … `D23-05` | `d23.01@normi.edu.ph` … `d23.05@normi.edu.ph` |
| D24 | DPO | `D24-01` … `D24-05` | `d24.01@normi.edu.ph` … `d24.05@normi.edu.ph` |

Example: CEAS staff 1 is `D06-01` / `d06.01@normi.edu.ph`.

Source: `prisma/seed.ts` and `src/services/departmentDummy.service.ts`

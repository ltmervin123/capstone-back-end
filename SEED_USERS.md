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

Source: `prisma/seed.ts`

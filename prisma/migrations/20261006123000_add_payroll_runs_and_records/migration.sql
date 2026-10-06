-- CreateEnum
CREATE TYPE "PayrollRunStatus" AS ENUM ('DRAFT', 'ATTENDANCE_LOCKED', 'CALCULATED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "CutoffType" AS ENUM ('MONTHLY', 'FIRST_HALF', 'SECOND_HALF', 'CUSTOM');

-- CreateEnum
CREATE TYPE "PayrollRecordStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateTable
CREATE TABLE "payroll_runs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cutoffType" "CutoffType" NOT NULL DEFAULT 'MONTHLY',
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "status" "PayrollRunStatus" NOT NULL DEFAULT 'DRAFT',
    "totalGross" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalDeductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalNet" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "processedById" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_runs_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "payroll_records" ADD COLUMN "payrollRunId" TEXT,
ADD COLUMN "startDate" DATE,
ADD COLUMN "endDate" DATE,
ADD COLUMN "status" "PayrollRecordStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN "grossPay" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "tardinessMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "tardinessDeduction" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "sssDeduction" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "philHealthDeduction" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "pagIbigDeduction" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "taxWithheld" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- DropIndex
DROP INDEX IF EXISTS "payroll_records_employeeId_month_year_key";

-- CreateIndex
CREATE UNIQUE INDEX "payroll_records_payrollRunId_employeeId_key" ON "payroll_records"("payrollRunId", "employeeId");

-- CreateIndex
CREATE INDEX "payroll_records_month_year_idx" ON "payroll_records"("month", "year");

-- CreateIndex
CREATE INDEX "payroll_records_status_idx" ON "payroll_records"("status");

-- CreateIndex
CREATE INDEX "payroll_runs_status_idx" ON "payroll_runs"("status");

-- CreateIndex
CREATE INDEX "payroll_runs_startDate_idx" ON "payroll_runs"("startDate");

-- CreateIndex
CREATE INDEX "payroll_runs_endDate_idx" ON "payroll_runs"("endDate");

-- AddForeignKey
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_records" ADD CONSTRAINT "payroll_records_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "payroll_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

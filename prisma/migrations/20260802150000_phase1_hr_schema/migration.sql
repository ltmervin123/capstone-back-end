-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'RETIRED');

-- CreateEnum
CREATE TYPE "EmploymentChangeType" AS ENUM ('PROMOTION', 'TRANSFER', 'RETIREMENT', 'REINSTATEMENT', 'POSITION_CHANGE');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'LATE', 'ABSENT', 'ON_LEAVE');

-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('SICK', 'VACATION', 'EMERGENCY', 'MATERNITY_PATERNITY');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ApplicantStatus" AS ENUM ('APPLIED', 'INTERVIEWING', 'OFFERED', 'REJECTED');

-- CreateEnum
CREATE TYPE "FeedbackStatus" AS ENUM ('NEW', 'UNDER_REVIEW', 'RESOLVED');

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "employeeNumber" TEXT NOT NULL,
    "surname" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "dateOfBirth" DATE NOT NULL,
    "sex" "Sex" NOT NULL,
    "maritalStatus" TEXT NOT NULL,
    "religion" TEXT,
    "homeAddress" TEXT NOT NULL,
    "contactNumber" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "profilePictureUrl" TEXT,
    "departmentId" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "employmentDate" DATE NOT NULL,
    "serviceDuration" TEXT,
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "educationLevel" TEXT,
    "bachelorsDegree" TEXT,
    "mastersStatus" TEXT,
    "mastersDegreeName" TEXT,
    "doctorateStatus" TEXT,
    "functionalRate" DECIMAL(12,2),
    "gasolineAllowance" DECIMAL(12,2),
    "cashAdvanceBalance" DECIMAL(12,2),
    "employeeShare" DECIMAL(12,2),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employment_status_changes" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "changeType" "EmploymentChangeType" NOT NULL,
    "effectiveDate" DATE NOT NULL,
    "previousPosition" TEXT,
    "newPosition" TEXT,
    "previousDepartmentId" TEXT,
    "newDepartmentId" TEXT,
    "previousStatus" "EmployeeStatus",
    "newStatus" "EmployeeStatus",
    "remarks" TEXT,
    "approvedById" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employment_status_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_evaluations" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "evaluationPeriod" TEXT NOT NULL,
    "evaluationDate" DATE NOT NULL,
    "rating" DECIMAL(5,2),
    "ratingLabel" TEXT,
    "summary" TEXT,
    "evaluatorName" TEXT,
    "evaluatorId" TEXT,
    "documentUrl" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "performance_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_categories" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "document_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_types" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "document_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_document_checklist" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "documentTypeId" TEXT NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "completedById" TEXT,
    "notes" TEXT,

    CONSTRAINT "employee_document_checklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_documents" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "documentTypeId" TEXT,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedById" TEXT,
    "extractedText" TEXT,
    "isIndexed" BOOLEAN NOT NULL DEFAULT false,
    "indexedAt" TIMESTAMP(3),

    CONSTRAINT "employee_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_records" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "timeIn" TEXT,
    "timeOut" TEXT,
    "status" "AttendanceStatus" NOT NULL,
    "remarks" TEXT,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_records" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "leaveType" "LeaveType" NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leave_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_records" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "functionalRate" DECIMAL(12,2) NOT NULL,
    "daysWorked" INTEGER NOT NULL,
    "basicSalary" DECIMAL(12,2) NOT NULL,
    "allowances" DECIMAL(12,2) NOT NULL,
    "gasoline" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cashAdvance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "employeeShare" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "otherDeductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalDeductions" DECIMAL(12,2) NOT NULL,
    "netPay" DECIMAL(12,2) NOT NULL,
    "processedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applicants" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "positionApplied" TEXT NOT NULL,
    "departmentId" TEXT,
    "status" "ApplicantStatus" NOT NULL DEFAULT 'APPLIED',
    "appliedDate" DATE NOT NULL,
    "resumeUrl" TEXT,
    "notes" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applicants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_items" (
    "id" TEXT NOT NULL,
    "senderUserId" TEXT,
    "senderEmployeeId" TEXT,
    "senderName" TEXT NOT NULL,
    "senderEmail" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "status" "FeedbackStatus" NOT NULL DEFAULT 'NEW',
    "adminResponse" TEXT,
    "respondedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feedback_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "username" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "details" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_query_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "queryText" TEXT NOT NULL,
    "responseText" TEXT,
    "sourcesUsed" JSONB,
    "latencyMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_query_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "departments_name_key" ON "departments"("name");

-- CreateIndex
CREATE UNIQUE INDEX "employees_employeeNumber_key" ON "employees"("employeeNumber");

-- CreateIndex
CREATE UNIQUE INDEX "employees_email_key" ON "employees"("email");

-- CreateIndex
CREATE INDEX "employees_departmentId_idx" ON "employees"("departmentId");

-- CreateIndex
CREATE INDEX "employees_status_idx" ON "employees"("status");

-- CreateIndex
CREATE INDEX "employees_dateOfBirth_idx" ON "employees"("dateOfBirth");

-- CreateIndex
CREATE INDEX "employees_employmentDate_idx" ON "employees"("employmentDate");

-- CreateIndex
CREATE INDEX "employment_status_changes_employeeId_idx" ON "employment_status_changes"("employeeId");

-- CreateIndex
CREATE INDEX "employment_status_changes_changeType_idx" ON "employment_status_changes"("changeType");

-- CreateIndex
CREATE INDEX "employment_status_changes_effectiveDate_idx" ON "employment_status_changes"("effectiveDate");

-- CreateIndex
CREATE INDEX "performance_evaluations_employeeId_idx" ON "performance_evaluations"("employeeId");

-- CreateIndex
CREATE INDEX "performance_evaluations_evaluationDate_idx" ON "performance_evaluations"("evaluationDate");

-- CreateIndex
CREATE INDEX "document_types_categoryId_idx" ON "document_types"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "document_types_categoryId_name_key" ON "document_types"("categoryId", "name");

-- CreateIndex
CREATE INDEX "employee_document_checklist_employeeId_idx" ON "employee_document_checklist"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "employee_document_checklist_employeeId_documentTypeId_key" ON "employee_document_checklist"("employeeId", "documentTypeId");

-- CreateIndex
CREATE INDEX "employee_documents_employeeId_idx" ON "employee_documents"("employeeId");

-- CreateIndex
CREATE INDEX "employee_documents_documentTypeId_idx" ON "employee_documents"("documentTypeId");

-- CreateIndex
CREATE INDEX "employee_documents_isIndexed_idx" ON "employee_documents"("isIndexed");

-- CreateIndex
CREATE INDEX "attendance_records_employeeId_idx" ON "attendance_records"("employeeId");

-- CreateIndex
CREATE INDEX "attendance_records_date_idx" ON "attendance_records"("date");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_records_employeeId_date_key" ON "attendance_records"("employeeId", "date");

-- CreateIndex
CREATE INDEX "leave_records_employeeId_idx" ON "leave_records"("employeeId");

-- CreateIndex
CREATE INDEX "leave_records_status_idx" ON "leave_records"("status");

-- CreateIndex
CREATE INDEX "leave_records_startDate_idx" ON "leave_records"("startDate");

-- CreateIndex
CREATE INDEX "payroll_records_employeeId_idx" ON "payroll_records"("employeeId");

-- CreateIndex
CREATE INDEX "payroll_records_year_idx" ON "payroll_records"("year");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_records_employeeId_month_year_key" ON "payroll_records"("employeeId", "month", "year");

-- CreateIndex
CREATE INDEX "applicants_status_idx" ON "applicants"("status");

-- CreateIndex
CREATE INDEX "applicants_appliedDate_idx" ON "applicants"("appliedDate");

-- CreateIndex
CREATE INDEX "feedback_items_status_idx" ON "feedback_items"("status");

-- CreateIndex
CREATE INDEX "feedback_items_createdAt_idx" ON "feedback_items"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "ai_query_logs_userId_idx" ON "ai_query_logs"("userId");

-- CreateIndex
CREATE INDEX "ai_query_logs_createdAt_idx" ON "ai_query_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed minimal employee row required by existing demo user (juan_delacruz -> EMP001)
INSERT INTO "departments" ("id", "name", "updatedAt")
SELECT 'clseeddept000000000000mis', 'MIS', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "departments" WHERE "name" = 'MIS');

INSERT INTO "employees" (
    "id",
    "employeeNumber",
    "surname",
    "firstName",
    "dateOfBirth",
    "sex",
    "maritalStatus",
    "homeAddress",
    "contactNumber",
    "email",
    "departmentId",
    "position",
    "employmentDate",
    "status",
    "updatedAt"
)
SELECT
    'clseedemp00000000000000001',
    'EMP001',
    'Dela Cruz',
    'Juan',
    '1985-03-15'::date,
    'MALE',
    'Married',
    'Cagayan de Oro City, Misamis Oriental',
    '09171234567',
    'juan.delacruz@normi.edu.ph',
    d."id",
    'Instructor',
    '2010-06-01'::date,
    'ACTIVE',
    CURRENT_TIMESTAMP
FROM "departments" d
WHERE d."name" = 'MIS'
  AND NOT EXISTS (SELECT 1 FROM "employees" WHERE "employeeNumber" = 'EMP001');

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("employeeNumber") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employment_status_changes" ADD CONSTRAINT "employment_status_changes_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employment_status_changes" ADD CONSTRAINT "employment_status_changes_previousDepartmentId_fkey" FOREIGN KEY ("previousDepartmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employment_status_changes" ADD CONSTRAINT "employment_status_changes_newDepartmentId_fkey" FOREIGN KEY ("newDepartmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employment_status_changes" ADD CONSTRAINT "employment_status_changes_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employment_status_changes" ADD CONSTRAINT "employment_status_changes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_evaluations" ADD CONSTRAINT "performance_evaluations_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_evaluations" ADD CONSTRAINT "performance_evaluations_evaluatorId_fkey" FOREIGN KEY ("evaluatorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_evaluations" ADD CONSTRAINT "performance_evaluations_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_types" ADD CONSTRAINT "document_types_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "document_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_document_checklist" ADD CONSTRAINT "employee_document_checklist_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_document_checklist" ADD CONSTRAINT "employee_document_checklist_documentTypeId_fkey" FOREIGN KEY ("documentTypeId") REFERENCES "document_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_document_checklist" ADD CONSTRAINT "employee_document_checklist_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_documentTypeId_fkey" FOREIGN KEY ("documentTypeId") REFERENCES "document_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_records" ADD CONSTRAINT "leave_records_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_records" ADD CONSTRAINT "leave_records_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_records" ADD CONSTRAINT "leave_records_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_records" ADD CONSTRAINT "payroll_records_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_records" ADD CONSTRAINT "payroll_records_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applicants" ADD CONSTRAINT "applicants_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applicants" ADD CONSTRAINT "applicants_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_items" ADD CONSTRAINT "feedback_items_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_items" ADD CONSTRAINT "feedback_items_senderEmployeeId_fkey" FOREIGN KEY ("senderEmployeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_items" ADD CONSTRAINT "feedback_items_respondedById_fkey" FOREIGN KEY ("respondedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_query_logs" ADD CONSTRAINT "ai_query_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

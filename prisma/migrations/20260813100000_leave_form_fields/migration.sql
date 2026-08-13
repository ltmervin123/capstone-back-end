-- Replace LeaveType values to match the official leave of absence form
CREATE TYPE "LeaveType_new" AS ENUM (
  'LEAVE_CREDITS',
  'MATERNITY',
  'VAWC',
  'PATERNITY',
  'SOLO_PARENT',
  'STUDY',
  'SPECIAL',
  'AUTHORIZED_ABSENCE',
  'AUTHORIZED_UNDERTIME'
);

ALTER TABLE "leave_records" ALTER COLUMN "leaveType" TYPE "LeaveType_new"
  USING (
    CASE "leaveType"::text
      WHEN 'SICK' THEN 'LEAVE_CREDITS'
      WHEN 'VACATION' THEN 'LEAVE_CREDITS'
      WHEN 'EMERGENCY' THEN 'SPECIAL'
      WHEN 'MATERNITY_PATERNITY' THEN 'MATERNITY'
      ELSE 'LEAVE_CREDITS'
    END::"LeaveType_new"
  );

DROP TYPE "LeaveType";

ALTER TYPE "LeaveType_new" RENAME TO "LeaveType";

ALTER TABLE "leave_records" ADD COLUMN "numberOfDays" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "leave_records" ADD COLUMN "timeFrom" TEXT;
ALTER TABLE "leave_records" ADD COLUMN "timeTo" TEXT;

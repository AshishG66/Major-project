import { prisma } from '../config/db.js';
import { logger } from '../config/logger.js';

/**
 * Safe, idempotent database migration for DoctorPatientAssignment table and AssignmentStatus enum.
 * Ensures zero data loss, preserves all existing User and DoctorNote records,
 * and leaves historical records unassigned for manual reconciliation as required by policy.
 */
export async function applyDoctorPatientAssignmentMigration(): Promise<{ success: boolean; message: string }> {
  try {
    logger.info('[Migration] Checking DoctorPatientAssignment database schema...');

    // 1. Create Enum AssignmentStatus if not exists
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "AssignmentStatus" AS ENUM ('ACTIVE', 'REVOKED', 'INACTIVE');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 2. Create Table DoctorPatientAssignment if not exists
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "DoctorPatientAssignment" (
        "id" TEXT NOT NULL,
        "patientId" TEXT NOT NULL,
        "doctorId" TEXT NOT NULL,
        "status" "AssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
        "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "revokedAt" TIMESTAMP(3),
        "assignedBy" TEXT,
        "revokedBy" TEXT,
        "notes" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "DoctorPatientAssignment_pkey" PRIMARY KEY ("id")
      );
    `);

    // 3. Create Indexes if not exists
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "DoctorPatientAssignment_doctorId_status_idx" 
      ON "DoctorPatientAssignment"("doctorId", "status");
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "DoctorPatientAssignment_patientId_status_idx" 
      ON "DoctorPatientAssignment"("patientId", "status");
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "DoctorPatientAssignment_doctorId_patientId_status_idx" 
      ON "DoctorPatientAssignment"("doctorId", "patientId", "status");
    `);

    // 4. Add Foreign Keys if not exist
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE "DoctorPatientAssignment" 
        ADD CONSTRAINT "DoctorPatientAssignment_patientId_fkey" 
        FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE "DoctorPatientAssignment" 
        ADD CONSTRAINT "DoctorPatientAssignment_doctorId_fkey" 
        FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 5. Verification: Check count of assignments
    const count = await prisma.doctorPatientAssignment.count();
    logger.info(`[Migration] DoctorPatientAssignment table verified. Existing active/inactive assignments: ${count}`);

    return {
      success: true,
      message: `DoctorPatientAssignment table and indexes successfully provisioned without data loss. Current records: ${count}`,
    };
  } catch (err: any) {
    logger.error(`[Migration Error] Failed to apply DoctorPatientAssignment migration: ${err.message}`);
    return {
      success: false,
      message: err.message,
    };
  }
}

// Allow standalone execution via tsx
if (process.argv[1]?.endsWith('migrateAssignments.ts')) {
  applyDoctorPatientAssignmentMigration().then((res) => {
    console.log(JSON.stringify(res, null, 2));
    process.exit(res.success ? 0 : 1);
  });
}

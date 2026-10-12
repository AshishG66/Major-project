import { newDb, DataType } from 'pg-mem';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrationReplayTest() {
  console.log('=== DISPOSABLE IN-MEMORY POSTGRESQL MIGRATION REPLAY TEST ===\n');

  const migrationsDir = path.resolve(__dirname, '../../prisma/migrations');
  const migration1Path = path.join(migrationsDir, '20261010_initial_schema', 'migration.sql');
  const migration2Path = path.join(migrationsDir, '20261011_add_doctor_patient_assignment', 'migration.sql');

  if (!fs.existsSync(migration1Path)) {
    throw new Error(`Missing baseline migration: ${migration1Path}`);
  }
  if (!fs.existsSync(migration2Path)) {
    throw new Error(`Missing assignment migration: ${migration2Path}`);
  }

  let migration1Sql = fs.readFileSync(migration1Path, 'utf8');
  const migration2Sql = fs.readFileSync(migration2Path, 'utf8');

  // Initialize pure in-memory PostgreSQL instance (disposable, isolated)
  const db = newDb();

  // Register vector extension for pg-mem compatibility
  db.registerExtension('vector', (schema) => {});

  // Since pg-mem parser does not natively know the pgvector type "vector(768)",
  // we adapt "vector(768)" to "text" for in-memory AST execution without altering the source SQL file.
  const adaptedMigration1Sql = migration1Sql.replace(/vector\(768\)/g, 'text');

  console.log('Step 1: Replaying Baseline Migration (20261010_initial_schema) onto empty database...');
  try {
    db.public.none(adaptedMigration1Sql);
    console.log(' -> Baseline migration replayed successfully.');
  } catch (err: any) {
    console.error(' -> Baseline migration replay FAILED:', err.message);
    throw err;
  }

  // Verify User and DoctorNote exist, but DoctorPatientAssignment does not yet exist
  const tablesAfterStep1 = db.public.many(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
  ).map((r: any) => r.table_name);

  console.log(` -> Tables created after baseline (${tablesAfterStep1.length} tables):`);
  console.log('    Includes "User":', tablesAfterStep1.includes('User'));
  console.log('    Includes "DoctorNote":', tablesAfterStep1.includes('DoctorNote'));
  console.log('    Includes "SensorData":', tablesAfterStep1.includes('SensorData'));
  console.log('    Includes "DoctorPatientAssignment":', tablesAfterStep1.includes('DoctorPatientAssignment'));

  if (!tablesAfterStep1.includes('User') || !tablesAfterStep1.includes('DoctorNote')) {
    throw new Error('Baseline migration did not create required initial tables!');
  }
  if (tablesAfterStep1.includes('DoctorPatientAssignment')) {
    throw new Error('Baseline migration unexpectedly contains DoctorPatientAssignment! This would cause duplicate creation!');
  }

  console.log('\nStep 2: Replaying Assignment Migration (20261011_add_doctor_patient_assignment)...');
  try {
    db.public.none(migration2Sql);
    console.log(' -> Assignment migration replayed successfully.');
  } catch (err: any) {
    console.error(' -> Assignment migration replay FAILED:', err.message);
    throw err;
  }

  const tablesAfterStep2 = db.public.many(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
  ).map((r: any) => r.table_name);

  console.log(` -> Tables created after step 2 (${tablesAfterStep2.length} tables):`);
  console.log('    Includes "DoctorPatientAssignment":', tablesAfterStep2.includes('DoctorPatientAssignment'));

  if (!tablesAfterStep2.includes('DoctorPatientAssignment')) {
    throw new Error('DoctorPatientAssignment was not created by Migration 2!');
  }

  // Step 3: Insert synthetic records to test foreign keys and constraints
  console.log('\nStep 3: Testing relational integrity with synthetic clinical entities...');
  db.public.none(`
    INSERT INTO "User" ("id", "email", "passwordHash", "role", "updatedAt")
    VALUES 
      ('patient-alice-01', 'alice@test.hospital', 'hashedpwd', 'USER', NOW()),
      ('doctor-carol-01', 'carol@test.hospital', 'hashedpwd', 'DOCTOR', NOW());
  `);

  db.public.none(`
    INSERT INTO "DoctorPatientAssignment" ("id", "patientId", "doctorId", "status", "assignedBy", "updatedAt")
    VALUES ('assignment-01', 'patient-alice-01', 'doctor-carol-01', 'ACTIVE', 'admin-eve', NOW());
  `);

  const assignmentCount = db.public.one('SELECT count(*) as count FROM "DoctorPatientAssignment"') as any;
  console.log(` -> Inserted synthetic assignment record count: ${assignmentCount.count}`);

  // Test cascade deletion: deleting patient-alice should cascade delete assignment-01
  db.public.none('DELETE FROM "User" WHERE "id" = \'patient-alice-01\';');
  const assignmentCountAfterDelete = db.public.one('SELECT count(*) as count FROM "DoctorPatientAssignment"') as any;
  console.log(` -> Assignment count after patient cascade delete: ${assignmentCountAfterDelete.count}`);

  if (Number(assignmentCountAfterDelete.count) !== 0) {
    throw new Error('Cascade deletion did not remove assignment when patient was deleted!');
  }

  console.log('\n✅ ALL DISPOSABLE MIGRATION REPLAY CHECKS PASSED WITH ZERO ERRORS.\n');
  return { success: true, tableCount: tablesAfterStep2.length };
}

runMigrationReplayTest()
  .then((res) => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration replay failed:', err);
    process.exit(1);
  });

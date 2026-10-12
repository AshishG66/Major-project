import { prisma } from '../config/db.js';

interface ColumnInfo {
  column_name: string;
  data_type: string;
  udt_name: string;
  is_nullable: string;
  column_default: string | null;
}

interface IndexInfo {
  indexname: string;
  indexdef: string;
}

interface ConstraintInfo {
  conname: string;
  condef: string;
}

async function verifyLiveDatabaseSchema() {
  console.log('=== READ-ONLY NEON POSTGRESQL SCHEMA INTROSPECTION ===\n');

  try {
    // 1. PostgreSQL Version
    const versionRes = await prisma.$queryRawUnsafe<Array<{ version: string }>>('SELECT version()');
    console.log('1. Database Engine Version:');
    console.log(`   ${versionRes[0]?.version}\n`);

    // 2. Installed Extensions
    const extRes = await prisma.$queryRawUnsafe<Array<{ extname: string; extversion: string }>>(
      'SELECT extname, extversion FROM pg_extension ORDER BY extname'
    );
    console.log('2. Installed PostgreSQL Extensions:');
    extRes.forEach((e) => console.log(`   - ${e.extname} (v${e.extversion})`));
    console.log();

    // 3. Migration Tracking Table Status
    const migrationTableRes = await prisma.$queryRawUnsafe<Array<{ table_name: string }>>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '_prisma_migrations'"
    );
    const hasMigrationTable = migrationTableRes.length > 0;
    console.log(`3. _prisma_migrations Table Exists: ${hasMigrationTable}`);
    if (hasMigrationTable) {
      const records = await prisma.$queryRawUnsafe<Array<any>>('SELECT * FROM "_prisma_migrations"');
      console.log(`   Recorded migrations: ${records.length}`);
      records.forEach((r) => console.log(`   - ${r.migration_name} (applied: ${r.finished_at})`));
    } else {
      console.log('   (Database was initialized via prisma db push / direct DDL, not prisma migrate)');
    }
    console.log();

    // 4. All Tables in Public Schema
    const tablesRes = await prisma.$queryRawUnsafe<Array<{ table_name: string }>>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name"
    );
    const tableNames = tablesRes.map((t) => t.table_name);
    console.log(`4. Total Tables in Public Schema: ${tableNames.length}`);
    console.log(`   Tables: ${tableNames.join(', ')}\n`);

    // 5. AssignmentStatus Enum Values
    const enumRes = await prisma.$queryRawUnsafe<Array<{ enumlabel: string }>>(
      `SELECT e.enumlabel 
       FROM pg_enum e 
       JOIN pg_type t ON e.enumtypid = t.oid 
       WHERE t.typname = 'AssignmentStatus' 
       ORDER BY e.enumsortorder`
    );
    console.log('5. AssignmentStatus Enum labels:');
    enumRes.forEach((e) => console.log(`   - ${e.enumlabel}`));
    console.log();

    // 6. DoctorPatientAssignment Columns
    const columnsRes = await prisma.$queryRawUnsafe<ColumnInfo[]>(
      `SELECT column_name, data_type, udt_name, is_nullable, column_default 
       FROM information_schema.columns 
       WHERE table_schema = 'public' AND table_name = 'DoctorPatientAssignment' 
       ORDER BY ordinal_position`
    );
    console.log('6. DoctorPatientAssignment Columns:');
    columnsRes.forEach((c) => {
      console.log(`   - ${c.column_name}: ${c.udt_name} (nullable: ${c.is_nullable}, default: ${c.column_default})`);
    });
    console.log();

    // 7. DoctorPatientAssignment Indexes
    const indexRes = await prisma.$queryRawUnsafe<IndexInfo[]>(
      `SELECT indexname, indexdef 
       FROM pg_indexes 
       WHERE schemaname = 'public' AND tablename = 'DoctorPatientAssignment' 
       ORDER BY indexname`
    );
    console.log('7. DoctorPatientAssignment Indexes:');
    indexRes.forEach((idx) => console.log(`   - ${idx.indexname}: ${idx.indexdef}`));
    console.log();

    // 8. DoctorPatientAssignment Foreign Keys
    const fkRes = await prisma.$queryRawUnsafe<ConstraintInfo[]>(
      `SELECT c.conname, pg_get_constraintdef(c.oid) as condef 
       FROM pg_constraint c 
       JOIN pg_class cl ON cl.oid = c.conrelid 
       WHERE c.contype = 'f' AND cl.relname = 'DoctorPatientAssignment'`
    );
    console.log('8. DoctorPatientAssignment Foreign Keys:');
    fkRes.forEach((fk) => console.log(`   - ${fk.conname}: ${fk.condef}`));
    console.log();

    // 9. Entity Counts
    const userCount = await prisma.user.count();
    const assignmentCount = await prisma.doctorPatientAssignment.count();
    const doctorNoteCount = await prisma.doctorNote.count();
    console.log('9. Live Entity Counts:');
    console.log(`   - Users: ${userCount}`);
    console.log(`   - DoctorPatientAssignments: ${assignmentCount}`);
    console.log(`   - DoctorNotes: ${doctorNoteCount}\n`);

    console.log('=== SCHEMA INTROSPECTION COMPLETE ===');
  } catch (error: any) {
    console.error('Error during schema introspection:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyLiveDatabaseSchema();

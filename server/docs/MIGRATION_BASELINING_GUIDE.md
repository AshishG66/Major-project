# HridayaDarpana — Database Migration Governance & Baselining Guide

## 1. Database Target & Current Environment

- **Host:** `ep-dawn-thunder-attghw8s-pooler.c-9.us-east-1.aws.neon.tech`
- **Database Engine:** PostgreSQL (Neon Serverless with PgBouncer Connection Pooling)
- **Database Name:** `neondb`
- **Environment:** Development sandbox instance (`NODE_ENV` defaulting to development)
- **Current Table State:**
  - `User`: 64 records intact
  - `DoctorNote`: 0 records intact
  - `DoctorPatientAssignment`: 0 records intact (provisioned via safe idempotent DDL)
- **Prisma Migration State:**
  - The relation `_prisma_migrations` does not exist on this Neon database because the initial schema was created using `prisma db push`.

---

## 2. Risk Warning: Why `prisma migrate dev` Must NOT Be Run Directly

> [!CAUTION]
> Running `npx prisma migrate dev` against an existing database originally initialized with `prisma db push` will detect **schema drift** (tables present without `_prisma_migrations` tracking records).
> Under default behavior, `prisma migrate dev` will prompt to **RESET the database**, which would drop all existing tables, foreign keys, and 64 user records.

---

## 3. Verified Dual-Target Migration Governance Strategy

The repository establishes a two-stage migration history that functions safely for **BOTH**:
1. **Existing Database** (e.g. Neon PostgreSQL originally managed via `prisma db push` and custom DDL)
2. **Fresh Database** (e.g. empty PostgreSQL instance initialized from scratch in local development or staging)

### Intended Migration Sequence:
1. `20261010_initial_schema`: Contains all 27 original tables (`User`, `DoctorNote`, `SensorData`, `AuditLog`, etc.) *strictly prior* to Phase 3. Does NOT contain `DoctorPatientAssignment` or `AssignmentStatus`.
2. `20261011_add_doctor_patient_assignment`: Creates enum `AssignmentStatus`, table `DoctorPatientAssignment`, indexes, and foreign keys referencing `User`.

> [!IMPORTANT]
> **Why Baseline Must Exclude `DoctorPatientAssignment`:**
> If the baseline migration had been generated from the current datamodel (which already includes `DoctorPatientAssignment`), any fresh database replaying the migration sequence would create `DoctorPatientAssignment` in Step 1, and then crash with `relation "DoctorPatientAssignment" already exists` when replaying Step 2.
> By separating the pre-assignment schema into `20261010_initial_schema` and the assignment model into `20261011_add_doctor_patient_assignment`, fresh databases replay cleanly in order.

---

### Procedure A: For Fresh Databases (CI / Disposable / Local Staging)
On any fresh, empty database, run standard Prisma deployment:
```bash
npx prisma migrate deploy
```
Prisma replays `20261010_initial_schema` first (27 tables), then `20261011_add_doctor_patient_assignment` (28th table), creating the complete schema with zero duplicate table errors.

---

### Procedure B: For Existing Databases (Zero-Data-Loss Baseline Tracking)
For the existing remote database where tables were pushed and `DoctorPatientAssignment` was provisioned via safe idempotent DDL:

#### Step 1: Verify Schema Synchronization
Ensure the active `schema.prisma` validates:
```bash
npx prisma validate
```

#### Step 2: Mark Baseline as Applied Without Executing DDL
Mark the initial baseline migration as already applied in `_prisma_migrations`:
```bash
npx prisma migrate resolve --applied 20261010_initial_schema
```

#### Step 3: Mark Assignment Migration as Applied
Mark the assignment migration as already applied (since DDL was executed idempotently):
```bash
npx prisma migrate resolve --applied 20261011_add_doctor_patient_assignment
```

#### Step 4: Verification for Future CI/CD Deployments
For all subsequent releases, CI/CD pipelines run only:
```bash
npx prisma migrate deploy
```
`prisma migrate deploy` executes pending future migrations safely without shadow database creation or reset prompts.

---

### Procedure C: Disposable In-Memory Replay Verification
To verify migration replay safely without touching remote databases:
```bash
npx tsx src/scripts/testMigrationReplay.ts
```


---

## 4. Database Backup, Rollback, and Recovery Procedures

### A. Point-in-Time Backup (Neon CLI / pg_dump)
Before executing any DDL or migration on staging/production:
```bash
# Export full schema and data snapshot
pg_dump -h $PGHOST -U $PGUSER -d neondb -F c -b -v -f "backup_pre_migration_$(date +%Y%m%d_%H%M%S).dump"
```
On Neon, utilize **Neon Point-in-Time Restore (PITR)** or create a temporary branch snapshot before applying migrations:
```bash
neon branches create --name pre-migration-snapshot
```

### B. Rollback Procedure for `DoctorPatientAssignment`
If rollback of the assignment access control model is required:
```sql
BEGIN;
DROP TABLE IF EXISTS "DoctorPatientAssignment" CASCADE;
DROP TYPE IF EXISTS "AssignmentStatus";
DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261011_add_doctor_patient_assignment';
COMMIT;
```

---

## 5. Administrative Procedure for Existing Cohort Assignment Reconciliation

Because no historical doctor notes were automatically synthesized into active assignments (to comply with strict medical privacy standards), the 64 existing user accounts currently have 0 active assignments.

To establish legitimate clinical access for existing patients:

1. **Option A: Patient-Initiated Workflow (Recommended):**
   - The patient logs in to HridayaDarpana.
   - The patient navigates to the Doctor Directory and clicks "Request Consultation / Select Doctor".
   - The frontend issues `POST /api/doctor/assignments` with `patientId: caller.id`, `doctorId: selectedDoctorId`, and `notes: "Patient consent recorded via web portal"`.
   - The backend records the relationship as `ACTIVE` and immutably logs the patient consent to `AuditLog`.

2. **Option B: Administrative Onboarding Script:**
   - For supervised institutional pilots, an authorized hospital administrator executes the verified assignment API:
   ```bash
   POST /api/doctor/assignments
   Headers: Authorization: Bearer <ADMIN_JWT>
   Body: {
     "doctorId": "<LICENSED_DOCTOR_UUID>",
     "patientId": "<PATIENT_UUID>",
     "notes": "Institutional supervised pilot assignment. Patient physical consent form #REF-2026-001 on file."
   }
   ```
   - Both identities and roles are validated server-side.
   - The action is logged to the SHA-256 tamper-evident `AuditLog`.

import { prisma } from '../config/db.js';
import { logger } from '../config/logger.js';
import { createAuditLogEntry } from './hashChainService.js';
import { socketService } from './socketService.js';

export interface CallerContext {
  id: string;
  email: string;
  role: string;
}

export interface AccessCheckResult {
  authorized: boolean;
  status: 200 | 401 | 403 | 404 | 500;
  reason: string;
}

/**
 * Checks whether an explicit, ACTIVE DoctorPatientAssignment exists between a doctor and patient.
 *
 * CRITICAL CLINICAL SAFETY RULES:
 * 1. Historical doctor notes alone do NOT establish an active assignment.
 * 2. Revoked (REVOKED) or Inactive (INACTIVE) assignments immediately fail closed (return false).
 * 3. Both doctorId and patientId must be verified server-side.
 */
export async function isDoctorAssignedToPatient(doctorId: string, patientId: string): Promise<boolean> {
  if (!doctorId || !patientId) return false;

  try {
    const activeAssignment = await prisma.doctorPatientAssignment.findFirst({
      where: {
        doctorId,
        patientId,
        status: 'ACTIVE',
      },
    });

    return !!activeAssignment;
  } catch (error: any) {
    logger.error(`[AccessControl] Error checking assignment for doctor ${doctorId} and patient ${patientId}: ${error.message}`);
    // Fail-closed default
    return false;
  }
}

/**
 * Centralized authorization policy for patient-associated health records.
 *
 * Rules:
 * 1. Patient (USER): May only access their own authorized records (caller.id === patientId).
 * 2. Doctor (DOCTOR): May only access patients with an ACTIVE DoctorPatientAssignment.
 * 3. Administrator (ADMIN): Permitted access under institutional governance, producing an audit log.
 * 4. Missing/invalid credentials fail closed.
 * 5. Uniform 403 response for unauthorized doctors to prevent patient existence enumeration.
 */
export async function canAccessPatientRecords(
  caller: CallerContext | undefined,
  patientId: string,
  resourceType: string = 'CLINICAL_RECORDS'
): Promise<AccessCheckResult> {
  if (!caller || !caller.id || !caller.role) {
    return {
      authorized: false,
      status: 401,
      reason: 'Authentication required',
    };
  }

  if (!patientId || typeof patientId !== 'string') {
    return {
      authorized: false,
      status: 403,
      reason: 'Invalid patient identifier',
    };
  }

  // 1. Patient accessing own records
  if (caller.role === 'USER') {
    if (caller.id === patientId) {
      return { authorized: true, status: 200, reason: 'PATIENT_OWN_RECORDS' };
    }
    return {
      authorized: false,
      status: 403,
      reason: 'Access denied. You are not authorized to view another patient\'s records.',
    };
  }

  // 2. Doctor accessing patient records
  if (caller.role === 'DOCTOR') {
    const isAssigned = await isDoctorAssignedToPatient(caller.id, patientId);
    if (isAssigned) {
      return { authorized: true, status: 200, reason: 'ACTIVE_ASSIGNED_DOCTOR' };
    }
    // Return uniform 403 without revealing whether patientId exists in database
    return {
      authorized: false,
      status: 403,
      reason: 'Access denied. You do not have an active clinical assignment for this patient.',
    };
  }

  // 3. Administrator accessing patient records (Audited Access Policy)
  if (caller.role === 'ADMIN') {
    // Record tamper-evident audit log for administrative access
    try {
      await createAuditLogEntry({
        userId: caller.id,
        patientId,
        eventType: 'ADMIN_PATIENT_DATA_ACCESS',
        action: `ADMIN_ACCESS_${resourceType.toUpperCase()}`,
        details: `Administrator ${caller.id} accessed ${resourceType} for patient ${patientId} under institutional audit oversight.`,
      });
    } catch (err: any) {
      logger.error(`[AuditLog] Administrative access audit failed: ${err.message}`);
      return {
        authorized: false,
        status: 500,
        reason: 'Institutional audit log write failure. Administrative access denied to preserve audit integrity.',
      };
    }

    return { authorized: true, status: 200, reason: 'ADMIN_INSTITUTIONAL_OVERSIGHT' };
  }

  // Default fail-closed
  return {
    authorized: false,
    status: 403,
    reason: 'Access denied. Insufficient permissions.',
  };
}

/**
 * Creates an explicit DoctorPatientAssignment.
 */
export async function assignDoctorToPatient(params: {
  doctorId: string;
  patientId: string;
  assignedBy: string;
  notes?: string;
  ipAddress?: string;
}): Promise<{ success: boolean; assignment?: any; message?: string; duplicate?: boolean }> {
  const { doctorId, patientId, assignedBy, notes, ipAddress } = params;

  try {
    // Verify Doctor existence and role
    const doctor = await prisma.user.findUnique({
      where: { id: doctorId },
      select: { id: true, role: true },
    });
    if (!doctor || doctor.role !== 'DOCTOR') {
      return { success: false, message: 'Invalid doctor identifier. User is not a licensed doctor.' };
    }

    // Verify Patient existence and role
    const patient = await prisma.user.findUnique({
      where: { id: patientId },
      select: { id: true, role: true },
    });
    if (!patient || patient.role !== 'USER') {
      return { success: false, message: 'Invalid patient identifier. User is not a registered patient.' };
    }

    // Check if an active assignment already exists
    const existingActive = await prisma.doctorPatientAssignment.findFirst({
      where: {
        doctorId,
        patientId,
        status: 'ACTIVE',
      },
    });

    if (existingActive) {
      return {
        success: false,
        duplicate: true,
        message: 'An active clinical assignment already exists between this doctor and patient.',
      };
    }

    // Create assignment with ACTIVE status
    const assignment = await prisma.doctorPatientAssignment.create({
      data: {
        doctorId,
        patientId,
        status: 'ACTIVE',
        assignedBy,
        notes: notes?.trim() || null,
        assignedAt: new Date(),
      },
      include: {
        doctor: { include: { profile: true } },
        patient: { include: { profile: true } },
      },
    });

    // Record SHA-256 Tamper-Evident Audit Log Entry
    await createAuditLogEntry({
      userId: assignedBy,
      patientId,
      eventType: 'DOCTOR_PATIENT_ASSIGNMENT_CREATED',
      action: 'ASSIGN_DOCTOR_TO_PATIENT',
      details: `Active clinical assignment established between Doctor ${doctorId} and Patient ${patientId} by user ${assignedBy}.`,
      ipAddress,
    }).catch((err) => logger.warn(`[AuditLog] Assignment creation audit deferred: ${err.message}`));

    logger.info(`[AccessControl] Successfully created ACTIVE assignment between doctor ${doctorId} and patient ${patientId}`);
    return { success: true, assignment };
  } catch (err: any) {
    logger.error(`[AccessControl] Error assigning doctor to patient: ${err.message}`);
    return { success: false, message: err.message };
  }
}

/**
 * Revokes an existing DoctorPatientAssignment, immediately terminating clinical access.
 */
export async function revokeDoctorPatientAssignment(params: {
  doctorId: string;
  patientId: string;
  revokedBy: string;
  notes?: string;
  ipAddress?: string;
}): Promise<{ success: boolean; assignment?: any; message?: string }> {
  const { doctorId, patientId, revokedBy, notes, ipAddress } = params;

  try {
    const activeAssignment = await prisma.doctorPatientAssignment.findFirst({
      where: {
        doctorId,
        patientId,
        status: 'ACTIVE',
      },
    });

    if (!activeAssignment) {
      return { success: false, message: 'No active assignment found for this doctor-patient pair.' };
    }

    const updatedAssignment = await prisma.doctorPatientAssignment.update({
      where: { id: activeAssignment.id },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
        revokedBy,
        notes: notes ? `${activeAssignment.notes || ''}\n[Revocation Note]: ${notes}`.trim() : activeAssignment.notes,
      },
    });

    // Immediately revoke real-time WebSocket subscriptions and clear cache
    socketService.revokePatientAuthorization(doctorId, patientId);

    // Record SHA-256 Tamper-Evident Audit Log Entry
    await createAuditLogEntry({
      userId: revokedBy,
      patientId,
      eventType: 'DOCTOR_PATIENT_ASSIGNMENT_REVOKED',
      action: 'REVOKE_DOCTOR_ASSIGNMENT',
      details: `Active clinical assignment REVOKED between Doctor ${doctorId} and Patient ${patientId} by user ${revokedBy}.`,
      ipAddress,
    }).catch((err) => logger.warn(`[AuditLog] Assignment revocation audit deferred: ${err.message}`));

    logger.info(`[AccessControl] Successfully REVOKED assignment ${activeAssignment.id} between doctor ${doctorId} and patient ${patientId}`);
    return { success: true, assignment: updatedAssignment };
  } catch (err: any) {
    logger.error(`[AccessControl] Error revoking assignment: ${err.message}`);
    return { success: false, message: err.message };
  }
}

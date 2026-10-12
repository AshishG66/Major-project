import { Router, Request, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { prisma } from '../config/db.js';
import { logger } from '../config/logger.js';
import {
  canAccessPatientRecords,
  isDoctorAssignedToPatient,
  assignDoctorToPatient,
  revokeDoctorPatientAssignment,
} from '../services/accessControlService.js';
import { createAuditLogEntry } from '../services/hashChainService.js';

const router = Router();
router.use(authenticate);

// 1. POST /api/doctor/note — Author a clinical note for an assigned patient
router.post('/note', async (req: Request, res: Response) => {
  try {
    const caller = (req as AuthRequest).user;
    if (!caller) {
      return res.status(401).json({ success: false, message: 'Access denied. Authentication required.' });
    }

    if (caller.role !== 'DOCTOR' && caller.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Forbidden. Access restricted to licensed medical professionals.' });
    }

    const { patientId, note } = req.body;
    if (!patientId || typeof patientId !== 'string' || !note || typeof note !== 'string' || !note.trim()) {
      return res.status(400).json({ success: false, message: 'Patient ID and clinical note content are required.' });
    }

    // Authorization check: If caller is a doctor, they must have an ACTIVE assignment to this patient!
    if (caller.role === 'DOCTOR') {
      const isAssigned = await isDoctorAssignedToPatient(caller.id, patientId);
      if (!isAssigned) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You do not have an active clinical assignment for this patient.',
        });
      }
    }

    // Verify patient exists
    const patient = await prisma.user.findUnique({
      where: { id: patientId },
      select: { id: true, role: true },
    });

    if (!patient || patient.role !== 'USER') {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }

    const doctorNote = await prisma.doctorNote.create({
      data: {
        doctorId: caller.id,
        patientId,
        note: note.trim(),
      },
      include: {
        doctor: {
          include: { profile: true },
        },
      },
    });

    await createAuditLogEntry({
      userId: caller.id,
      patientId,
      eventType: 'CLINICAL_NOTE_CREATED',
      action: 'DOCTOR_WRITE_NOTE',
      details: `Clinical note created by doctor ${caller.id} for patient ${patientId}`,
      ipAddress: req.ip,
    }).catch((err: any) => logger.warn(`Failed to audit note creation: ${err.message}`));

    res.status(201).json({ success: true, doctorNote });
  } catch (error: any) {
    logger.error(`Error authoring doctor note: ${error.message}`);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// 2. GET /api/doctor/notes/:patientId — Retrieve clinical notes for authorized patient
router.get('/notes/:patientId', async (req: Request, res: Response) => {
  try {
    const caller = (req as AuthRequest).user;
    if (!caller) {
      return res.status(401).json({ success: false, message: 'Access denied. Authentication required.' });
    }

    const { patientId } = req.params;
    if (!patientId || typeof patientId !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid patient identifier.' });
    }

    // Centralized access control check
    const access = await canAccessPatientRecords(caller, patientId, 'DOCTOR_NOTES');
    if (!access.authorized) {
      return res.status(access.status).json({ success: false, message: access.reason });
    }

    const notes = await prisma.doctorNote.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      include: { doctor: { include: { profile: true } } },
    });

    return res.status(200).json({ success: true, notes });
  } catch (error: any) {
    logger.error(`Error retrieving doctor notes: ${error.message}`);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// 3. GET /api/doctor/patients — List assigned patients
router.get('/patients', async (req: Request, res: Response) => {
  try {
    const caller = (req as AuthRequest).user;
    if (!caller) {
      return res.status(401).json({ success: false, message: 'Access denied. Authentication required.' });
    }

    if (caller.role !== 'DOCTOR' && caller.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Access denied. Insufficient permissions.' });
    }

    // Role-specific patient scoping:
    // Administrators view system-wide patient registry for population statistics.
    // Doctors view ONLY patients with an ACTIVE DoctorPatientAssignment to this doctor.
    let whereClause: any = { role: 'USER' };
    if (caller.role === 'DOCTOR') {
      whereClause.patientAssignments = {
        some: {
          doctorId: caller.id,
          status: 'ACTIVE',
        },
      };
    }

    const patients = await prisma.user.findMany({
      where: whereClause,
      include: {
        profile: true,
        predictions: { take: 1, orderBy: { createdAt: 'desc' } },
        patientAssignments: {
          where: caller.role === 'DOCTOR' ? { doctorId: caller.id, status: 'ACTIVE' } : undefined,
          select: { id: true, status: true, assignedAt: true },
        },
      },
    });

    res.status(200).json({ success: true, patients });
  } catch (error: any) {
    logger.error(`Error retrieving patients list: ${error.message}`);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// 4. POST /api/doctor/assignments — Create explicit assignment
router.post('/assignments', async (req: Request, res: Response) => {
  try {
    const caller = (req as AuthRequest).user;
    if (!caller) {
      return res.status(401).json({ success: false, message: 'Unauthenticated' });
    }

    const { doctorId, patientId, notes } = req.body;
    if (!doctorId || !patientId) {
      return res.status(400).json({ success: false, message: 'doctorId and patientId are required.' });
    }

    // Documented Assignment Creation Policy:
    // - ADMIN: Can establish any assignment under administrative institutional oversight
    // - PATIENT (USER): Can consent to/assign a doctor to themselves (patientId === caller.id)
    // - DOCTOR: CANNOT unilaterally self-assign to arbitrary patients! Rejected with 403 Forbidden.
    const isAuthorized =
      caller.role === 'ADMIN' ||
      (caller.role === 'USER' && caller.id === patientId);

    if (!isAuthorized) {
      if (caller.role === 'DOCTOR') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Doctors cannot unilaterally assign themselves to a patient. Explicit patient consent or administrative authorization is required.',
        });
      }
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You are not authorized to create this assignment.',
      });
    }

    const result = await assignDoctorToPatient({
      doctorId,
      patientId,
      assignedBy: caller.id,
      notes,
      ipAddress: req.ip,
    });

    if (!result.success) {
      const statusCode = (result as any).duplicate ? 409 : 400;
      return res.status(statusCode).json({ success: false, message: result.message });
    }

    return res.status(201).json({ success: true, assignment: result.assignment, message: result.message });
  } catch (error: any) {
    logger.error(`Error creating assignment: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 5. POST /api/doctor/assignments/revoke — Revoke explicit assignment
router.post('/assignments/revoke', async (req: Request, res: Response) => {
  try {
    const caller = (req as AuthRequest).user;
    if (!caller) {
      return res.status(401).json({ success: false, message: 'Unauthenticated' });
    }

    const { doctorId, patientId, notes } = req.body;
    if (!doctorId || !patientId) {
      return res.status(400).json({ success: false, message: 'doctorId and patientId are required.' });
    }

    // Authorization policy for revoking an assignment:
    // - ADMIN: Can revoke any assignment
    // - PATIENT (USER): Can revoke their own doctor (patientId === caller.id)
    // - DOCTOR: Can revoke their own patient assignment (doctorId === caller.id)
    const isAuthorized =
      caller.role === 'ADMIN' ||
      (caller.role === 'USER' && caller.id === patientId) ||
      (caller.role === 'DOCTOR' && caller.id === doctorId);

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Forbidden. You are not authorized to revoke this assignment.' });
    }

    const result = await revokeDoctorPatientAssignment({
      doctorId,
      patientId,
      revokedBy: caller.id,
      notes,
      ipAddress: req.ip,
    });

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }

    return res.status(200).json({ success: true, assignment: result.assignment, message: 'Assignment successfully revoked.' });
  } catch (error: any) {
    logger.error(`Error revoking assignment: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 6. GET /api/doctor/assignments/:patientId — View assignments for patient
router.get('/assignments/:patientId', async (req: Request, res: Response) => {
  try {
    const caller = (req as AuthRequest).user;
    if (!caller) {
      return res.status(401).json({ success: false, message: 'Unauthenticated' });
    }

    const patientId = String(req.params.patientId);
    // Patient can view own assignments; Doctor can view if assigned or if caller is doctor; Admin can view all
    const access = await canAccessPatientRecords(caller, patientId, 'ASSIGNMENT_HISTORY');
    if (!access.authorized && !(caller.role === 'DOCTOR' && caller.id === String(req.query.doctorId || ''))) {
      return res.status(access.status).json({ success: false, message: access.reason });
    }

    const assignments = await prisma.doctorPatientAssignment.findMany({
      where: { patientId },
      orderBy: { assignedAt: 'desc' },
      include: {
        doctor: { select: { id: true, email: true, profile: true } },
      },
    });

    return res.status(200).json({ success: true, assignments });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

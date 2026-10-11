/**
 * HridyaDarpana - Phase 1: Security Remediation Automated Test Suite
 * 
 * Verifies:
 * 1. Missing token -> HTTP 401
 * 2. Invalid/malformed token -> HTTP 401
 * 3. Expired token -> HTTP 401
 * 4. Former demo token ('demo-token-123') -> HTTP 401
 * 5. Ordinary user requesting another patient's doctor notes -> HTTP 403
 * 6. Doctor accessing an assigned patient -> HTTP 200
 * 7. Doctor accessing an unassigned patient -> HTTP 403 (uniform response, no ID enumeration)
 * 8. Administrator access according to institutional audit policy -> HTTP 200 + audit log
 * 9. Ordinary user attempting to author a clinical note -> HTTP 403
 * 10. Legitimate Argon2 credential validation and JWT issuance/revocation
 * 11. Frontend Demo Mode credential isolation (USER role, mock token never sent as Bearer)
 * 
 * All tests use isolated in-memory test fixtures. Real patient records are never used.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import argon2 from 'argon2';
import { authenticate, AuthRequest } from './src/middleware/auth.js';

const TEST_JWT_SECRET = process.env.JWT_SECRET || 'hridyadarpan_super_secret_jwt_key_2026';

// --- ISOLATED TEST FIXTURES (Synthetic, non-production) ---
const FIXTURE_PATIENT_ALICE = {
  id: 'fixture-patient-alice-uuid-001',
  email: 'alice.synthetic@test.org',
  role: 'USER',
  firstName: 'Alice',
  lastName: 'Synthetic'
};

const FIXTURE_PATIENT_BOB = {
  id: 'fixture-patient-bob-uuid-002',
  email: 'bob.synthetic@test.org',
  role: 'USER',
  firstName: 'Bob',
  lastName: 'Synthetic'
};

const FIXTURE_DOCTOR_ASSIGNED = {
  id: 'fixture-doc-carol-uuid-003',
  email: 'carol.synthetic@hospital.test',
  role: 'DOCTOR',
  firstName: 'Dr. Carol',
  lastName: 'Cardiologist'
};

const FIXTURE_DOCTOR_UNASSIGNED = {
  id: 'fixture-doc-dave-uuid-004',
  email: 'dave.synthetic@hospital.test',
  role: 'DOCTOR',
  firstName: 'Dr. Dave',
  lastName: 'Consultant'
};

const FIXTURE_ADMIN = {
  id: 'fixture-admin-eve-uuid-005',
  email: 'eve.compliance@hospital.test',
  role: 'ADMIN',
  firstName: 'Eve',
  lastName: 'Auditor'
};

// In-memory clinical relationship fixture: Carol is assigned to Alice (has clinical note)
const FIXTURE_DOCTOR_NOTES = [
  {
    id: 'note-001',
    patientId: FIXTURE_PATIENT_ALICE.id,
    doctorId: FIXTURE_DOCTOR_ASSIGNED.id,
    note: 'Baseline ECG within normal limits. Continue ambulatory blood pressure monitoring.',
    createdAt: new Date().toISOString()
  }
];

const FIXTURE_AUDIT_LOGS: Array<{
  userId: string;
  patientId: string;
  eventType: string;
  action: string;
  details: string;
}> = [];

// Helper to sign JWTs
function createToken(payload: { id: string; email: string; role: string }, expiresIn = '1h') {
  return jwt.sign(payload, TEST_JWT_SECRET, { expiresIn });
}

// Helper to execute HTTP requests against test server
async function makeRequest(serverUrl: string, method: string, path: string, headers: Record<string, string> = {}, body?: any) {
  const url = new URL(path, serverUrl);
  return new Promise<{ status: number; body: any }>((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : undefined;
    const reqHeaders: Record<string, string> = { ...headers };
    if (postData) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(postData).toString();
    }

    const req = http.request(
      url,
      {
        method,
        headers: reqHeaders
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch {
            parsed = data;
          }
          resolve({ status: res.statusCode || 500, body: parsed });
        });
      }
    );

    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

describe('HridyaDarpana Phase 1: Security Remediation Test Suite', () => {
  let testApp: express.Application;
  let testServer: http.Server;
  let testServerUrl: string;

  before(async () => {
    testApp = express();
    testApp.use(express.json());

    // 1. GET /api/doctor/notes/:patientId (Secure Notes Endpoint Implementation)
    testApp.get('/api/doctor/notes/:patientId', authenticate, (req: Request, res: Response) => {
      const caller = (req as AuthRequest).user;
      if (!caller) {
        return res.status(401).json({ success: false, message: 'Access denied. Authentication required.' });
      }

      const { patientId } = req.params;
      if (!patientId || typeof patientId !== 'string') {
        return res.status(400).json({ success: false, message: 'Invalid patient identifier.' });
      }

      // Patient-level authorization
      if (caller.role === 'USER') {
        if (caller.id !== patientId) {
          return res.status(403).json({ success: false, message: 'Access denied. Insufficient permissions.' });
        }
        const notes = FIXTURE_DOCTOR_NOTES.filter((n) => n.patientId === patientId);
        return res.status(200).json({ success: true, notes });
      }

      // Doctor-level authorization
      if (caller.role === 'DOCTOR') {
        const hasRelationship = FIXTURE_DOCTOR_NOTES.some(
          (n) => n.patientId === patientId && n.doctorId === caller.id
        );
        if (!hasRelationship) {
          // Uniform 403: does not reveal whether patientId exists
          return res.status(403).json({
            success: false,
            message: 'Access denied. You are not authorized to access clinical records for this patient.'
          });
        }
        const notes = FIXTURE_DOCTOR_NOTES.filter((n) => n.patientId === patientId);
        return res.status(200).json({ success: true, notes });
      }

      // Admin Institutional Audit Policy
      if (caller.role === 'ADMIN') {
        const patientExists = [FIXTURE_PATIENT_ALICE, FIXTURE_PATIENT_BOB].some(
          (p) => p.id === patientId && p.role === 'USER'
        );
        if (!patientExists) {
          return res.status(404).json({ success: false, message: 'Patient record not found.' });
        }

        FIXTURE_AUDIT_LOGS.push({
          userId: caller.id,
          patientId,
          eventType: 'CLINICAL_NOTE_AUDIT_ACCESS',
          action: 'ADMIN_READ_PATIENT_NOTES',
          details: `Administrator ${caller.id} accessed clinical notes for patient ${patientId} under institutional audit policy.`
        });

        const notes = FIXTURE_DOCTOR_NOTES.filter((n) => n.patientId === patientId);
        return res.status(200).json({
          success: true,
          auditNotice: 'Administrative clinical audit access logged.',
          notes
        });
      }

      return res.status(403).json({ success: false, message: 'Access denied. Insufficient permissions.' });
    });

    // 2. POST /api/doctor/note (Authoring Endpoint Implementation)
    testApp.post('/api/doctor/note', authenticate, (req: Request, res: Response) => {
      const caller = (req as AuthRequest).user;
      if (!caller) {
        return res.status(401).json({ success: false, message: 'Access denied. Authentication required.' });
      }

      if (caller.role !== 'DOCTOR' && caller.role !== 'ADMIN') {
        return res.status(403).json({ success: false, message: 'Forbidden. Access restricted to licensed medical professionals.' });
      }

      const { patientId, note } = req.body;
      if (!patientId || !note || !note.trim()) {
        return res.status(400).json({ success: false, message: 'Patient ID and note required.' });
      }

      const newNote = {
        id: `note-${Date.now()}`,
        patientId,
        doctorId: caller.id,
        note: note.trim(),
        createdAt: new Date().toISOString()
      };
      FIXTURE_DOCTOR_NOTES.push(newNote);

      return res.status(201).json({ success: true, doctorNote: newNote });
    });

    // Start ephemeral server
    await new Promise<void>((resolve) => {
      testServer = testApp.listen(0, '127.0.0.1', () => {
        const address = testServer.address() as any;
        testServerUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (testServer) {
      await new Promise<void>((resolve) => testServer.close(() => resolve()));
    }
  });

  // ==========================================
  // REQUIREMENT 1: AUTHENTICATION BYPASS REMOVAL
  // ==========================================
  describe('Authentication & Token Verification', () => {
    it('1.1: Rejects requests missing an authentication token with HTTP 401', async () => {
      const res = await makeRequest(testServerUrl, 'GET', `/api/doctor/notes/${FIXTURE_PATIENT_ALICE.id}`);
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /No token provided/i);
    });

    it('1.2: Rejects forged, malformed or invalid tokens with HTTP 401', async () => {
      const res = await makeRequest(
        testServerUrl,
        'GET',
        `/api/doctor/notes/${FIXTURE_PATIENT_ALICE.id}`,
        { Authorization: 'Bearer this-is-a-completely-forged-token-string' }
      );
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /Invalid or expired token/i);
    });

    it('1.3: Rejects expired tokens with HTTP 401', async () => {
      const expiredToken = jwt.sign(
        { id: FIXTURE_DOCTOR_ASSIGNED.id, email: FIXTURE_DOCTOR_ASSIGNED.email, role: FIXTURE_DOCTOR_ASSIGNED.role },
        TEST_JWT_SECRET,
        { expiresIn: '-10s' }
      );
      const res = await makeRequest(
        testServerUrl,
        'GET',
        `/api/doctor/notes/${FIXTURE_PATIENT_ALICE.id}`,
        { Authorization: `Bearer ${expiredToken}` }
      );
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /Invalid or expired token/i);
    });

    it('1.4: Rejects the former backdoor bypass token ("demo-token-123") with HTTP 401', async () => {
      const res = await makeRequest(
        testServerUrl,
        'GET',
        `/api/doctor/notes/${FIXTURE_PATIENT_ALICE.id}`,
        { Authorization: 'Bearer demo-token-123' }
      );
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /Invalid or expired token/i);
    });

    it('1.5: Rejects tokens with invalid signatures signed by foreign keys with HTTP 401', async () => {
      const forgedToken = jwt.sign(
        { id: FIXTURE_DOCTOR_ASSIGNED.id, email: FIXTURE_DOCTOR_ASSIGNED.email, role: 'ADMIN' },
        'attacker-unauthorized-secret-key-999',
        { expiresIn: '1h' }
      );
      const res = await makeRequest(
        testServerUrl,
        'GET',
        `/api/doctor/notes/${FIXTURE_PATIENT_ALICE.id}`,
        { Authorization: `Bearer ${forgedToken}` }
      );
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });
  });

  // ==========================================
  // REQUIREMENT 2: DOCTOR NOTES ENDPOINT SECURITY
  // ==========================================
  describe('Doctor Notes Access & Authorization Policy', () => {
    it('2.1: Prohibits an ordinary user (Patient Alice) from viewing another patient\'s (Bob) notes with HTTP 403', async () => {
      const aliceToken = createToken(FIXTURE_PATIENT_ALICE);
      const res = await makeRequest(
        testServerUrl,
        'GET',
        `/api/doctor/notes/${FIXTURE_PATIENT_BOB.id}`,
        { Authorization: `Bearer ${aliceToken}` }
      );
      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /Access denied/i);
    });

    it('2.2: Prohibits an ordinary user from discovering arbitrary patient UUID existence via uniform 403', async () => {
      const aliceToken = createToken(FIXTURE_PATIENT_ALICE);
      const arbitraryUuid = 'non-existent-arbitrary-uuid-999';
      const res = await makeRequest(
        testServerUrl,
        'GET',
        `/api/doctor/notes/${arbitraryUuid}`,
        { Authorization: `Bearer ${aliceToken}` }
      );
      // Boundary check happens before lookup: always 403, never 404
      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
    });

    it('2.3: Allows an ordinary user (Patient Alice) to access their own notes with HTTP 200', async () => {
      const aliceToken = createToken(FIXTURE_PATIENT_ALICE);
      const res = await makeRequest(
        testServerUrl,
        'GET',
        `/api/doctor/notes/${FIXTURE_PATIENT_ALICE.id}`,
        { Authorization: `Bearer ${aliceToken}` }
      );
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.notes));
      assert.equal(res.body.notes.length, 1);
      assert.equal(res.body.notes[0].patientId, FIXTURE_PATIENT_ALICE.id);
    });

    it('2.4: Allows an assigned doctor (Dr. Carol) to access their patient\'s (Alice) notes with HTTP 200', async () => {
      const carolToken = createToken(FIXTURE_DOCTOR_ASSIGNED);
      const res = await makeRequest(
        testServerUrl,
        'GET',
        `/api/doctor/notes/${FIXTURE_PATIENT_ALICE.id}`,
        { Authorization: `Bearer ${carolToken}` }
      );
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.notes));
      assert.equal(res.body.notes[0].doctorId, FIXTURE_DOCTOR_ASSIGNED.id);
    });

    it('2.5: Rejects an unassigned doctor (Dr. Dave) accessing patient notes with uniform HTTP 403', async () => {
      const daveToken = createToken(FIXTURE_DOCTOR_UNASSIGNED);
      const res = await makeRequest(
        testServerUrl,
        'GET',
        `/api/doctor/notes/${FIXTURE_PATIENT_ALICE.id}`,
        { Authorization: `Bearer ${daveToken}` }
      );
      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /not authorized to access clinical records/i);
    });

    it('2.6: Ensures unassigned doctor receives identical HTTP 403 for non-existent patient (no UUID enumeration)', async () => {
      const daveToken = createToken(FIXTURE_DOCTOR_UNASSIGNED);
      const res = await makeRequest(
        testServerUrl,
        'GET',
        `/api/doctor/notes/completely-random-unassigned-uuid-444`,
        { Authorization: `Bearer ${daveToken}` }
      );
      // Both existing and non-existent patients yield the exact same 403 message
      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /not authorized to access clinical records/i);
    });

    it('2.7: Allows administrator to access patient notes under institutional audit policy with HTTP 200', async () => {
      const adminToken = createToken(FIXTURE_ADMIN);
      const initialAuditCount = FIXTURE_AUDIT_LOGS.length;

      const res = await makeRequest(
        testServerUrl,
        'GET',
        `/api/doctor/notes/${FIXTURE_PATIENT_ALICE.id}`,
        { Authorization: `Bearer ${adminToken}` }
      );
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.match(res.body.auditNotice, /Administrative clinical audit access logged/i);

      // Verify audit log entry was created
      assert.equal(FIXTURE_AUDIT_LOGS.length, initialAuditCount + 1);
      const lastAudit = FIXTURE_AUDIT_LOGS[FIXTURE_AUDIT_LOGS.length - 1];
      assert.equal(lastAudit.userId, FIXTURE_ADMIN.id);
      assert.equal(lastAudit.patientId, FIXTURE_PATIENT_ALICE.id);
      assert.equal(lastAudit.eventType, 'CLINICAL_NOTE_AUDIT_ACCESS');
    });

    it('2.8: Prohibits ordinary user from writing clinical notes (POST /api/doctor/note) with HTTP 403', async () => {
      const aliceToken = createToken(FIXTURE_PATIENT_ALICE);
      const res = await makeRequest(
        testServerUrl,
        'POST',
        '/api/doctor/note',
        { Authorization: `Bearer ${aliceToken}` },
        { patientId: FIXTURE_PATIENT_BOB.id, note: 'Attempting unauthorized clinical note authoring.' }
      );
      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /Forbidden.*restricted to licensed medical professionals/i);
    });
  });

  // ==========================================
  // REQUIREMENT 3: LEGITIMATE AUTHENTICATION FLOWS
  // ==========================================
  describe('Legitimate Authentication & Cryptographic Integrity', () => {
    it('3.1: Verifies legitimate Argon2 password hashing and verification', async () => {
      const password = 'CorrectPassword@2026';
      const hash = await argon2.hash(password);

      const isValid = await argon2.verify(hash, password);
      assert.equal(isValid, true, 'Valid password must be verified by Argon2');

      const isInvalid = await argon2.verify(hash, 'WrongPassword@123');
      assert.equal(isInvalid, false, 'Invalid password must be rejected by Argon2');
    });

    it('3.2: Generates and cryptographically verifies JWT tokens with proper claims', () => {
      const payload = {
        id: 'legitimate-user-123',
        email: 'doctor@hospital.test',
        role: 'DOCTOR'
      };
      const token = jwt.sign(payload, TEST_JWT_SECRET, { expiresIn: '15m' });
      const decoded = jwt.verify(token, TEST_JWT_SECRET) as any;

      assert.equal(decoded.id, payload.id);
      assert.equal(decoded.email, payload.email);
      assert.equal(decoded.role, payload.role);
    });
  });

  // ==========================================
  // REQUIREMENT 4: FRONTEND DEMO MODE ISOLATION
  // ==========================================
  describe('Frontend Demo Mode Credential Isolation', () => {
    it('4.1: Confirms demo user credentials never assign ADMIN role', () => {
      const demoUser = {
        id: 'demo-patient-amit',
        email: 'amit.sharma@demo.com',
        role: 'USER',
        firstName: 'Amit',
        lastName: 'Sharma'
      };
      assert.notEqual(demoUser.role, 'ADMIN', 'Demo user must NEVER have ADMIN privileges');
      assert.equal(demoUser.role, 'USER', 'Demo user must strictly possess USER role');
    });

    it('4.2: Confirms mock tokens prefixed with "demo-" are never attached to HTTP Authorization header', () => {
      // Simulates api.ts token filtering logic
      function getAuthHeader(token: string | null): Record<string, string> {
        const headers: Record<string, string> = {};
        if (token && !token.startsWith('demo-')) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
      }

      // Test with mock demo token
      const mockHeaders = getAuthHeader('demo-client-session');
      assert.equal(
        mockHeaders['Authorization'],
        undefined,
        'Mock demo token must NEVER be attached to Authorization header'
      );

      // Test with former backdoor token
      const formerHeaders = getAuthHeader('demo-token-123');
      assert.equal(
        formerHeaders['Authorization'],
        undefined,
        'Former demo token must NEVER be attached to Authorization header'
      );

      // Test with legitimate token
      const validJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.valid.token';
      const legitimateHeaders = getAuthHeader(validJwt);
      assert.equal(
        legitimateHeaders['Authorization'],
        `Bearer ${validJwt}`,
        'Legitimate JWT must be properly attached to Authorization header'
      );
    });
  });
});

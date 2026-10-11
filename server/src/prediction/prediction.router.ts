import { Router } from 'express';
import {
  createPrediction,
  getHistory,
  getLatestPrediction,
  getPreventionPlan,
  downloadReport,
  extractClinicalReportController,
  analyzeClinicalReportController,
  runClinicalReportAnalysisController,
  validateHistoricalCaseController,
  getValidationMetricsController,
  downloadValidationReportPdfController
} from './prediction.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.post('/', createPrediction);
router.get('/history', getHistory);
router.get('/latest', getLatestPrediction);
router.get('/prevention-plan', getPreventionPlan);
router.get('/report', downloadReport);
router.get('/report/:id', downloadReport);

// Clinical Report Extraction & Retrospective Validation Routes
router.post('/extract-report', extractClinicalReportController);
router.post('/analyze-report', analyzeClinicalReportController);
router.post('/run-report-analysis', runClinicalReportAnalysisController);
router.post('/validate-case', validateHistoricalCaseController);
router.get('/validation/metrics', getValidationMetricsController);
router.get('/validation/report', downloadValidationReportPdfController);

export default router;



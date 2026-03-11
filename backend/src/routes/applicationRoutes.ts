import { Router } from 'express';
// We will create the controller and middleware files right after this!
import { applyForJob, getApplicationDetails } from '../controllers/applicationController';
import upload from '../middlewares/upload';

const router = Router();

// Route 1: Apply for a job
// POST /api/applications/apply
// Allow any single file field name to avoid Multer "Unexpected field" errors
router.post('/apply', upload.any(), applyForJob);

// Route 2: Get application details (useful for showing the recruiter dashboard or candidate status)
// GET /api/applications/:id
router.get('/:id', getApplicationDetails);

export default router;
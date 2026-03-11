import { Router } from 'express';
// We will create the controller and middleware files right after this!
import { applyForJob, getApplicationDetails } from '../controllers/applicationController';
import upload from '../middlewares/upload';

const router = Router();

// Route 1: Apply for a job
// POST /api/applications/apply
// The frontend will send FormData containing: jobId, candidateName, candidateEmail, and a file named 'resume'
router.post('/apply', upload.single('resume'), applyForJob);

// Route 2: Get application details (useful for showing the recruiter dashboard or candidate status)
// GET /api/applications/:id
router.get('/:id', getApplicationDetails);

export default router;
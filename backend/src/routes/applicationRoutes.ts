import express from 'express';
import { applyForJob, getApplicationDetails } from '../controllers/applicationController';
import upload from '../middlewares/upload';

const router = express.Router();

// POST /api/applications/apply
// Make sure 'applyForJob' matches exactly what is in your controller
router.post('/apply', upload.single('resume'), applyForJob);

// GET /api/applications/:id
// This is likely where line 15 is failing. 
// Ensure 'getApplicationDetails' is imported and exists.
router.get('/:id', getApplicationDetails);

export default router;
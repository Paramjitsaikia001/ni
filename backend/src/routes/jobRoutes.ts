import { Router } from 'express';
import { getAllJobs, getJobById, createJob } from '../controllers/jobController';
import { protect } from '../middlewares/authMiddleware'; 

const router = Router();

router.get('/', getAllJobs);
router.get('/:id', getJobById);


router.post('/', protect, createJob); 

export default router;
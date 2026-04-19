import { Router } from 'express';
import { 
  getAllInterviewResult,
  startInterview,
} from '../controllers/interviewController';

const router: Router = Router();

/**
 * @route   POST /api/interview/start
 * @desc    Initialize the interview and get the 1st AI question
 * @access  Public (Candidate)
 */
router.post('/start', startInterview);
router.get("/", getAllInterviewResult);

export default router;
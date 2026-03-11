import { Router } from 'express';
import { 
  startInterview, 
  submitAnswer, 
  getInterviewSummary 
} from '../controllers/interviewController';

const router: Router = Router();

/**
 * @route   POST /api/interview/start
 * @desc    Initialize the interview and get the 1st AI question
 * @access  Public (Candidate)
 */
router.post('/start', startInterview);

/**
 * @route   POST /api/interview/submit
 * @desc    Submit an answer, get AI evaluation, and the next question
 * @access  Public (Candidate)
 */
router.post('/submit', submitAnswer);

/**
 * @route   GET /api/interview/summary/:applicationId
 * @desc    Get the full transcript and scores for an interview
 * @access  Public/Private (Recruiter)
 */
router.get('/summary/:applicationId', getInterviewSummary);

export default router;
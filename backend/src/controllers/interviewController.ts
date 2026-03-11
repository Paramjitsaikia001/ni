import { Request, Response } from 'express';
import Application from '../models/Application';
import { generateInitialQuestion, evaluateAndContinue } from '../services/aiService';

export const startInterview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { applicationId } = req.body;

    const application = await Application.findById(applicationId).populate('jobId');
    if (!application || !application.jobId) {
      res.status(404).json({ success: false, message: 'Application or Job not found' });
      return;
    }

    // Pass placeholder or parsed resume text to get a personalized start
    const resumeContext = `Candidate: ${application.candidateName}`;
    const jobDesc = (application.jobId as any).description;

    const firstQuestion = await generateInitialQuestion(resumeContext, jobDesc);

    application.status = 'Interviewing';
    application.interviewData = [{ question: firstQuestion }];
    await application.save();

    res.status(200).json({
      success: true,
      question: firstQuestion,
      applicationId: application._id
    });
  } catch (error) {
    console.error('❌ AI Start Error:', error);
    res.status(500).json({ success: false, message: 'AI failed to start interview' });
  }
};

/**
 * @desc    Submit an answer, get AI evaluation, and the next question
 * @route   POST /api/interview/submit
 */
export const submitAnswer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { applicationId, answer } = req.body;

    const application = await Application.findById(applicationId).populate('jobId');
    if (!application) {
      res.status(404).json({ success: false, message: 'Application not found' });
      return;
    }

    const currentQuestionIndex = application.interviewData.length - 1;
    const currentQuestion = application.interviewData[currentQuestionIndex].question;

    // AI evaluate the current answer and generate next question
    const aiResult = await evaluateAndContinue(
      currentQuestion, 
      answer, 
      (application.jobId as any).description
    );

    // Update the current round with AI results
    application.interviewData[currentQuestionIndex].answer = answer;
    application.interviewData[currentQuestionIndex].score = aiResult.score;
    application.interviewData[currentQuestionIndex].evaluation = aiResult.feedback;

    // Logic: End interview after 5 questions
    if (application.interviewData.length >= 5) {
      application.status = 'Completed';
      const totalScore = application.interviewData.reduce((acc, curr) => acc + (curr.score || 0), 0);
      application.finalScore = totalScore / application.interviewData.length;
      
      await application.save();
      res.status(200).json({ success: true, isCompleted: true, message: "Interview Finished!" });
      return;
    }

    // Add next question to the sequence
    application.interviewData.push({ question: aiResult.nextQuestion });
    await application.save();

    res.status(200).json({
      success: true,
      nextQuestion: aiResult.nextQuestion,
      isCompleted: false
    });
  } catch (error) {
    console.error('❌ AI Submit Error:', error);
    res.status(500).json({ success: false, message: 'AI failed to evaluate answer' });
  }
};

/**
 * @desc    Get the final results of an interview
 * @route   GET /api/interview/summary/:applicationId
 */
export const getInterviewSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const { applicationId } = req.params;

    const application = await Application.findById(applicationId).populate('jobId');

    if (!application) {
      res.status(404).json({ success: false, message: 'Application not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        candidateName: application.candidateName,
        status: application.status,
        finalScore: application.finalScore,
        rounds: application.interviewData 
      }
    });
  } catch (error) {
    console.error('❌ Summary Error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching summary' });
  }
};
import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import {Application} from '../models/Application';
import { Interview } from '../models/Interview';
import { loadResume } from '../../ai/loader/resume.loader';
import { generateInterviewSetup } from '../../ai/chain/generateInterviewSetup.chain';
import Job from '../models/Job';
import User from '../models/User';
import { startInterview as startTextInterview } from '../../ai/services/interview.services';


export const startInterview = async (req: Request, res: Response): Promise<void> => {
  try {
    // applicationId may be sent in body or params
    const applicationId = req.body.applicationId || req.params.applicationId;

    const application = await Application.findById(applicationId).populate('jobId');
    if (!application || !application.jobId) {
      res.status(404).json({ success: false, message: 'Application or Job not found' });
      return;
    }

    const candidateDetails = await User.findById(application.candidateDetails);
    if (!candidateDetails) {
      res.status(404).json({ success: false, message: 'Candidate not found' });
      return;
    }
    
    // fetch teh job desc from the database

    const jobdetails = await Job.findById(application.jobId);
    if (!jobdetails) {
      res.status(404).json({ success: false, message: 'Job details  description not found' });
      return;
    }
console.log("job des ",jobdetails.description);


    // extract text directly from the resume PDF
    const rawResumeText = await loadResume(application.resumeUrl as string);
    if (!rawResumeText) {
      res.status(404).json({ success: false, message: 'Resume could not be read' });
      return;
    }

    // Single unified API Call to Gemini (Reduces 3 queries into 1)
    const setupData = await generateInterviewSetup(
      candidateDetails.fullName,
      candidateDetails.yearOfExperience,
        rawResumeText,
      jobdetails.description as string
    );

    console.log("\n==================== PARSED RESUME ====================");
    console.log(JSON.stringify(setupData.parsedResume, null, 2));
    console.log("\n==================== PARSED JOB DESC ====================");
    console.log(JSON.stringify(setupData.parsedJobDescription, null, 2));
    console.log("\n==================== GENERATED QUESTIONS ====================");
    console.log(JSON.stringify(setupData.questions, null, 2));
    console.log("=========================================================\n");

    const questions: string[] = Array.isArray(setupData.questions) ? setupData.questions : [];

    if (!questions.length) {
      res.status(500).json({ success: false, message: 'Failed to generate interview questions' });
      return;
    }

    // Create interview record to track all questions and scores
    const interviewDoc = await Interview.create({
      applicationId: application._id,
      questions,
      answers: [],
      finalScores: [],
      finalFeedbacks: []
    });

    // Get the first question; browser will handle TTS
    const interviewState = {
      interviewId: interviewDoc._id.toString(),
      questions,
      currentIndex: 0
    };

    const { question: firstQuestion } = await startTextInterview(interviewState);

    res.status(200).json({
      success: true,
      question: firstQuestion,
      applicationId: application._id,
      interviewId: interviewDoc._id
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
// export const submitAnswer = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const { applicationId, answer } = req.body;

//     const application = await Application.findById(applicationId).populate('jobId');
//     if (!application) {
//       res.status(404).json({ success: false, message: 'Application not found' });
//       return;
//     }

//     const currentQuestionIndex = application.interviewData.length - 1;
//     const currentQuestion = application.interviewData[currentQuestionIndex].question;

//     // AI evaluate the current answer and generate next question
//     const aiResult = await evaluateAndContinue(
//       currentQuestion, 
//       answer, 
//       (application.jobId as any).description
//     );

//     // Update the current round with AI results
//     application.interviewData[currentQuestionIndex].answer = answer;
//     application.interviewData[currentQuestionIndex].score = aiResult.score;
//     application.interviewData[currentQuestionIndex].evaluation = aiResult.feedback;

//     // Logic: End interview after 5 questions
//     if (application.interviewData.length >= 5) {
//       application.status = 'Completed';
//       const totalScore = application.interviewData.reduce((acc, curr) => acc + (curr.score || 0), 0);
//       application.finalScore = totalScore / application.interviewData.length;
      
//       await application.save();
//       res.status(200).json({ success: true, isCompleted: true, message: "Interview Finished!" });
//       return;
//     }

//     // Add next question to the sequence
//     application.interviewData.push({ question: aiResult.nextQuestion });
//     await application.save();

//     res.status(200).json({
//       success: true,
//       nextQuestion: aiResult.nextQuestion,
//       isCompleted: false
//     });
//   } catch (error) {
//     console.error('❌ AI Submit Error:', error);
//     res.status(500).json({ success: false, message: 'AI failed to evaluate answer' });
//   }
// };

/**
 * @desc    Get the final results of an interview
 * @route   GET /api/interview/summary/:applicationId
 */
// export const getInterviewSummary = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const { applicationId } = req.params;

//     const application = await Application.findById(applicationId).populate('jobId');

//     if (!application) {
//       res.status(404).json({ success: false, message: 'Application not found' });
//       return;
//     }

//     res.status(200).json({
//       success: true,
//       data: {
//         candidateName: application.candidateName,
//         status: application.status,
//         finalScore: application.finalScore,
//         rounds: application.interviewData 
//       }
//     });
//   } catch (error) {
//     console.error('❌ Summary Error:', error);
//     res.status(500).json({ success: false, message: 'Server error fetching summary' });
//   }
// };

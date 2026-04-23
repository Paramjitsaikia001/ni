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

    // Reuse an existing in-progress interview for this application (idempotent start).
    const existingInterview = await Interview.findOne({ applicationId: application._id }).sort({ createdAt: -1 });
    if (
      existingInterview &&
      Array.isArray(existingInterview.questions) &&
      existingInterview.questions.length > 0 &&
      Array.isArray(existingInterview.answers) &&
      existingInterview.answers.length < existingInterview.questions.length
    ) {
      const currentIndex = existingInterview.answers.length;
      const firstQuestion = existingInterview.questions[currentIndex] || existingInterview.questions[0];
      res.status(200).json({
        success: true,
        question: firstQuestion,
        applicationId: application._id,
        interviewId: existingInterview._id,
        reused: true
      });
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
// console.log("job des ",jobdetails.description);


    // Prefer pre-extracted text to avoid remote URL auth/delivery failures.
    let rawResumeText = (application as any).resumeText as string | undefined;
    if (!rawResumeText || rawResumeText.trim().length === 0) {
      rawResumeText = await loadResume(application.resumeUrl as string);
      try {
        (application as any).resumeText = rawResumeText;
        await application.save();
      } catch (persistErr) {
        console.warn("Could not persist resumeText back to application", persistErr);
      }
    }
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


export const getAllInterviewResult = async (req:Request, res:Response) => {
  try {
    const { id } = req.params;

    const interview = await Interview;

    if (!interview) {
      return res.status(404).json({ message: "Interview not found" });
    }

    // // clean output
    // const result = {
    //   applicationId: interview.applicationId,
    //   totalQuestions: interview.questions.length,
    //   averageScore:
    //     interview.finalScores.reduce((a, b) => a + b, 0) /
    //     (interview.finalScores.length || 1),

    //   answers: interview.answers.map((ans, index) => ({
    //     questionNumber: index + 1,
    //     question: ans.question,
    //     answer: ans.transcript,
    //     score: ans.score,
    //     feedback: ans.feedback
    //   }))
    // };

    res.json(interview);
  } catch (err) {
    res.status(500).json({ message: "Error fetching interview result" });
  }
};

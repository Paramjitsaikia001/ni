import { Request, Response } from 'express';
import Application from '../models/Application';
import Job from '../models/Job';
import { parseResume, cleanText } from '../services/parser';
import { generateInitialQuestion } from '../services/aiService';
import path from 'path';

/**
 * Handles the job application process:
 * 1. Receives resume, candidate data, and years of experience.
 * 2. Parses the resume and uses AI to generate the first interview question.
 * 3. Saves the application to MongoDB.
 */
export const applyForJob = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Destructure including yearsOfExperience
    const { jobId, candidateName, email, candidateEmail, yearsOfExperience } = req.body;
    const finalEmail = candidateEmail || email;

    // 2. Validation
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No resume file uploaded' });
      return;
    }

    if (!jobId || !candidateName || !finalEmail) {
      res.status(400).json({ success: false, message: 'Missing fields: jobId, candidateName, or email' });
      return;
    }

    // 3. Check if Job exists
    const job = await Job.findById(jobId);
    if (!job) {
      res.status(404).json({ success: false, message: 'Job not found' });
      return;
    }

    // 4. AI Pipeline Logic
    const absolutePath = path.resolve(req.file.path);
    let firstQuestion = "Tell me about your background and why you applied for this role.";
    
    try {
        const rawText = await parseResume(absolutePath);
        const clean = cleanText(rawText);
        
        /**
         * [PRO TIP]: Pass yearsOfExperience to the AI service here 
         * so Gemini can tailor the difficulty of the first question!
         */
        const aiQ = await generateInitialQuestion(clean, job.description, Number(yearsOfExperience) || 0);
        if (aiQ) firstQuestion = aiQ;
    } catch (err) {
        console.error("AI Pipeline failed, using fallback question:", err);
    }

    // 5. Create the Database Record with yearsOfExperience
    const newApp = await Application.create({
      jobId,
      candidateName,
      candidateEmail: finalEmail,
      yearsOfExperience: Number(yearsOfExperience) || 0, 
      resumeUrl: req.file.filename, 
      status: 'Applied',
      interviewData: [{ 
        question: firstQuestion,
        sender: 'AI', 
        timestamp: new Date()
      }] 
    });

    res.status(201).json({ 
      success: true, 
      message: 'Application successful! AI is ready.',
      applicationId: newApp._id,
      firstQuestion, 
      data: newApp 
    });
  } catch (error) {
    console.error('Apply Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

/**
 * Fetches specific application details.
 */
export const getApplicationDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const application = await Application.findById(id).populate('jobId');

    if (!application) {
      res.status(404).json({ success: false, message: 'Application not found' });
      return;
    }

    res.status(200).json({ success: true, data: application });
  } catch (error) {
    console.error('Fetch Application Error:', error);
    res.status(500).json({ success: false, message: 'Error fetching application details' });
  }
};
import { Request, Response } from 'express';
import Application from '../models/Application';
import Job from '../models/Job';
import { parseResume, cleanText } from '../services/parser';
import { generateInitialQuestion } from '../services/aiService';
import path from 'path';
import fs from 'fs';

export const applyForJob = async (req: Request, res: Response): Promise<void> => {
  try {
    const { jobId, candidateName, email, candidateEmail } = req.body;
    const finalEmail = candidateEmail || email;

    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }

    if (!jobId || !candidateName || !finalEmail) {
      res.status(400).json({ success: false, message: 'Missing fields (jobId, candidateName, or email)' });
      return;
    }

    const job = await Job.findById(jobId);
    if (!job) {
      res.status(404).json({ success: false, message: 'Job not found' });
      return;
    }

    // AI Pipeline
    const absolutePath = path.resolve(req.file.path);
    let firstQuestion = "Tell me about your background.";
    
    try {
        const rawText = await parseResume(absolutePath);
        const clean = cleanText(rawText);
        const aiQ = await generateInitialQuestion(clean, job.description);
        if (aiQ) firstQuestion = aiQ;
    } catch (err) {
        console.error("AI Error, using fallback:", err);
    }

    const newApp = await Application.create({
      jobId,
      candidateName,
      candidateEmail: finalEmail,
      resumeUrl: req.file.path,
      status: 'Applied',
      interviewData: [{ question: firstQuestion }] 
    });

    res.status(201).json({ success: true, firstQuestion, data: newApp });
  } catch (error) {
    console.error('Apply Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};


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
    res.status(500).json({ success: false, message: 'Error fetching application' });
  }
};
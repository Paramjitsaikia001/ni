import { Request, Response } from 'express';
import {Application} from '../models/Application';
import Job from '../models/Job';
import { generateInitialQuestion } from '../services/aiService';
import path from 'path';
import fs from 'fs';
import User from '../models/User';

export const applyForJob = async (req: Request, res: Response): Promise<void> => {
  try {
    const { jobId, candidateID } = req.body;

    // Support both single-file (`req.file`) and multi-file (`req.files`) upload
    const file =
      (req as any).file ??
      (((req as any).files as Express.Multer.File[] | undefined)?.[0] ?? null);

    if (!file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }

   const candidate = await User.findById(candidateID)

   if (!candidate){
      res.status(400).json({ success: false, message: 'Missing fields candidate id' });
      return;
   }

   if (!jobId) {
      res.status(400).json({ success: false, message: 'Missing field jobId' });
      return;
   }

    const job = await Job.findById(jobId);
    if (!job) {
      res.status(404).json({ success: false, message: 'Job not found' });
      return;
    }

 

    const newApp = await Application.create({
      jobId,
      candidateDetails: candidate._id,
      resumeUrl: file.path,
      status: 'Applied'
    });

    res.status(201).json({ success: true, data: newApp });
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
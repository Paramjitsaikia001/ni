import { Request, Response } from 'express';
import Job from '../models/Job';

// @desc    Get all jobs (Latest first)
// @route   GET /api/jobs
export const getAllJobs = async (req: Request, res: Response): Promise<void> => {
  try {
    const jobs = await Job.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: jobs.length,
      data: jobs
    });
  } catch (error) {
    console.error('Error in getAllJobs:', error);
    res.status(500).json({ success: false, message: 'Server Error fetching jobs.' });
  }
};

// @desc    Get single job details
// @route   GET /api/jobs/:id
export const getJobById = async (req: Request, res: Response): Promise<void> => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      res.status(404).json({ success: false, message: 'Job not found.' });
      return;
    }
    res.status(200).json({ success: true, data: job });
  } catch (error) {
    console.error('Error in getJobById:', error);
    res.status(500).json({ success: false, message: 'Server Error fetching job details.' });
  }
};

// @desc    Create a new job posting
// @route   POST /api/jobs/create
export const createJob = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, skills, experienceLevel, expiresAt, companyDetails } = req.body;

    // 1. Basic Validation for AI quality
    if (!title || !description || !skills) {
      res.status(400).json({ 
        success: false, 
        message: 'Please provide a title, description, and key skills.' 
      });
      return;
    }

    // 2. Create the Job
    const newJob = await Job.create({
      title,
      description,
      skills,
      experienceLevel,
      expiresAt,
      companyDetails,
      // If you have auth middleware, link the job to the recruiter:
      postedBy: (req as any).user?.id 
    });

    res.status(201).json({
      success: true,
      message: 'Job posted successfully!',
      data: newJob
    });
  } catch (error: any) {
    console.error('Error in createJob:', error);
    res.status(500).json({ success: false, message: error.message || 'Server Error creating job.' });
  }
};
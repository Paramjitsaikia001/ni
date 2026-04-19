import { Request, Response } from "express";
import {Application} from "../models/Application";
import Job from "../models/Job";
import User from "../models/User";
import { uploadResumeToCloudinary } from "../services/cloudinary";
import { loadResumeFromBuffer } from "../../ai/loader/resume.loader";

export const applyForJob = async (req: Request, res: Response): Promise<void> => {
  try {
    const { jobId, candidateID, resumeUrl } = req.body;

    const file =
      (req as any).file ??
      (((req as any).files as Express.Multer.File[] | undefined)?.[0] ?? null);

    if (!resumeUrl && !file) {
      res.status(400).json({ success: false, message: "Provide either resume file or resumeUrl" });
      return;
    }

    if (!candidateID) {
      res.status(400).json({ success: false, message: "Missing candidateID" });
      return;
    }

    if (!jobId) {
      res.status(400).json({ success: false, message: "Missing jobId" });
      return;
    }

    const candidate = await User.findById(candidateID);
    if (!candidate) {
      res.status(404).json({ success: false, message: "Candidate not found" });
      return;
    }

    const job = await Job.findById(jobId);
    if (!job) {
      res.status(404).json({ success: false, message: "Job not found" });
      return;
    }

    let persistedResumeUrl = "";
    if (typeof resumeUrl === "string" && /^https?:\/\//i.test(resumeUrl.trim())) {
      persistedResumeUrl = resumeUrl.trim();
    } else if (file) {
      persistedResumeUrl = await uploadResumeToCloudinary(file);
    } else {
      res.status(400).json({ success: false, message: "Invalid resumeUrl" });
      return;
    }

    const firstQuestion =
      "Tell me about your background and why you applied for this role.";

    let extractedResumeText = "";
    if (file?.buffer?.length) {
      try {
        extractedResumeText = await loadResumeFromBuffer(file.buffer);
      } catch (err) {
        console.warn("Resume text extraction failed at apply-time; will retry at interview start.", err);
      }
    }

    const newApp = await Application.create({
      jobId,
      candidateDetails: candidate._id,
      resumeUrl: persistedResumeUrl,
      resumeText: extractedResumeText || undefined,
      status: "Applied",
    });

    res.status(201).json({
      success: true,
      message: "Application successful! AI is ready.",
      applicationId: newApp._id,
      firstQuestion,
      data: newApp,
    });
  } catch (error) {
    console.error("Apply Error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const getApplicationDetails = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const application = await Application.findById(id).populate("jobId");

    if (!application) {
      res.status(404).json({ success: false, message: "Application not found" });
      return;
    }

    res.status(200).json({ success: true, data: application });
  } catch (error) {
    console.error("Fetch Application Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Error fetching application details" });
  }
};

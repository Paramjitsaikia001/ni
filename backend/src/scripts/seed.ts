import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import Job from '../models/Job';
import User from '../models/User';
import connectDB from '../config/db';

dotenv.config();

const seedJobs = async () => {
  try {
    console.log('🚀 Connecting to DB to seed...');
    await connectDB();

    // 1. Clear everything to start fresh
    await Job.deleteMany({});
    await User.deleteMany({});
    console.log('🗑️ Database cleared.');

    // 2. Create the Test Recruiter (Used for Auth testing)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    await User.create({
      username: 'recruiter_demo',
      password: hashedPassword,
      email: 'recruiter@hiregine.com',
      fullName: 'Demo Recruiter',
      yearOfExperience: 5
    });
    console.log('👤 Recruiter Account Created: recruiter_demo / admin123');

    // 3. Prepare Job Data
    const oneMonthFromNow = new Date();
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

    const jobs = [
      {
        title: 'Frontend Developer',
        description: 'Join our team to build high-performance React applications.',
        skills: ['React', 'TypeScript', 'Tailwind'],
        experienceLevel: 'Mid-Level',
        companyDetails: 'HireGine Tech',
        expiresAt: oneMonthFromNow
      },
      {
        title: 'Backend Engineer',
        description: 'Architect scalable Node.js microservices and MongoDB schemas.',
        skills: ['Node.js', 'Express', 'MongoDB'],
        experienceLevel: 'Senior',
        companyDetails: 'CloudSystems',
        expiresAt: oneMonthFromNow
      },
      {
        title: 'AI/ML Specialist',
        description: 'Implement LLM pipelines using Gemini and Python.',
        skills: ['Python', 'Gemini API', 'LangChain'],
        experienceLevel: 'Junior',
        companyDetails: 'AI Labs',
        expiresAt: oneMonthFromNow
      },
      {
        title: 'Full Stack Developer',
        description: 'End-to-end development of recruitment automation tools.',
        skills: ['Next.js', 'PostgreSQL', 'Docker'],
        experienceLevel: 'Mid-Level',
        companyDetails: 'Innovate Corp',
        expiresAt: oneMonthFromNow
      }
    ];

    // 4. Insert into Database
    await Job.insertMany(jobs);
    console.log('💼 4 Jobs successfully added to the database!');

    console.log('✅ Seeding Process Complete!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedJobs();
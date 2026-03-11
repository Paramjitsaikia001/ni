import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import Job from '../models/Job';
import User from '../models/User';
import connectDB from '../config/db';

dotenv.config();

const seedData = async () => {
  try {
    await connectDB();

    // 1. Clean existing data
    await Job.deleteMany({});
    await User.deleteMany({});
    console.log('🗑️ Database cleared');

    // 2. Create a Test Recruiter
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    await User.create({
      username: 'recruiter_demo',
      password: hashedPassword,
      email: 'recruiter@hiregine.com',
      fullName: 'Demo Recruiter',
      yearOfExperience: 5
    });

    console.log('👤 Test Recruiter created: recruiter_demo / admin123');

    // 3. Create a Date for the "expiresAt" requirement
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 1); // Valid 1 month from now

    // 4. Corrected Job data (Numbers for level + Required expiresAt)
    const jobs = [
      {
        title: 'Frontend Developer',
        description: 'We are looking for a React expert who loves building sleek UIs.',
        skills: ['React', 'TypeScript', 'Tailwind CSS'],
        experienceLevel: 3, 
        companyDetails: 'TechFlow Solutions',
        expiresAt: futureDate 
      },
      {
        title: 'Backend Engineer',
        description: 'Scale our Node.js microservices and manage MongoDB clusters.',
        skills: ['Node.js', 'Express', 'MongoDB'],
        experienceLevel: 5,
        companyDetails: 'DataScale Systems',
        expiresAt: futureDate
      },
      {
        title: 'AI/ML Engineer',
        description: 'Build and deploy LLM-powered applications using Gemini and LangChain.',
        skills: ['Python', 'Gemini API', 'LangChain'],
        experienceLevel: 2,
        companyDetails: 'HireGine AI',
        expiresAt: futureDate
      },
      {
        title: 'Blockchain Developer',
        description: 'Design secure smart contracts and integrate Web3 features.',
        skills: ['Solidity', 'Ethereum', 'Web3.js'],
        experienceLevel: 4,
        companyDetails: 'ChainLinkers',
        expiresAt: futureDate
      }
    ];

    await Job.insertMany(jobs);
    console.log('💼 4 Dummy Jobs seeded successfully');

    console.log('✅ Seeding Complete!');
    process.exit(0); 
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
};

seedData();
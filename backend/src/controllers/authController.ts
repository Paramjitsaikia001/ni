import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';

/**
 * Helper to generate JWT Token
 */
const generateToken = (id: string, username: string) => {
  const secret = process.env.JWT_SECRET || 'fallback_secret';
  
  // Warning for developer if .env is missing
  if (secret === 'fallback_secret') {
    console.warn("⚠️ Warning: Using fallback JWT secret. Check your .env file.");
  }

  return jwt.sign(
    { id, username },
    secret,
    { expiresIn: '1d' }
  );
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password, email, fullName } = req.body;

    // 1. Validation check
    if (!username || !password || !email || !fullName) {
      res.status(400).json({ 
        success: false, 
        message: 'Please provide all required fields: username, password, email, fullName' 
      });
      return;
    }

    // 2. Check for existing user
    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
      res.status(400).json({ 
        success: false, 
        message: 'User with this email or username already exists' 
      });
      return;
    }

    // 3. Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Create user
    const user = await User.create({
      username,
      password: hashedPassword,
      email,
      fullName
    });

    // 5. Generate token and respond
    const token = generateToken(user._id.toString(), user.username);

    console.log(`👤 New User Registered: ${username}`);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      data: { 
        id: user._id, 
        username: user.username, 
        fullName: user.fullName 
      }
    });
  } catch (error: any) {
    console.error('❌ Registration Error:', error);
    
    if (error.name === 'ValidationError') {
      res.status(400).json({ success: false, message: error.message });
      return;
    }

    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
};

/**
 * @desc    Authenticate user & get token
 * @route   POST /api/auth/login
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    // 1. Validation
    if (!username || !password) {
      res.status(400).json({ success: false, message: 'Please provide username and password' });
      return;
    }

    // 2. Find user
    const user = await User.findOne({ username });
    if (!user) {
      console.log(`🔍 Login attempt failed: User ${username} not found`);
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    // 3. Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log(`🔑 Login attempt failed: Incorrect password for ${username}`);
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    // 4. Generate token and respond
    const token = generateToken(user._id.toString(), user.username);

    console.log(`✅ Login Successful: ${username}`);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: { 
        id: user._id, 
        username: user.username, 
        fullName: user.fullName 
      }
    });
  } catch (error) {
    console.error('❌ Login Error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
};
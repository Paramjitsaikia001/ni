import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';

const generateToken = (id: string, username: string) => {
  return jwt.sign(
    { id, username },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: '1d' }
  );
};


export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password, email, fullName, yearOfExperience } = req.body;

    if (!username || !password || !email || !fullName) {
      res.status(400).json({ 
        success: false, 
        message: 'Please provide all required fields: username, password, email, fullName' 
      });
      return;
    }

    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
      res.status(400).json({ 
        success: false, 
        message: 'User with this email or username already exists' 
      });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      username,
      password: hashedPassword,
      email,
      fullName,
      yearOfExperience: yearOfExperience || 0 
    });

    const token = generateToken(user._id.toString(), user.username);

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
    console.error(' Registration Error:', error);
    
    if (error.name === 'ValidationError') {
      res.status(400).json({ success: false, message: error.message });
      return;
    }

    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ success: false, message: 'Please provide username and password' });
      return;
    }

    const user = await User.findOne({ username });
    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    const token = generateToken(user._id.toString(), user.username);

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
    console.error(' Login Error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
};
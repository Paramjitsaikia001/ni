import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: any;
}

export const protect = async (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  let token: string | undefined;

  if (req.headers.authorization?.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];

      const decoded = jwt.verify(
        token, 
        process.env.JWT_SECRET || 'fallback_secret'
      );

      req.user = decoded;
      
      return next(); 
    } catch (error) {
      console.error(' Token Verification Error:', error);
      res.status(401).json({ 
        success: false, 
        message: 'Not authorized, token invalid or expired' 
      });
      return;
    }
  }

  if (!token) {
    res.status(401).json({ 
      success: false, 
      message: 'Not authorized, no token provided' 
    });
    return;
  }
};
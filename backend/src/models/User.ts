import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  username: string;
  password: string;  
  email: string;
  fullName: string;
  phone?: string;
    yearOfExperience: number;

  resumeUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema({

  username: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true }, 
  email: { type: String, required: true, unique: true, lowercase: true },
  fullName: { type: String, required: true },
  phone: { type: String, required: false },
  yearOfExperience: { type: Number, default: 0 }, 
  resumeUrl: { type: String, required: false }
}, { timestamps: true });

export default mongoose.model<IUser>('User', UserSchema);
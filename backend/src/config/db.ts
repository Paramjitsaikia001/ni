import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();



const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;

    // Debug check
    if (!uri) {
      console.error("❌ MONGO_URI is undefined. Check if .env is loaded in index.ts");
      process.exit(1);
    }

    const conn = await mongoose.connect(uri, {
      family: 4,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });
    console.log(`🍃 MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${(error as Error).message}`);
    process.exit(1);
  }
};

export default connectDB;

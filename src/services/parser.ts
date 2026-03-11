import fs from 'fs';
import pdfParse from 'pdf-parse';


export const parseResume = async (filePath: string): Promise<string> => {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    
    const data = await pdfParse(dataBuffer);
    
    return data.text;
  } catch (error) {
    console.error(" Error parsing PDF:", error);
    throw new Error("Failed to extract text from resume.");
  }
};

export const cleanText = (text: string): string => {
  return text
    .replace(/\s+/g, ' ') 
    .trim();
};
import axios from "axios";
import fs from "fs";
import FormData from "form-data";
import path from "path";
import os from "os";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function speechToText(fileInput: string | Buffer, mimeType: string = "audio/webm") {
  const buffer = Buffer.isBuffer(fileInput) ? fileInput : fs.readFileSync(fileInput);

  // If the buffer is extremely small (e.g., empty recording), don't send it
  if (buffer.length < 500) {
      return "";
  }

  // Sarvam strictly expects wav or mp3 formats. For browser WebM recordings, use Gemini STT natively.
  if (mimeType.includes("webm") || mimeType.includes("ogg")) {
      try {
          const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");
          const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
          const result = await model.generateContent([
              {
                  inlineData: {
                      data: buffer.toString("base64"),
                      mimeType: mimeType === "audio/webm" ? "audio/webm" : mimeType
                  }
              },
              { text: "Please transcribe this audio exactly as spoken. Return only the transcription, no additional commentary." }
          ]);
          return result.response.text().trim();
      } catch (geminiError) {
          console.error("Gemini STT Fallback Error:", geminiError);
          return "";
      }
  }

  const formData = new FormData();
  let tempFilePath = "";

  if (typeof fileInput === 'string') {
      formData.append("file", fs.createReadStream(fileInput));
  } else {
      const ext = mimeType.includes("mp3") ? "mp3" : mimeType.includes("wav") ? "wav" : "webm";
      tempFilePath = path.join(os.tmpdir(), `sarvam-${Date.now()}.${ext}`);
      fs.writeFileSync(tempFilePath, buffer);
      
      formData.append("file", fs.createReadStream(tempFilePath), {
          filename: `audio.${ext}`,
          contentType: mimeType
      });
  }

  formData.append("model", "saaras:v3");
  formData.append("language_code", "en-IN");

  try {
      const response = await axios.post(
        "https://api.sarvam.ai/speech-to-text",
        formData,
        {
          headers: {
            Authorization: `Bearer ${process.env.SARVAM_API_KEY}`,
            ...formData.getHeaders()
          }
        }
      );
      
      return response.data.transcript || response.data.text;
  } catch (error: any) {
      if (error.response?.data) {
          console.error("Sarvam STT Error Payload:", JSON.stringify(error.response.data));
      } else {
          console.error("Sarvam STT Error:", error.message);
      }
      throw error;
  } finally {
      if (tempFilePath && fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
      }
  }
}
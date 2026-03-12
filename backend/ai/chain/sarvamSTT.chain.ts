import axios from "axios";
import fs from "fs";
import FormData from "form-data";
import path from "path";
import os from "os";

export async function speechToText(fileInput: string | Buffer, mimeType: string = "audio/webm") {
  const formData = new FormData();
  let tempFilePath = "";

  if (typeof fileInput === 'string') {
      formData.append("file", fs.createReadStream(fileInput));
  } else {
      // Create a temporary file to guarantee Axios and FormData can stream the file correctly with boundaries
      const ext = mimeType.includes("mp3") ? "mp3" : mimeType.includes("wav") ? "wav" : "webm";
      tempFilePath = path.join(os.tmpdir(), `sarvam-${Date.now()}.${ext}`);
      fs.writeFileSync(tempFilePath, fileInput);
      
      // FormData parses streams robustly compared to raw buffers which can drop boundary headers
      formData.append("file", fs.createReadStream(tempFilePath), {
          filename: `audio.${ext}`,
          contentType: mimeType
      });
  }

  // Sarvam strictly expects the model and language code appended as form fields
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
  } finally {
      if (tempFilePath && fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
      }
  }
}

/*
This file defines a Speech-to-Text (STT) utility using Sarvam AI API.

Flow:
1. Accepts either a file path or audio buffer.
2. Converts input into a readable stream.
3. Wraps it in FormData for API upload.
4. Sends request to Sarvam STT API.
5. Returns the transcript text.
6. Cleans up temporary files if created.
*/

import axios from "axios"; // Used to make HTTP requests to Sarvam API
import fs from "fs"; // File system module to read/write files
import FormData from "form-data"; // Used to send multipart/form-data requests
import path from "path"; // Helps handle file paths
import os from "os"; // Provides OS-level utilities like temp directory

/*
This function converts speech (audio) into text using Sarvam AI.

Parameters:
- fileInput: can be a file path (string) OR a Buffer (binary audio data)
- mimeType: type of audio (default: webm)

Returns:
- transcript (string)
*/
export async function speechToText(fileInput: string | Buffer, mimeType: string = "audio/webm") {
    // Convert input into a buffer
    const buffer = Buffer.isBuffer(fileInput) ? fileInput : fs.readFileSync(fileInput);

    // If the audio is too small (likely empty), skip processing
    if (buffer.length < 2000) {
        return "";
    }

    // Create FormData to send file to API
    const formData = new FormData();
    let tempFilePath = ""; // Will store temp file path if buffer is used

    const cleanMimeType = (mimeType || "audio/webm").split(";")[0].trim().toLowerCase();
    const fileExt = cleanMimeType.includes("mp3") ? "mp3" : cleanMimeType.includes("wav") ? "wav" : "webm";

    // Case 1: If input is already a file path
    if (typeof fileInput === 'string') {
        // Directly append file stream to form data
        formData.append("file", fs.createReadStream(fileInput));
    } else {
        // Case 2: Input is a buffer → need to convert to a temp file

        // Create a temporary file path
        tempFilePath = path.join(os.tmpdir(), `sarvam-${Date.now()}.${fileExt}`);

        // Write buffer data to temp file
        fs.writeFileSync(tempFilePath, buffer);

        // Attach temp file as stream to form data
        formData.append("file", fs.createReadStream(tempFilePath), {
            filename: `audio.${fileExt}`, // File name sent to API
            contentType: cleanMimeType // MIME type of audio
        });
    }

    // Add required API parameters
    formData.append("model", "saaras:v3"); // STT model
    formData.append("language_code", "en-IN"); // Language setting
    formData.append("sample_rate", "16000"); // Prefer 16k on Sarvam

    try {
        // Send POST request to Sarvam STT API
        const response = await axios.post(
            "https://api.sarvam.ai/speech-to-text",
            formData,
            {
                headers: {
                    Authorization: `Bearer ${process.env.SARVAM_API_KEY}`, // API key from env
                    ...formData.getHeaders() // Required headers for multipart
                }
            }
        );

        // Return transcript (API may return either 'transcript' or 'text')
        return response.data.transcript || response.data.text;

    } catch (error: any) {

        // Handle API errors
        if (error.response?.data) {
            console.error("Sarvam STT Error Payload:", JSON.stringify(error.response.data));
        } else {
            console.error("Sarvam STT Error:", error.message);
        }
        throw error; // Re-throw error for upstream handling

    } finally {
        // Cleanup: delete temp file if created
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
        }
    }
}
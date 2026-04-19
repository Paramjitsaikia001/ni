import axios from "axios";
import fs from "fs";
import FormData from "form-data";
import path from "path";
import os from "os";
import { execFile } from "child_process";
import ffmpegPath from "ffmpeg-static";

function extractTranscript(payload: any): string {
    if (!payload) return "";

    const candidates = [
        payload.transcript,
        payload.text,
        payload.output_text,
        payload.result?.transcript,
        payload.result?.text,
        payload.data?.transcript,
        payload.data?.text,
        payload.results?.[0]?.transcript,
        payload.results?.[0]?.text
    ];

    for (const value of candidates) {
        if (typeof value === "string" && value.trim().length > 0) {
            return value.trim();
        }
    }
    return "";
}

function mimeToExt(mimeType: string): "wav" | "mp3" | "webm" {
    const cleanMimeType = (mimeType || "audio/webm").split(";")[0].trim().toLowerCase();
    if (cleanMimeType.includes("wav")) return "wav";
    if (cleanMimeType.includes("mp3") || cleanMimeType.includes("mpeg")) return "mp3";
    return "webm";
}

function isDurationLimitError(error: any): boolean {
    const msg = String(error?.response?.data?.error?.message || "").toLowerCase();
    return msg.includes("audio duration exceeds the maximum limit");
}

async function postToSarvam(fileInput: string | Buffer, mimeType: string): Promise<string> {
    const buffer = Buffer.isBuffer(fileInput) ? fileInput : fs.readFileSync(fileInput);
    if (buffer.length < 2000) {
        return "";
    }

    const formData = new FormData();
    let tempFilePath = "";
    const fileExt = mimeToExt(mimeType);
    const cleanMimeType = (mimeType || "audio/webm").split(";")[0].trim().toLowerCase();

    if (typeof fileInput === "string") {
        formData.append("file", fs.createReadStream(fileInput));
    } else {
        tempFilePath = path.join(os.tmpdir(), `sarvam-${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`);
        fs.writeFileSync(tempFilePath, buffer);
        formData.append("file", fs.createReadStream(tempFilePath), {
            filename: `audio.${fileExt}`,
            contentType: cleanMimeType,
        });
    }

    formData.append("model", "saaras:v3");
    formData.append("language_code", "en-IN");
    if (fileExt === "wav") {
        formData.append("sample_rate", "16000");
    }

    try {
        const response = await axios.post(
            "https://api.sarvam.ai/speech-to-text",
            formData,
            {
                headers: {
                    Authorization: `Bearer ${process.env.SARVAM_API_KEY}`,
                    ...formData.getHeaders(),
                },
            },
        );

        const transcript = extractTranscript(response.data);
        console.log("Sarvam STT:", transcript);
        if (!transcript) {
            try {
                console.warn("Sarvam STT empty transcript response keys:", Object.keys(response.data || {}));
            } catch {
                console.warn("Sarvam STT empty transcript and response payload is non-object");
            }
        }
        return transcript;
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

async function normalizeToWav16k(
    inputBuffer: Buffer,
    inputExt: "wav" | "mp3" | "webm",
): Promise<Buffer | null> {
    if (!ffmpegPath) return null;
    const ffmpegBinary = ffmpegPath as string;
    const tempIn = path.join(os.tmpdir(), `sarvam-norm-in-${Date.now()}-${Math.random().toString(36).slice(2)}.${inputExt}`);
    const tempOut = path.join(os.tmpdir(), `sarvam-norm-out-${Date.now()}-${Math.random().toString(36).slice(2)}.wav`);

    fs.writeFileSync(tempIn, inputBuffer);
    try {
        await new Promise<void>((resolve, reject) => {
            execFile(ffmpegBinary, [
                "-y",
                "-fflags", "+genpts",
                "-avoid_negative_ts", "make_zero",
                "-i", tempIn,
                "-vn",
                "-ac", "1",
                "-ar", "16000",
                "-c:a", "pcm_s16le",
                "-t", "28",
                tempOut,
            ], { timeout: 15000 }, (err, _stdout, stderr) => {
                if (err) {
                    reject(new Error(`FFmpeg normalize failed: ${String(err)} ${String(stderr || "").slice(-500)}`));
                    return;
                }
                resolve();
            });
        });
        if (!fs.existsSync(tempOut)) return null;
        return fs.readFileSync(tempOut);
    } catch (err) {
        console.warn("FFmpeg normalize fallback failed:", err);
        return null;
    } finally {
        if (fs.existsSync(tempIn)) fs.unlinkSync(tempIn);
        if (fs.existsSync(tempOut)) fs.unlinkSync(tempOut);
    }
}


export async function speechToText(fileInput: string | Buffer, mimeType: string = "audio/webm") {
    const buffer = Buffer.isBuffer(fileInput) ? fileInput : fs.readFileSync(fileInput);
    const fileExt = mimeToExt(mimeType);
    let requestBuffer = buffer;
    let requestMimeType = mimeType;

    // Primary path: normalize non-WAV uploads to WAV 16k first, then send to Sarvam.
    if (fileExt !== "wav") {
        const normalized = await normalizeToWav16k(buffer, fileExt);
        if (normalized && normalized.length >= 2000) {
            requestBuffer = normalized;
            requestMimeType = "audio/wav";
            console.log("Using normalized WAV 16k for Sarvam STT", {
                originalBytes: buffer.length,
                wavBytes: normalized.length,
                originalExt: fileExt,
            });
        } else {
            console.warn("WAV normalization unavailable, falling back to original input format", {
                originalBytes: buffer.length,
                originalExt: fileExt,
            });
        }
    }

    let transcript = "";
    let primaryError: any = null;
    try {
        transcript = await postToSarvam(requestBuffer, requestMimeType);
    } catch (err) {
        primaryError = err;
    }

    // If primary attempt failed due to duration constraints and we didn't already send WAV, normalize+retry.
    if (!transcript && primaryError && isDurationLimitError(primaryError) && requestMimeType !== "audio/wav") {
        const normalized = await normalizeToWav16k(buffer, fileExt);
        if (normalized && normalized.length >= 2000) {
            console.log("Retrying Sarvam STT after duration-limit error with normalized WAV", {
                originalBytes: buffer.length,
                wavBytes: normalized.length,
            });
            transcript = await postToSarvam(normalized, "audio/wav");
            return transcript;
        }
        throw primaryError;
    }

    if (!transcript && primaryError) {
        throw primaryError;
    }

    return transcript;
}

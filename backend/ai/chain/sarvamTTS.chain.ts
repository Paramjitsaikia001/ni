import axios, { type AxiosResponse } from "axios";

export async function sarvamTTS(text: string): Promise<Buffer> {
  const response: AxiosResponse<ArrayBuffer> = await axios.post(
    "https://api.sarvam.ai/text-to-speech",
    {
      text,
      voice: "bulbul:v3",
      output_format: "mp3",
      language_code: "en-IN",
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.SARVAM_API_KEY}`,
        "Content-Type": "application/json",
      },
      responseType: "arraybuffer",
      validateStatus: () => true,
    }
  );

  const contentType = response.headers["content-type"] || "";

  if (response.status >= 400 || contentType.includes("application/json")) {
    const textBody = Buffer.from(response.data).toString("utf-8");
    try {
        const json = JSON.parse(textBody);
        if (response.status === 200 && json.audios && json.audios.length > 0) {
            return Buffer.from(json.audios[0], "base64");
        }
    } catch (e) {
        // failed to parse json, fall through to error
    }
    console.error("Sarvam TTS error:", response.status, textBody);
    // console.log("Sarvam key:", process.env.SARVAM_API_KEY);
    throw new Error("Sarvam TTS failed; check SARVAM_API_KEY and request payload");
  }

  return Buffer.from(response.data);
}
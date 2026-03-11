import axios from "axios";
import fs from "fs";
import FormData from "form-data";

export async function speechToText(filePath: string) {

  const formData = new FormData();
  formData.append("file", fs.createReadStream(filePath));

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

  return response.data.text;
}
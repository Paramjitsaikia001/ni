import crypto from "crypto";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`${name} is missing`);
  }
  return value;
}

export async function uploadResumeToCloudinary(file: Express.Multer.File): Promise<string> {
  if (!file?.buffer?.length) {
    throw new Error("Resume file buffer is empty");
  }

  const cloudName = requiredEnv("CLOUDINARY_CLOUD_NAME");
  const apiKey = requiredEnv("CLOUDINARY_API_KEY");
  const apiSecret = requiredEnv("CLOUDINARY_API_SECRET");
  const folder = process.env.CLOUDINARY_RESUME_FOLDER || "hiregine/resumes";

  const timestamp = Math.floor(Date.now() / 1000);
  const signaturePayload = `access_mode=public&folder=${folder}&timestamp=${timestamp}&type=upload${apiSecret}`;
  const signature = crypto.createHash("sha1").update(signaturePayload).digest("hex");

  const form = new FormData();
  form.append("api_key", apiKey);
  form.append("timestamp", String(timestamp));
  form.append("folder", folder);
  form.append("type", "upload");
  form.append("access_mode", "public");
  form.append("signature", signature);
  form.append(
    "file",
    new Blob([new Uint8Array(file.buffer)], { type: file.mimetype || "application/pdf" }),
    file.originalname || `resume-${Date.now()}.pdf`
  );

  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`;
  const response = await fetch(endpoint, {
    method: "POST",
    body: form,
  });

  const payload = await response.json() as {
    secure_url?: string;
    error?: { message?: string };
  };

  if (!response.ok || !payload?.secure_url) {
    const reason = payload?.error?.message || `HTTP ${response.status}`;
    throw new Error(`Cloudinary upload failed: ${reason}`);
  }

  return payload.secure_url;
}

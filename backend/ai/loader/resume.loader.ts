import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { WebPDFLoader } from "@langchain/community/document_loaders/web/pdf";
import axios from "axios";

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function normalizeRemoteResumeUrl(input: string): string {
  const value = input.trim();
  try {
    const url = new URL(value);

    // Google Drive share URL -> direct download URL
    if (url.hostname.includes("drive.google.com")) {
      const fileIdMatch = url.pathname.match(/\/d\/([^/]+)/);
      const fileId = fileIdMatch?.[1] || url.searchParams.get("id");
      if (fileId) {
        return `https://drive.google.com/uc?export=download&id=${fileId}`;
      }
    }

    // Dropbox share URL -> direct download
    if (url.hostname.includes("dropbox.com")) {
      url.searchParams.set("dl", "1");
      return url.toString();
    }

    return url.toString();
  } catch {
    return value;
  }
}

async function fetchRemotePdfBuffer(url: string): Promise<Buffer> {
  const commonConfig = {
    responseType: "arraybuffer" as const,
    timeout: 30000,
    maxContentLength: 20 * 1024 * 1024,
    maxRedirects: 5,
    validateStatus: () => true,
  };

  const res1 = await axios.get<ArrayBuffer>(url, commonConfig);
  if (res1.status < 400) {
    return Buffer.from(res1.data);
  }

  // Optional fallback for protected object storage
  const bearer = process.env.RESUME_FETCH_BEARER_TOKEN;
  if (res1.status === 401 && bearer) {
    const res2 = await axios.get<ArrayBuffer>(url, {
      ...commonConfig,
      headers: { Authorization: `Bearer ${bearer}` },
    });
    if (res2.status < 400) {
      return Buffer.from(res2.data);
    }
  }

  // Optional fallback for basic-auth protected URLs
  const basicUser = process.env.RESUME_FETCH_BASIC_USER;
  const basicPass = process.env.RESUME_FETCH_BASIC_PASS;
  if (res1.status === 401 && basicUser && basicPass) {
    const auth = Buffer.from(`${basicUser}:${basicPass}`).toString("base64");
    const res3 = await axios.get<ArrayBuffer>(url, {
      ...commonConfig,
      headers: { Authorization: `Basic ${auth}` },
    });
    if (res3.status < 400) {
      return Buffer.from(res3.data);
    }
  }

  const host = (() => {
    try {
      return new URL(url).host;
    } catch {
      return "unknown-host";
    }
  })();
  throw new Error(`Failed to fetch resume from URL: HTTP ${res1.status} (${host}). Ensure URL is publicly readable or provide auth env vars.`);
}

export async function loadResumeFromBuffer(fileBuffer: Buffer): Promise<string> {
  const blob = new Blob([new Uint8Array(fileBuffer)], { type: "application/pdf" });
  const loader = new WebPDFLoader(blob, { splitPages: true });
  const docs = await loader.load();
  return docs.map((doc) => doc.pageContent).join("\n");
}

export async function loadResume(filePathOrUrl: string) {
  if (isHttpUrl(filePathOrUrl)) {
    const normalizedUrl = normalizeRemoteResumeUrl(filePathOrUrl);
    const fileBuffer = await fetchRemotePdfBuffer(normalizedUrl);
    return loadResumeFromBuffer(fileBuffer);
  }

  const loader = new PDFLoader(filePathOrUrl);

  const docs = await loader.load();

  const result = docs.map((doc) => doc.pageContent).join("\n");

  return result;
}

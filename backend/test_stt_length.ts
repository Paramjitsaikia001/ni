import { speechToText } from "./ai/chain/sarvamSTT.chain";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

async function run() {
    // create 10kb dummy webm
    const buffer = Buffer.alloc(10240, "a");
    try {
        console.log("Testing STT with WebM dummy...");
        await speechToText(buffer, "audio/webm");
        console.log("STT success!");
    } catch (e: any) {
        console.error("STT Error response:");
        if (e.request && e.request._contentLength) {
            console.error("Content-Length sent:", e.request._contentLength);
        }
        if (e.response && e.response.data) {
            console.error(JSON.stringify(e.response.data, null, 2));
        } else {
            console.error(e.message);
        }
    }
}

run();

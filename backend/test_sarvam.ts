import { sarvamTTS } from "./ai/chain/sarvamTTS.chain";
import { speechToText } from "./ai/chain/sarvamSTT.chain";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

async function run() {
    let ttsBuffer: Buffer | null = null;
    try {
        console.log("Testing TTS...");
        ttsBuffer = await sarvamTTS("Hello world, this is a test.");
        console.log(`TTS success! Received ${ttsBuffer.length} bytes.`);
        fs.writeFileSync("test.mp3", ttsBuffer);
    } catch (e: any) {
        console.error("TTS Error response:");
        if (e.response && e.response.data) {
            console.error(e.response.data.toString("utf8"));
        } else {
            console.error(e.message);
        }
    }

    if (ttsBuffer) {
        try {
            console.log("\nTesting STT with the MP3...");
            const sttText = await speechToText(ttsBuffer, "audio/mpeg");
            console.log("STT success! Transcript:", sttText);
        } catch (e: any) {
            console.error("STT Error response:");
            if (e.response && e.response.data) {
                console.error(JSON.stringify(e.response.data, null, 2));
            } else {
                console.error(e.message);
            }
        }
    }
}

run();

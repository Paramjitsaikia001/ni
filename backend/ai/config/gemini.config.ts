import "dotenv/config"
import {ChatGoogleGenerativeAI}  from "@langchain/google-genai"

const apiKey= process.env.GOOGLE_API_KEY 

if (!apiKey) {
    throw new Error("GOOGLE_API_KEY is not defined in environment variables")
}

export const genmodel = new ChatGoogleGenerativeAI(
    {
        model:"gemini-2.5-flash-lite",
        apiKey,
        temperature: 0.2,

    }
)

import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

if (!apiKey) {
  console.warn("GEMINI_API_KEY is not set. AI features will be disabled.");
}

export const ai = new GoogleGenAI({ apiKey: apiKey || "" });

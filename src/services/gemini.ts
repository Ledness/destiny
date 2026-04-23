import { GoogleGenAI } from "@google/genai";

export async function askGM(prompt: string) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    
    return response.text || "진행자가 침묵에 빠졌습니다...";
  } catch (error) {
    console.error("GM API Error:", error);
    return "진행자가 운명의 실타래를 놓쳤습니다. (AI 통신 오류)";
  }
}

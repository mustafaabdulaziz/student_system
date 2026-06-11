import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';

// Safely initialize the client only when needed to avoid crashes if env is missing during load
const getAiClient = () => {
  if (!apiKey) {
    console.warn("API_KEY is not set. Gemini features will not work.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generateUniversityDescription = async (name: string, country: string): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return "API Key missing. Cannot generate description.";

  try {
    const prompt = `Write a brief, engaging description (max 100 words) for a university named "${name}" located in ${country}. The description should be in Arabic, suitable for a student recruitment portal. Focus on academic excellence and student life.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "لم يتم العثور على وصف.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "حدث خطأ أثناء توليد الوصف.";
  }
};
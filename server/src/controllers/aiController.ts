
import { Request, Response } from 'express';
import { GoogleGenAI, Type } from "@google/genai";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Generate Vocabulary
export const generateVocabulary = async (req: Request, res: Response) => {
    const { level, category, targetLang, nativeLang, count } = req.body;
    const model = "gemini-2.0-flash-exp";

    const prompt = `You are an expert language teacher. 
    Task: Generate ${count} vocabulary terms for topic: '${category}'.
    Target: ${targetLang}, Native: ${nativeLang}, Level: ${level}.
    Output JSON Array with: word, translation, sentence, sentenceTranslation, visualParts (array of strings).`;

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            word: { type: Type.STRING },
                            translation: { type: Type.STRING },
                            sentence: { type: Type.STRING },
                            sentenceTranslation: { type: Type.STRING },
                            visualParts: { type: Type.ARRAY, items: { type: Type.STRING } }
                        }
                    }
                }
            }
        });
        res.json(JSON.parse(response.text || "[]"));
    } catch (error: any) {
        console.error("AI Error:", error);
        res.status(500).json({ message: "Failed to generate vocabulary" });
    }
};

// Generate Story
export const generateStory = async (req: Request, res: Response) => {
    const { level, topic, targetLang, nativeLang } = req.body;
    
    const prompt = `Write a short story about "${topic}" for level ${level}.
    Target: ${targetLang}. Translation: ${nativeLang}.
    Return JSON: { title, content, translation, vocabulary: [{word, meaning}], visualPrompt }`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash-exp",
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        res.json(JSON.parse(response.text || "{}"));
    } catch (error) {
        res.status(500).json({ message: "Failed to generate story" });
    }
};

// Generate TTS (Text-to-Speech)
// Note: This proxies the binary audio data
export const generateTTS = async (req: Request, res: Response) => {
    const { text, voiceName } = req.body;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash-exp",
            contents: [{ parts: [{ text: text }] }],
            config: {
                responseModalities: ["AUDIO"],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName || 'Kore' } } },
            },
        });
        
        const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (audioData) {
            res.json({ audio: audioData });
        } else {
            res.status(500).json({ message: "No audio generated" });
        }
    } catch (error) {
        res.status(500).json({ message: "TTS failed" });
    }
}

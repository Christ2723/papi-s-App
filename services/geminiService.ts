
import { GoogleGenAI, Type, FunctionDeclaration, Modality } from "@google/genai";
import { FlashcardData, Level, Category, Language, QuizQuestion, GrammarLesson, StoryData, ReadingEvaluation, SongData } from "../types";

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateImageForCard = async (description: string): Promise<string | null> => {
  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: description }],
        },
        config: {
            imageConfig: {
                aspectRatio: "1:1", // Square for sticker assets
            }
        }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            return `data:image/png;base64,${part.inlineData.data}`;
        }
    }
    return null;
  } catch (e) {
    console.error("Image gen error", e);
    return null;
  }
};

export const generateVocabulary = async (
  level: Level,
  category: Category | string,
  targetLang: Language,
  nativeLang: Language,
  includeSentences: boolean,
  count: number = 5
): Promise<FlashcardData[]> => {
  const model = "gemini-3-flash-preview";
  
  let contentInstruction = "";
  
  if (category === Category.Conversation) {
     contentInstruction = `Generate ${count} short role-plays. Word=Topic, Sentence=Dialogue.`;
  } else if (category === Category.Reading) {
     contentInstruction = `Generate ${count} reading passages.`;
  } else {
     contentInstruction = `Generate ${count} essential vocabulary terms related to the topic: '${category}'.`;
  }

  const prompt = `You are an expert language teacher. 
  Task: ${contentInstruction}
  
  CRITICAL LANGUAGE RULES:
  1. The 'word' and 'sentence' fields MUST be in ${targetLang}.
  2. The 'translation' and 'sentenceTranslation' fields MUST be in ${nativeLang}.
  3. Even if the topic '${category}' is provided in English, translate the concept and generate words in ${targetLang}.
  
  Level: ${level}.
  ${includeSentences ? "Include 'sentence' and 'sentenceTranslation'." : ""}
  
  VISUAL INSTRUCTION:
  For 'visualParts', break the concept down into 1 or 2 distinct, tangible elements that can be drawn separately.
  Example for "The cat sat on the mat": ["A cat sitting", "A floor mat"].
  Example for "Apple": ["A red apple"].
  If the concept is abstract, provide a metaphorical object.
  
  Output Format: Valid JSON Array.
  Item Properties:
  - word, translation, sentence, sentenceTranslation (strings)
  - visualParts: Array of strings (The isolated visual elements)`;

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
            },
            required: ["word", "translation", "visualParts"]
          }
        }
      }
    });

    const data = JSON.parse(response.text || "[]");
    
    // Process items
    const cards = await Promise.all(data.map(async (item: any, index: number) => {
        const generatedImages: string[] = [];
        
        // Professional, clean style - not childish
        const styleBase = "High-quality digital illustration, modern flat design style, clean lines, isolated subject on pure white background, professional, minimal shadow: ";

        if (item.visualParts && item.visualParts.length > 0) {
            // Limit to max 2 images to save time/resources
            const partsToGen = item.visualParts.slice(0, 2);
            
            const imagePromises = partsToGen.map((partDesc: string) => {
                return generateImageForCard(styleBase + partDesc);
            });
            
            const results = await Promise.all(imagePromises);
            results.forEach(img => {
                if(img) generatedImages.push(img);
            });
        }

        // Fallback: If no parts defined or generation failed, try generating based on the word itself
        if (generatedImages.length === 0) {
             const fallbackPrompt = styleBase + `A visual representation of ${item.word}`;
             const fallbackImg = await generateImageForCard(fallbackPrompt);
             if (fallbackImg) {
                 generatedImages.push(fallbackImg);
             } else {
                 // Final fallback if AI image gen completely fails
                 generatedImages.push(`https://placehold.co/400x400?text=${encodeURIComponent(item.word)}`);
             }
        }

        return {
            id: `${Date.now()}-${index}`,
            word: item.word,
            translation: item.translation,
            sentence: item.sentence,
            sentenceTranslation: item.sentenceTranslation,
            masteryLevel: 0,
            visualParts: item.visualParts,
            images: generatedImages,
            pronunciation: item.word
        };
    }));

    return cards;

  } catch (error) {
    console.error("Error generating vocabulary:", error);
    return [];
  }
};

export const translateSyllabus = async (
    targetLang: string,
    syllabusData: {
        vocab: string[],
        grammar: string[],
        conversations: string[],
        expressions: string[]
    }
) => {
    // If target is English, just return the original structure
    if (targetLang === 'English') return syllabusData;

    const prompt = `Translate the following language learning syllabus topics into ${targetLang}. 
    Ensure the translation is natural for a language curriculum title.
    
    Input JSON:
    ${JSON.stringify(syllabusData)}
    
    Output JSON with the same keys: vocab, grammar, conversations, expressions.
    Arrays must correspond 1-to-1 with the input.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        vocab: { type: Type.ARRAY, items: { type: Type.STRING } },
                        grammar: { type: Type.ARRAY, items: { type: Type.STRING } },
                        conversations: { type: Type.ARRAY, items: { type: Type.STRING } },
                        expressions: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ["vocab", "grammar", "conversations", "expressions"]
                }
            }
        });
        
        return JSON.parse(response.text || "null");
    } catch (e) {
        console.error("Syllabus translation failed", e);
        return syllabusData; // Fallback to English
    }
}

export const generateGrammarLesson = async (
    topic: string, 
    level: Level, 
    targetLang: Language, 
    nativeLang: Language
): Promise<GrammarLesson | null> => {
    const prompt = `Create a comprehensive grammar lesson for "${topic}".
    Target: ${targetLang} (Level ${level}). Native: ${nativeLang}.
    Style: Professional, clear, modern.
    
    Structure:
    1. Title, Subtitle, Quick Summary.
    2. Sections (Rules).
    3. Examples (4-6): Distinct nuances, correct usage.
    4. practiceCards (5 items):
       - Create 5 Flashcard-style exercises.
       - 'word': A sentence with a blank or a challenge question (e.g., "If I _____ (be) you...").
       - 'translation': The correct Answer/Keyword (e.g., "were").
       - 'sentence': The full, correct sentence.
       - 'visualParts': A simple visual description for the card.
    
    JSON Schema:
    - visualParts (for Hero): Array of strings.
    - sections: Array of rules.
    - examples: Array of usage scenarios.
    - practiceCards: Array of FlashcardData objects.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        subtitle: { type: Type.STRING },
                        quickSummary: { type: Type.STRING },
                        visualParts: { type: Type.ARRAY, items: { type: Type.STRING } },
                        sections: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING },
                                    points: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    style: { type: Type.STRING, enum: ['neutral', 'warning', 'tip'] }
                                },
                                required: ['title', 'points', 'style']
                            }
                        },
                        examples: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    context: { type: Type.STRING },
                                    sentence: { type: Type.STRING },
                                    translation: { type: Type.STRING },
                                    visualParts: { type: Type.ARRAY, items: { type: Type.STRING } }
                                },
                                required: ['context', 'sentence', 'translation', 'visualParts']
                            }
                        },
                        practiceCards: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    word: { type: Type.STRING },
                                    translation: { type: Type.STRING },
                                    sentence: { type: Type.STRING },
                                    visualParts: { type: Type.ARRAY, items: { type: Type.STRING } }
                                },
                                required: ['word', 'translation', 'sentence', 'visualParts']
                            }
                        }
                    },
                    required: ["title", "subtitle", "quickSummary", "visualParts", "sections", "examples", "practiceCards"]
                }
            }
        });
        
        const lesson = JSON.parse(response.text || "null");

        if (lesson) {
            const styleBase = "High-quality editorial illustration, modern style, clean, isolated on white background: ";

            // Hero Images
            const heroImages: string[] = [];
            if (lesson.visualParts) {
                 const heroPrompts = lesson.visualParts.slice(0, 2).map((p: string) => 
                    `${styleBase}${p}`
                 );
                 const results = await Promise.all(heroPrompts.map(generateImageForCard));
                 results.forEach(img => { if(img) heroImages.push(img); });
            }
            lesson.heroImages = heroImages;

            // Example Images
            const examplePromises = lesson.examples.map(async (ex: any) => {
                 const images: string[] = [];
                 if (ex.visualParts && ex.visualParts.length > 0) {
                     const partPrompts = ex.visualParts.slice(0, 2).map((p: string) => 
                        `${styleBase}${p}`
                     );
                     const results = await Promise.all(partPrompts.map(generateImageForCard));
                     results.forEach(img => { if(img) images.push(img); });
                 }
                 if (images.length === 0) {
                     const fallbackImg = await generateImageForCard(`${styleBase}Illustration of: ${ex.sentence}`);
                     if (fallbackImg) images.push(fallbackImg);
                 }
                 return { ...ex, images };
            });
            lesson.examples = await Promise.all(examplePromises);

            // Practice Card Images (Process them like flashcards)
            const practicePromises = lesson.practiceCards.map(async (card: any, idx: number) => {
                const images: string[] = [];
                if (card.visualParts && card.visualParts.length > 0) {
                    const partPrompts = card.visualParts.slice(0, 1).map((p: string) => 
                        `${styleBase}${p}`
                    );
                    const results = await Promise.all(partPrompts.map(generateImageForCard));
                    results.forEach(img => { if(img) images.push(img); });
                } else {
                     const fallbackImg = await generateImageForCard(`${styleBase}Illustration related to: ${card.word}`);
                     if (fallbackImg) images.push(fallbackImg);
                }
                return {
                    ...card,
                    id: `practice-${Date.now()}-${idx}`,
                    images: images,
                    masteryLevel: 0,
                    pronunciation: card.sentence
                };
            });
            lesson.practiceCards = await Promise.all(practicePromises);
        }

        return lesson;

    } catch (e) {
        console.error("Grammar Gen Error", e);
        return null;
    }
}

export const generateQuiz = async (
    level: Level, 
    targetLang: Language, 
    count: number = 5
): Promise<QuizQuestion[]> => {
    const prompt = `Generate ${count} multiple choice questions for ${targetLang} Level ${level}.`;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            question: { type: Type.STRING },
                            options: { type: Type.ARRAY, items: { type: Type.STRING } },
                            correctAnswer: { type: Type.INTEGER },
                            explanation: { type: Type.STRING }
                        },
                        required: ["question", "options", "correctAnswer", "explanation"]
                    }
                }
            }
        });
        return JSON.parse(response.text || "[]");
    } catch (e) {
        return [];
    }
}

export const generateStory = async (
    level: Level, 
    targetLang: Language, 
    nativeLang: Language, 
    topic?: string
): Promise<StoryData | null> => {
    const topicPrompt = topic ? `Topic: ${topic}` : "Topic: Surprise me (Be creative and engaging)";
    const prompt = `Write an engaging short story for language learners.
    ${topicPrompt}
    Target Language: ${targetLang}
    Level: ${level}
    Native Language for translation: ${nativeLang}
    
    Requirements:
    1. Title in ${targetLang}.
    2. Interesting plot suitable for the level.
    3. Highlight 5-8 key vocabulary words used in the text.
    4. Provide a full translation.
    5. 'visualPrompt': A detailed description for a cover image for this story.
    
    Output JSON.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        content: { type: Type.STRING },
                        translation: { type: Type.STRING },
                        vocabulary: { 
                            type: Type.ARRAY, 
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    word: { type: Type.STRING },
                                    meaning: { type: Type.STRING }
                                },
                                required: ['word', 'meaning']
                            }
                        },
                        visualPrompt: { type: Type.STRING }
                    },
                    required: ["title", "content", "translation", "vocabulary", "visualPrompt"]
                }
            }
        });

        const storyData = JSON.parse(response.text || "null");

        if (storyData && storyData.visualPrompt) {
            // Generate Cover Image
            const coverStyle = "Storybook illustration, detailed, atmospheric, digital art style: ";
            const image = await generateImageForCard(coverStyle + storyData.visualPrompt);
            if (image) storyData.image = image;
        }

        return storyData;

    } catch (e) {
        console.error("Story Gen Error", e);
        return null;
    }
}

export const searchSong = async (
    query: string,
    targetLang: Language,
    nativeLang: Language,
    isKaraokeMode: boolean
): Promise<SongData | null> => {
    try {
        // Step 1: Get Metadata & Lyrics
        const lyricsPrompt = `You are a music expert.
        User Query: "${query}"
        
        1. Identify the most likely song.
        2. Provide the Title and Artist.
        3. Provide the full lyrics in ${targetLang}.
        4. Translate lyrics to ${nativeLang} line-by-line.

        Return valid JSON.`;

        const lyricsResponse = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: lyricsPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        artist: { type: Type.STRING },
                        lyrics: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    original: { type: Type.STRING },
                                    translation: { type: Type.STRING }
                                },
                                required: ['original', 'translation']
                            }
                        }
                    },
                    required: ["title", "artist", "lyrics"]
                }
            }
        });

        const songData = JSON.parse(lyricsResponse.text || "null");
        if (!songData) return null;

        // Step 2: Get Video - Optimized for Karaoke/Practice
        let searchInstruction = "";
        if (isKaraokeMode) {
            searchInstruction = `Find a **Karaoke** or **Instrumental with Lyrics** version of "${songData.title}" by "${songData.artist}". 
            Prioritize videos by channels like 'Sing King', 'Karaoke Version', etc. that are not VEVO restricted.`;
        } else {
            searchInstruction = `Find the official lyric video or official audio for "${songData.title}" by "${songData.artist}".`;
        }

        const searchPrompt = `${searchInstruction}
        IMPORTANT: Output the full YouTube URL in your text response.`;

        const searchResponse = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: searchPrompt,
            config: {
                tools: [{ googleSearch: {} }]
            }
        });

        let youtubeId = "";
        
        const extractId = (url: string) => {
            const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
            const match = url.match(regExp);
            return (match && match[7].length === 11) ? match[7] : null;
        };

        const chunks = searchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        for (const chunk of chunks) {
            if (chunk.web?.uri) {
                const id = extractId(chunk.web.uri);
                if (id) {
                    youtubeId = id;
                    break;
                }
            }
        }

        if (!youtubeId && searchResponse.text) {
             const urlRegex = /(https?:\/\/[^\s]+)/g;
             const urls = searchResponse.text.match(urlRegex);
             if (urls) {
                 for(const url of urls) {
                     const id = extractId(url);
                     if(id) {
                         youtubeId = id;
                         break;
                     }
                 }
             }
        }

        return {
            ...songData,
            youtubeId: youtubeId 
        };

    } catch(e) {
        console.error("Song Search Error", e);
        return null;
    }
}

export const editImageWithGemini = async (imageBase64: string, prompt: string): Promise<string | null> => {
    try {
        const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { inlineData: { data: cleanBase64, mimeType: 'image/png' } },
                    { text: prompt }
                ]
            }
        });
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
        }
        return null;
    } catch (e) {
        return null;
    }
}

export const generateTts = async (text: string, voiceName: string = 'Kore'): Promise<string | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } } },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch (error) {
    return null;
  }
};

export const analyzePronunciation = async (audioBase64: string, referenceText: string, targetLang: string) => {
    const prompt = `You are a strict language tutor. The user is reading the following text in ${targetLang}:
    "${referenceText}"
    
    Listen to the audio. 
    1. Give a score from 0 to 100 based on pronunciation accuracy and fluency.
    2. Provide a 1-sentence supportive feedback summary.
    3. List up to 3 specific words they mispronounced or could improve, with tips on how to say them.
    
    Return JSON.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: {
                parts: [
                    { inlineData: { data: audioBase64, mimeType: "audio/webm" } }, // Browser recorder typically defaults to webm
                    { text: prompt }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        score: { type: Type.INTEGER },
                        feedback: { type: Type.STRING },
                        improvementWords: { 
                            type: Type.ARRAY, 
                            items: { 
                                type: Type.OBJECT,
                                properties: {
                                    word: { type: Type.STRING },
                                    tip: { type: Type.STRING }
                                }
                            }
                        }
                    }
                }
            }
        });
        return JSON.parse(response.text || "null");
    } catch (e) {
        console.error("Pronunciation Analysis Error", e);
        return null;
    }
};

export const evaluateSentenceReading = async (audioBase64: string, sentence: string, targetLang: string): Promise<ReadingEvaluation | null> => {
    const prompt = `You are a strict pronunciation engine.
    Target Sentence: "${sentence}" in ${targetLang}.
    
    Task: Analyze the user's reading.
    1. Score (0-100). High scores require correct intonation and clear phonemes.
    2. Analyze EXACTLY the words present in the sentence.
    
    Return JSON:
    - score: number
    - feedback: string (1 sentence)
    - wordAnalysis: Array of objects.
      - word: The word from the sentence.
      - status: 'correct' | 'incorrect' | 'needs_improvement'
      - issue: Short description of the error if incorrect (optional).`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: {
                parts: [
                    { inlineData: { data: audioBase64, mimeType: "audio/webm" } },
                    { text: prompt }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        score: { type: Type.INTEGER },
                        feedback: { type: Type.STRING },
                        wordAnalysis: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    word: { type: Type.STRING },
                                    status: { type: Type.STRING, enum: ['correct', 'incorrect', 'needs_improvement'] },
                                    issue: { type: Type.STRING }
                                },
                                required: ['word', 'status']
                            }
                        }
                    },
                    required: ['score', 'feedback', 'wordAnalysis']
                }
            }
        });
        return JSON.parse(response.text || "null");
    } catch(e) {
        console.error("Reading Eval Error", e);
        return null;
    }
};

export const generatePracticeSentence = async (difficulty: number, targetLang: Language, nativeLang: Language): Promise<{sentence: string, translation: string} | null> => {
    const prompt = `Generate ONE single sentence for reading practice in ${targetLang}.
    Difficulty Level: ${difficulty} (1 = Simple SVO, 10 = Complex Academic/Literary).
    Translation Language: ${nativeLang}.
    
    Return JSON: { sentence, translation }`;

    try {
        const response = await ai.models.generateContent({
             model: "gemini-3-flash-preview",
             contents: prompt,
             config: {
                 responseMimeType: "application/json",
                 responseSchema: {
                     type: Type.OBJECT,
                     properties: {
                         sentence: { type: Type.STRING },
                         translation: { type: Type.STRING }
                     },
                     required: ['sentence', 'translation']
                 }
             }
        });
        return JSON.parse(response.text || "null");
    } catch(e) {
        return null;
    }
}

export const connectLiveSession = async (
    targetLang: string,
    nativeLang: string,
    onOpen: () => void,
    onMessage: (message: any) => void,
    onClose: () => void,
    onError: (e: any) => void
) => {
    return await ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
            systemInstruction: `You are a friendly tutor. Practice ${targetLang} with the user. Native: ${nativeLang}.`,
            inputAudioTranscription: {},
            outputAudioTranscription: {},
        },
        callbacks: { onopen: onOpen, onmessage: onMessage, onclose: onClose, onerror: onError }
    });
}
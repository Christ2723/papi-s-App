import React, { useState, useRef, useEffect } from 'react';
import { Feather, BookOpen, Sparkles, Volume2, Globe, Loader2, Mic, StopCircle, CheckCircle2, AlertCircle } from 'lucide-react';
import { Level, Language, StoryData } from '../types';
import { generateStory, generateTts, analyzePronunciation } from '../services/geminiService';
import { playPcmAudio } from '../services/audioUtils';

interface StoryFactoryProps {
    level: Level;
    targetLang: Language;
    nativeLang: Language;
    onStoryGenerated?: (story: StoryData | null) => void;
    preloadedStory?: StoryData | null; // Added prop
}

interface PronunciationResult {
    score: number;
    feedback: string;
    improvementWords?: { word: string; tip: string }[];
}

export const StoryFactory: React.FC<StoryFactoryProps> = ({ level, targetLang, nativeLang, onStoryGenerated, preloadedStory }) => {
    const [topic, setTopic] = useState("");
    const [story, setStory] = useState<StoryData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showTranslation, setShowTranslation] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    
    // Recording State
    const [isRecording, setIsRecording] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [feedback, setFeedback] = useState<PronunciationResult | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    useEffect(() => {
        if(preloadedStory) {
            setStory(preloadedStory);
        }
    }, [preloadedStory]);

    const handleGenerate = async () => {
        setIsLoading(true);
        setStory(null);
        setFeedback(null);
        if(onStoryGenerated) onStoryGenerated(null);
        
        const data = await generateStory(level, targetLang, nativeLang, topic);
        setStory(data);
        if(onStoryGenerated) onStoryGenerated(data);
        setIsLoading(false);
    };

    const handlePlayAudio = async () => {
        if (!story || isPlaying) return;
        setIsPlaying(true);
        const audio = await generateTts(story.content);
        if (audio) {
            await playPcmAudio(audio);
        }
        setIsPlaying(false);
    }

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                // Stop tracks
                stream.getTracks().forEach(track => track.stop());
                
                await analyzeAudio(audioBlob);
            };

            mediaRecorder.start();
            setIsRecording(true);
            setFeedback(null); // Clear previous
        } catch (e) {
            console.error("Error accessing microphone", e);
            alert("Could not access microphone.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const analyzeAudio = async (blob: Blob) => {
        if (!story) return;
        setIsAnalyzing(true);
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
            const base64Audio = (reader.result as string).split(',')[1];
            const result = await analyzePronunciation(base64Audio, story.content, targetLang);
            setFeedback(result);
            setIsAnalyzing(false);
        };
    };

    return (
        <div className="flex h-full flex-col md:flex-row bg-transparent">
            {/* Control Panel - Left Side (Only if not preloaded) */}
            {!preloadedStory && (
            <div className="w-full md:w-1/3 p-8 border-r border-zinc-900 flex flex-col gap-6 bg-black">
                <div className="flex items-center gap-3 text-white mb-2">
                    <div className="p-3 bg-zinc-800 rounded-2xl text-zinc-300">
                        <Feather className="w-6 h-6" />
                    </div>
                    <h2 className="text-2xl font-black tracking-tight">Story Teller</h2>
                </div>
                <p className="text-zinc-500 text-sm font-bold leading-relaxed">
                    Create engaging short stories tailored to Level {level}. Enter a topic or leave blank for a surprise.
                </p>

                <div className="space-y-4">
                    <div className="relative">
                        <textarea 
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="Ex: A lonely robot finding a flower in space..."
                            className="w-full p-5 bg-zinc-900 border border-zinc-800 rounded-3xl focus:ring-4 focus:ring-teal-900 focus:border-teal-700 outline-none text-white placeholder-zinc-600 h-40 resize-none font-medium shadow-inner"
                        />
                    </div>
                    
                    <button 
                        onClick={handleGenerate}
                        disabled={isLoading}
                        className="w-full py-4 bg-white hover:bg-zinc-200 text-black rounded-2xl font-bold shadow-lg shadow-white/10 transition transform active:scale-95 flex items-center justify-center gap-2"
                    >
                        {isLoading ? <Loader2 className="animate-spin" /> : <Sparkles size={20} />}
                        {isLoading ? "Weaving Story..." : "Generate Story"}
                    </button>
                </div>

                {story && story.vocabulary.length > 0 && (
                    <div className="mt-6 p-6 bg-zinc-900 rounded-3xl border border-zinc-800 flex-1 overflow-y-auto custom-scrollbar shadow-inner">
                        <h3 className="font-bold text-zinc-400 mb-4 flex items-center gap-2 uppercase text-xs tracking-widest">
                            <BookOpen size={14}/> Key Vocabulary
                        </h3>
                        <ul className="space-y-3">
                            {story.vocabulary.map((vocab, i) => (
                                <li key={i} className="flex flex-col border-b border-zinc-800 pb-2 last:border-0">
                                    <span className="font-bold text-teal-400 text-lg">{vocab.word}</span>
                                    <span className="text-sm text-zinc-500 italic">{vocab.meaning}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
            )}

            {/* If preloaded, show Vocabulary on the left in a slimmer view or integrated? 
                For consistency with ClassProgram, we'll keep the vocab list on the left if preloaded but without input fields 
            */}
            {preloadedStory && story && story.vocabulary.length > 0 && (
                 <div className="w-80 p-8 border-r border-zinc-200 flex flex-col gap-6 bg-zinc-50 overflow-hidden">
                    <h3 className="font-black text-teal-700 mb-4 flex items-center gap-2 uppercase text-xs tracking-widest">
                        <BookOpen size={18}/> Story Keywords
                    </h3>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                         <ul className="space-y-4">
                            {story.vocabulary.map((vocab, i) => (
                                <li key={i} className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                                    <span className="font-bold text-teal-600 text-lg block">{vocab.word}</span>
                                    <span className="text-sm text-zinc-500 italic">{vocab.meaning}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                 </div>
            )}

            {/* Story Display - Right Side */}
            <div className="flex-1 p-8 md:p-12 overflow-y-auto custom-scrollbar relative">
                {isLoading ? (
                    <div className="h-full flex flex-col items-center justify-center text-teal-800/40">
                        <div className="bg-white/30 p-8 rounded-full mb-6 animate-pulse">
                            <Feather size={64} />
                        </div>
                        <p className="font-serif italic text-2xl font-light">Once upon a time...</p>
                    </div>
                ) : story ? (
                    <div className="max-w-3xl mx-auto bg-white/90 backdrop-blur-md p-8 md:p-12 rounded-[2.5rem] shadow-2xl border border-white/50 animate-in slide-in-from-bottom-8 duration-700 mb-20">
                        {story.image && (
                            <div className="w-full h-64 md:h-80 mb-10 rounded-3xl overflow-hidden shadow-lg transform hover:scale-[1.02] transition duration-700">
                                <img src={story.image} alt="Story cover" className="w-full h-full object-cover" />
                            </div>
                        )}
                        
                        <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-4">
                            <h1 className="text-4xl md:text-5xl font-black text-teal-950 font-serif leading-tight">{story.title}</h1>
                            <div className="flex gap-2 shrink-0">
                                {/* Recording Control */}
                                <button
                                    onClick={isRecording ? stopRecording : startRecording}
                                    disabled={isAnalyzing}
                                    className={`p-3 rounded-full transition flex items-center justify-center border-2 
                                    ${isRecording 
                                        ? 'bg-red-500 border-red-600 text-white animate-pulse shadow-red-300 shadow-lg' 
                                        : 'bg-white border-teal-100 text-teal-600 hover:bg-teal-50 hover:border-teal-200'}`}
                                    title={isRecording ? "Stop Recording" : "Read Aloud"}
                                >
                                    {isRecording ? <StopCircle size={22} fill="currentColor" /> : <Mic size={22} />}
                                </button>

                                <button 
                                    onClick={() => setShowTranslation(!showTranslation)}
                                    className={`p-3 rounded-full transition border-2 border-transparent ${showTranslation ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-400 hover:bg-teal-50'}`}
                                    title="Toggle Translation"
                                >
                                    <Globe size={22} />
                                </button>
                                <button 
                                    onClick={handlePlayAudio}
                                    className={`p-3 rounded-full transition border-2 border-transparent ${isPlaying ? 'bg-teal-600 text-white animate-pulse' : 'bg-teal-100 text-teal-700 hover:bg-teal-200'}`}
                                    title="Listen to Story"
                                >
                                    {isPlaying ? <Loader2 className="animate-spin" size={22}/> : <Volume2 size={22} />}
                                </button>
                            </div>
                        </div>

                        {/* Analysis Feedback Panel */}
                        {(isAnalyzing || feedback) && (
                            <div className="mb-8 p-6 bg-white/60 rounded-3xl border border-teal-200/50 shadow-xl animate-in fade-in zoom-in duration-300">
                                {isAnalyzing ? (
                                    <div className="flex items-center gap-3 text-teal-700 font-bold">
                                        <Loader2 className="animate-spin" />
                                        <span>Analyzing your pronunciation...</span>
                                    </div>
                                ) : feedback && (
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="text-sm font-black text-teal-800 uppercase tracking-widest flex items-center gap-2">
                                                <Sparkles size={16}/> Performance
                                            </h4>
                                            <div className={`px-4 py-1 rounded-full text-sm font-black text-white ${feedback.score >= 80 ? 'bg-green-500' : feedback.score >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}>
                                                {feedback.score}/100
                                            </div>
                                        </div>
                                        <p className="text-teal-900 font-medium mb-4">{feedback.feedback}</p>
                                        
                                        {feedback.improvementWords && feedback.improvementWords.length > 0 && (
                                            <div className="space-y-2">
                                                <p className="text-xs font-bold text-teal-500 uppercase">Focus on:</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {feedback.improvementWords.map((item, idx) => (
                                                        <div key={idx} className="bg-white px-3 py-2 rounded-xl border border-teal-100 text-sm flex items-center gap-2 shadow-sm">
                                                            <span className="font-bold text-red-500 line-through decoration-2">{item.word}</span>
                                                            <span className="text-gray-400">→</span>
                                                            <span className="text-teal-700 font-medium italic">{item.tip}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="prose prose-xl prose-teal text-slate-700 font-serif leading-loose whitespace-pre-line">
                            {story.content}
                        </div>

                        {showTranslation && (
                            <div className="mt-10 pt-10 border-t-2 border-dashed border-teal-100 animate-in fade-in slide-in-from-top-4">
                                <h4 className="text-xs font-black text-teal-400 uppercase tracking-widest mb-4">Translation</h4>
                                <div className="prose prose-lg text-slate-500 font-serif italic leading-relaxed whitespace-pre-line">
                                    {story.translation}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-teal-900 opacity-20">
                        <BookOpen size={120} className="mb-6" />
                        <h3 className="text-4xl font-black tracking-tight">Your story awaits</h3>
                    </div>
                )}
            </div>
        </div>
    );
};
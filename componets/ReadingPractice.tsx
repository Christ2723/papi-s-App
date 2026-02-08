import React, { useState, useEffect, useRef } from 'react';
import { Mic, StopCircle, ArrowRight, RefreshCcw, Loader2, Sparkles, Volume2, Globe } from 'lucide-react';
import { ReadingEvaluation, Language } from '../types';
import { generatePracticeSentence, evaluateSentenceReading, generateTts } from '../services/geminiService';
import { playPcmAudio } from '../services/audioUtils';

interface ReadingPracticeProps {
    targetLang: Language;
    nativeLang: Language;
}

export const ReadingPractice: React.FC<ReadingPracticeProps> = ({ targetLang, nativeLang }) => {
    const [difficulty, setDifficulty] = useState(1);
    const [sentenceData, setSentenceData] = useState<{sentence: string, translation: string} | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    // Recording & Evaluation
    const [isRecording, setIsRecording] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [evaluation, setEvaluation] = useState<ReadingEvaluation | null>(null);
    
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    useEffect(() => {
        loadNewSentence(difficulty);
    }, []);

    const loadNewSentence = async (diff: number) => {
        setIsLoading(true);
        setEvaluation(null);
        setSentenceData(null);
        const data = await generatePracticeSentence(diff, targetLang, nativeLang);
        setSentenceData(data);
        setIsLoading(false);
    };

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
                stream.getTracks().forEach(track => track.stop());
                await analyze(audioBlob);
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (e) {
            alert("Microphone access failed");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const analyze = async (blob: Blob) => {
        if (!sentenceData) return;
        setIsAnalyzing(true);
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
            const base64Audio = (reader.result as string).split(',')[1];
            const result = await evaluateSentenceReading(base64Audio, sentenceData.sentence, targetLang);
            setEvaluation(result);
            setIsAnalyzing(false);
        };
    };

    const handleNext = () => {
        if (!evaluation) return;
        
        let nextDiff = difficulty;
        if (evaluation.score >= 90 && difficulty < 10) {
            nextDiff += 1;
        }
        
        setDifficulty(nextDiff);
        loadNewSentence(nextDiff);
    };
    
    const playSentenceAudio = async () => {
        if(!sentenceData) return;
        const audio = await generateTts(sentenceData.sentence);
        if(audio) await playPcmAudio(audio);
    }

    const renderSentence = () => {
        if (!sentenceData) return null;
        if (!evaluation) return <h1 className="text-4xl font-bold text-gray-800 text-center leading-relaxed">{sentenceData.sentence}</h1>;

        // Split sentence to match words (simple split, can be improved with smarter regex in future)
        const words = sentenceData.sentence.split(' ');
        
        return (
            <h1 className="text-4xl font-bold text-center leading-relaxed flex flex-wrap justify-center gap-2">
                {words.map((word, idx) => {
                    const cleanWord = word.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g,"");
                    const analysis = evaluation.wordAnalysis.find(w => w.word.toLowerCase().includes(cleanWord.toLowerCase()) || cleanWord.toLowerCase().includes(w.word.toLowerCase()));
                    
                    let colorClass = "text-gray-800";
                    if (analysis) {
                        if (analysis.status === 'incorrect') colorClass = "text-red-500 line-through decoration-red-300 decoration-4";
                        else if (analysis.status === 'needs_improvement') colorClass = "text-amber-500 underline decoration-amber-300 decoration-wavy";
                        else if (analysis.status === 'correct') colorClass = "text-green-600";
                    }

                    return (
                        <span key={idx} className={colorClass}>
                            {word}
                        </span>
                    );
                })}
            </h1>
        );
    };

    const passed = evaluation && evaluation.score >= 90;

    return (
        <div className="flex flex-col h-full bg-transparent p-8">
            <div className="max-w-4xl mx-auto w-full flex flex-col h-full">
                
                {/* Header */}
                <div className="flex justify-between items-center mb-8 bg-white/50 backdrop-blur-sm p-4 rounded-2xl">
                    <div className="flex items-center gap-2">
                        <span className="bg-lime-500 text-white px-3 py-1 rounded-lg font-black text-xs uppercase tracking-widest">Difficulty {difficulty}</span>
                        <span className="text-lime-800 font-bold text-sm">Pronunciation Studio</span>
                    </div>
                    {evaluation && (
                        <div className={`px-6 py-2 rounded-full font-black text-xl ${passed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                            {evaluation.score}%
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col items-center justify-center bg-white/80 backdrop-blur-xl rounded-[3rem] shadow-xl p-12 border border-white/50 relative overflow-hidden">
                    
                    {isLoading ? (
                        <div className="flex flex-col items-center text-lime-600">
                             <Loader2 size={48} className="animate-spin mb-4"/>
                             <p className="font-bold animate-pulse">Fetching sentence...</p>
                        </div>
                    ) : (
                        <div className="w-full flex flex-col items-center gap-10">
                            <div className="bg-lime-50 p-10 rounded-3xl w-full text-center relative">
                                {renderSentence()}
                                <div className="mt-6 text-gray-400 font-medium text-lg italic">{sentenceData?.translation}</div>
                                <button onClick={playSentenceAudio} className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-sm text-lime-600 hover:bg-lime-100">
                                    <Volume2 size={20}/>
                                </button>
                            </div>

                            {/* Feedback Message */}
                            {evaluation && (
                                <div className={`p-4 rounded-xl text-center font-medium ${passed ? 'bg-green-100 text-green-800' : 'bg-red-50 text-red-800'}`}>
                                    {evaluation.feedback}
                                </div>
                            )}

                            {/* Controls */}
                            <div className="flex items-center gap-6">
                                <button 
                                    onClick={isRecording ? stopRecording : startRecording}
                                    disabled={isAnalyzing || passed}
                                    className={`w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-all transform hover:scale-105 ${
                                        isRecording ? 'bg-red-500 text-white animate-pulse ring-4 ring-red-200' : 
                                        passed ? 'bg-gray-200 text-gray-400 cursor-not-allowed' :
                                        'bg-lime-500 text-white hover:bg-lime-600 ring-4 ring-lime-100'
                                    }`}
                                >
                                    {isRecording ? <StopCircle size={40} fill="currentColor"/> : <Mic size={40}/>}
                                </button>
                                
                                {isAnalyzing && <div className="text-lime-600 font-bold animate-pulse">Analyzing...</div>}

                                <button 
                                    onClick={handleNext}
                                    disabled={!passed}
                                    className={`px-8 py-4 rounded-2xl font-black flex items-center gap-3 transition-all ${
                                        passed ? 'bg-gray-900 text-white shadow-xl hover:bg-black hover:-translate-y-1' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    }`}
                                >
                                    Next Sentence <ArrowRight size={20}/>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                
                {!passed && sentenceData && !isLoading && (
                    <div className="text-center mt-6 text-gray-500 text-sm font-bold uppercase tracking-widest">
                        Read correctly to proceed
                    </div>
                )}
            </div>
        </div>
    );
};
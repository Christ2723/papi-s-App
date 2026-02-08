
import React, { useState, useEffect } from 'react';
import { Sparkles, BookOpen, GraduationCap, Feather, FileQuestion, Play, CheckCircle2, X, ChevronRight, ChevronLeft, Layers, Layout, Loader2, ArrowRight, List, Type, Check, LogOut, FileText, Presentation, Monitor, Minimize, Eye, MessageCircle, Quote, Map, Ship } from 'lucide-react';
import { Level, Language, FlashcardData, GrammarLesson, StoryData, QuizQuestion } from '../types';
import { generateVocabulary, generateGrammarLesson, generateStory, generateQuiz } from '../services/geminiService';
import { Flashcard } from './Flashcard';
import { GrammarStudio } from './GrammarStudio';
import { StoryFactory } from './StoryFactory';
import { ExamRoom } from './ExamRoom';
import { LESSON_PLAN } from '../curriculum';
import jsPDF from 'jspdf';
import PptxGenJS from 'pptxgenjs';

interface ClassProgramProps {
    level: Level;
    targetLang: Language;
    nativeLang: Language;
    defaultCount: number;
    onClose: () => void;
    startTopic?: string;
    onComplete?: () => void;
}

interface ClassData {
    topic: string;
    vocab: FlashcardData[];
    grammar: GrammarLesson | null;
    conversations: FlashcardData[];
    expressions: FlashcardData[];
    story: StoryData | null;
    quiz: QuizQuestion[];
}

type ClassStep = 'intro' | 'vocab' | 'grammar' | 'conversations' | 'expressions' | 'story' | 'quiz' | 'outro';

export const ClassProgram: React.FC<ClassProgramProps> = ({ level, targetLang, nativeLang, defaultCount, onClose, startTopic, onComplete }) => {
    // Configuration State
    const [generationMode, setGenerationMode] = useState<'custom' | 'structured'>('structured');
    const [customTopic, setCustomTopic] = useState("");
    const [selectedLessonIndices, setSelectedLessonIndices] = useState<number[]>([0]);
    
    // Auto-selected for adventure mode
    const [includeVocab, setIncludeVocab] = useState(true);
    const [includeGrammar, setIncludeGrammar] = useState(true);
    const [includeConversations, setIncludeConversations] = useState(true);
    const [includeExpressions, setIncludeExpressions] = useState(true);
    const [includeStory, setIncludeStory] = useState(true);
    const [includeQuiz, setIncludeQuiz] = useState(true);
    
    // Generation State
    const [isGenerating, setIsGenerating] = useState(false);
    const [loadingStage, setLoadingStage] = useState("");
    const [classData, setClassData] = useState<ClassData | null>(null);

    // Presentation State
    const [currentStep, setCurrentStep] = useState<ClassStep>('intro');
    const [vocabIndex, setVocabIndex] = useState(0); 
    const [quizIndex, setQuizIndex] = useState(0);
    const [showQuizAnswer, setShowQuizAnswer] = useState(false);
    const [isProjecting, setIsProjecting] = useState(false);
    
    // AUTO-START LOGIC
    useEffect(() => {
        if (startTopic && !classData && !isGenerating) {
            // Force enable all modules for Adventure Mode
            setIncludeVocab(true);
            setIncludeGrammar(true);
            setIncludeConversations(true);
            setIncludeExpressions(true);
            setIncludeStory(true);
            setIncludeQuiz(true);
            
            handleGenerate(startTopic);
        }
    }, [startTopic]);

    const toggleLessonSelection = (index: number) => {
        setSelectedLessonIndices(prev => {
            if (prev.includes(index)) {
                return prev.filter(i => i !== index);
            } else {
                return [...prev, index].sort((a, b) => a - b);
            }
        });
    };

    const handleGenerate = async (overrideTopic?: string) => {
        let finalTopic = "";
        let topicForPrompt = "";

        if (overrideTopic) {
            finalTopic = overrideTopic;
            topicForPrompt = overrideTopic.replace(/^\d+\.\s/, ''); 
        } else if (generationMode === 'custom') {
            if (!customTopic) return;
            finalTopic = customTopic; 
            topicForPrompt = customTopic;
        } else {
            if (selectedLessonIndices.length === 0) return;
            const selectedTopics = selectedLessonIndices.map(idx => LESSON_PLAN[level][idx].replace(/^\d+\.\s/, ''));
            topicForPrompt = selectedTopics.join(" & ");
            finalTopic = topicForPrompt; 
        }

        setIsGenerating(true);
        
        // Adventure mode uses fixed counts for better flow
        const vocabCount = 15; 
        const exerciseCount = 5; 
        
        const data: ClassData = { 
            topic: finalTopic, 
            vocab: [], 
            grammar: null, 
            conversations: [],
            expressions: [],
            story: null, 
            quiz: [] 
        };

        try {
            // Always generate Grammar first to anchor the lesson
            setLoadingStage("Consulting the Grammar Scrolls...");
            data.grammar = await generateGrammarLesson(topicForPrompt, level, targetLang, nativeLang);
            if (data.grammar) data.topic = data.grammar.title; 

            setLoadingStage(`Gathering Vocabulary Treasures...`);
            data.vocab = await generateVocabulary(level, topicForPrompt, targetLang, nativeLang, true, vocabCount);

            setLoadingStage(`Scripting Local Dialogues...`);
            data.conversations = await generateVocabulary(level, `Roleplay dialogues about ${topicForPrompt}`, targetLang, nativeLang, true, exerciseCount);

            setLoadingStage(`Translating Ancient Idioms...`);
            data.expressions = await generateVocabulary(level, `Common idioms about ${topicForPrompt}`, targetLang, nativeLang, true, exerciseCount);

            setLoadingStage("Writing the Legend...");
            data.story = await generateStory(level, targetLang, nativeLang, topicForPrompt);

            setLoadingStage(`Preparing the Final Challenge...`);
            data.quiz = await generateQuiz(level, targetLang, exerciseCount); 

            setClassData(data);
            setCurrentStep('intro');
            setVocabIndex(0);
            setQuizIndex(0);
        } catch (e) {
            console.error(e);
            alert("Error generating adventure. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleFinishClass = () => {
        if (onComplete) {
            onComplete();
        } else {
            onClose();
        }
    };

    const steps: ClassStep[] = ['intro'];
    if (classData?.vocab.length) steps.push('vocab');
    if (classData?.grammar) steps.push('grammar');
    if (classData?.conversations.length) steps.push('conversations');
    if (classData?.expressions.length) steps.push('expressions');
    if (classData?.story) steps.push('story');
    if (classData?.quiz.length) steps.push('quiz');
    steps.push('outro');

    const currentStepIndex = steps.indexOf(currentStep);

    const goNext = () => {
        if (currentStepIndex < steps.length - 1) {
            setCurrentStep(steps[currentStepIndex + 1]);
            setVocabIndex(0);
            setQuizIndex(0);
            setShowQuizAnswer(false);
        }
    };

    const goPrev = () => {
        if (currentStepIndex > 0) {
            setCurrentStep(steps[currentStepIndex - 1]);
            setVocabIndex(0);
            setQuizIndex(0);
            setShowQuizAnswer(false);
        }
    };

    const handleVocabNext = (confidence: number) => {
        if (classData && vocabIndex < classData.vocab.length - 1) {
            setVocabIndex(i => i + 1);
        } else {
            goNext();
        }
    };

    // --- RENDER LOADING (ADVENTURE THEMED IF START TOPIC) ---
    if (isGenerating) {
        if (startTopic) {
             return (
                <div className="flex flex-col items-center justify-center h-full relative overflow-hidden" style={{ backgroundColor: '#2a2a2a' }}>
                    <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] mix-blend-overlay"></div>
                    <div className="z-10 text-center space-y-8 animate-in fade-in duration-1000">
                        <div className="relative inline-block">
                            <Ship size={80} className="text-amber-600 animate-bounce" />
                            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-24 h-2 bg-black/50 blur-md rounded-full animate-pulse"></div>
                        </div>
                        <h2 className="text-3xl font-serif font-black text-amber-500 tracking-widest">{loadingStage}</h2>
                        <p className="text-zinc-500 font-medium">Charting your course for {startTopic}...</p>
                    </div>
                </div>
            );
        }
        return (
            <div className="flex flex-col items-center justify-center h-full bg-zinc-50">
                <Loader2 size={64} className="text-blue-600 animate-spin mb-6" />
                <h2 className="text-3xl font-black text-zinc-800 animate-pulse">{loadingStage}</h2>
                <p className="text-zinc-500 mt-2 font-medium">Building your lesson plan...</p>
            </div>
        );
    }

    // --- RENDER CONFIGURATION SCREEN (Only if NOT auto-started) ---
    if (!classData) {
        return (
            <div className="flex h-full flex-col items-center justify-center p-8 bg-zinc-50 relative">
                <button onClick={onClose} className="absolute top-8 right-8 p-3 bg-white rounded-full shadow-sm hover:bg-zinc-100 transition z-10">
                    <X size={24} className="text-zinc-500" />
                </button>

                <div className="max-w-2xl w-full bg-white rounded-[2.5rem] shadow-2xl border border-zinc-100 overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white shrink-0">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                                <Layout size={24} />
                            </div>
                            <h2 className="text-2xl font-black tracking-tight">Class Generator</h2>
                        </div>
                        <p className="text-blue-100 font-medium text-sm">Build a complete, interactive lesson plan in seconds.</p>
                    </div>

                    <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                        <div className="bg-zinc-100 p-1 rounded-xl flex shrink-0">
                            <button 
                                onClick={() => setGenerationMode('structured')}
                                className={`flex-1 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${generationMode === 'structured' ? 'bg-white text-blue-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                            >
                                <List size={16} /> Syllabus Lesson
                            </button>
                            <button 
                                onClick={() => setGenerationMode('custom')}
                                className={`flex-1 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${generationMode === 'custom' ? 'bg-white text-blue-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                            >
                                <Type size={16} /> Custom Topic
                            </button>
                        </div>

                        <div>
                            {generationMode === 'custom' ? (
                                <div>
                                    <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">Enter Topic</label>
                                    <input 
                                        value={customTopic}
                                        onChange={(e) => setCustomTopic(e.target.value)}
                                        placeholder="e.g., Space Travel, Business Negotiation..."
                                        className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-xl text-lg font-bold text-zinc-800 focus:ring-4 focus:ring-blue-100 outline-none transition"
                                    />
                                </div>
                            ) : (
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest">Select Lessons (Level {level})</label>
                                        <span className="text-xs font-bold text-blue-600">{selectedLessonIndices.length} selected</span>
                                    </div>
                                    <div className="h-60 overflow-y-auto border border-zinc-200 rounded-2xl bg-zinc-50 p-2 custom-scrollbar">
                                        {LESSON_PLAN[level].map((lesson, idx) => {
                                            const isSelected = selectedLessonIndices.includes(idx);
                                            return (
                                                <div 
                                                    key={idx}
                                                    onClick={() => toggleLessonSelection(idx)}
                                                    className={`p-3 rounded-xl cursor-pointer transition-all flex items-center gap-3 mb-1 ${isSelected ? 'bg-blue-50 border border-blue-200 shadow-sm' : 'hover:bg-zinc-100 border border-transparent'}`}
                                                >
                                                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-zinc-300 bg-white'}`}>
                                                        {isSelected && <Check size={12} strokeWidth={4} />}
                                                    </div>
                                                    <span className={`text-sm font-bold leading-tight ${isSelected ? 'text-blue-900' : 'text-zinc-600'}`}>{lesson}</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        <button 
                            onClick={() => handleGenerate()}
                            disabled={(generationMode === 'custom' && !customTopic) || (generationMode === 'structured' && selectedLessonIndices.length === 0)}
                            className={`w-full py-4 rounded-xl font-black text-lg shadow-xl flex items-center justify-center gap-2 transition-transform active:scale-[0.98] ${(generationMode === 'custom' && !customTopic) || (generationMode === 'structured' && selectedLessonIndices.length === 0) ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed' : 'bg-zinc-900 text-white hover:bg-black'}`}
                        >
                            <Sparkles size={20} /> Generate Full Class
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // --- RENDER CLASS (STANDARD VIEW) ---
    // Only difference is if startTopic exists, we can theme the header slightly differently
    return (
        <div className="flex flex-col h-full bg-zinc-100 overflow-hidden relative">
            {/* Progress Header */}
            <div className={`h-16 border-b flex items-center justify-between px-6 z-20 ${startTopic ? 'bg-[#2a2a2a] border-zinc-800 text-white' : 'bg-white border-zinc-200'}`}>
                <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-lg font-bold text-xs uppercase tracking-widest ${startTopic ? 'bg-amber-600 text-white' : 'bg-zinc-900 text-white'}`}>
                        {startTopic ? "Adventure" : "Class"}
                    </span>
                    <span className={`font-bold truncate max-w-[300px] text-lg ${startTopic ? 'text-zinc-200' : 'text-zinc-700'}`}>{classData.topic}</span>
                </div>
                
                <div className="flex items-center gap-2">
                        {steps.map((step, idx) => (
                            <div 
                            key={step} 
                            className={`h-2 rounded-full transition-all duration-500 ${idx === currentStepIndex ? 'w-8 bg-blue-600' : idx < currentStepIndex ? 'w-2 bg-blue-200' : 'w-2 bg-zinc-200'}`}
                            />
                        ))}
                </div>
                
                <div className="flex items-center gap-2">
                    <button 
                        onClick={onClose} 
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition text-xs uppercase tracking-wider border ${startTopic ? 'bg-red-900/30 border-red-800 text-red-400 hover:bg-red-900/50' : 'bg-red-50 hover:bg-red-100 text-red-600 border-red-100'}`}
                    >
                        <LogOut size={16} /> Exit
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative">
                {currentStep === 'intro' && (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center animate-in zoom-in duration-500">
                            <div className={`w-32 h-32 rounded-full flex items-center justify-center shadow-2xl mb-8 ${startTopic ? 'bg-amber-600' : 'bg-gradient-to-br from-blue-500 to-indigo-600'}`}>
                            {startTopic ? <Map size={64} className="text-white" /> : <Sparkles size={64} className="text-white" />}
                            </div>
                            <h1 className="text-5xl md:text-7xl font-black text-zinc-900 mb-6 max-w-5xl">{classData.topic}</h1>
                            <p className="text-3xl text-zinc-500 font-light mb-12">{startTopic ? "The Adventure Begins!" : `Interactive Lesson • Level ${level}`}</p>
                            <button onClick={goNext} className="px-12 py-5 bg-zinc-900 text-white rounded-full font-bold text-2xl hover:scale-105 transition shadow-xl flex items-center gap-4">
                            Start Journey <ArrowRight size={28} />
                            </button>
                    </div>
                )}

                {currentStep === 'vocab' && (
                    <div className="h-full flex flex-col items-center justify-center relative">
                        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur px-6 py-2 rounded-full shadow-sm border border-zinc-200 text-base font-bold text-indigo-600 uppercase tracking-widest z-10">
                            Vocabulary {vocabIndex + 1} / {classData.vocab.length}
                        </div>
                        {classData.vocab[vocabIndex] && (
                            <Flashcard 
                                data={classData.vocab[vocabIndex]} 
                                showSentences={true} 
                                onNext={handleVocabNext} 
                                primaryLang={nativeLang} 
                                targetLang={targetLang}
                                isFullScreen={false}
                            />
                        )}
                    </div>
                )}

                {currentStep === 'grammar' && classData.grammar && (
                    <div className="h-full w-full overflow-hidden">
                            <GrammarStudio 
                            level={level} 
                            targetLang={targetLang} 
                            nativeLang={nativeLang} 
                            preloadedLesson={classData.grammar}
                            />
                    </div>
                )}

                {currentStep === 'conversations' && classData.conversations[vocabIndex] && (
                    <div className="h-full flex flex-col items-center justify-center p-8">
                            <div className="max-w-4xl w-full bg-white rounded-3xl shadow-xl border border-zinc-100 overflow-hidden flex flex-col">
                                <div className="bg-rose-50 p-6 border-b border-rose-100 flex justify-between items-center">
                                    <h2 className="text-2xl font-black text-rose-800 flex items-center gap-3">
                                        <MessageCircle /> {classData.conversations[vocabIndex].word}
                                    </h2>
                                    <span className="text-sm font-bold text-rose-400 uppercase tracking-widest">
                                        Dialogue {vocabIndex + 1}/{classData.conversations.length}
                                    </span>
                                </div>
                                <div className="p-10 text-lg leading-relaxed font-mono whitespace-pre-line text-zinc-700 h-[400px] overflow-y-auto custom-scrollbar">
                                    {classData.conversations[vocabIndex].sentence}
                                </div>
                                <div className="bg-zinc-50 p-4 border-t border-zinc-100 flex justify-center">
                                    <button onClick={() => handleVocabNext(5)} className="px-8 py-3 bg-zinc-900 text-white rounded-xl font-bold">Next Conversation</button>
                                </div>
                            </div>
                    </div>
                )}

                {currentStep === 'expressions' && classData.expressions[vocabIndex] && (
                    <div className="h-full flex flex-col items-center justify-center p-8">
                            <div className="max-w-3xl w-full bg-white rounded-3xl shadow-xl border border-zinc-100 overflow-hidden flex flex-col text-center p-12">
                                <div className="mb-8">
                                    <div className="inline-block p-4 bg-emerald-100 text-emerald-600 rounded-full mb-4"><Quote size={32}/></div>
                                    <h2 className="text-6xl font-black text-zinc-900 mb-4">{classData.expressions[vocabIndex].word}</h2>
                                    <p className="text-3xl text-emerald-600 font-serif italic">"{classData.expressions[vocabIndex].translation}"</p>
                                </div>
                                {classData.expressions[vocabIndex].sentence && (
                                    <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-100">
                                        <p className="text-zinc-500 font-bold uppercase text-xs tracking-widest mb-2">Example</p>
                                        <p className="text-xl text-zinc-700">{classData.expressions[vocabIndex].sentence}</p>
                                    </div>
                                )}
                                <div className="mt-8">
                                    <button onClick={() => handleVocabNext(5)} className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition">Next Expression</button>
                                </div>
                            </div>
                    </div>
                )}

                {currentStep === 'story' && classData.story && (
                        <div className="h-full w-full overflow-hidden">
                        <StoryFactory 
                            level={level} 
                            targetLang={targetLang} 
                            nativeLang={nativeLang} 
                            preloadedStory={classData.story}
                        />
                    </div>
                )}

                {currentStep === 'quiz' && classData.quiz.length > 0 && (
                    <div className="h-full w-full overflow-hidden">
                        <ExamRoom 
                            level={level}
                            targetLang={targetLang}
                            preloadedQuiz={classData.quiz}
                        />
                    </div>
                )}

                {currentStep === 'outro' && (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center animate-in zoom-in duration-500">
                            <div className="w-32 h-32 bg-green-500 rounded-full flex items-center justify-center shadow-2xl mb-8">
                            <CheckCircle2 size={64} className="text-white" />
                            </div>
                            <h1 className="text-6xl font-black text-zinc-900 mb-6">{startTopic ? "Adventure Complete!" : "Level Complete!"}</h1>
                            <p className="text-2xl text-zinc-500 mb-12 max-w-lg">You have mastered <strong>{classData.topic}</strong>.</p>
                            <div className="flex gap-4">
                            <button onClick={handleFinishClass} className="px-10 py-4 bg-zinc-900 text-white rounded-xl font-bold text-lg hover:bg-black transition shadow-lg w-full">
                                {startTopic ? "Return to Map & Mark Complete" : "Finish"}
                            </button>
                            </div>
                    </div>
                )}
            </div>

            {/* Footer Navigation */}
            {currentStep !== 'intro' && currentStep !== 'outro' && currentStep !== 'vocab' && (
                <div className="h-20 bg-white border-t border-zinc-200 flex items-center justify-between px-8 absolute bottom-0 w-full z-20">
                        <button onClick={goPrev} className="flex items-center gap-2 text-zinc-500 hover:text-black font-bold px-4 py-2 hover:bg-zinc-100 rounded-lg transition text-lg">
                        <ChevronLeft /> Previous Module
                        </button>
                        <button onClick={goNext} className="flex items-center gap-2 bg-zinc-900 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-black transition text-lg">
                        Next Module <ChevronRight />
                        </button>
                </div>
            )}
        </div>
    );
};

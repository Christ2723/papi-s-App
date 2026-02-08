import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Award, Play, RotateCcw, Loader2, HelpCircle, Frown, Star, Shield, Trophy, Hexagon } from 'lucide-react';
import { QuizQuestion, Level, Language } from '../types';
import { generateQuiz } from '../services/geminiService';

interface ExamRoomProps {
    level: Level;
    targetLang: Language;
    onQuizChange?: (questions: QuizQuestion[]) => void;
    preloadedQuiz?: QuizQuestion[]; // Added prop
}

const BadgeGenerator: React.FC<{ level: Level }> = ({ level }) => {
    // Generate complex visual badge based on level
    const renderBadgeContent = () => {
        switch(level) {
            case Level.A1:
            case Level.A2:
                // FOUNDATION: Bronze/Iron Shield style
                return (
                    <div className="relative w-48 h-48 flex items-center justify-center animate-in zoom-in duration-700">
                         <div className="absolute inset-0 bg-orange-900/20 rounded-full blur-xl"></div>
                         <div className="relative w-40 h-48 bg-gradient-to-b from-stone-400 to-stone-600 clip-shield shadow-2xl flex items-center justify-center border-4 border-stone-300">
                             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/brushed-alum.png')] opacity-30"></div>
                             <div className="flex flex-col items-center">
                                 <Shield size={64} className="text-stone-800 drop-shadow-sm mb-2" />
                                 <span className="text-4xl font-black text-stone-100 drop-shadow-lg">{level}</span>
                                 <span className="text-xs font-bold uppercase tracking-widest text-stone-200 mt-1">Foundation</span>
                             </div>
                         </div>
                    </div>
                );
            case Level.B1:
            case Level.B2:
                 // FLUENCY: Gold/Silver Medal style
                 return (
                    <div className="relative w-48 h-48 flex items-center justify-center animate-in zoom-in duration-700">
                         <div className="absolute inset-0 bg-yellow-500/30 rounded-full blur-2xl animate-pulse"></div>
                         <div className="relative w-40 h-40 rounded-full bg-gradient-to-br from-yellow-200 via-yellow-400 to-yellow-600 shadow-2xl flex items-center justify-center border-[6px] border-yellow-100 ring-4 ring-yellow-500/50">
                             <div className="absolute top-0 w-full h-1/2 bg-white/20 rounded-t-full"></div>
                             <div className="flex flex-col items-center z-10">
                                 <Trophy size={56} className="text-yellow-900 drop-shadow-sm mb-1" />
                                 <span className="text-5xl font-black text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]">{level}</span>
                                 <span className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-900 mt-1">Certified</span>
                             </div>
                             {/* Ribbons */}
                             <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-10 h-16 bg-red-600 -z-10 clip-ribbon"></div>
                         </div>
                         {/* Stars */}
                         <Star className="absolute -top-4 text-yellow-300 w-12 h-12 fill-yellow-300 animate-bounce" />
                    </div>
                 );
            case Level.C1:
            case Level.C2:
                 // MASTERY: Diamond/Cosmic style
                 return (
                    <div className="relative w-56 h-56 flex items-center justify-center animate-in zoom-in duration-1000">
                        <div className="absolute inset-0 bg-cyan-500/40 rounded-full blur-3xl animate-pulse"></div>
                        <div className="relative w-44 h-44 bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 rotate-45 border-4 border-cyan-400 shadow-[0_0_50px_rgba(34,211,238,0.5)] flex items-center justify-center overflow-hidden">
                             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-50 animate-spin-slow"></div>
                             <div className="-rotate-45 flex flex-col items-center z-10">
                                 <Hexagon size={64} className="text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)] mb-2" />
                                 <span className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-cyan-300 drop-shadow-lg filter">{level}</span>
                                 <span className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-200 mt-2">Master</span>
                             </div>
                             {/* Glow Effects */}
                             <div className="absolute -top-10 -left-10 w-20 h-20 bg-white blur-xl opacity-40"></div>
                             <div className="absolute -bottom-10 -right-10 w-20 h-20 bg-cyan-400 blur-xl opacity-40"></div>
                        </div>
                    </div>
                 );
            default: return null;
        }
    }

    return (
        <div className="flex flex-col items-center">
             {renderBadgeContent()}
             <style>{`
                .clip-shield { clip-path: polygon(50% 0, 100% 15%, 100% 85%, 50% 100%, 0 85%, 0 15%); }
                .clip-ribbon { clip-path: polygon(0 0, 100% 0, 100% 80%, 50% 100%, 0 80%); }
                .animate-spin-slow { animation: spin 20s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
             `}</style>
        </div>
    )
}

export const ExamRoom: React.FC<ExamRoomProps> = ({ level, targetLang, onQuizChange, preloadedQuiz }) => {
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [showResults, setShowResults] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [isAnswerChecked, setIsAnswerChecked] = useState(false);

    useEffect(() => {
        if(preloadedQuiz) {
            setQuestions(preloadedQuiz);
        }
    }, [preloadedQuiz]);

    const startQuiz = async () => {
        setLoading(true);
        setShowResults(false);
        setScore(0);
        setCurrentIndex(0);
        setSelectedAnswer(null);
        setIsAnswerChecked(false);
        setQuestions([]);
        if(onQuizChange) onQuizChange([]);
        
        // If preloaded, use it. Else generate.
        if (preloadedQuiz) {
            setQuestions(preloadedQuiz);
            if(onQuizChange) onQuizChange(preloadedQuiz);
            setLoading(false);
        } else {
            const data = await generateQuiz(level, targetLang, 10); 
            setQuestions(data);
            if(onQuizChange) onQuizChange(data);
            setLoading(false);
        }
    };

    const handleCheck = (index: number) => {
        if (isAnswerChecked) return;
        setSelectedAnswer(index);
        setIsAnswerChecked(true);
        
        if (index === questions[currentIndex].correctAnswer) {
            setScore(s => s + 1);
        }
    };

    const nextQuestion = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(c => c + 1);
            setSelectedAnswer(null);
            setIsAnswerChecked(false);
        } else {
            setShowResults(true);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-amber-700 bg-transparent">
                <Loader2 size={64} className="animate-spin mb-4" />
                <p className="font-bold text-xl">Preparing your exam paper...</p>
                <p className="text-amber-700/60 mt-2">Generating questions for Level {level}</p>
            </div>
        );
    }

    if (questions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-transparent">
                <div className="bg-white/80 backdrop-blur-md p-12 rounded-3xl shadow-xl max-w-lg w-full border-t-8 border-amber-500">
                    <div className="bg-amber-100 w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-8">
                         <Award className="w-16 h-16 text-amber-600" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-800 mb-4">Proficiency Exam</h2>
                    <p className="text-gray-600 mb-8 leading-relaxed">
                        Ready to test your {targetLang} skills? You must achieve <strong>90%</strong> or higher to pass this level.
                    </p>
                    <button 
                        onClick={startQuiz}
                        className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xl shadow-lg shadow-amber-200 transition transform hover:scale-[1.02] flex items-center justify-center gap-2"
                    >
                        <Play size={24} /> Start Exam
                    </button>
                </div>
            </div>
        );
    }

    if (showResults) {
        const percentage = Math.round((score / questions.length) * 100);
        const passed = percentage >= 90;

        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-transparent overflow-y-auto">
                <div className={`bg-white/90 backdrop-blur-md p-12 rounded-3xl shadow-xl max-w-lg w-full border-t-8 ${passed ? 'border-green-500' : 'border-red-500'} animate-in fade-in duration-500`}>
                    <div className="mb-6">
                        {passed ? (
                            <BadgeGenerator level={level} />
                        ) : (
                            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                                <Frown className="w-12 h-12 text-red-500" />
                            </div>
                        )}
                    </div>
                    <h2 className="text-3xl font-bold text-gray-800 mb-2">{passed ? "Level Passed!" : "Level Failed"}</h2>
                    <p className="text-gray-500 mb-6 font-medium uppercase tracking-wide">Level {level} - {targetLang}</p>
                    
                    <div className={`text-6xl font-black mb-8 ${passed ? 'text-green-600' : 'text-red-500'}`}>
                        {percentage}%
                    </div>
                    
                    <div className={`p-4 rounded-xl mb-8 ${passed ? 'bg-green-100 text-green-800' : 'bg-red-50 text-red-800'}`}>
                         <p className="text-lg font-bold">
                            {passed 
                                ? "You have earned your Badge! Proceed to the next level." 
                                : "You need 90% to advance. Review the material and try again."}
                        </p>
                    </div>

                    <button 
                        onClick={startQuiz}
                        className="w-full py-4 bg-gray-900 hover:bg-black text-white rounded-xl font-bold text-lg transition flex items-center justify-center gap-2"
                    >
                        <RotateCcw size={20} /> Retake Exam
                    </button>
                </div>
            </div>
        );
    }

    const currentQ = questions[currentIndex];

    return (
        <div className="max-w-4xl mx-auto h-full flex flex-col justify-center p-6">
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-white/50">
                {/* Header */}
                <div className="bg-amber-500 px-8 py-6 flex justify-between items-center text-white">
                    <span className="font-bold tracking-widest text-sm uppercase bg-white/20 px-3 py-1 rounded-full">Question {currentIndex + 1} / {questions.length}</span>
                    <span className="font-bold bg-white/20 px-3 py-1 rounded-full">Score: {score}</span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-100 h-2">
                    <div className="bg-amber-500 h-2 transition-all duration-500" style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}></div>
                </div>

                {/* Question */}
                <div className="p-10 flex-1 flex flex-col justify-center">
                    <h3 className="text-3xl font-bold text-gray-800 mb-10 leading-snug">{currentQ.question}</h3>
                    
                    <div className="grid grid-cols-1 gap-4">
                        {currentQ.options.map((opt, i) => {
                            let btnClass = "p-6 rounded-2xl border-2 text-left transition text-lg font-medium flex items-center justify-between group ";
                            
                            if (isAnswerChecked) {
                                if (i === currentQ.correctAnswer) btnClass += "border-green-500 bg-green-50 text-green-800 shadow-md";
                                else if (i === selectedAnswer) btnClass += "border-red-500 bg-red-50 text-red-800 opacity-75";
                                else btnClass += "border-gray-100 text-gray-400 opacity-50";
                            } else {
                                btnClass += "border-gray-100 hover:border-amber-400 hover:bg-amber-50 text-gray-700 hover:shadow-md";
                            }

                            return (
                                <button 
                                    key={i}
                                    onClick={() => handleCheck(i)}
                                    disabled={isAnswerChecked}
                                    className={btnClass}
                                >
                                    <div className="flex items-center gap-4">
                                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border ${isAnswerChecked && i === currentQ.correctAnswer ? 'bg-green-200 border-green-300 text-green-800' : 'bg-gray-100 border-gray-200 text-gray-500 group-hover:bg-amber-200 group-hover:text-amber-800 group-hover:border-amber-300'}`}>
                                            {String.fromCharCode(65+i)}
                                        </span>
                                        {opt}
                                    </div>
                                    {isAnswerChecked && i === currentQ.correctAnswer && <CheckCircle size={28} className="text-green-600" />}
                                    {isAnswerChecked && i === selectedAnswer && i !== currentQ.correctAnswer && <XCircle size={28} className="text-red-500" />}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Footer / Explanation */}
                {isAnswerChecked && (
                    <div className="bg-gray-50 p-8 border-t border-gray-100 animate-slide-in-up">
                        <div className="flex flex-col md:flex-row gap-6 items-start">
                            <div className="flex-1 bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                <p className="text-xs font-bold text-amber-500 uppercase mb-2 flex items-center gap-2">
                                    <HelpCircle size={14}/> Instructor Note
                                </p>
                                <p className="text-gray-700 text-base leading-relaxed">{currentQ.explanation}</p>
                            </div>
                            <button 
                                onClick={nextQuestion}
                                className="px-10 py-5 bg-gray-900 hover:bg-black text-white rounded-xl font-bold shadow-lg transition flex items-center gap-2 whitespace-nowrap"
                            >
                                {currentIndex < questions.length - 1 ? "Next Question" : "Finish Exam"} <Play size={18} fill="white" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
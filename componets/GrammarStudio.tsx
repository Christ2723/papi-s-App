import React, { useState, useEffect, useMemo } from 'react';
import { Book, Sparkles, ArrowRight, Loader2, ChevronDown, ChevronRight, GraduationCap, AlertTriangle, CheckCircle2, Lightbulb, Image as ImageIcon, Search, Zap, Monitor, Minimize, ChevronLeft, X } from 'lucide-react';
import { Level, Language, GrammarLesson } from '../types';
import { generateGrammarLesson } from '../services/geminiService';
import { GRAMMAR_TOPICS } from '../curriculum';
import { Flashcard } from './Flashcard';

interface GrammarStudioProps {
    level: Level;
    targetLang: Language;
    nativeLang: Language;
    onLessonChange?: (lesson: GrammarLesson | null) => void;
    preloadedLesson?: GrammarLesson | null; // Added prop
}

type SlideType = 
    | { type: 'intro' } 
    | { type: 'section'; index: number } 
    | { type: 'example'; index: number } 
    | { type: 'practice'; index: number };

export const GrammarStudio: React.FC<GrammarStudioProps> = ({ level: currentLevel, targetLang, nativeLang, onLessonChange, preloadedLesson }) => {
    const [topic, setTopic] = useState("");
    const [customInput, setCustomInput] = useState("");
    const [lesson, setLesson] = useState<GrammarLesson | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [expandedLevel, setExpandedLevel] = useState<Level | null>(currentLevel);
    const [practiceIndex, setPracticeIndex] = useState(0); // For inline practice
    
    // Projection State
    const [isProjecting, setIsProjecting] = useState(false);
    const [slideIndex, setSlideIndex] = useState(0);

    useEffect(() => {
        if (preloadedLesson) {
            setLesson(preloadedLesson);
            setTopic(preloadedLesson.title);
        }
    }, [preloadedLesson]);

    const handleLearn = async (selectedTopic: string) => {
        setTopic(selectedTopic);
        setCustomInput("");
        setIsLoading(true);
        const data = await generateGrammarLesson(selectedTopic, currentLevel, targetLang, nativeLang);
        setLesson(data);
        setPracticeIndex(0);
        if(onLessonChange) onLessonChange(data);
        setIsLoading(false);
    };

    const handleCustomSubmit = async () => {
        if (!customInput.trim()) return;
        setTopic(customInput);
        setExpandedLevel(null); // Collapse accordion
        setIsLoading(true);
        const data = await generateGrammarLesson(customInput, currentLevel, targetLang, nativeLang);
        setLesson(data);
        setPracticeIndex(0);
        if(onLessonChange) onLessonChange(data);
        setIsLoading(false);
    }

    const toggleLevel = (lvl: Level) => {
        if (expandedLevel === lvl) setExpandedLevel(null);
        else setExpandedLevel(lvl);
    }

    const handlePracticeNext = (confidence: number) => {
        if (lesson && lesson.practiceCards) {
            if (practiceIndex < lesson.practiceCards.length - 1) {
                setPracticeIndex(p => p + 1);
            } else {
                setPracticeIndex(0); // Loop back
            }
        }
    }

    // --- PROJECTION LOGIC ---
    const slides: SlideType[] = useMemo(() => {
        if (!lesson) return [];
        const s: SlideType[] = [{ type: 'intro' }];
        lesson.sections.forEach((_, i) => s.push({ type: 'section', index: i }));
        lesson.examples.forEach((_, i) => s.push({ type: 'example', index: i }));
        if (lesson.practiceCards) {
            lesson.practiceCards.forEach((_, i) => s.push({ type: 'practice', index: i }));
        }
        return s;
    }, [lesson]);

    useEffect(() => {
        if (!isProjecting) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' || e.key === ' ') nextSlide();
            if (e.key === 'ArrowLeft') prevSlide();
            if (e.key === 'Escape') setIsProjecting(false);
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [isProjecting, slideIndex, slides]);

    const nextSlide = () => setSlideIndex(i => Math.min(i + 1, slides.length - 1));
    const prevSlide = () => setSlideIndex(i => Math.max(i - 1, 0));

    const handleProjectPracticeNext = (confidence: number) => {
        nextSlide();
    }

    // Reuse rendering logic for lesson content
    const renderLessonContent = () => {
        if (!lesson) return null;
        return (
            <div className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/40 animate-fade-in-up flex flex-col max-w-6xl mx-auto mb-24">
                {/* Hero Header */}
                <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 p-12 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-[30rem] h-[30rem] bg-white opacity-10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
                    
                    {/* Project Button */}
                    <div className="absolute top-8 right-8 z-20">
                        <button 
                            onClick={() => { setSlideIndex(0); setIsProjecting(true); }}
                            className="flex items-center gap-2 px-6 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full font-bold text-sm transition border border-white/20 shadow-lg"
                        >
                            <Monitor size={18} /> Project Lesson
                        </button>
                    </div>

                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-6">
                                <span className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border border-white/10 shadow-sm">Level {currentLevel}</span>
                                <span className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border border-white/10 shadow-sm">{targetLang}</span>
                            </div>
                            <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-6 leading-tight drop-shadow-sm">{lesson.title}</h1>
                            <p className="text-violet-100 text-2xl font-light mb-8">{lesson.subtitle}</p>
                            <div className="p-6 bg-white/10 rounded-3xl border border-white/20 backdrop-blur-md shadow-lg">
                                <p className="text-lg font-medium leading-relaxed flex items-start gap-3">
                                <Sparkles className="flex-shrink-0 text-yellow-300 mt-1" size={24}/>
                                {lesson.quickSummary}
                                </p>
                            </div>
                        </div>
                        {lesson.heroImages && lesson.heroImages.length > 0 && (
                            <div className="w-64 h-64 flex-shrink-0 bg-white rounded-full p-2 shadow-2xl border-4 border-white/30 transform hover:scale-105 transition duration-500">
                                <img src={lesson.heroImages[0]} alt="Hero asset" className="w-full h-full object-contain rounded-full bg-violet-50" />
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="p-10 md:p-14 bg-white/80">
                    <div className="grid grid-cols-1 gap-8 mb-16">
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] border-b-2 border-slate-100 pb-4 mb-6">Key Rules</h3>
                        <div className="grid md:grid-cols-2 gap-6">
                            {lesson.sections.map((section, idx) => {
                                let borderColor = "border-slate-100";
                                let bgColor = "bg-slate-50/80";
                                let icon = <Book className="text-violet-400" />;
                                let titleColor = "text-violet-900";

                                if (section.style === 'warning') {
                                    borderColor = "border-red-200";
                                    bgColor = "bg-red-50/80";
                                    icon = <AlertTriangle className="text-red-500" />;
                                    titleColor = "text-red-800";
                                } else if (section.style === 'tip') {
                                    borderColor = "border-amber-200";
                                    bgColor = "bg-amber-50/80";
                                    icon = <Lightbulb className="text-amber-500" />;
                                    titleColor = "text-amber-800";
                                } else {
                                    borderColor = "border-emerald-200";
                                    bgColor = "bg-emerald-50/80";
                                    icon = <CheckCircle2 className="text-emerald-500" />;
                                    titleColor = "text-emerald-800";
                                }

                                return (
                                    <div key={idx} className={`${bgColor} border ${borderColor} p-8 rounded-[2rem] shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1`}>
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="p-3 bg-white rounded-2xl shadow-sm">{icon}</div>
                                            <h3 className={`text-xl font-bold ${titleColor}`}>{section.title}</h3>
                                        </div>
                                        <ul className="space-y-4">
                                            {section.points.map((pt, pIdx) => (
                                                <li key={pIdx} className="flex items-start gap-4 text-slate-700 text-base font-medium leading-relaxed">
                                                    <div className={`w-2 h-2 rounded-full mt-2.5 flex-shrink-0 ${section.style === 'warning' ? 'bg-red-400' : section.style === 'tip' ? 'bg-amber-400' : 'bg-emerald-400'}`}></div>
                                                    {pt}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    <div className="space-y-10 mb-16">
                        <div className="flex items-center justify-between border-b-2 border-slate-100 pb-6">
                            <h3 className="text-2xl font-black text-slate-800 flex items-center gap-4">
                                <div className="p-3 bg-violet-100 text-violet-600 rounded-2xl shadow-sm">
                                    <ImageIcon size={28}/>
                                </div>
                                Visual Context Examples
                            </h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            {lesson.examples.map((ex, i) => (
                                <div key={i} className="group relative bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden flex flex-col hover:-translate-y-2 hover:shadow-2xl transition-all duration-500">
                                    <div className="w-full h-72 relative flex items-center justify-center overflow-hidden bg-gradient-to-b from-slate-50 to-white">
                                        {/* Render Multiple Sticker Assets */}
                                        {ex.images && ex.images.length > 0 ? (
                                            <div className="flex items-center gap-[-20px] justify-center w-full h-full px-4 relative">
                                                {ex.images.map((img, idx) => (
                                                    <img 
                                                        key={idx}
                                                        src={img} 
                                                        alt={`Example part ${idx}`} 
                                                        className="h-48 w-auto object-contain drop-shadow-2xl transition-transform duration-700 group-hover:scale-110 z-10"
                                                        style={{ transform: `translateX(${idx === 0 ? '15px' : '-15px'}) rotate(${idx === 0 ? '-5deg' : '5deg'})` }}
                                                    />
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                <ImageIcon size={64} />
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="p-8 bg-white relative z-20 border-t border-slate-100">
                                        <div className="absolute -top-4 left-8 px-5 py-1.5 bg-violet-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-violet-200">
                                            {ex.context}
                                        </div>
                                        <div className="mt-4 space-y-3">
                                            <p className="text-2xl font-black text-slate-800 leading-tight">"{ex.sentence}"</p>
                                            <p className="text-lg font-medium text-slate-500 italic border-l-4 border-violet-200 pl-4">{ex.translation}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* NEW: Interactive Practice Section */}
                    {lesson.practiceCards && lesson.practiceCards.length > 0 && (
                        <div className="bg-gradient-to-b from-indigo-50 to-white rounded-[2.5rem] border border-indigo-100 p-10 overflow-hidden relative">
                            <div className="flex items-center justify-between mb-8 relative z-10">
                                <h3 className="text-2xl font-black text-indigo-900 flex items-center gap-3">
                                    <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200">
                                        <Zap size={24}/>
                                    </div>
                                    Interactive Practice
                                </h3>
                                <span className="bg-indigo-200 text-indigo-700 px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest">
                                    {practiceIndex + 1} / {lesson.practiceCards.length}
                                </span>
                            </div>

                            <div className="relative z-10 max-w-4xl mx-auto">
                                <Flashcard 
                                    data={lesson.practiceCards[practiceIndex]}
                                    showSentences={true}
                                    onNext={handlePracticeNext}
                                    primaryLang={nativeLang}
                                    targetLang={targetLang}
                                    isFullScreen={false}
                                />
                            </div>
                            
                            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/graphy.png')] opacity-10 pointer-events-none"></div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // --- RENDER PROJECTION ---
    if (isProjecting && lesson) {
        const slide = slides[slideIndex];
        return (
            <div className="fixed inset-0 z-[200] bg-zinc-950 text-white flex flex-col font-sans animate-in fade-in duration-300">
                {/* Projection Controls */}
                <div className="absolute top-6 right-6 z-50 flex gap-4">
                    <div className="bg-zinc-800/80 backdrop-blur rounded-full px-4 py-2 flex items-center gap-4 border border-zinc-700">
                        <button onClick={prevSlide} disabled={slideIndex === 0} className="p-2 hover:bg-zinc-700 rounded-full transition disabled:opacity-30"><ChevronLeft size={24}/></button>
                        <span className="font-mono font-bold text-zinc-400">{slideIndex + 1} / {slides.length}</span>
                        <button onClick={nextSlide} disabled={slideIndex === slides.length - 1} className="p-2 hover:bg-zinc-700 rounded-full transition disabled:opacity-30"><ChevronRight size={24}/></button>
                    </div>
                    <button onClick={() => setIsProjecting(false)} className="p-4 bg-zinc-800/80 hover:bg-zinc-700 backdrop-blur rounded-full transition border border-zinc-700">
                        <Minimize size={24} />
                    </button>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center p-16 overflow-hidden relative">
                    {/* Background Ambience */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] bg-violet-900/10 rounded-full blur-[150px] pointer-events-none"></div>

                    {slide.type === 'intro' && (
                        <div className="text-center animate-in zoom-in duration-500 max-w-6xl">
                            <div className="flex items-center justify-center gap-4 mb-8">
                                <span className="px-6 py-2 rounded-full border border-violet-500/50 text-violet-300 font-bold uppercase tracking-widest bg-violet-900/20">Grammar Lab</span>
                                <span className="px-6 py-2 rounded-full border border-zinc-700 text-zinc-400 font-bold uppercase tracking-widest">Level {currentLevel}</span>
                            </div>
                            <h1 className="text-8xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-400 mb-12 leading-tight tracking-tight">
                                {lesson.title}
                            </h1>
                            <p className="text-4xl md:text-5xl text-violet-200 font-light max-w-5xl mx-auto leading-relaxed">
                                {lesson.subtitle}
                            </p>
                            <div className="mt-16 text-2xl text-zinc-400 max-w-4xl mx-auto border-t border-zinc-800 pt-8">
                                {lesson.quickSummary}
                            </div>
                        </div>
                    )}

                    {slide.type === 'section' && (
                        <div className="w-full max-w-7xl animate-in slide-in-from-right duration-500">
                            <div className="flex items-center gap-6 mb-12 border-b border-zinc-800 pb-8">
                                <div className="p-4 bg-violet-900/30 rounded-2xl border border-violet-500/30">
                                    <Book size={48} className="text-violet-400" />
                                </div>
                                <h2 className="text-6xl font-black text-white">{lesson.sections[slide.index].title}</h2>
                            </div>
                            <ul className="space-y-8">
                                {lesson.sections[slide.index].points.map((pt, i) => (
                                    <li key={i} className="flex items-start gap-6 text-4xl md:text-5xl font-medium text-zinc-300 leading-snug">
                                        <div className={`mt-3 w-4 h-4 rounded-full flex-shrink-0 ${lesson.sections[slide.index].style === 'warning' ? 'bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)]' : 'bg-violet-500 shadow-[0_0_20px_rgba(139,92,246,0.5)]'}`}></div>
                                        {pt}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {slide.type === 'example' && (
                        <div className="w-full max-w-7xl animate-in slide-in-from-right duration-500 flex flex-col items-center text-center">
                            <div className="mb-12">
                                <span className="px-8 py-3 rounded-full bg-violet-900/30 border border-violet-500/30 text-violet-300 text-xl font-black uppercase tracking-[0.2em]">
                                    Example: {lesson.examples[slide.index].context}
                                </span>
                            </div>
                            
                            {lesson.examples[slide.index].images && (
                                <div className="mb-12 relative">
                                    <div className="absolute inset-0 bg-white/5 blur-2xl rounded-full"></div>
                                    <div className="flex gap-4 relative z-10">
                                        {lesson.examples[slide.index].images!.map((img, i) => (
                                            <img key={i} src={img} className="h-64 object-contain drop-shadow-2xl" />
                                        ))}
                                    </div>
                                </div>
                            )}

                            <h2 className="text-7xl md:text-8xl font-black text-white mb-8 leading-tight">
                                "{lesson.examples[slide.index].sentence}"
                            </h2>
                            <p className="text-4xl md:text-5xl text-violet-400 font-serif italic">
                                {lesson.examples[slide.index].translation}
                            </p>
                        </div>
                    )}

                    {slide.type === 'practice' && lesson.practiceCards && (
                        <div className="w-full h-full flex items-center justify-center animate-in zoom-in duration-300">
                             <div className="absolute top-8 left-8">
                                <span className="text-2xl font-black text-zinc-500 uppercase tracking-widest flex items-center gap-3">
                                    <Zap size={32} className="text-yellow-500" /> Practice {slide.index + 1}
                                </span>
                             </div>
                             <Flashcard 
                                data={lesson.practiceCards[slide.index]}
                                showSentences={true}
                                onNext={handleProjectPracticeNext}
                                primaryLang={nativeLang}
                                targetLang={targetLang}
                                isFullScreen={true}
                             />
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (preloadedLesson) {
        return (
             <div className="flex-1 overflow-y-auto bg-transparent p-8 custom-scrollbar h-full">
                 {renderLessonContent()}
             </div>
        )
    }

    return (
        <div className="h-full flex overflow-hidden bg-transparent">
             {/* Left Panel: Topics - Only show if not preloaded */}
             <div className="w-80 border-r border-zinc-900 bg-black flex flex-col h-full overflow-hidden">
                 <div className="p-8 border-b border-zinc-900 bg-black z-10">
                     <h2 className="text-xl font-black text-white flex items-center gap-3 mb-2">
                         <div className="p-2 bg-zinc-800 rounded-xl text-zinc-300">
                            <Book size={20} />
                         </div>
                         Grammar Lab
                     </h2>
                     <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-4">Select or Type Topic</p>
                     
                     {/* Custom Input Area */}
                     <div className="relative flex items-center">
                         <input 
                            value={customInput}
                            onChange={(e) => setCustomInput(e.target.value)}
                            placeholder="e.g. Past Perfect"
                            onKeyDown={(e) => e.key === 'Enter' && handleCustomSubmit()}
                            className="w-full bg-zinc-900 border border-zinc-800 text-white text-sm font-bold p-3 pl-10 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none placeholder-zinc-600"
                         />
                         <Search size={16} className="absolute left-3 text-zinc-500" />
                         <button 
                            onClick={handleCustomSubmit}
                            disabled={!customInput || isLoading}
                            className="absolute right-1 p-2 bg-violet-600 hover:bg-violet-500 rounded-lg text-white disabled:opacity-0 transition-opacity"
                         >
                             <ArrowRight size={14} />
                         </button>
                     </div>
                 </div>
                 
                 <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
                     {Object.values(Level).map((lvl) => (
                         <div key={lvl} className="border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-900/30 transition-all">
                             <button 
                                onClick={() => toggleLevel(lvl)}
                                className={`w-full flex items-center justify-between p-4 font-bold transition ${lvl === currentLevel ? 'bg-zinc-800 text-white' : 'hover:bg-zinc-900 text-zinc-500'}`}
                             >
                                <span className="flex items-center gap-3">
                                    <div className={`p-1.5 rounded-lg ${lvl === currentLevel ? 'bg-white text-black' : 'bg-black text-zinc-600 border border-zinc-800'}`}>
                                        <GraduationCap size={14} /> 
                                    </div>
                                    Level {lvl}
                                </span>
                                {expandedLevel === lvl ? <ChevronDown size={18}/> : <ChevronRight size={18} className="text-zinc-700"/>}
                             </button>
                             
                             {expandedLevel === lvl && (
                                 <div className="bg-black p-2 space-y-1 border-t border-zinc-800">
                                     {GRAMMAR_TOPICS[lvl].map((t, i) => (
                                         <button
                                            key={i}
                                            onClick={() => handleLearn(t)}
                                            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-3 ${topic === t ? 'bg-white text-black shadow-lg shadow-white/10' : 'text-zinc-500 hover:bg-zinc-900 hover:text-white'}`}
                                         >
                                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors ${topic === t ? 'bg-black' : 'bg-zinc-700'}`}></span>
                                            {t}
                                         </button>
                                     ))}
                                 </div>
                             )}
                         </div>
                     ))}
                 </div>
             </div>

             {/* Right Panel: Content */}
             <div className="flex-1 overflow-y-auto bg-transparent p-8 custom-scrollbar">
                 {isLoading ? (
                     <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-slate-400 bg-white/60 backdrop-blur-xl rounded-[3rem] shadow-xl border border-white/40">
                         <div className="relative">
                            <Sparkles className="animate-spin text-fuchsia-500" size={64} />
                            <div className="absolute inset-0 bg-fuchsia-500 blur-2xl opacity-30 animate-pulse"></div>
                         </div>
                         <p className="text-2xl font-black mt-8 text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-600">Creating lesson & exercises...</p>
                         <p className="text-violet-500 font-bold mt-2 bg-violet-50 px-6 py-2 rounded-full shadow-inner">{topic}</p>
                     </div>
                 ) : lesson ? (
                     renderLessonContent()
                 ) : (
                     <div className="h-full flex flex-col items-center justify-center p-12 text-center opacity-40">
                         <div className="w-48 h-48 bg-white/50 backdrop-blur-xl rounded-full flex items-center justify-center mb-8 border border-white/60 shadow-lg">
                            <Book size={64} className="text-violet-800" />
                         </div>
                         <h3 className="text-3xl font-black text-violet-900 mb-2 tracking-tight">Select a Grammar Topic</h3>
                         <p className="text-violet-800 max-w-md font-medium">Choose a topic from the sidebar or type a custom one to generate an illustrated lesson with practice cards.</p>
                     </div>
                 )}
             </div>
        </div>
    );
};
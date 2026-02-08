import React, { useEffect, useState } from 'react';
import { Map, Download, BookOpen, GraduationCap, CheckCircle2, FileText, Presentation, MessageCircle, Sparkles, Trophy, ArrowRight, Loader2 } from 'lucide-react';
import { Level, Language } from '../types';
import { LESSON_PLAN, GRAMMAR_TOPICS, CONVERSATIONS, EXPRESSIONS } from '../curriculum';
import { translateSyllabus } from '../services/geminiService';
import jsPDF from 'jspdf';
import PptxGenJS from 'pptxgenjs';

interface SyllabusViewProps {
    level: Level;
    targetLang: Language;
    nativeLang: Language;
    onNavigate: (type: 'vocab' | 'grammar' | 'conversation' | 'expression' | 'exam', topic: string) => void;
}

// Global cache to prevent re-fetching when switching tabs
const translationCache: Record<string, any> = {};

export const SyllabusView: React.FC<SyllabusViewProps> = ({ level, targetLang, nativeLang, onNavigate }) => {
    
    const [content, setContent] = useState<{vocab: string[], grammar: string[], conversations: string[], expressions: string[]} | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchContent = async () => {
            const cacheKey = `${level}-${targetLang}`;
            
            // Clean input data (remove numbers to get better translations, we re-add numbers in UI)
            const rawVocab = LESSON_PLAN[level].map(t => t.replace(/^\d+\.\s/, ''));
            const rawGrammar = GRAMMAR_TOPICS[level];
            const rawConvos = CONVERSATIONS[level] || [];
            const rawExpr = EXPRESSIONS[level] || [];

            if (targetLang === Language.English) {
                setContent({
                    vocab: rawVocab,
                    grammar: rawGrammar,
                    conversations: rawConvos,
                    expressions: rawExpr
                });
                return;
            }

            if (translationCache[cacheKey]) {
                setContent(translationCache[cacheKey]);
                return;
            }

            setIsLoading(true);
            const translated = await translateSyllabus(targetLang as string, {
                vocab: rawVocab,
                grammar: rawGrammar,
                conversations: rawConvos,
                expressions: rawExpr
            });
            
            translationCache[cacheKey] = translated;
            setContent(translated);
            setIsLoading(false);
        };

        fetchContent();
    }, [level, targetLang]);

    const downloadPDF = () => {
        if (!content) return;
        const doc = new jsPDF();
        
        // Branding
        doc.setFillColor(245, 158, 11); // Amber
        doc.rect(0, 0, 210, 20, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text("Payero Language School", 105, 13, { align: "center" });

        // Title
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(28);
        doc.text(`Official Syllabus: ${targetLang} ${level}`, 20, 40);
        
        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text(`Comprehensive learning roadmap from Zero to Fluency.`, 20, 48);

        let yPos = 60;

        // Section: Vocabulary
        doc.setFillColor(79, 70, 229); // Indigo
        doc.rect(20, yPos, 170, 10, 'F');
        doc.setTextColor(255);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("VOCABULARY MODULES", 25, yPos + 7);
        
        yPos += 20;
        doc.setTextColor(0);
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");

        content.vocab.forEach((topic, i) => {
            if (yPos > 270) { doc.addPage(); yPos = 20; }
            doc.text(`${i+1}. ${topic}`, 25, yPos);
            yPos += 8;
        });

        yPos += 10;
        if (yPos > 250) { doc.addPage(); yPos = 20; }

        // Section: Grammar
        doc.setFillColor(124, 58, 237); // Violet
        doc.rect(20, yPos, 170, 10, 'F');
        doc.setTextColor(255);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("GRAMMAR STRUCTURES", 25, yPos + 7);

        yPos += 20;
        doc.setTextColor(0);
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");

        content.grammar.forEach((topic, i) => {
            if (yPos > 270) { doc.addPage(); yPos = 20; }
            doc.text(`${i + 1}. ${topic}`, 25, yPos);
            yPos += 8;
        });

        // Footer
        const pageCount = doc.getNumberOfPages();
        for(let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(10);
            doc.setTextColor(150);
            doc.text(`Page ${i} of ${pageCount}`, 105, 290, {align:"center"});
        }

        doc.save(`Syllabus_${targetLang}_${level}.pdf`);
    };

    const downloadPPT = async () => {
        if (!content) return;
        const pres = new PptxGenJS();
        pres.layout = 'LAYOUT_WIDE';

        // Slide 1: Cover
        let slide = pres.addSlide();
        slide.background = { color: '1e1e1e' }; // Dark bg
        slide.addText("Payero Language School", { x: 1, y: 1.5, w: '80%', fontSize: 36, color: 'F59E0B', align: 'center', bold: true });
        slide.addText(`Course Syllabus: ${targetLang}`, { x: 1, y: 2.5, w: '80%', fontSize: 28, color: 'FFFFFF', align: 'center' });
        slide.addText(`Level ${level}`, { x: 1, y: 3.5, w: '80%', fontSize: 60, color: '4f46e5', align: 'center', bold: true });

        // Slide 2: Vocabulary
        slide = pres.addSlide();
        slide.background = { color: 'F3F4F6' };
        slide.addText("Vocabulary Roadmap", { x: 0.5, y: 0.5, w: '90%', fontSize: 24, color: '4338ca', bold: true, border: { pt: 0, pb: 2, color: '4338ca' } });
        
        let yPos = 1.5;
        let xPos = 0.5;
        content.vocab.forEach((topic, i) => {
            if (i === 10) { xPos = 6.5; yPos = 1.5; } // New column
            slide.addText(`${i+1}. ${topic}`, { x: xPos, y: yPos, fontSize: 14, color: '374151' });
            yPos += 0.5;
        });

        // Slide 3: Grammar
        slide = pres.addSlide();
        slide.background = { color: 'F3F4F6' };
        slide.addText("Grammar Lab Structure", { x: 0.5, y: 0.5, w: '90%', fontSize: 24, color: '7c3aed', bold: true, border: { pt: 0, pb: 2, color: '7c3aed' } });
        
        yPos = 1.5;
        xPos = 0.5;
        content.grammar.forEach((topic, i) => {
            if (i === 8) { xPos = 6.5; yPos = 1.5; } // New column
            slide.addText(`${i + 1}. ${topic}`, { x: xPos, y: yPos, fontSize: 14, color: '374151' });
            yPos += 0.6;
        });

        await pres.writeFile({ fileName: `Syllabus_${targetLang}_${level}.pptx` });
    };

    if (isLoading || !content) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-zinc-50">
                <Loader2 size={64} className="text-blue-500 animate-spin mb-4" />
                <h2 className="text-2xl font-black text-zinc-800">Localizing Curriculum...</h2>
                <p className="text-zinc-500 font-medium">Translating roadmap to {targetLang}</p>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col bg-zinc-50 overflow-hidden font-sans">
            {/* Header */}
            <div className="h-24 bg-white border-b border-zinc-200 px-10 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-6">
                    <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-200 text-white">
                        <Map size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-zinc-900 tracking-tight">Interactive Roadmap</h1>
                        <p className="text-zinc-500 font-medium">Click any topic to <span className="text-blue-600 font-bold">start studying</span>.</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <button 
                        onClick={downloadPDF}
                        className="flex items-center gap-2 px-6 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl font-bold transition border border-zinc-200"
                    >
                        <FileText size={20} /> PDF
                    </button>
                    <button 
                        onClick={downloadPPT}
                        className="flex items-center gap-2 px-6 py-3 bg-zinc-900 hover:bg-black text-white rounded-xl font-bold transition shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                    >
                        <Presentation size={20} /> PPT
                    </button>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-10">
                <div className="max-w-7xl mx-auto space-y-12 pb-32">
                    
                    {/* --- ROW 1: FOUNDATION (Vocab & Grammar) --- */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                         {/* Vocabulary Column */}
                        <div className="flex flex-col gap-6">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                                        <BookOpen size={24} />
                                    </div>
                                    <h2 className="text-2xl font-black text-zinc-800 uppercase tracking-tight">Vocabulary</h2>
                                </div>
                                <span className="text-xs font-bold text-zinc-400 bg-zinc-100 px-2 py-1 rounded">{targetLang} / {nativeLang}</span>
                            </div>
                            
                            <div className="bg-white rounded-3xl shadow-sm border border-zinc-200 overflow-hidden">
                                {content.vocab.map((topic, idx) => (
                                    <button 
                                        key={idx} 
                                        onClick={() => onNavigate('vocab', topic)}
                                        className="w-full text-left group relative border-b last:border-0 border-zinc-100 p-5 hover:bg-indigo-50/50 transition-colors flex items-center gap-4"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-zinc-100 text-zinc-400 font-black flex items-center justify-center text-sm group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-zinc-700 text-lg group-hover:text-indigo-900 transition-colors">
                                                {topic}
                                            </p>
                                            <p className="text-xs text-zinc-400 font-medium mt-0.5 hidden group-hover:block animate-in fade-in">Click to generate Flashcards</p>
                                        </div>
                                        <div className="w-8 h-8 rounded-full border border-zinc-200 group-hover:border-indigo-300 flex items-center justify-center text-zinc-300 group-hover:text-indigo-600">
                                            <ArrowRight size={14}/>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Grammar Column */}
                        <div className="flex flex-col gap-6">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-violet-100 rounded-lg text-violet-600">
                                        <GraduationCap size={24} />
                                    </div>
                                    <h2 className="text-2xl font-black text-zinc-800 uppercase tracking-tight">Grammar</h2>
                                </div>
                                <span className="text-xs font-bold text-zinc-400 bg-zinc-100 px-2 py-1 rounded">Interactive Rules</span>
                            </div>

                            <div className="relative">
                                {/* Visual Timeline Line */}
                                <div className="absolute left-8 top-8 bottom-8 w-1 bg-zinc-200 rounded-full"></div>
                                
                                <div className="space-y-4">
                                    {content.grammar.map((topic, idx) => (
                                        <div key={idx} className="relative pl-20 group">
                                            {/* Connector */}
                                            <div className="absolute left-[30px] top-1/2 -translate-y-1/2 w-8 h-1 bg-zinc-200 group-hover:bg-violet-300 transition-colors"></div>
                                            <div className="absolute left-[26px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-4 border-zinc-300 group-hover:border-violet-500 transition-colors z-10"></div>

                                            <button 
                                                onClick={() => onNavigate('grammar', topic)}
                                                className="w-full text-left bg-white p-5 rounded-2xl shadow-sm border border-zinc-200 hover:shadow-lg hover:border-violet-200 transition-all duration-300 transform hover:-translate-y-1"
                                            >
                                                <h3 className="font-bold text-lg text-zinc-800 group-hover:text-violet-700 transition-colors mb-1">{topic}</h3>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                                                        <CheckCircle2 size={12} /> Essential Structure
                                                    </div>
                                                    <ArrowRight size={14} className="text-zinc-300 group-hover:text-violet-500 opacity-0 group-hover:opacity-100 transition-opacity"/>
                                                </div>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* --- ROW 2: FLUENCY (Conversations & Expressions) --- */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        {/* Conversation Column */}
                        <div className="flex flex-col gap-6">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-rose-100 rounded-lg text-rose-600">
                                        <MessageCircle size={24} />
                                    </div>
                                    <h2 className="text-2xl font-black text-zinc-800 uppercase tracking-tight">Real Conversations</h2>
                                </div>
                                <span className="text-xs font-bold text-zinc-400 bg-zinc-100 px-2 py-1 rounded">Roleplay</span>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                {content.conversations.map((topic, idx) => (
                                    <button 
                                        key={idx}
                                        onClick={() => onNavigate('conversation', topic)}
                                        className="group flex items-center gap-4 p-4 bg-white rounded-2xl border border-zinc-200 hover:border-rose-200 hover:bg-rose-50/30 transition-all hover:shadow-md"
                                    >
                                        <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-400 flex items-center justify-center font-black text-lg group-hover:bg-rose-500 group-hover:text-white transition-colors">
                                            {String.fromCharCode(65 + idx)}
                                        </div>
                                        <div className="flex-1 text-left">
                                            <p className="font-bold text-zinc-700 text-lg group-hover:text-rose-900">{topic}</p>
                                            <p className="text-xs text-zinc-400">Interactive Dialogue</p>
                                        </div>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity text-rose-500">
                                            <ArrowRight size={20} />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Expressions Column */}
                         <div className="flex flex-col gap-6">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                                        <Sparkles size={24} />
                                    </div>
                                    <h2 className="text-2xl font-black text-zinc-800 uppercase tracking-tight">Useful Expressions</h2>
                                </div>
                                <span className="text-xs font-bold text-zinc-400 bg-zinc-100 px-2 py-1 rounded">Idioms & Phrases</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {content.expressions.map((topic, idx) => (
                                    <button 
                                        key={idx}
                                        onClick={() => onNavigate('expression', topic)}
                                        className="group p-6 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100 hover:border-emerald-300 hover:shadow-lg transition-all text-left flex flex-col justify-between h-32"
                                    >
                                        <Sparkles size={16} className="text-emerald-300 mb-2 group-hover:text-emerald-500 transition-colors"/>
                                        <p className="font-bold text-emerald-900 text-lg leading-tight group-hover:scale-105 transition-transform origin-left">{topic}</p>
                                        <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider mt-2 opacity-50 group-hover:opacity-100 transition-opacity">Learn Phrase</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* --- EXAM SECTION --- */}
                    <div className="pt-10 border-t-2 border-dashed border-zinc-200">
                        <div className="max-w-3xl mx-auto">
                            <button 
                                onClick={() => onNavigate('exam', 'Final Exam')}
                                className="w-full group relative overflow-hidden bg-zinc-900 hover:bg-black rounded-[2rem] p-8 shadow-2xl transition-all hover:shadow-amber-900/20 transform hover:-translate-y-1"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="relative z-10 flex items-center justify-between">
                                    <div className="flex items-center gap-6">
                                        <div className="w-20 h-20 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-500">
                                            <Trophy size={40} className="animate-bounce" />
                                        </div>
                                        <div className="text-left">
                                            <h2 className="text-3xl font-black text-white mb-1">Final Level Exam</h2>
                                            <p className="text-zinc-400 font-medium">Test your knowledge of all {content.vocab.length + content.grammar.length + content.conversations.length} topics to advance.</p>
                                        </div>
                                    </div>
                                    <div className="bg-white text-black px-8 py-4 rounded-xl font-bold text-lg flex items-center gap-2 group-hover:bg-amber-400 transition-colors">
                                        Start Exam <ArrowRight size={20} />
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
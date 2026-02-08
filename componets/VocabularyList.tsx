import React, { useState } from 'react';
import { FlashcardData } from '../types';
import { ChevronLeft, ChevronRight, Monitor, Minimize, Volume2 } from 'lucide-react';
import { Logo } from './Logo';
import { playPcmAudio } from '../services/audioUtils';
import { generateTts } from '../services/geminiService';

interface VocabularyListProps {
    cards: FlashcardData[];
    primaryLang: string;
    targetLang: string;
}

export const VocabularyList: React.FC<VocabularyListProps> = ({ cards, primaryLang, targetLang }) => {
    const [currentPage, setCurrentPage] = useState(0);
    const [isProjecting, setIsProjecting] = useState(false);
    const ITEMS_PER_PAGE = 8;

    const totalPages = Math.ceil(cards.length / ITEMS_PER_PAGE);
    const startIndex = currentPage * ITEMS_PER_PAGE;
    const currentItems = cards.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const nextPage = () => {
        if (currentPage < totalPages - 1) setCurrentPage(p => p + 1);
    };

    const prevPage = () => {
        if (currentPage > 0) setCurrentPage(p => p - 1);
    };

    const playAudio = async (text: string) => {
        try {
            const audio = await generateTts(text);
            if (audio) await playPcmAudio(audio);
        } catch (e) {
            console.error(e);
        }
    }

    // --- PROJECTION MODE ---
    if (isProjecting) {
        return (
            <div className="fixed inset-0 z-[100] bg-zinc-900 text-white flex flex-col">
                {/* Projection Header */}
                <div className="h-20 bg-black/50 backdrop-blur-md border-b border-zinc-800 flex items-center justify-between px-8">
                    <div className="flex items-center gap-4">
                        <Logo size={48} />
                        <div>
                            <h1 className="text-xl font-bold text-amber-500 tracking-widest uppercase">Payero Language School</h1>
                            <p className="text-zinc-500 text-xs font-bold">Classroom Projection • Page {currentPage + 1}/{totalPages}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex bg-zinc-800 rounded-lg p-1">
                            <button onClick={prevPage} disabled={currentPage === 0} className="p-3 hover:bg-zinc-700 rounded-md disabled:opacity-30"><ChevronLeft size={24}/></button>
                            <span className="px-4 flex items-center font-mono font-bold text-xl">{currentPage + 1}</span>
                            <button onClick={nextPage} disabled={currentPage === totalPages - 1} className="p-3 hover:bg-zinc-700 rounded-md disabled:opacity-30"><ChevronRight size={24}/></button>
                        </div>
                        <button onClick={() => setIsProjecting(false)} className="bg-zinc-800 hover:bg-zinc-700 p-3 rounded-lg text-zinc-300 font-bold flex items-center gap-2">
                            <Minimize size={20} /> Exit
                        </button>
                    </div>
                </div>

                {/* Large Projection Content */}
                <div className="flex-1 p-8 overflow-y-auto flex items-center justify-center">
                    <div className="w-full max-w-7xl grid grid-cols-1 gap-4">
                        {currentItems.map((card, idx) => (
                            <div key={card.id} className="flex items-center bg-zinc-800/50 border border-zinc-700 p-6 rounded-2xl shadow-lg">
                                <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center text-amber-500 font-black text-2xl mr-8 flex-shrink-0 border border-amber-500/30">
                                    {startIndex + idx + 1}
                                </div>
                                <div className="flex-1 grid grid-cols-2 gap-8 items-center">
                                    <div className="text-left">
                                        <div className="text-5xl font-black text-white mb-2 tracking-tight">{card.word}</div>
                                        {card.sentence && <div className="text-zinc-400 text-xl italic font-serif">"{card.sentence}"</div>}
                                    </div>
                                    <div className="text-right border-l border-zinc-700 pl-8">
                                        <div className="text-4xl font-bold text-amber-500">{card.translation}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // --- STANDARD LIST VIEW ---
    return (
        <div className="w-full h-full flex flex-col p-6 animate-in fade-in">
            {/* Toolbar */}
            <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-2xl shadow-sm border border-zinc-100">
                <div className="flex items-center gap-2">
                     <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-lg font-bold text-xs uppercase tracking-widest">Page {currentPage + 1} of {totalPages}</span>
                     <span className="text-zinc-400 text-sm font-medium ml-2">{cards.length} Total Words</span>
                </div>
                <div className="flex items-center gap-3">
                     <button onClick={prevPage} disabled={currentPage === 0} className="p-2 hover:bg-zinc-100 rounded-full disabled:opacity-30 text-zinc-600"><ChevronLeft/></button>
                     <button onClick={nextPage} disabled={currentPage === totalPages - 1} className="p-2 hover:bg-zinc-100 rounded-full disabled:opacity-30 text-zinc-600"><ChevronRight/></button>
                     <div className="h-6 w-px bg-zinc-200 mx-2"></div>
                     <button 
                        onClick={() => setIsProjecting(true)}
                        className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-xl font-bold shadow-lg hover:bg-zinc-800 transition"
                    >
                        <Monitor size={18} /> Project List
                     </button>
                </div>
            </div>

            {/* Table / List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-white rounded-3xl shadow-sm border border-zinc-100">
                <table className="w-full">
                    <thead className="bg-zinc-50 sticky top-0 z-10">
                        <tr>
                            <th className="text-left py-4 px-6 font-black text-xs text-zinc-500 uppercase tracking-widest w-16">#</th>
                            <th className="text-left py-4 px-6 font-black text-xs text-zinc-500 uppercase tracking-widest">{targetLang}</th>
                            <th className="text-left py-4 px-6 font-black text-xs text-zinc-500 uppercase tracking-widest">{primaryLang}</th>
                            <th className="text-left py-4 px-6 font-black text-xs text-zinc-500 uppercase tracking-widest">Context / Sentence</th>
                            <th className="w-16"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                        {currentItems.map((card, idx) => (
                            <tr key={card.id} className="hover:bg-indigo-50/50 transition-colors group">
                                <td className="py-5 px-6 font-bold text-zinc-400">{startIndex + idx + 1}</td>
                                <td className="py-5 px-6">
                                    <span className="text-xl font-black text-zinc-800 block">{card.word}</span>
                                    <span className="text-xs text-zinc-400 font-mono">{card.pronunciation}</span>
                                </td>
                                <td className="py-5 px-6 text-lg font-medium text-indigo-600">
                                    {card.translation}
                                </td>
                                <td className="py-5 px-6">
                                    {card.sentence ? (
                                        <div className="max-w-md">
                                            <p className="text-zinc-600 italic font-medium">"{card.sentence}"</p>
                                            <p className="text-zinc-400 text-sm mt-1">{card.sentenceTranslation}</p>
                                        </div>
                                    ) : (
                                        <span className="text-zinc-300 text-sm italic">No context</span>
                                    )}
                                </td>
                                <td className="py-5 px-6 text-right">
                                    <button 
                                        onClick={() => playAudio(card.word)}
                                        className="p-2 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-100 rounded-full transition opacity-0 group-hover:opacity-100"
                                    >
                                        <Volume2 size={20} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {/* Footer Pagination */}
            <div className="mt-4 flex justify-center gap-2">
                 {Array.from({length: totalPages}).map((_, i) => (
                     <button 
                        key={i} 
                        onClick={() => setCurrentPage(i)}
                        className={`w-2.5 h-2.5 rounded-full transition-all ${currentPage === i ? 'bg-indigo-600 w-8' : 'bg-zinc-300 hover:bg-zinc-400'}`}
                     />
                 ))}
            </div>
        </div>
    );
};
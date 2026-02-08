
import React, { useEffect, useState, useRef } from 'react';
import { StudentProgress, AppMode } from '../types';
import { getProgress } from '../services/storageService';
import { Lock, Anchor, Skull, Ship, X, MapPin, Tent, Castle, Trees, Mountain } from 'lucide-react';
import { LESSON_PLAN } from '../curriculum';

interface TreasureMapProps {
    userId: string;
    onNavigate: (mode: AppMode, params?: any) => void;
}

export const TreasureMap: React.FC<TreasureMapProps> = ({ userId, onNavigate }) => {
    const [progress, setProgress] = useState<StudentProgress | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const p = getProgress(userId);
        setProgress(p);
    }, [userId]);

    // Auto-scroll to current level node on load
    useEffect(() => {
        if (progress && scrollRef.current) {
            setTimeout(() => {
                const activeNode = document.getElementById('active-node');
                if (activeNode) {
                    activeNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 500);
        }
    }, [progress]);

    if (!progress) return null;

    const currentLevelLessons = LESSON_PLAN[progress.level];
    const completedCount = currentLevelLessons.filter(topic => progress.completedTopics.includes(topic)).length;
    const activeLessonIndex = Math.min(completedCount, currentLevelLessons.length - 1);

    const handleNodeClick = (lessonTopic: string, index: number, isLocked: boolean) => {
        if (isLocked) return;
        
        onNavigate(AppMode.ClassProgram, { 
            topic: lessonTopic,
            index: index,
            isResume: true 
        });
    };

    // Helper to pick icons based on index to simulate different map locations
    const getLocationIcon = (index: number) => {
        if (index === 0) return <Anchor size={20} className="text-zinc-800" />;
        if (index === currentLevelLessons.length - 1) return <Castle size={20} className="text-zinc-800" />;
        if (index % 5 === 0) return <Mountain size={20} className="text-zinc-800" />;
        if (index % 3 === 0) return <Tent size={20} className="text-zinc-800" />;
        if (index % 2 === 0) return <Trees size={20} className="text-zinc-800" />;
        return <MapPin size={20} className="text-zinc-800" />;
    };

    return (
        <div ref={scrollRef} className="h-full bg-zinc-900 overflow-y-auto custom-scrollbar relative flex justify-center">
            
            {/* Outer Container - Dark Table Surface */}
            <div className="w-full max-w-5xl min-h-full p-4 md:p-8 relative flex flex-col items-center">
                
                {/* THE BATTLE MAP CONTAINER */}
                <div 
                    className="relative w-full rounded-2xl overflow-hidden shadow-2xl border-4 border-zinc-800 bg-[#3b5d6a]"
                    style={{
                        minHeight: `${Math.max(100, currentLevelLessons.length * 15)}vh`,
                    }}
                >
                    {/* --- MAP LAYERS --- */}

                    {/* 1. Water Base (Ocean Texture) */}
                    <div className="absolute inset-0 bg-[#375e6d] opacity-100">
                        {/* Subtle water ripples pattern */}
                        <div className="absolute inset-0 opacity-20" 
                             style={{ backgroundImage: `radial-gradient(circle, #5b8796 1px, transparent 1px)`, backgroundSize: '20px 20px' }}>
                        </div>
                    </div>

                    {/* 2. Land Mass (Coastal Shape) */}
                    {/* We create a jagged coastline using a clip-path on the right side */}
                    <div 
                        className="absolute top-0 right-0 h-full w-[85%] bg-[#d6ccaa] shadow-2xl"
                        style={{
                            clipPath: 'polygon(15% 0, 5% 10%, 18% 20%, 8% 30%, 20% 40%, 10% 50%, 22% 60%, 12% 70%, 25% 80%, 15% 90%, 20% 100%, 100% 100%, 100% 0)',
                        }}
                    >
                         {/* Land Texture (Sandy/Rocky) */}
                         <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/concrete-wall.png')]"></div>
                         
                         {/* Greenery / Jungle patches overlay */}
                         <div className="absolute inset-0 bg-gradient-to-l from-green-900/20 to-transparent"></div>
                         <div className="absolute top-1/4 right-0 w-1/2 h-1/2 bg-green-800/10 blur-3xl rounded-full"></div>
                    </div>

                    {/* 3. Shoreline Effect (White foam along the clip path approximation) */}
                    <div 
                        className="absolute top-0 right-0 h-full w-[86%] bg-white/20 pointer-events-none blur-md"
                        style={{
                            clipPath: 'polygon(15% 0, 5% 10%, 18% 20%, 8% 30%, 20% 40%, 10% 50%, 22% 60%, 12% 70%, 25% 80%, 15% 90%, 20% 100%, 22% 100%, 17% 90%, 27% 80%, 14% 70%, 24% 60%, 12% 50%, 22% 40%, 10% 30%, 20% 20%, 7% 10%, 17% 0)',
                        }}
                    ></div>

                    {/* 4. Grid Overlay (Battle Map Style) */}
                    <div 
                        className="absolute inset-0 pointer-events-none opacity-20"
                        style={{
                            backgroundImage: `linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)`,
                            backgroundSize: '60px 60px'
                        }}
                    ></div>

                    {/* 5. Map Title Box */}
                    <div className="absolute top-8 left-8 z-10 bg-[#f4ebd0] border-2 border-[#5c4033] p-4 rounded-sm shadow-[5px_5px_0px_rgba(0,0,0,0.4)] transform -rotate-1">
                        <h2 className="text-3xl font-black text-[#3e2723] uppercase tracking-widest leading-none">Level {progress.level}</h2>
                        <p className="text-[#6d4c41] font-serif font-bold text-sm mt-1">Jahaka Anchorage Region</p>
                    </div>

                    {/* 6. Compass Rose */}
                    <div className="absolute bottom-8 left-8 z-10 opacity-80">
                         <div className="w-24 h-24 relative flex items-center justify-center">
                             <div className="w-full h-0.5 bg-zinc-800 absolute"></div>
                             <div className="h-full w-0.5 bg-zinc-800 absolute"></div>
                             <div className="w-16 h-16 border-2 border-zinc-800 rounded-full flex items-center justify-center bg-[#f4ebd0]/80">
                                 <span className="font-black text-xl mb-1">N</span>
                             </div>
                         </div>
                    </div>

                    {/* 7. Path Line */}
                    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 overflow-visible">
                        <path 
                            d={currentLevelLessons.map((_, i) => {
                                const y = i * 160 + 200;
                                // Shift path more to the right to sit on the "land" mass
                                const x = 50 + 20 * Math.sin(i * 0.7) + (i % 2 === 0 ? 10 : 0); 
                                return `${i === 0 ? 'M' : 'L'} ${x + 10}% ${y}`;
                            }).join(' ')}
                            fill="none"
                            stroke="#5c4033"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeDasharray="8 8"
                            className="opacity-60 drop-shadow-sm"
                        />
                    </svg>

                    {/* 8. Nodes */}
                    <div className="relative z-10 w-full h-full pt-48 pb-32">
                        {currentLevelLessons.map((lesson, idx) => {
                            const isCompleted = progress.completedTopics.includes(lesson);
                            const isActive = !isCompleted && idx === activeLessonIndex;
                            const isLocked = !isCompleted && !isActive;
                            
                            // Align with SVG path
                            const top = idx * 160 + 200;
                            const left = 60 + 20 * Math.sin(idx * 0.7) + (idx % 2 === 0 ? 10 : 0); 

                            return (
                                <div 
                                    key={idx}
                                    id={isActive ? 'active-node' : undefined}
                                    className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer"
                                    style={{ left: `${left}%`, top: `${top}px` }}
                                    onClick={() => handleNodeClick(lesson, idx, isLocked)}
                                >
                                    {/* The Node Marker */}
                                    <div className={`relative transition-transform duration-300 ${isActive ? 'scale-125 z-20' : 'scale-100 z-10 hover:scale-110 hover:z-20'}`}>
                                        
                                        {/* Map Location Pin Style */}
                                        <div className={`w-12 h-12 rounded-lg rotate-45 border-2 shadow-lg flex items-center justify-center
                                            ${isLocked 
                                                ? 'bg-zinc-400 border-zinc-600 grayscale' 
                                                : isCompleted 
                                                    ? 'bg-[#81c784] border-[#2e7d32]' 
                                                    : 'bg-[#ffb74d] border-[#e65100] animate-pulse'
                                            }`}
                                        >
                                            <div className="-rotate-45">
                                                {isCompleted ? <X size={24} className="text-green-900"/> : getLocationIcon(idx)}
                                            </div>
                                        </div>

                                        {/* "You Are Here" indicator */}
                                        {isActive && (
                                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce">
                                                <div className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-md uppercase tracking-wide whitespace-nowrap">
                                                    Current Quest
                                                </div>
                                                <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-red-600"></div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Label */}
                                    <div className={`mt-4 px-3 py-1.5 bg-[#f4ebd0] border border-[#8d6e63] rounded shadow-md max-w-[160px] text-center transition-all duration-300 transform ${isActive ? 'scale-110' : ''} ${isLocked ? 'opacity-50' : 'opacity-100'}`}>
                                        <p className="font-bold text-[#3e2723] text-xs leading-tight">
                                            {lesson.replace(/^\d+\.\s/, '')}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Final Boss / Destination */}
                        <div 
                            className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                            style={{ left: '60%', top: `${currentLevelLessons.length * 160 + 200}px` }}
                        >
                            <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center border-4 border-zinc-600 shadow-2xl">
                                <Skull size={40} className="text-zinc-400" />
                            </div>
                            <div className="mt-3 px-4 py-1 bg-red-900 text-white font-black uppercase text-sm rounded shadow-lg">
                                Final Exam
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

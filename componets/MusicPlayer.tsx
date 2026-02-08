import React, { useState, useRef, useEffect } from 'react';
import { Music, Search, Disc, Volume2, Sparkles, Loader2, Mic, Play, ExternalLink, AlertTriangle, StopCircle, RefreshCcw, Monitor, Minimize, ChevronLeft, ChevronRight } from 'lucide-react';
import { Language, SongData } from '../types';
import { searchSong, generateTts } from '../services/geminiService';
import { playPcmAudio } from '../services/audioUtils';

interface MusicPlayerProps {
    targetLang: Language;
    nativeLang: Language;
}

export const MusicPlayer: React.FC<MusicPlayerProps> = ({ targetLang, nativeLang }) => {
    const [query, setQuery] = useState("");
    const [song, setSong] = useState<SongData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showFallback, setShowFallback] = useState(false);
    const [isKaraokeMode, setIsKaraokeMode] = useState(false);
    const [isProjecting, setIsProjecting] = useState(false);
    
    // Recording
    const [isRecording, setIsRecording] = useState(false);
    const [recordedAudio, setRecordedAudio] = useState<string | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const [currentLine, setCurrentLine] = useState(-1);
    
    const scrollRef = useRef<HTMLDivElement>(null);

    const handleSearch = async () => {
        if (!query.trim()) return;
        setIsLoading(true);
        setSong(null);
        setCurrentLine(-1);
        setShowFallback(false);
        setRecordedAudio(null);
        setIsProjecting(false);
        
        const foundSong = await searchSong(query, targetLang, nativeLang, isKaraokeMode);
        setSong(foundSong);
        setIsLoading(false);
    };

    const playLinePronunciation = async (index: number) => {
        if (!song || index >= song.lyrics.length) return;
        setCurrentLine(index);
        
        try {
            // Generate audio for the line using TTS as a pronunciation guide
            const audioBase64 = await generateTts(song.lyrics[index].original, 'Kore');
            if (audioBase64) {
                await playPcmAudio(audioBase64);
            }
        } catch (e) {
            console.error(e);
        }
    };

    // Keyboard Navigation for Projection
    useEffect(() => {
        if (!isProjecting || !song) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
                 if (currentLine < song.lyrics.length - 1) setCurrentLine(c => c + 1);
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                 if (currentLine > 0) setCurrentLine(c => c - 1);
            } else if (e.key === 'Escape') {
                setIsProjecting(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isProjecting, song, currentLine]);


    // --- Recorder Logic ---
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

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const audioUrl = URL.createObjectURL(audioBlob);
                setRecordedAudio(audioUrl);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordedAudio(null);
        } catch (e) {
            alert("Microphone access denied");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const playRecording = () => {
        if (recordedAudio) {
            const audio = new Audio(recordedAudio);
            audio.play();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSearch();
    }

    // --- PROJECTION RENDER ---
    if (isProjecting && song) {
        const activeLine = currentLine >= 0 ? song.lyrics[currentLine] : null;
        const nextLine = currentLine < song.lyrics.length - 1 ? song.lyrics[currentLine + 1] : null;

        return (
            <div className="fixed inset-0 z-[100] bg-black text-white flex flex-col font-sans animate-in fade-in duration-300">
                {/* Header */}
                <div className="h-20 flex items-center justify-between px-8 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur z-20">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-cyan-900/30 rounded-lg">
                             <Music size={24} className="text-cyan-400"/>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white tracking-tight">{song.title}</h1>
                            <p className="text-cyan-500 text-sm font-medium uppercase tracking-widest">{song.artist}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-zinc-800 rounded-lg p-1">
                            <button onClick={() => setCurrentLine(c => Math.max(0, c - 1))} className="p-3 hover:bg-zinc-700 rounded-md transition disabled:opacity-30" disabled={currentLine <= 0}><ChevronLeft size={20}/></button>
                            <span className="font-mono font-bold w-16 text-center text-zinc-300">{currentLine < 0 ? "-" : currentLine + 1}/{song.lyrics.length}</span>
                            <button onClick={() => setCurrentLine(c => Math.min(song.lyrics.length - 1, c + 1))} className="p-3 hover:bg-zinc-700 rounded-md transition disabled:opacity-30" disabled={currentLine >= song.lyrics.length - 1}><ChevronRight size={20}/></button>
                        </div>
                        <button 
                            onClick={() => setIsProjecting(false)} 
                            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition"
                        >
                            <Minimize size={20} /> Exit Projection
                        </button>
                    </div>
                </div>

                {/* Main Lyric Display */}
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center relative overflow-hidden">
                    {/* Background Ambience */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] bg-cyan-500/10 rounded-full blur-[150px] pointer-events-none"></div>

                    {currentLine === -1 ? (
                         <div className="animate-in zoom-in duration-500 relative z-10">
                             <h2 className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-zinc-500 mb-8 leading-tight">{song.title}</h2>
                             <p className="text-4xl text-cyan-400 font-light mb-16 tracking-widest uppercase">{song.artist}</p>
                             <div className="text-zinc-500 font-bold uppercase tracking-[0.2em] animate-pulse border border-zinc-700 rounded-full px-8 py-3 inline-block">Press Arrow Keys or Tap to Start</div>
                         </div>
                    ) : (
                        <div className="z-10 max-w-7xl w-full flex flex-col gap-16 items-center">
                             {/* Current Line */}
                             <div key={currentLine} className="animate-in slide-in-from-bottom-8 fade-in duration-500">
                                <h2 className="text-6xl md:text-8xl font-black text-white mb-8 leading-tight drop-shadow-2xl">
                                    {activeLine?.original}
                                </h2>
                                <p className="text-3xl md:text-5xl text-cyan-400 font-serif italic font-medium leading-relaxed opacity-90">
                                    {activeLine?.translation}
                                </p>
                             </div>

                             {/* Pronunciation Button (Big) */}
                             <div className="flex justify-center mt-8">
                                <button 
                                    onClick={() => playLinePronunciation(currentLine)}
                                    className="px-8 py-4 bg-zinc-900/80 hover:bg-cyan-900/30 text-zinc-400 hover:text-cyan-300 border border-zinc-700 hover:border-cyan-500 rounded-full transition flex items-center gap-3 font-bold uppercase tracking-wider backdrop-blur-md shadow-2xl"
                                >
                                    <Volume2 size={24} /> Pronounce
                                </button>
                             </div>
                        </div>
                    )}

                    {/* Next Line Preview */}
                    {nextLine && currentLine !== -1 && (
                        <div className="absolute bottom-12 left-0 right-0 text-center opacity-40 hover:opacity-80 transition-opacity">
                            <p className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-3">Next Line</p>
                            <p className="text-2xl text-zinc-300 font-bold truncate max-w-4xl mx-auto px-8">{nextLine.original}</p>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col bg-zinc-950 text-white overflow-hidden font-sans">
            {/* Top Bar: Search */}
            <div className="h-20 bg-black border-b border-zinc-800 flex items-center px-8 gap-6 flex-shrink-0 z-20 shadow-lg">
                <div className="flex items-center gap-3 text-cyan-400">
                    <Music size={28} />
                    <h2 className="text-xl font-black tracking-tighter hidden md:block">Lyrical Lab</h2>
                </div>
                
                <div className="flex-1 max-w-2xl relative flex items-center gap-4">
                    <div className="relative flex-1">
                        <input 
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Search for a song (e.g. 'Shape of You')..."
                            className="w-full bg-zinc-900 border border-zinc-800 p-3 pl-12 rounded-full text-white focus:ring-2 focus:ring-cyan-500 outline-none text-sm font-medium transition-all focus:bg-zinc-800"
                        />
                        <Search className="absolute left-4 top-3 text-zinc-500" size={18}/>
                    </div>

                    {/* Karaoke Toggle */}
                    <button 
                        onClick={() => setIsKaraokeMode(!isKaraokeMode)}
                        className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest border transition-all flex items-center gap-2 ${isKaraokeMode ? 'bg-cyan-900 border-cyan-500 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)]' : 'bg-zinc-900 border-zinc-700 text-zinc-500 hover:border-zinc-500'}`}
                        title="Finds instrumental versions to avoid VEVO restrictions"
                    >
                        <Mic size={14} /> Karaoke Mode: {isKaraokeMode ? "ON" : "OFF"}
                    </button>
                    
                    {/* Project Toggle */}
                    {song && (
                        <button 
                            onClick={() => setIsProjecting(true)}
                            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full font-bold transition flex items-center gap-2 text-xs uppercase tracking-wider whitespace-nowrap border border-zinc-700"
                        >
                            <Monitor size={14} /> Project
                        </button>
                    )}
                </div>
                
                <button 
                    onClick={handleSearch}
                    disabled={isLoading || !query}
                    className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-full font-bold shadow-lg shadow-cyan-900/20 transition flex items-center gap-2 whitespace-nowrap transform active:scale-95"
                >
                    {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                    <span className="hidden md:inline">Load Song</span>
                </button>
            </div>

            {/* Main Content */}
            {song ? (
                <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
                     {/* Left/Top: Video Stage */}
                     <div className="w-full lg:w-1/2 bg-black flex flex-col items-center justify-center p-6 border-b lg:border-b-0 lg:border-r border-zinc-800 relative shadow-2xl z-10">
                         {/* Stage Lights Effect */}
                         <div className="absolute top-0 left-1/4 w-1/2 h-24 bg-cyan-500/10 blur-[80px]"></div>

                         <div className="w-full max-w-2xl aspect-video rounded-2xl overflow-hidden shadow-2xl border border-zinc-800 ring-1 ring-white/5 relative z-10 bg-zinc-900">
                             {song.youtubeId && !showFallback ? (
                                 <div className="relative w-full h-full group">
                                     <iframe 
                                        width="100%" 
                                        height="100%" 
                                        src={`https://www.youtube.com/embed/${song.youtubeId}?autoplay=0&rel=0&playsinline=1`} 
                                        title="YouTube video player" 
                                        frameBorder="0" 
                                        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                        allowFullScreen
                                    ></iframe>
                                    {/* Overlay button to handle errors manually */}
                                    <button 
                                        onClick={() => setShowFallback(true)}
                                        className="absolute top-2 right-2 bg-red-600/90 hover:bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 transition-opacity opacity-0 group-hover:opacity-100 z-50 backdrop-blur-sm"
                                        title="Click if video shows error 153 or fails to play"
                                    >
                                        <AlertTriangle size={12} /> Video Error?
                                    </button>
                                 </div>
                             ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-center p-6">
                                    <Disc size={48} className="text-zinc-700 mb-4 animate-spin-slow" />
                                    <p className="text-zinc-400 font-bold mb-2">Video Unavailable or Restricted</p>
                                    <p className="text-zinc-600 text-sm mb-6 max-w-xs">YouTube blocked this video from playing here. Open it in a new tab to listen while reading lyrics.</p>
                                    <a 
                                        href={song.youtubeId ? `https://www.youtube.com/watch?v=${song.youtubeId}` : `https://www.youtube.com/results?search_query=${encodeURIComponent(song.title + " " + song.artist + " official video")}`} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-full font-bold flex items-center gap-2 transition shadow-lg shadow-red-900/20"
                                    >
                                        <Play size={18} fill="currentColor"/> Watch on YouTube
                                    </a>
                                    {showFallback && (
                                        <button onClick={() => setShowFallback(false)} className="mt-4 text-xs text-zinc-500 hover:text-white underline">
                                            Try embedding again
                                        </button>
                                    )}
                                </div>
                             )}
                         </div>

                         <div className="mt-8 text-center relative z-10">
                             <h1 className="text-3xl md:text-4xl font-black text-white mb-2 tracking-tight">{song.title}</h1>
                             <p className="text-cyan-400 text-lg font-medium tracking-wide flex items-center justify-center gap-2">
                                 {song.artist}
                                 {song.youtubeId && !showFallback && (
                                     <a href={`https://www.youtube.com/watch?v=${song.youtubeId}`} target="_blank" rel="noreferrer" className="text-zinc-600 hover:text-white transition" title="Open in YouTube">
                                         <ExternalLink size={16} />
                                     </a>
                                 )}
                             </p>
                             {isKaraokeMode && <span className="inline-block mt-2 px-3 py-1 bg-cyan-900/50 text-cyan-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-cyan-800">Karaoke / Instrumental</span>}
                         </div>

                         {/* Recording Controls */}
                         <div className="mt-8 flex gap-4 items-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                             <button 
                                onClick={isRecording ? stopRecording : startRecording}
                                className={`p-5 rounded-full shadow-2xl transition-all transform hover:scale-105 flex items-center justify-center border-4 ${isRecording ? 'bg-red-600 border-red-400 animate-pulse' : 'bg-zinc-800 border-zinc-700 hover:border-cyan-500 hover:text-cyan-400'}`}
                             >
                                 {isRecording ? <StopCircle size={32} fill="currentColor" /> : <Mic size={32} />}
                             </button>
                             
                             {recordedAudio && !isRecording && (
                                 <button 
                                    onClick={playRecording}
                                    className="p-5 rounded-full bg-cyan-600 border-4 border-cyan-400 text-white shadow-lg hover:bg-cyan-500 transition-all flex items-center justify-center"
                                    title="Play your recording"
                                 >
                                     <Play size={32} fill="currentColor" />
                                 </button>
                             )}
                             
                             <div className="text-left">
                                 <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Practice</p>
                                 <p className="text-sm font-medium text-zinc-300">
                                     {isRecording ? "Recording your voice..." : recordedAudio ? "Recording ready to play!" : "Record yourself singing"}
                                 </p>
                             </div>
                         </div>
                     </div>

                     {/* Right/Bottom: Lyrics Scroll */}
                     <div className="w-full lg:w-1/2 bg-zinc-950 relative overflow-hidden flex flex-col">
                         <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/10 via-zinc-950 to-zinc-950 pointer-events-none"></div>
                         
                         <div className="flex-1 overflow-y-auto custom-scrollbar p-8 scroll-smooth" ref={scrollRef}>
                             <div className="space-y-10 py-[30vh]"> {/* Padding to allow centering top/bottom items */}
                                 {song.lyrics.map((line, idx) => {
                                     const isActive = idx === currentLine;
                                     return (
                                         <div 
                                            key={idx}
                                            onClick={() => {
                                                setCurrentLine(idx);
                                                // Optional: playLinePronunciation(idx); 
                                            }}
                                            className={`transition-all duration-500 cursor-pointer text-center group ${isActive ? 'scale-110 opacity-100 py-4' : 'opacity-30 hover:opacity-60 blur-[1px] hover:blur-0'}`}
                                         >
                                             <p className={`text-2xl md:text-3xl font-black mb-3 transition-all ${isActive ? 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-white to-cyan-200 drop-shadow-[0_0_15px_rgba(34,211,238,0.6)]' : 'text-zinc-300'}`}>
                                                 {line.original}
                                             </p>
                                             <p className={`text-lg md:text-xl font-serif italic transition-colors ${isActive ? 'text-cyan-400' : 'text-zinc-600'}`}>
                                                 {line.translation}
                                             </p>
                                             {isActive && (
                                                <div className="mt-2 flex justify-center gap-2">
                                                    <button onClick={(e) => { e.stopPropagation(); playLinePronunciation(idx); }} className="text-xs font-bold text-zinc-500 hover:text-white uppercase tracking-wider flex items-center gap-1 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
                                                        <Volume2 size={12}/> Pronounce
                                                    </button>
                                                </div>
                                             )}
                                         </div>
                                     )
                                 })}
                             </div>
                         </div>
                         
                         {/* Floating Control Tip */}
                         <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-zinc-900/80 backdrop-blur px-6 py-2 rounded-full border border-white/10 text-xs font-bold text-zinc-500 pointer-events-none whitespace-nowrap">
                             Scroll or tap lines to follow
                         </div>
                     </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center relative">
                     <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
                     <div className="relative z-10 text-center p-8 max-w-md">
                         <div className="w-32 h-32 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-8 border-4 border-zinc-800 shadow-2xl animate-[spin_10s_linear_infinite]">
                             <Disc size={64} className="text-zinc-700" />
                         </div>
                         <h2 className="text-4xl font-black text-white mb-4">Ready to Sing?</h2>
                         <p className="text-zinc-500 text-lg leading-relaxed font-medium mb-8">
                             Search for any song to load its official music video and synchronized lyrics.
                         </p>
                         <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 backdrop-blur-sm text-sm text-zinc-400">
                             <div className="flex items-center gap-2 mb-2 font-bold text-cyan-400">
                                 <Mic size={16} /> Pro Tip:
                             </div>
                             Toggle <strong>Karaoke Mode</strong> to find instrumental backing tracks and record your own cover!
                         </div>
                     </div>
                </div>
            )}
        </div>
    );
};
import React, { useState, useEffect } from 'react';
import { Volume2, RefreshCcw, Sparkles, Loader2, Image as ImageIcon, Eye, Globe } from 'lucide-react';
import { FlashcardData } from '../types';
import { generateImageForCard, generateTts } from '../services/geminiService';
import { playPcmAudio } from '../services/audioUtils';

interface FlashcardProps {
  data: FlashcardData;
  showSentences: boolean;
  onNext: (confidence: number) => void;
  primaryLang: string;
  targetLang: string;
  isFullScreen?: boolean;
}

export const Flashcard: React.FC<FlashcardProps> = ({ 
  data, 
  showSentences, 
  onNext,
  primaryLang,
  targetLang,
  isFullScreen = false
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [images, setImages] = useState<string[]>(data.images || []);
  const [loadingImage, setLoadingImage] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showSentenceTranslation, setShowSentenceTranslation] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<string>('Kore');

  useEffect(() => {
    setImages(data.images || []);
    setIsFlipped(false);
    setShowSentenceTranslation(false); 
  }, [data]);

  const playAudio = async (text: string) => {
    if (isPlayingAudio) return;
    setIsPlayingAudio(true);
    try {
        const cleanText = text.replace(/\n/g, ". ");
        let promptText = cleanText;
        if (selectedVoice === 'Zephyr') promptText = `Speak with a British accent: ${cleanText}`;
        else if (selectedVoice === 'Puck') promptText = `Speak with a relaxed accent: ${cleanText}`;

        const audioBase64 = await generateTts(promptText, selectedVoice);
        if (audioBase64) await playPcmAudio(audioBase64);
    } catch (e) {
        console.error("Error playing audio", e);
    } finally {
        setIsPlayingAudio(false);
    }
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleNext = (e: React.MouseEvent, confidence: number) => {
      e.stopPropagation();
      onNext(confidence);
  }

  const handleEnhanceImage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoadingImage(true);
    // Regenerate just the first concept for simplicity in this demo, or append
    const prompt = `3D clay style sticker, isolated, white background: ${data.word}`;
    const newImage = await generateImageForCard(prompt);
    if (newImage) {
        setImages([newImage]); // Replace with new
    }
    setLoadingImage(false);
  }

  const handleVoiceChange = (e: React.MouseEvent, voice: string) => {
    e.stopPropagation();
    setSelectedVoice(voice);
  };

  const containerClass = isFullScreen 
    ? "w-full max-w-7xl h-[85vh] perspective-1000 mx-auto relative group" 
    : "w-full max-w-4xl h-[600px] perspective-1000 mx-auto my-8 relative group";

  const titleSize = isFullScreen ? "text-9xl" : "text-7xl";
  const translationSize = isFullScreen ? "text-8xl" : "text-6xl";
  const isLongText = data.sentence && data.sentence.length > 80;
  
  const sentenceClass = isLongText 
    ? "text-2xl text-left leading-relaxed max-h-[250px] overflow-y-auto pr-2 custom-scrollbar" 
    : isFullScreen ? "text-5xl font-light italic" : "text-4xl font-light italic";

  return (
    <div className={containerClass}>
      <div 
        className={`relative w-full h-full text-center transition-transform duration-700 transform-style-3d cursor-pointer shadow-2xl rounded-[3rem] ${isFlipped ? 'rotate-y-180' : ''}`}
        onClick={handleFlip}
      >
        {/* FRONT */}
        <div className="absolute w-full h-full backface-hidden bg-white/90 backdrop-blur-xl rounded-[3rem] overflow-hidden flex flex-col shadow-2xl border border-white/60">
           {/* Image Container */}
           <div className="h-[60%] w-full relative bg-gradient-to-b from-white to-gray-50 overflow-hidden group-image flex items-center justify-center p-4">
                {/* Render Multiple Images Floating */}
                <div className="flex items-center justify-center w-full h-full gap-4">
                    {images.map((img, idx) => (
                        <img 
                            key={idx}
                            src={img} 
                            alt={`${data.word} part ${idx}`} 
                            className={`object-contain transition-transform duration-500 group-hover:scale-105 ${images.length > 1 ? 'max-w-[45%] h-[90%]' : 'max-w-[90%] h-[90%]'}`}
                            style={{ 
                                filter: 'drop-shadow(0px 20px 30px rgba(0,0,0,0.15))',
                                transform: `rotate(${idx % 2 === 0 ? '-2deg' : '2deg'})`
                            }}
                        />
                    ))}
                    {images.length === 0 && (
                        <div className="text-gray-300 flex flex-col items-center">
                            <ImageIcon size={64} />
                            <p className="mt-2 font-semibold">No Image</p>
                        </div>
                    )}
                </div>
                
                <div className="absolute top-6 right-6 z-10 flex gap-2">
                    <button 
                        onClick={handleEnhanceImage}
                        className="bg-white/90 backdrop-blur px-5 py-2.5 rounded-full hover:bg-white text-indigo-600 shadow-xl transition flex items-center gap-2 font-bold text-sm"
                    >
                       {loadingImage ? <Loader2 className="animate-spin" size={16}/> : <Sparkles size={16}/>}
                       <span>Remix</span>
                    </button>
                </div>
           </div>

           {/* Text Container */}
           <div className="h-[40%] flex flex-col items-center justify-center p-4 bg-white">
                <h2 className={`${titleSize} font-black text-slate-800 mb-6 tracking-tight line-clamp-2 leading-tight drop-shadow-sm`}>{data.word}</h2>
                <button 
                    onClick={(e) => { e.stopPropagation(); playAudio(data.word); }}
                    className={`mt-2 px-8 py-3 rounded-full transition flex items-center gap-2 text-lg font-bold border-2 ${isPlayingAudio ? 'border-indigo-400 text-indigo-400 bg-indigo-50' : 'border-indigo-600 text-indigo-600 hover:bg-indigo-600 hover:text-white shadow-lg hover:shadow-indigo-200'}`}
                >
                    {isPlayingAudio ? <Loader2 className="animate-spin" size={24}/> : <Volume2 size={24} />}
                    {isPlayingAudio ? 'Speaking...' : 'Pronounce'}
                </button>
           </div>
        </div>

        {/* BACK */}
        <div className="absolute w-full h-full backface-hidden rotate-y-180 bg-indigo-900 text-white rounded-[3rem] flex flex-col shadow-2xl overflow-hidden border border-indigo-700">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 to-purple-900 opacity-100 z-0"></div>
            
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-8 lg:p-12 overflow-y-auto">
                <h3 className="text-sm uppercase tracking-[0.2em] text-indigo-300 mb-4 font-bold">{primaryLang} Translation</h3>
                <h2 className={`${isLongText ? 'text-4xl' : translationSize} font-black mb-10 leading-tight drop-shadow-md`}>{data.translation}</h2>
                
                {(showSentences || isLongText) && data.sentence && (
                    <div className="w-full max-w-5xl bg-white/10 p-10 rounded-3xl backdrop-blur-md border border-white/10 flex flex-col gap-6 text-left shadow-2xl relative">
                        <div className="flex justify-between items-start gap-4">
                             <div className={sentenceClass}>
                                {isLongText ? data.sentence.split('\n').map((line, i) => <p key={i} className="mb-3">{line}</p>) : `"${data.sentence}"`}
                             </div>
                             <div className="flex flex-col gap-4 items-end">
                                <div className="flex flex-col items-center gap-2">
                                     <button 
                                        onClick={(e) => { e.stopPropagation(); playAudio(data.sentence!); }}
                                        className="flex-shrink-0 text-indigo-200 hover:text-white transition p-4 rounded-full hover:bg-indigo-600 bg-indigo-800 shadow-lg border border-indigo-500/50"
                                    >
                                        {isPlayingAudio ? <Loader2 className="animate-spin" size={28}/> : <Volume2 size={32} />}
                                    </button>
                                </div>
                             </div>
                        </div>
                        
                        {data.sentenceTranslation && (
                             <div className="pt-6 border-t border-white/10 min-h-[60px] flex items-center justify-between">
                                {!showSentenceTranslation ? (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setShowSentenceTranslation(true); }}
                                        className="flex items-center gap-2 text-indigo-300 hover:text-white text-sm font-bold uppercase tracking-wider border border-indigo-500/50 rounded-full px-5 py-2 hover:bg-indigo-600 transition"
                                    >
                                        <Eye size={18} /> Reveal Translation
                                    </button>
                                ) : (
                                    <p className="text-indigo-100 text-2xl italic animate-in fade-in slide-in-from-top-2 font-medium">{data.sentenceTranslation}</p>
                                )}

                                 <div className="flex bg-black/20 p-1.5 rounded-full border border-white/10 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
                                    <button onClick={(e) => handleVoiceChange(e, 'Kore')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${selectedVoice === 'Kore' ? 'bg-indigo-500 text-white shadow' : 'text-indigo-300 hover:text-white'}`}>🇺🇸 US</button>
                                    <button onClick={(e) => handleVoiceChange(e, 'Zephyr')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${selectedVoice === 'Zephyr' ? 'bg-indigo-500 text-white shadow' : 'text-indigo-300 hover:text-white'}`}>🇬🇧 UK</button>
                                    <button onClick={(e) => handleVoiceChange(e, 'Puck')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${selectedVoice === 'Puck' ? 'bg-indigo-500 text-white shadow' : 'text-indigo-300 hover:text-white'}`}>🎧 Urban</button>
                                 </div>
                             </div>
                        )}
                    </div>
                )}
            </div>

            <div className="relative z-10 p-6 bg-black/20 backdrop-blur-md border-t border-white/10 flex justify-center gap-6 flex-shrink-0">
                  <button onClick={(e) => handleNext(e, 1)} className="flex-1 py-4 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-black shadow-lg transform hover:-translate-y-1 transition text-xl">Again</button>
                  <button onClick={(e) => handleNext(e, 3)} className="flex-1 py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black shadow-lg transform hover:-translate-y-1 transition text-xl">Hard</button>
                  <button onClick={(e) => handleNext(e, 5)} className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black shadow-lg transform hover:-translate-y-1 transition text-xl">Easy</button>
            </div>
        </div>
      </div>
    </div>
  );
};
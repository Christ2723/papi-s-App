import React, { useEffect, useRef, useState } from 'react';
import { connectLiveSession } from '../services/geminiService';
import { createPcmBlob, decodeAudioData, base64ToUint8Array } from '../services/audioUtils';
import { LiveServerMessage } from '@google/genai';
import { Mic, MicOff, X, User, Bot, Loader2, MessageSquare, Activity, History, Square } from 'lucide-react';
import { Logo } from './Logo';
import { TranscriptItem } from '../types';

interface LiveTutorProps {
  onClose: () => void;
  targetLang: string;
  nativeLang: string;
  history: TranscriptItem[];
  setHistory: React.Dispatch<React.SetStateAction<TranscriptItem[]>>;
}

export const LiveTutor: React.FC<LiveTutorProps> = ({ onClose, targetLang, nativeLang, history, setHistory }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [status, setStatus] = useState("Initializing...");
  
  // Local "Streaming" state (buffer)
  const [currentInput, setCurrentInput] = useState("");
  const [currentOutput, setCurrentOutput] = useState("");
  
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Audio Context Refs
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // Accumulate text buffers for current turn
  const currentInputRef = useRef("");
  const currentOutputRef = useRef("");

  // Cleanup function
  const cleanup = () => {
    if (sessionRef.current) {
      sessionRef.current.close();
    }
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
    }
    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close();
    }
    setIsConnected(false);
  };

  // Scroll to bottom whenever transcripts or partials change
  useEffect(() => {
    if (transcriptEndRef.current) {
        transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history, currentInput, currentOutput]);

  useEffect(() => {
    let mounted = true;

    const startSession = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

        const sessionPromise = connectLiveSession(
          targetLang,
          nativeLang,
          () => {
            if (!mounted) return;
            setIsConnected(true);
            setStatus(`Listening in ${targetLang}...`);

            // Setup Audio Input Stream
            const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              if (isMuted) return; // Simple mute logic
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createPcmBlob(inputData);
              
              sessionPromise.then(session => {
                 session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current!.destination);
          },
          async (message: LiveServerMessage) => {
             // Handle Audio Output
             const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
             if (base64Audio && outputAudioContextRef.current) {
                const ctx = outputAudioContextRef.current;
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                
                const audioBuffer = await decodeAudioData(
                    base64ToUint8Array(base64Audio),
                    ctx,
                    24000
                );

                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(ctx.destination);
                source.addEventListener('ended', () => {
                    sourcesRef.current.delete(source);
                });
                
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                sourcesRef.current.add(source);
             }

             // Handle Transcriptions
             const content = message.serverContent;
             
             if (content?.inputTranscription) {
                 currentInputRef.current += content.inputTranscription.text;
                 setCurrentInput(currentInputRef.current);
             }
             
             if (content?.outputTranscription) {
                 currentOutputRef.current += content.outputTranscription.text;
                 setCurrentOutput(currentOutputRef.current);
             }
             
             // Commit transcript on turn complete or interrupt
             // CRITICAL FIX: Ensure we save to history before clearing buffers
             const turnComplete = content?.turnComplete;
             const interrupted = content?.interrupted;

             if (turnComplete || interrupted) {
                 setHistory(prev => {
                     const newHistory = [...prev];
                     // Only add if there is content and it's not a duplicate of the last message
                     if (currentInputRef.current.trim()) {
                         newHistory.push({ role: 'user', text: currentInputRef.current });
                     }
                     if (currentOutputRef.current.trim()) {
                         newHistory.push({ role: 'model', text: currentOutputRef.current });
                     }
                     return newHistory;
                 });
                 
                 // Clear buffers AFTER queuing update
                 currentInputRef.current = "";
                 currentOutputRef.current = "";
                 setCurrentInput("");
                 setCurrentOutput("");
             }
          },
          () => {
            if(mounted) setStatus("Disconnected");
          },
          (err) => {
             console.error(err);
             if(mounted) setStatus("Error connecting");
          }
        );

        sessionRef.current = await sessionPromise;

      } catch (e) {
        console.error("Failed to start live session", e);
        setStatus("Microphone access failed.");
      }
    };

    startSession();

    return () => {
      mounted = false;
      cleanup();
    };
  }, [targetLang, nativeLang, setHistory]); 

  const toggleMute = () => {
      setIsMuted(!isMuted);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex animate-in fade-in duration-300 font-sans overflow-hidden">
      
      {/* --- LEFT AREA: VISUAL STAGE (The "Metallic Microphone") --- */}
      <div className="flex-1 relative flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-800 via-gray-950 to-black overflow-hidden border-r border-white/10">
          
          {/* Background Ambient Effects */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
              <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px] transition-opacity duration-1000 ${isConnected ? 'opacity-100' : 'opacity-0'}`}></div>
          </div>

          {/* Top Left Branding */}
          <div className="absolute top-8 left-8 flex items-center gap-3 z-20">
              <div className="p-2 bg-white/5 rounded-xl border border-white/10 backdrop-blur-md">
                 <Logo size={28} />
              </div>
              <div>
                  <h2 className="text-xl font-black tracking-tight text-white">Voice Tutor</h2>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{targetLang} Conversation</p>
              </div>
          </div>

          {/* MAIN VISUALIZER CIRCLE */}
          <div className="relative z-10 flex flex-col items-center">
              
              {/* The Metallic Microphone Orb */}
              <div className="relative group cursor-pointer" onClick={toggleMute}>
                  {/* Outer Glows/Rings - Animated */}
                  {isConnected && !isMuted && (
                      <>
                        <div className="absolute inset-0 rounded-full border border-gray-400/30 animate-[ping_2s_linear_infinite]"></div>
                        <div className="absolute -inset-4 rounded-full border border-gray-400/20 animate-[ping_3s_linear_infinite]"></div>
                      </>
                  )}
                  
                  {/* METALLIC BODY STRUCTURE */}
                  <div className={`w-56 h-56 rounded-full flex items-center justify-center shadow-[0_10px_40px_rgba(0,0,0,0.8)] transition-all duration-500 relative overflow-hidden border-4 ${isMuted ? 'border-red-900 bg-red-950/50' : 'border-gray-400 bg-gray-300'}`}>
                      
                      {/* Metallic Gradient Simulation */}
                      {!isMuted && (
                          <>
                            <div className="absolute inset-0 bg-gradient-to-br from-gray-100 via-gray-400 to-gray-800 opacity-90"></div>
                            <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_40%,rgba(255,255,255,0.4)_45%,transparent_50%)]"></div>
                            {/* Texture mesh */}
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
                          </>
                      )}
                      
                      {/* Inner Recessed Circle */}
                      <div className="absolute inset-4 rounded-full bg-gradient-to-tl from-black via-gray-900 to-gray-800 shadow-inner flex items-center justify-center border border-gray-600/50">
                          {/* The Icon */}
                          <div className={`relative z-10 transition-transform duration-300 ${isConnected && !isMuted ? 'scale-110' : 'scale-100'}`}>
                              {isMuted ? (
                                  <MicOff size={80} className="text-red-500 drop-shadow-[0_2px_10px_rgba(239,68,68,0.5)]" />
                              ) : (
                                  // Steel/Blueish tint for active mic
                                  <Mic size={80} className="text-gray-200 drop-shadow-[0_2px_5px_rgba(0,0,0,0.8)] fill-gray-400/20" strokeWidth={1.5} />
                              )}
                          </div>
                      </div>
                  </div>
              </div>

              {/* Status Text */}
              <div className="mt-12 text-center space-y-2">
                  <h3 className={`text-3xl font-black tracking-tight transition-colors duration-300 ${isMuted ? 'text-red-400' : 'text-gray-200'}`}>
                      {status}
                  </h3>
                  <p className="text-gray-500 text-lg font-medium">
                      {isMuted ? "Tap microphone to resume" : "Speak naturally. I'm listening."}
                  </p>
              </div>

              {/* Waveform Visualization (Simulated) */}
              {!isMuted && isConnected && (
                  <div className="mt-8 flex items-center gap-1.5 h-12">
                      {[...Array(12)].map((_, i) => (
                          <div 
                            key={i} 
                            className="w-1.5 bg-gray-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                            style={{ 
                                height: `${20 + Math.random() * 80}%`,
                                animationDuration: `${0.4 + Math.random() * 0.4}s` 
                            }}
                          ></div>
                      ))}
                  </div>
              )}
          </div>

          {/* Bottom Stop Button */}
          <div className="absolute bottom-10 z-20">
               <button 
                  onClick={onClose}
                  className="flex items-center gap-3 px-8 py-4 bg-zinc-900/60 hover:bg-red-900/40 border border-zinc-700 hover:border-red-500/50 text-zinc-300 hover:text-red-100 rounded-full transition-all duration-300 backdrop-blur-md shadow-lg group font-bold tracking-wide uppercase text-sm"
              >
                  <div className="p-1.5 bg-zinc-800 group-hover:bg-red-500/20 rounded-md transition-colors">
                    <Square size={14} className="fill-current group-hover:text-red-400" />
                  </div>
                  End Session & Return
              </button>
          </div>
      </div>

      {/* --- RIGHT AREA: PERSISTENT SIDEBAR TRANSCRIPT --- */}
      <div className="w-[600px] bg-gray-900 border-l border-white/10 flex flex-col shadow-2xl relative z-40">
          
          {/* Header */}
          <div className="h-20 flex items-center justify-between px-6 border-b border-white/10 bg-gray-900/95 backdrop-blur z-20">
              <div className="flex items-center gap-3 text-indigo-400">
                  <MessageSquare size={24} />
                  <span className="text-sm font-black uppercase tracking-widest text-gray-300">Conversation History</span>
              </div>
              <button 
                onClick={onClose} 
                className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition"
              >
                  <X size={24} />
              </button>
          </div>

          {/* Chat History List */}
          <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar bg-black/40">
               {history.length === 0 && !currentInput && !currentOutput && (
                   <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-50 space-y-6">
                       <div className="w-24 h-24 rounded-full bg-gray-800 flex items-center justify-center border border-gray-700">
                            <History size={40} className="text-gray-500"/>
                       </div>
                       <p className="text-center text-xl font-medium leading-relaxed max-w-[300px]">
                           Start speaking.<br/>Your conversation is saved here.
                       </p>
                   </div>
               )}

               {/* Render Past Transcripts (Global History) */}
               {history.map((item, idx) => (
                   <div key={idx} className={`flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300 ${item.role === 'user' ? 'items-end' : 'items-start'}`}>
                       <span className="text-xs font-bold text-gray-500 mb-2 px-1 uppercase tracking-wider flex items-center gap-1.5">
                           {item.role === 'user' ? <User size={12}/> : <Bot size={12}/>} {item.role === 'user' ? 'You' : 'Tutor'}
                       </span>
                       <div className={`p-6 rounded-3xl max-w-[90%] text-2xl leading-relaxed shadow-lg font-medium ${
                           item.role === 'user' 
                           ? 'bg-indigo-600 text-white rounded-tr-sm shadow-indigo-900/20' 
                           : 'bg-zinc-800 text-gray-100 rounded-tl-sm border border-zinc-700'
                       }`}>
                           {item.text}
                       </div>
                   </div>
               ))}

               {/* Render Real-time "Streaming" Bubbles (Partials) */}
               
               {currentInput && (
                    <div className="flex flex-col items-end opacity-90">
                        <span className="text-xs font-bold text-indigo-400 mb-2 px-1 uppercase tracking-wider flex items-center gap-1.5">
                            <Activity size={12} className="animate-pulse"/> Speaking...
                        </span>
                        <div className="p-6 rounded-3xl max-w-[90%] text-2xl leading-relaxed bg-indigo-900/40 text-indigo-100 rounded-tr-sm border border-indigo-500/30 border-dashed">
                           {currentInput}
                        </div>
                    </div>
               )}
               
               {currentOutput && (
                    <div className="flex flex-col items-start opacity-90">
                        <span className="text-xs font-bold text-gray-400 mb-2 px-1 uppercase tracking-wider flex items-center gap-1.5">
                             <Loader2 size={12} className="animate-spin"/> Thinking...
                        </span>
                        <div className="p-6 rounded-3xl max-w-[90%] text-2xl leading-relaxed bg-zinc-800/60 text-gray-300 rounded-tl-sm border border-zinc-700 border-dashed">
                           {currentOutput}
                        </div>
                    </div>
               )}
               
               {/* Invisible element to scroll to */}
               <div ref={transcriptEndRef} className="h-4" />
          </div>
      </div>

    </div>
  );
};
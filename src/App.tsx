
import React, { useState, useEffect, useRef } from 'react';
import { 
  Menu, Settings, BookOpen, Mic, Image as ImageIcon, Download, 
  ChevronRight, Sparkles, Languages, Layout,
  Maximize, Minimize, Hash, Book, FileQuestion, Presentation, List, Monitor,
  Feather,
  AlignLeft,
  PieChart,
  Trophy,
  RotateCcw,
  Grid,
  Rocket,
  Music,
  Map,
  ArrowLeft,
  Layers,
  LogOut,
  User as UserIcon
} from 'lucide-react';
import jsPDF from 'jspdf';
import PptxGenJS from 'pptxgenjs';
import { generateVocabulary } from './services/geminiService';
import { FlashcardData, Level, Category, Language, AppMode, GrammarLesson, QuizQuestion, StoryData, TranscriptItem, User, UserRole } from './types';
import { getCurrentUser, logoutUser, logActivity, saveUser, markTopicAsCompleted } from './services/storageService';
import { LESSON_PLAN } from './curriculum';
import { Flashcard } from './components/Flashcard';
import { LiveTutor } from './components/LiveTutor';
import { ImageEditor } from './components/ImageEditor';
import { GrammarStudio } from './components/GrammarStudio';
import { ExamRoom } from './components/ExamRoom';
import { StoryFactory } from './components/StoryFactory';
import { ReadingPractice } from './components/ReadingPractice';
import { Logo } from './components/Logo';
import { VocabularyList } from './components/VocabularyList';
import { MusicPlayer } from './components/MusicPlayer';
import { SyllabusView } from './components/SyllabusView';
import { ClassProgram } from './components/ClassProgram';
import { AuthScreen } from './components/AuthScreen';
import { TreasureMap } from './components/TreasureMap';
import { AdminDashboard } from './components/AdminDashboard';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // App State
  const [mode, setMode] = useState<AppMode>(AppMode.Dashboard);
  const [history, setHistory] = useState<AppMode[]>([AppMode.Dashboard]);
  
  // Lesson Launch Params (When opening ClassProgram from Map)
  const [activeLessonParams, setActiveLessonParams] = useState<{topic: string, index: number} | null>(null);

  // Settings
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [level, setLevel] = useState<Level>(Level.A1);
  const [studyMode, setStudyMode] = useState<'random' | 'structured'>('random');
  const [category, setCategory] = useState<Category>(Category.Random); 
  const [selectedLessonIndex, setSelectedLessonIndex] = useState<number>(0); 
  const [targetLang, setTargetLang] = useState<Language>(Language.English);
  const [primaryLang, setPrimaryLang] = useState<Language>(Language.Spanish);
  const [includeSentences, setIncludeSentences] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [cardCount, setCardCount] = useState<number>(5);

  // Content State
  const [cards, setCards] = useState<FlashcardData[]>([]);
  const [currentGrammarLesson, setCurrentGrammarLesson] = useState<GrammarLesson | null>(null);
  const [currentQuiz, setCurrentQuiz] = useState<QuizQuestion[]>([]);
  const [currentStory, setCurrentStory] = useState<StoryData | null>(null);
  const [liveHistory, setLiveHistory] = useState<TranscriptItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSessionComplete, setIsSessionComplete] = useState(false);

  // Time Tracking Refs
  const startTimeRef = useRef<number>(Date.now());
  const currentModeRef = useRef<AppMode>(AppMode.Dashboard);

  // --- AUTH & INIT ---
  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
        setCurrentUser(user);
        setTargetLang(user.targetLang);
        setPrimaryLang(user.nativeLang);
        setLevel(user.currentLevel);
    }
  }, []);

  // --- TIME TRACKING LOGIC ---
  useEffect(() => {
    const endTime = Date.now();
    const duration = (endTime - startTimeRef.current) / 1000;
    
    if (currentUser && duration > 5 && currentModeRef.current !== AppMode.Dashboard) {
        logActivity(currentUser.id, currentModeRef.current, duration);
    }

    startTimeRef.current = Date.now();
    currentModeRef.current = mode;

    return () => {
        const end = Date.now();
        const dur = (end - startTimeRef.current) / 1000;
        if (currentUser && dur > 5 && currentModeRef.current !== AppMode.Dashboard) {
             logActivity(currentUser.id, currentModeRef.current, dur);
        }
    };
  }, [mode, currentUser]);

  const handleLogin = (user: User) => {
      setCurrentUser(user);
      setTargetLang(user.targetLang);
      setPrimaryLang(user.nativeLang);
      setLevel(user.currentLevel);
      setMode(AppMode.Dashboard);
      setHistory([AppMode.Dashboard]);
  };

  const handleLogout = () => {
      logoutUser();
      setCurrentUser(null);
  };

  const updatePreferences = (updates: Partial<User>) => {
      if (!currentUser) return;
      const updatedUser = { ...currentUser, ...updates };
      setCurrentUser(updatedUser);
      saveUser(updatedUser); 
      if (updates.targetLang) setTargetLang(updates.targetLang);
      if (updates.nativeLang) setPrimaryLang(updates.nativeLang);
      if (updates.currentLevel) setLevel(updates.currentLevel);
  };

  // --- NAVIGATION HANDLERS ---
  const navigate = (newMode: AppMode, params?: any) => {
      setHistory(prev => {
          if (prev[prev.length - 1] === newMode) return prev;
          return [...prev, newMode];
      });
      setMode(newMode);

      // Handle Map -> Class Program Launch
      if (newMode === AppMode.ClassProgram && params && params.topic) {
          setActiveLessonParams({ topic: params.topic, index: params.index });
      } else {
          setActiveLessonParams(null);
      }
  };

  const goBack = () => {
      if (history.length > 1) {
          const newHistory = [...history];
          newHistory.pop(); // Remove current
          const prevMode = newHistory[newHistory.length - 1];
          setHistory(newHistory);
          setMode(prevMode);
          setActiveLessonParams(null); // Clear active lesson params on back
      }
  };

  // Called when ClassProgram finishes "Outro" or user manually closes it successfully
  const handleClassCompletion = () => {
      if (activeLessonParams && currentUser) {
          markTopicAsCompleted(currentUser.id, activeLessonParams.topic);
      }
      goBack();
  };

  const handleRoadmapNavigation = (type: 'vocab' | 'grammar' | 'conversation' | 'expression' | 'exam', topic: string) => {
      switch(type) {
          case 'vocab':
              navigate(AppMode.Flashcards);
              setCategory(topic as unknown as Category);
              setStudyMode('random');
              setCardCount(20); 
              handleGenerateDeck(topic as unknown as Category, 20);
              break;
          case 'grammar':
              navigate(AppMode.Grammar);
              break;
          case 'conversation':
              navigate(AppMode.VoiceTutor);
              break;
          case 'expression':
              navigate(AppMode.Flashcards);
              setCategory(topic as unknown as Category);
              setStudyMode('random');
              setCardCount(10); 
              handleGenerateDeck(topic as unknown as Category, 10);
              break;
          case 'exam':
              navigate(AppMode.Exam);
              break;
      }
  };

  const handleGenerateDeck = async (overrideCategory?: Category, overrideCount?: number) => {
    setIsLoading(true);
    setIsSessionComplete(false);
    setCards([]);
    
    let finalCategory = overrideCategory || category;
    if (!overrideCategory && studyMode === 'structured') {
        const lessonTopic = LESSON_PLAN[level][selectedLessonIndex];
        finalCategory = `Lesson ${selectedLessonIndex + 1}: ${lessonTopic}` as unknown as Category;
    }
    
    const countToGen = overrideCount || cardCount;
    const forceSentences = includeSentences || category === Category.Conversation || category === Category.Reading;
    
    const newCards = await generateVocabulary(level, finalCategory, targetLang, primaryLang, forceSentences, countToGen);
    setCards(newCards);
    setCurrentIndex(0);
    setIsLoading(false);
  };

  const handleNextCard = (confidence: number) => {
    const updatedCards = [...cards];
    let mastery = 0;
    if (confidence === 5) mastery = 100;
    else if (confidence === 3) mastery = 50;
    else mastery = 0;
    updatedCards[currentIndex].masteryLevel = mastery;

    if (currentIndex >= updatedCards.length - 1) {
        const cardsToRepeat = updatedCards.filter(c => c.masteryLevel < 100);
        if (cardsToRepeat.length > 0) {
            alert(`Round Complete! Reviewing ${cardsToRepeat.length} cards that need practice.`);
            setCards(cardsToRepeat);
            setCurrentIndex(0);
        } else {
            setCards(updatedCards); 
            setIsSessionComplete(true);
        }
    } else {
        setCards(updatedCards);
        setCurrentIndex(prev => prev + 1);
    }
  };

  const toggleBrowserFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
          console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const hasContentToExport = () => {
      if (mode === AppMode.Flashcards && cards.length > 0) return true;
      if (mode === AppMode.Grammar && currentGrammarLesson) return true;
      if (mode === AppMode.Exam && currentQuiz.length > 0) return true;
      if (mode === AppMode.Stories && currentStory) return true;
      return false;
  }

  const getModeColorClass = (m: AppMode, isActive: boolean) => {
    const base = "w-full text-left px-4 py-4 rounded-xl flex items-center gap-4 transition-all duration-200 font-bold tracking-wide ";
    if (!isActive) return base + "text-zinc-500 hover:text-white hover:bg-zinc-900";
    if (m === AppMode.Dashboard) return base + "bg-amber-600 text-white shadow-lg shadow-amber-900/50";
    return base + "bg-indigo-600 text-white shadow-lg shadow-indigo-900/50"; 
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    let yPos = 20;
    doc.setFontSize(22);
    doc.setTextColor(245, 158, 11);
    doc.text("Payero Language School", 105, yPos, { align: "center" });
    doc.setTextColor(0);
    yPos += 10;
    doc.setFontSize(12);
    doc.text(`Level: ${level} | ${targetLang}`, 105, yPos, { align: "center" });
    yPos += 20;

    if (mode === AppMode.Flashcards) {
        doc.setFontSize(16); doc.text("Vocabulary List", 20, yPos); yPos += 10; doc.setFontSize(12);
        cards.forEach((card, i) => {
            if (yPos > 270) { doc.addPage(); yPos = 20; }
            doc.setFont("helvetica", "bold"); doc.text(`${i+1}. ${card.word}`, 20, yPos);
            doc.setFont("helvetica", "normal"); doc.text(` - ${card.translation}`, 80, yPos); yPos += 10;
        });
    }
    doc.save(`payero_${mode.toLowerCase()}.pdf`);
  };

  const exportToPPT = async () => {
      const pres = new PptxGenJS();
      pres.layout = 'CLEAN_WHITE';
      let slide = pres.addSlide();
      slide.addText("Payero Language School", { x: 1, y: 1.5, w: '80%', fontSize: 36, color: 'F59E0B', align: 'center', bold: true });
      await pres.writeFile({ fileName: `payero_${mode.toLowerCase()}.pptx` });
  }

  // --- RENDER ---
  if (!currentUser) {
      return <AuthScreen onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-black overflow-hidden font-poppins text-gray-800">
      
      {/* LEFT SIDEBAR */}
      <aside className="w-72 bg-black border-r border-zinc-900 flex flex-col shadow-2xl z-20">
        <div className="p-8 border-b border-zinc-900 bg-black">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-zinc-900 p-2 rounded-xl border border-zinc-800 shadow-inner">
                <Logo size={32} />
            </div>
            <div>
                 <h1 className="text-lg font-bold leading-tight text-white tracking-tight">Payero</h1>
                 <h1 className="text-xs font-bold leading-tight text-amber-500 tracking-widest uppercase">School</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4 bg-zinc-900/50 p-2 rounded-lg">
             <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                 {currentUser.name.charAt(0)}
             </div>
             <div className="overflow-hidden">
                 <p className="text-white text-xs font-bold truncate">{currentUser.name}</p>
                 <p className="text-zinc-500 text-[10px] uppercase">{currentUser.role}</p>
             </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-8 custom-scrollbar">
            <div className="space-y-2">
                <label className="px-4 text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2 block">Main</label>
                <button onClick={() => navigate(AppMode.Dashboard)} className={getModeColorClass(AppMode.Dashboard, mode === AppMode.Dashboard)}>
                    {currentUser.role === UserRole.Student ? <Map size={20} /> : <Layout size={20} />} 
                    {currentUser.role === UserRole.Student ? "Adventure Map" : "Dashboard"}
                </button>
            </div>

            <div className="space-y-2">
                <label className="px-4 text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2 block">Classroom</label>
                <button onClick={() => navigate(AppMode.Syllabus)} className={getModeColorClass(AppMode.Syllabus, mode === AppMode.Syllabus)}><Map size={20} /> Learning Roadmap</button>
                <button onClick={() => navigate(AppMode.ClassProgram)} className={getModeColorClass(AppMode.ClassProgram, mode === AppMode.ClassProgram)}><Layers size={20} /> Class Program</button>
                <button onClick={() => navigate(AppMode.Flashcards)} className={getModeColorClass(AppMode.Flashcards, mode === AppMode.Flashcards)}><BookOpen size={20} /> Vocabulary</button>
                <button onClick={() => navigate(AppMode.Grammar)} className={getModeColorClass(AppMode.Grammar, mode === AppMode.Grammar)}><Book size={20} /> Grammar Lab</button>
                <button onClick={() => navigate(AppMode.Stories)} className={getModeColorClass(AppMode.Stories, mode === AppMode.Stories)}><Feather size={20} /> Story Teller</button>
                <button onClick={() => navigate(AppMode.Exam)} className={getModeColorClass(AppMode.Exam, mode === AppMode.Exam)}><FileQuestion size={20} /> Quiz & Exam</button>
            </div>

            <div className="space-y-2">
                <label className="px-4 text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2 block">Practice Tools</label>
                <button onClick={() => navigate(AppMode.VoiceTutor)} className={getModeColorClass(AppMode.VoiceTutor, mode === AppMode.VoiceTutor)}><Mic size={20} /> Voice Tutor</button>
                <button onClick={() => navigate(AppMode.ReadingPractice)} className={getModeColorClass(AppMode.ReadingPractice, mode === AppMode.ReadingPractice)}><AlignLeft size={20} /> Pronunciation</button>
                <button onClick={() => navigate(AppMode.MusicPractice)} className={getModeColorClass(AppMode.MusicPractice, mode === AppMode.MusicPractice)}><Music size={20} /> Lyrical Lab</button>
                <button onClick={() => navigate(AppMode.ImageStudio)} className={getModeColorClass(AppMode.ImageStudio, mode === AppMode.ImageStudio)}><ImageIcon size={20} /> Creative Studio</button>
            </div>

            {/* Global Settings Section */}
            <div className="bg-zinc-900/50 p-5 rounded-3xl border border-zinc-800 shadow-inner mt-4 space-y-5">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">Target Language</label>
                    <div className="relative">
                        <select 
                            value={targetLang} 
                            onChange={(e) => updatePreferences({ targetLang: e.target.value as Language })} 
                            className="w-full p-3 bg-black border border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-600 text-sm font-bold text-white appearance-none shadow-sm transition-all hover:border-zinc-700 cursor-pointer"
                        >
                            {Object.values(Language).map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                        <ChevronRight size={14} className="absolute right-3 top-3.5 text-zinc-500 pointer-events-none rotate-90"/>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">Native Language</label>
                     <div className="relative">
                        <select 
                            value={primaryLang} 
                            onChange={(e) => updatePreferences({ nativeLang: e.target.value as Language })} 
                            className="w-full p-3 bg-black border border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-600 text-sm font-bold text-zinc-400 appearance-none shadow-sm transition-all hover:border-zinc-700 cursor-pointer"
                        >
                            {Object.values(Language).map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                         <ChevronRight size={14} className="absolute right-3 top-3.5 text-zinc-500 pointer-events-none rotate-90"/>
                    </div>
                </div>

                <hr className="border-zinc-800"/>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">Proficiency</label>
                    <div className="grid grid-cols-3 gap-2">
                        {Object.values(Level).map((l) => (
                            <button 
                                key={l} 
                                onClick={() => updatePreferences({ currentLevel: l })} 
                                className={`py-2 rounded-lg text-[10px] font-black transition-all ${level === l ? 'bg-white text-black shadow-md shadow-white/20' : 'bg-black text-zinc-600 hover:bg-zinc-900 border border-zinc-800'}`}
                            >
                                {l}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            
            <button onClick={handleLogout} className="w-full text-left px-4 py-3 rounded-xl flex items-center gap-4 transition-all duration-200 font-bold tracking-wide text-red-400 hover:bg-red-900/20 hover:text-red-300 mt-auto">
                <LogOut size={20} /> Sign Out
            </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col relative h-full overflow-hidden">
         <header className={`h-20 px-10 flex items-center justify-between z-10 border-b backdrop-blur-xl transition-all duration-500 ${mode === AppMode.MusicPractice ? 'bg-black/80 border-zinc-800 text-white' : 'bg-white/80 border-zinc-200 text-zinc-800'}`}>
            <div className="flex items-center gap-4">
                {history.length > 1 && (
                    <button onClick={goBack} className="p-2 -ml-2 hover:bg-black/10 rounded-full transition-colors mr-2">
                        <ArrowLeft size={24} className={mode === AppMode.MusicPractice ? 'text-white' : 'text-black'}/>
                    </button>
                )}
                <span className={`text-2xl font-black tracking-tighter ${mode === AppMode.MusicPractice ? 'text-white' : 'text-black'}`}>
                    {mode === AppMode.Dashboard ? (currentUser.role === UserRole.Student ? 'My Learning Journey' : 'Instructor Dashboard') : mode}
                </span>
            </div>
            <div className="flex gap-3 items-center">
                <button onClick={toggleBrowserFullScreen} className={`flex items-center gap-2 text-sm font-bold transition px-4 py-2 rounded-xl ${mode === AppMode.MusicPractice ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-zinc-500 hover:text-black hover:bg-zinc-100'}`}>
                    <Maximize size={18}/> Full Screen
                </button>
                {hasContentToExport() && (
                     <>
                        <div className="h-6 w-px bg-zinc-200 mx-2"></div>
                        <button onClick={exportToPDF} className="text-zinc-500 hover:text-black flex items-center gap-2 text-sm font-bold transition px-4 py-2 rounded-xl hover:bg-zinc-100"><Download size={18}/> PDF</button>
                        <button onClick={exportToPPT} className="text-zinc-500 hover:text-black flex items-center gap-2 text-sm font-bold transition px-4 py-2 rounded-xl hover:bg-zinc-100"><Presentation size={18}/> PPT</button>
                     </>
                )}
            </div>
         </header>

         <div className="flex-1 overflow-hidden relative flex bg-gray-50">
            <div className="flex-1 overflow-y-auto h-full scroll-smooth">
                {mode === AppMode.Dashboard && (
                    currentUser.role === UserRole.Student 
                    ? <TreasureMap userId={currentUser.id} onNavigate={navigate} /> 
                    : <AdminDashboard />
                )}

                {/* --- CONTENT MODES --- */}
                {mode === AppMode.ClassProgram && (
                    <ClassProgram 
                        level={level} 
                        targetLang={targetLang} 
                        nativeLang={primaryLang} 
                        defaultCount={cardCount} 
                        onClose={goBack}
                        startTopic={activeLessonParams?.topic}
                        onComplete={handleClassCompletion}
                    />
                )}
                
                {mode === AppMode.ClassProgram && activeLessonParams && <></>}

                {mode === AppMode.Flashcards && (
                    <div className="min-h-full flex flex-col items-center justify-center p-8">
                        {isLoading ? (
                            <div className="text-center">
                                <div className="w-20 h-20 border-4 border-white/50 border-t-indigo-600 rounded-full animate-spin mx-auto mb-6 shadow-lg"></div>
                                <p className="text-indigo-900 animate-pulse font-bold text-lg">Curating deck...</p>
                            </div>
                        ) : isSessionComplete ? (
                            <div className="text-center animate-in zoom-in duration-500">
                                <div className="bg-white p-16 rounded-[3rem] shadow-2xl">
                                     <h2 className="text-5xl font-black text-indigo-900 mb-4">Deck Mastered!</h2>
                                     <button onClick={() => handleGenerateDeck()} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl">New Deck</button>
                                </div>
                            </div>
                        ) : cards.length > 0 ? (
                            viewMode === 'list' ? <VocabularyList cards={cards} primaryLang={primaryLang} targetLang={targetLang} /> : (
                                <div className="w-full flex flex-col justify-center animate-in fade-in duration-500">
                                    <Flashcard key={cards[currentIndex].id} data={cards[currentIndex]} showSentences={includeSentences} onNext={handleNextCard} primaryLang={primaryLang} targetLang={targetLang} />
                                </div>
                            )
                        ) : (
                            <div className="text-center max-w-2xl animate-in zoom-in duration-500">
                                <h2 className="text-6xl font-black text-zinc-900 mb-6">Ready to Learn?</h2>
                                <p className="text-zinc-500 mb-12 text-xl">Configure on the right.</p>
                            </div>
                        )}
                    </div>
                )}
                
                {mode === AppMode.ImageStudio && <ImageEditor />}
                {mode === AppMode.Syllabus && <SyllabusView level={level} targetLang={targetLang} nativeLang={primaryLang} onNavigate={handleRoadmapNavigation} />}
                {mode === AppMode.VoiceTutor && <LiveTutor onClose={goBack} targetLang={targetLang} nativeLang={primaryLang} history={liveHistory} setHistory={setLiveHistory} />}
                {mode === AppMode.Grammar && <GrammarStudio level={level} targetLang={targetLang} nativeLang={primaryLang} onLessonChange={setCurrentGrammarLesson} />}
                {mode === AppMode.Exam && <ExamRoom level={level} targetLang={targetLang} onQuizChange={setCurrentQuiz} />}
                {mode === AppMode.Stories && <StoryFactory level={level} targetLang={targetLang} nativeLang={primaryLang} onStoryGenerated={setCurrentStory} />}
                {mode === AppMode.ReadingPractice && <ReadingPractice targetLang={targetLang} nativeLang={primaryLang} />}
                {mode === AppMode.MusicPractice && <MusicPlayer targetLang={targetLang} nativeLang={primaryLang} />}
            </div>

            {/* RIGHT SIDEBAR (Only Flashcards) */}
            {mode === AppMode.Flashcards && (
                <aside className="w-80 bg-black border-l border-zinc-900 flex flex-col shadow-2xl z-20 overflow-y-auto custom-scrollbar">
                    <div className="p-8 border-b border-zinc-900 bg-black">
                         <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                             <Settings size={16} className="text-zinc-500" /> Configuration
                         </h3>
                    </div>
                    <div className="p-6 flex flex-col gap-6">
                        <div className="bg-zinc-900 p-1.5 rounded-2xl flex relative">
                            <button onClick={() => setViewMode('cards')} className={`flex-1 py-3 rounded-xl text-xs font-bold ${viewMode === 'cards' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}><Grid size={16}/> Cards</button>
                            <button onClick={() => setViewMode('list')} className={`flex-1 py-3 rounded-xl text-xs font-bold ${viewMode === 'list' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}><List size={16}/> List</button>
                        </div>
                        <div className="bg-zinc-900 p-1.5 rounded-2xl flex relative">
                            <button onClick={() => setStudyMode('random')} className={`flex-1 py-3 rounded-xl text-xs font-bold ${studyMode === 'random' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}>Free Topic</button>
                            <button onClick={() => setStudyMode('structured')} className={`flex-1 py-3 rounded-xl text-xs font-bold ${studyMode === 'structured' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}>Structured</button>
                        </div>
                        <div className="bg-black p-4 rounded-3xl border border-zinc-900 shadow-inner flex-1 min-h-0 flex flex-col">
                            {studyMode === 'random' ? (
                                <div className="flex flex-col gap-2 overflow-y-auto custom-scrollbar max-h-[400px]">
                                    {Object.values(Category).map((c) => (
                                        <button key={c} onClick={() => setCategory(c)} className={`text-left px-4 py-3 rounded-xl text-sm font-bold border ${category === c ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-500'}`}>{c}</button>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2 overflow-y-auto custom-scrollbar max-h-[400px]">
                                    {LESSON_PLAN[level].map((lessonTitle, idx) => (
                                        <button key={idx} onClick={() => setSelectedLessonIndex(idx)} className={`text-left px-4 py-3 rounded-xl text-sm border ${selectedLessonIndex === idx ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-500'}`}>
                                            <div className="font-black text-[10px] opacity-70 mb-0.5">Lesson {idx + 1}</div>
                                            <div className="leading-tight font-bold">{lessonTitle.replace(/^\d+\.\s/, '')}</div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button onClick={() => handleGenerateDeck()} className="w-full py-4 bg-white text-black rounded-2xl font-black shadow-lg flex items-center justify-center gap-2 mt-auto">
                            <Sparkles size={20}/> Generate Deck
                        </button>
                    </div>
                </aside>
            )}
         </div>
      </main>
    </div>
  );
}

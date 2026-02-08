
export enum Language {
  English = 'English',
  Spanish = 'Spanish',
  French = 'French',
  German = 'German',
  Italian = 'Italian',
  Portuguese = 'Portuguese',
  Chinese = 'Chinese',
  Japanese = 'Japanese',
  Russian = 'Russian',
  Arabic = 'Arabic',
  Hindi = 'Hindi',
  HaitianCreole = 'Haitian Creole'
}

export enum Level {
  A1 = 'A1',
  A2 = 'A2',
  B1 = 'B1',
  B2 = 'B2',
  C1 = 'C1',
  C2 = 'C2'
}

export enum UserRole {
  Student = 'student',
  Teacher = 'teacher',
  Admin = 'admin'
}

export interface User {
  id: string;
  username: string;
  name: string;
  password?: string; // In a real app, never store plain text
  role: UserRole;
  email?: string;
  phone?: string;
  targetLang: Language;
  nativeLang: Language;
  currentLevel: Level;
  createdAt: number;
}

export interface ActivityLog {
  id: string;
  userId: string;
  mode: AppMode;
  startTime: number;
  durationSeconds: number; // Real time spent
  details?: string; // e.g., "Studied 20 cards"
}

export interface StudentProgress {
  userId: string;
  level: Level;
  completedTopics: string[]; // List of topic IDs or Names completed
  quizScores: Record<string, number>; // Quiz ID -> Score
  totalStudyTime: number; // Aggregate seconds
}

export enum Category {
  Random = 'Random (Al Azar)',
  Conversation = 'Conversations',
  Reading = 'Reading (Lecturas)',
  Verbs = 'Verbs',
  Adjectives = 'Adjectives',
  Collocations = 'Collocations',
  Articles = 'Articles',
  Linkers = 'Linkers',
  Nouns = 'Nouns',
  Idioms = 'Idioms'
}

export interface TranscriptItem {
    role: 'user' | 'model';
    text: string;
}

export interface FlashcardData {
  id: string;
  word: string;
  translation: string;
  sentence?: string;
  sentenceTranslation?: string;
  visualParts?: string[]; // Descriptions of individual elements
  images?: string[]; // Generated URLs for each part
  pronunciation?: string; 
  masteryLevel: number; 
  lastReviewed?: number;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number; // index
  explanation: string;
}

export interface GrammarSection {
    title: string;
    points: string[];
    style: 'neutral' | 'warning' | 'tip';
}

export interface GrammarExample {
    context: string; 
    sentence: string; 
    translation: string; 
    visualParts: string[]; // Descriptions of individual elements
    images?: string[]; // Generated URLs
}

export interface GrammarLesson {
  title: string;
  subtitle: string;
  quickSummary: string;
  visualParts: string[]; // For Hero image components
  heroImages?: string[]; 
  sections: GrammarSection[];
  examples: GrammarExample[];
  practiceCards: FlashcardData[]; // NEW: Generated practice exercises
}

export interface StoryData {
    title: string;
    content: string;
    translation: string;
    vocabulary: { word: string; meaning: string }[];
    visualPrompt: string;
    image?: string;
}

export interface ReadingEvaluation {
    score: number;
    feedback: string;
    wordAnalysis: {
        word: string;
        status: 'correct' | 'incorrect' | 'needs_improvement';
        issue?: string;
    }[];
}

export interface SongLine {
    original: string;
    translation: string;
}

export interface SongData {
    title: string;
    artist: string;
    youtubeId?: string;
    lyrics: SongLine[];
    coverArtPrompt?: string;
    coverImage?: string;
}

export enum AppMode {
  Dashboard = 'Dashboard', // New: Treasure Map or Admin Panel
  Flashcards = 'Flashcards',
  ImageStudio = 'ImageStudio',
  VoiceTutor = 'VoiceTutor',
  Grammar = 'Grammar',
  Exam = 'Exam',
  Stories = 'Stories',
  ReadingPractice = 'ReadingPractice',
  MusicPractice = 'MusicPractice',
  Syllabus = 'Syllabus',
  ClassProgram = 'ClassProgram'
}
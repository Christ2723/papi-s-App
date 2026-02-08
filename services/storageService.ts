
import { User, ActivityLog, StudentProgress, UserRole, Level, Language, AppMode } from '../types';

const USERS_KEY = 'payero_users';
const LOGS_KEY = 'payero_activity_logs';
const PROGRESS_KEY = 'payero_progress';
const CURRENT_USER_KEY = 'payero_current_user_id';

// --- SYSTEM MANAGEMENT ---

export const clearAllData = () => {
    try {
        localStorage.removeItem(USERS_KEY);
        localStorage.removeItem(LOGS_KEY);
        localStorage.removeItem(PROGRESS_KEY);
        localStorage.removeItem(CURRENT_USER_KEY);
        window.location.reload();
    } catch (e) {
        console.error("Error clearing data:", e);
    }
};

const isStorageAvailable = () => {
    try {
        const test = '__storage_test__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch (e) {
        return false;
    }
};

// --- USER MANAGEMENT ---

export const getUsers = (): User[] => {
  try {
    const data = localStorage.getItem(USERS_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (e) {
    console.error("Error reading users from storage:", e);
    return [];
  }
};

export const saveUser = (user: User) => {
  if (!isStorageAvailable()) {
      console.warn("LocalStorage is not available. User data will not persist.");
      return;
  }
  
  try {
      const users = getUsers();
      const existingIndex = users.findIndex(u => u.id === user.id);
      
      if (existingIndex >= 0) {
        users[existingIndex] = user;
      } else {
        users.push(user);
      }
      
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch (e) {
      console.error("Failed to save user:", e);
  }
};

export const getCurrentUser = (): User | null => {
  try {
      const id = localStorage.getItem(CURRENT_USER_KEY);
      if (!id) return null;
      const users = getUsers();
      return users.find(u => u.id === id) || null;
  } catch (e) {
      console.error("Error getting current user:", e);
      return null;
  }
};

export const loginUser = (username: string, password: string): User | null => {
    try {
        const users = getUsers();
        const cleanUsername = username.trim();
        const user = users.find(u => u.username === cleanUsername && u.password === password);
        
        if (user) {
            localStorage.setItem(CURRENT_USER_KEY, user.id);
            return user;
        }
    } catch (e) {
        console.error("Login error:", e);
    }
    return null;
};

export const logoutUser = () => {
    localStorage.removeItem(CURRENT_USER_KEY);
};

// Robust ID generator
const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

export const registerUser = (userData: Partial<User>): User => {
    if (!isStorageAvailable()) {
        throw new Error("Browser storage is disabled. Cannot register account.");
    }

    const users = getUsers();
    const cleanUsername = (userData.username || '').trim();
    
    if (!cleanUsername) throw new Error("Username is required");
    if (users.some(u => u.username === cleanUsername)) {
        throw new Error("Username already exists");
    }

    const newUser: User = {
        id: generateId(),
        username: cleanUsername,
        name: userData.name || 'Student',
        password: userData.password || '',
        role: userData.role || UserRole.Student,
        email: userData.email || '',
        phone: userData.phone || '',
        targetLang: userData.targetLang || Language.English,
        nativeLang: userData.nativeLang || Language.Spanish,
        currentLevel: Level.A1,
        createdAt: Date.now()
    };
    
    // 1. Save User to User List
    saveUser(newUser);
    
    // 2. Initialize Empty Progress
    const progress: StudentProgress = {
        userId: newUser.id,
        level: Level.A1,
        completedTopics: [],
        quizScores: {},
        totalStudyTime: 0
    };
    saveProgress(progress);
    
    // 3. Set Active Session
    localStorage.setItem(CURRENT_USER_KEY, newUser.id);
    
    return newUser;
};

// --- PROGRESS MANAGEMENT ---

export const getProgress = (userId: string): StudentProgress => {
    try {
        const allProgressStr = localStorage.getItem(PROGRESS_KEY);
        const allProgress = allProgressStr ? JSON.parse(allProgressStr) : {};
        
        return allProgress[userId] || {
            userId,
            level: Level.A1,
            completedTopics: [],
            quizScores: {},
            totalStudyTime: 0
        };
    } catch (e) {
        // Fallback if read fails
        return {
            userId,
            level: Level.A1,
            completedTopics: [],
            quizScores: {},
            totalStudyTime: 0
        };
    }
};

export const saveProgress = (progress: StudentProgress) => {
    try {
        const allProgressStr = localStorage.getItem(PROGRESS_KEY);
        const allProgress = allProgressStr ? JSON.parse(allProgressStr) : {};
        
        allProgress[progress.userId] = progress;
        
        localStorage.setItem(PROGRESS_KEY, JSON.stringify(allProgress));
    } catch (e) {
        console.error("Error saving progress:", e);
    }
};

export const markTopicAsCompleted = (userId: string, topic: string) => {
    try {
        const progress = getProgress(userId);
        if (!progress.completedTopics.includes(topic)) {
            progress.completedTopics.push(topic);
            saveProgress(progress);
        }
    } catch (e) {
        console.error("Error marking topic completed:", e);
    }
};

// --- ACTIVITY LOGS ---

export const logActivity = (userId: string, mode: AppMode, durationSeconds: number, details?: string) => {
    try {
        const logsData = localStorage.getItem(LOGS_KEY);
        const logs: ActivityLog[] = logsData ? JSON.parse(logsData) : [];
        
        const newLog: ActivityLog = {
            id: generateId(),
            userId,
            mode,
            startTime: Date.now() - (durationSeconds * 1000),
            durationSeconds,
            details
        };
        
        logs.push(newLog);
        localStorage.setItem(LOGS_KEY, JSON.stringify(logs));

        // Update total time in progress automatically
        const progress = getProgress(userId);
        progress.totalStudyTime = (progress.totalStudyTime || 0) + durationSeconds;
        saveProgress(progress);
    } catch (e) {
        console.error("Error logging activity:", e);
    }
};

export const getAllLogs = (): ActivityLog[] => {
     try {
         const logsData = localStorage.getItem(LOGS_KEY);
         return logsData ? JSON.parse(logsData) : [];
     } catch {
         return [];
     }
};

export const getUserLogs = (userId: string): ActivityLog[] => {
    return getAllLogs().filter(l => l.userId === userId).sort((a,b) => b.startTime - a.startTime);
};


import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  username: string;
  name: string;
  password?: string;
  role: 'student' | 'teacher' | 'admin';
  email?: string;
  targetLang: string;
  nativeLang: string;
  currentLevel: string;
  progress: {
      completedTopics: string[];
      totalStudyTime: number;
      quizScores: Map<string, number>;
  };
  createdAt: number;
}

const UserSchema: Schema = new Schema({
  username: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'teacher', 'admin'], default: 'student' },
  email: { type: String },
  targetLang: { type: String, default: 'English' },
  nativeLang: { type: String, default: 'Spanish' },
  currentLevel: { type: String, default: 'A1' },
  progress: {
      completedTopics: [{ type: String }],
      totalStudyTime: { type: Number, default: 0 },
      quizScores: { type: Map, of: Number, default: {} }
  },
  createdAt: { type: Number, default: Date.now }
});

export default mongoose.model<IUser>('User', UserSchema);


import express from 'express';
import { registerUser, loginUser } from '../controllers/authController';
import { generateVocabulary, generateStory, generateTTS } from '../controllers/aiController';
import { protect } from '../middleware/auth';

const router = express.Router();

// Auth Routes
router.post('/auth/register', registerUser);
router.post('/auth/login', loginUser);

// AI Routes (Protected)
router.post('/ai/vocab', protect, generateVocabulary);
router.post('/ai/story', protect, generateStory);
router.post('/ai/tts', protect, generateTTS);

// Health Check
router.get('/health', (req, res) => res.json({ status: 'OK' }));

export default router;


import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import { connectDB } from './config/db';
import apiRoutes from './routes/api';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors()); // Allow frontend access
app.use(helmet()); // Security headers
app.use(express.json({ limit: '50mb' })); // Increased limit for audio/image data

// Database
connectDB();

// Routes
app.use('/api', apiRoutes);

app.get('/', (req, res) => {
  res.send('Payero Language School API is running');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

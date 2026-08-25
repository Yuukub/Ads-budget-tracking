import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import clientRoutes from './routes/clients.js';
import campaignRoutes from './routes/campaigns.js';
import historyRoutes from './routes/history.js';
import uploadRoutes from './routes/upload.js';
import adminRoutes from './routes/admin.js';
import settingsRoutes from './routes/settings.js';
import budgetRoutes from './routes/budget.js';
import shareRoutes from './routes/share.js';
import campaignCycleRoutes from './routes/campaignCycles.js';
import notesRoutes from './routes/notes.js';

dotenv.config();

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for Vercel/Heroku to get real IP
app.set('trust proxy', 1);

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? [process.env.FRONTEND_URL || '*', 'http://localhost:5173']
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', campaignCycleRoutes);
app.use('/api', notesRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/budget', budgetRoutes);
app.use('/api/share', shareRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend only if NOT running as Vercel function
if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
  const clientDistPath = path.join(__dirname, '../dist');
  app.use(express.static(clientDistPath));

  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(clientDistPath, 'index.html'));
    }
  });
}

// Only listen if run directly (not imported as a module)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;

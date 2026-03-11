import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';
import cron from 'node-cron';
import { runBackup } from './services/backup.js';

import authRouter from './routes/auth.js';
import profileRouter from './routes/profile.js';
import documentsRouter from './routes/documents.js';
import projectsRouter from './routes/projects.js';
import contactsRouter from './routes/contacts.js';
import chatRouter from './routes/chat.js';
import stripeRouter from './routes/stripe.js';
import pdfRouter from './routes/pdf.js';
import adminRouter from './routes/admin.js';
import templatesRouter from './routes/templates.js';
import markupsRouter from './routes/markups.js';
import attachmentsRouter from './routes/attachments.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3457;

// Stripe webhook needs raw body
app.use('/stripe/webhook', express.raw({ type: 'application/json' }));

// Standard middleware
const ALLOWED_ORIGINS = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'https://app.doveandbearinc.com',
  'https://constructionbear.vercel.app',
  'https://constructionbear.dev',
  'https://www.constructionbear.dev',
];
app.use(cors({
  origin: (origin, cb) => cb(null, !origin || ALLOWED_ORIGINS.includes(origin)),
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
const chatLimiter = rateLimit({ windowMs: 60 * 1000, max: 30 });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, skipSuccessfulRequests: true });
app.use(limiter);
app.use('/chat', chatLimiter);
app.use('/auth/login', authLimiter);
app.use('/auth/register', authLimiter);

// Static files
app.use('/logos', express.static(path.join(process.cwd(), 'data/logos')));
app.use('/uploads', express.static(path.join(process.cwd(), 'data/uploads')));

// Routes
app.use('/auth', authRouter);
app.use('/profile', profileRouter);
app.use('/documents', documentsRouter);
app.use('/projects', projectsRouter);
app.use('/contacts', contactsRouter);
app.use('/chat', chatRouter);
app.use('/stripe', stripeRouter);
app.use('/pdf', pdfRouter);
app.use('/admin', adminRouter);
app.use('/templates', templatesRouter);
app.use('/documents/:docId/markups', markupsRouter);
app.use('/documents/:docId/attachments', attachmentsRouter);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'ConstructionBear API' }));

app.listen(PORT, () => {
  console.log(`ConstructionBear API running on port ${PORT}`);
});

// Daily backup at 2:00 AM
cron.schedule('0 2 * * *', () => {
  runBackup();
});

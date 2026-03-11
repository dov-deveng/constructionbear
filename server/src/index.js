import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';

import authRouter from './routes/auth.js';
import profileRouter from './routes/profile.js';
import documentsRouter from './routes/documents.js';
import projectsRouter from './routes/projects.js';
import contactsRouter from './routes/contacts.js';
import chatRouter from './routes/chat.js';
import stripeRouter from './routes/stripe.js';
import pdfRouter from './routes/pdf.js';
import adminRouter from './routes/admin.js';

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
];
app.use(cors({
  origin: (origin, cb) => cb(null, !origin || ALLOWED_ORIGINS.includes(origin)),
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
const chatLimiter = rateLimit({ windowMs: 60 * 1000, max: 30 });
app.use(limiter);
app.use('/chat', chatLimiter);

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

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'ConstructionBear API' }));

app.listen(PORT, () => {
  console.log(`ConstructionBear API running on port ${PORT}`);
});

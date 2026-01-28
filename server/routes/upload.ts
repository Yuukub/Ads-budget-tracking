import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { adminMiddleware } from '../middleware/adminAuth.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';

const router = Router();

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists (use /tmp on Vercel)
const uploadsDir = process.env.VERCEL
  ? path.join('/tmp', 'uploads/logos')
  : path.join(__dirname, '../../uploads/logos');

if (!fs.existsSync(uploadsDir)) {
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
  } catch (error) {
    console.error('Failed to create uploads directory:', error);
  }
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Ensure dir exists (in case /tmp was cleaned)
    if (!fs.existsSync(uploadsDir)) {
      try {
        fs.mkdirSync(uploadsDir, { recursive: true });
      } catch (error) {
        // Ignore error
      }
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `logo-${uniqueSuffix}${ext}`);
  },
});

// File filter - only allow images
const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit
  },
});

// Apply auth middleware
router.use(authMiddleware);

// Upload logo
router.post('/logo', upload.single('logo'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Return the URL path to the uploaded file
    const logoUrl = `/uploads/logos/${req.file.filename}`;
    res.json({ url: logoUrl });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Delete logo file
router.delete('/logo', async (req: AuthRequest, res: Response) => {
  try {
    const { url } = req.body;
    if (!url || !url.startsWith('/uploads/logos/')) {
      return res.status(400).json({ error: 'Invalid URL' });
    }

    const filename = path.basename(url);
    const filepath = path.join(uploadsDir, filename);

    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }

    res.json({ message: 'Logo deleted' });
  } catch (error) {
    console.error('Delete logo error:', error);
    res.status(500).json({ error: 'Delete failed' });
  }
});

export default router;

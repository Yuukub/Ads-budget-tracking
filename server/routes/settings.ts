import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { adminMiddleware, AdminRequest } from '../middleware/adminAuth.js';

const router = Router();

// Helper to get or create settings
async function getOrCreateSettings() {
  let settings = await prisma.settings.findFirst();

  if (!settings) {
    settings = await prisma.settings.create({
      data: {
        appName: 'Ad Budget Tracker',
        primaryColor: '#3b82f6',
        footerText: '',
        turnstileEnabled: false
      }
    });
  }

  return settings;
}

// GET /api/settings - Get public settings (no auth required)
router.get('/', async (req: Request, res: Response) => {
  try {
    const settings = await getOrCreateSettings();

    // Return only public settings (hide secret key)
    res.json({
      appName: settings.appName,
      appLogo: settings.appLogo,
      primaryColor: settings.primaryColor,
      footerText: settings.footerText,
      turnstileEnabled: settings.turnstileEnabled,
      turnstileSiteKey: settings.turnstileSiteKey
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch settings' });
  }
});

// GET /api/settings/admin - Get all settings (admin only)
router.get('/admin', adminMiddleware, async (req: AdminRequest, res: Response) => {
  try {
    const settings = await getOrCreateSettings();
    res.json(settings);
  } catch (error) {
    console.error('Error fetching admin settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// PUT /api/settings - Update settings (admin only)
router.put('/', adminMiddleware, async (req: AdminRequest, res: Response) => {
  try {
    const {
      appName,
      appLogo,
      primaryColor,
      footerText,
      turnstileEnabled,
      turnstileSiteKey,
      turnstileSecretKey
    } = req.body;

    const settings = await getOrCreateSettings();

    const updatedSettings = await prisma.settings.update({
      where: { id: settings.id },
      data: {
        ...(appName !== undefined && { appName }),
        ...(appLogo !== undefined && { appLogo }),
        ...(primaryColor !== undefined && { primaryColor }),
        ...(footerText !== undefined && { footerText }),
        ...(turnstileEnabled !== undefined && { turnstileEnabled }),
        ...(turnstileSiteKey !== undefined && { turnstileSiteKey }),
        ...(turnstileSecretKey !== undefined && { turnstileSecretKey })
      }
    });

    res.json(updatedSettings);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// POST /api/settings/verify-turnstile - Verify Turnstile token
router.post('/verify-turnstile', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const settings = await getOrCreateSettings();

    if (!settings.turnstileEnabled) {
      return res.json({ success: true, message: 'Turnstile is disabled' });
    }

    if (!settings.turnstileSecretKey) {
      return res.status(500).json({ error: 'Turnstile secret key not configured' });
    }

    // Verify with Cloudflare
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        secret: settings.turnstileSecretKey,
        response: token
      })
    });

    const result = await response.json();

    if (result.success) {
      res.json({ success: true });
    } else {
      res.status(400).json({ success: false, error: 'Turnstile verification failed' });
    }
  } catch (error) {
    console.error('Error verifying turnstile:', error);
    res.status(500).json({ error: 'Failed to verify turnstile' });
  }
});

export default router;

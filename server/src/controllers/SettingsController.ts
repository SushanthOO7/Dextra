import { Router, Request, Response } from 'express'
import { DatabaseService } from '../services/DatabaseService'
import { logger } from '../utils/logger'

const router = Router()
const database = new DatabaseService()

// Initialize database
database.initialize().catch(error => {
  logger.error('Failed to initialize database:', error)
})

// GET /api/settings - Get all settings
router.get('/', async (req: Request, res: Response) => {
  try {
    const settings = {
      theme: database.getSetting('theme') || 'system',
      telemetry: database.getSetting('telemetry') === 'true',
      autoUpdate: database.getSetting('autoUpdate') === 'true',
      defaultPlatform: database.getSetting('defaultPlatform') || 'vercel',
      notifications: database.getSetting('notifications') === 'true',
      logLevel: database.getSetting('logLevel') || 'info'
    }
    
    res.json({ success: true, settings })
  } catch (error) {
    logger.error('Failed to get settings:', error)
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
  }
})

// PUT /api/settings - Update settings
router.put('/', async (req: Request, res: Response) => {
  try {
    const { settings } = req.body
    
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid settings object' 
      })
    }
    
    // Update each setting
    Object.entries(settings).forEach(([key, value]) => {
      database.setSetting(key, String(value))
    })
    
    res.json({ success: true })
  } catch (error) {
    logger.error('Failed to update settings:', error)
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
  }
})

// GET /api/settings/:key - Get specific setting
router.get('/:key', async (req: Request, res: Response) => {
  try {
    const { key } = req.params
    const value = database.getSetting(key)
    
    if (value === null) {
      return res.status(404).json({ 
        success: false, 
        error: 'Setting not found' 
      })
    }
    
    res.json({ success: true, value })
  } catch (error) {
    logger.error('Failed to get setting:', error)
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
  }
})

// PUT /api/settings/:key - Update specific setting
router.put('/:key', async (req: Request, res: Response) => {
  try {
    const { key } = req.params
    const { value } = req.body
    
    if (value === undefined) {
      return res.status(400).json({ 
        success: false, 
        error: 'Value is required' 
      })
    }
    
    database.setSetting(key, String(value))
    res.json({ success: true })
  } catch (error) {
    logger.error('Failed to update setting:', error)
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
  }
})

// DELETE /api/settings/:key - Delete specific setting
router.delete('/:key', async (req: Request, res: Response) => {
  try {
    const { key } = req.params
    
    // Set to empty string to "delete" the setting
    database.setSetting(key, '')
    res.json({ success: true })
  } catch (error) {
    logger.error('Failed to delete setting:', error)
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
  }
})

// POST /api/settings/reset - Reset all settings to defaults
router.post('/reset', async (req: Request, res: Response) => {
  try {
    const defaultSettings = {
      theme: 'system',
      telemetry: false,
      autoUpdate: true,
      defaultPlatform: 'vercel',
      notifications: true,
      logLevel: 'info'
    }
    
    Object.entries(defaultSettings).forEach(([key, value]) => {
      database.setSetting(key, String(value))
    })
    
    res.json({ success: true, settings: defaultSettings })
  } catch (error) {
    logger.error('Failed to reset settings:', error)
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
  }
})

// GET /api/settings/export - Export settings
router.get('/export', async (req: Request, res: Response) => {
  try {
    const settings = {
      theme: database.getSetting('theme') || 'system',
      telemetry: database.getSetting('telemetry') === 'true',
      autoUpdate: database.getSetting('autoUpdate') === 'true',
      defaultPlatform: database.getSetting('defaultPlatform') || 'vercel',
      notifications: database.getSetting('notifications') === 'true',
      logLevel: database.getSetting('logLevel') || 'info'
    }
    
    res.json({ success: true, settings })
  } catch (error) {
    logger.error('Failed to export settings:', error)
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
  }
})

// POST /api/settings/import - Import settings
router.post('/import', async (req: Request, res: Response) => {
  try {
    const { settings } = req.body
    
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid settings object' 
      })
    }
    
    // Validate settings
    const validKeys = ['theme', 'telemetry', 'autoUpdate', 'defaultPlatform', 'notifications', 'logLevel']
    const invalidKeys = Object.keys(settings).filter(key => !validKeys.includes(key))
    
    if (invalidKeys.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: `Invalid setting keys: ${invalidKeys.join(', ')}` 
      })
    }
    
    // Update settings
    Object.entries(settings).forEach(([key, value]) => {
      database.setSetting(key, String(value))
    })
    
    res.json({ success: true })
  } catch (error) {
    logger.error('Failed to import settings:', error)
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
  }
})

export { router as settingsRoutes }

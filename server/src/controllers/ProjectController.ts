import { Router, Request, Response } from 'express'
import { ProjectService } from '../services/ProjectService'
import { logger } from '../utils/logger'

const router = Router()
const projectService = new ProjectService()

// Initialize service
projectService.initialize().catch(error => {
  logger.error('Failed to initialize project service:', error)
})

// GET /api/projects - Get all projects
router.get('/', async (req: Request, res: Response) => {
  try {
    const projects = projectService.getAllProjects()
    res.json({ success: true, projects })
  } catch (error) {
    logger.error('Failed to get projects:', error)
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
  }
})

// GET /api/projects/:id - Get specific project
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const project = projectService.getProject(id)
    
    if (!project) {
      return res.status(404).json({ 
        success: false, 
        error: 'Project not found' 
      })
    }
    
    res.json({ success: true, project })
  } catch (error) {
    logger.error('Failed to get project:', error)
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
  }
})

// POST /api/projects - Add new project
router.post('/', async (req: Request, res: Response) => {
  try {
    const { path } = req.body
    
    if (!path) {
      return res.status(400).json({ 
        success: false, 
        error: 'Project path is required' 
      })
    }
    
    const result = await projectService.addProject(path)
    
    if (result.success) {
      res.status(201).json({ success: true, project: result.project })
    } else {
      res.status(400).json({ 
        success: false, 
        error: result.error 
      })
    }
  } catch (error) {
    logger.error('Failed to add project:', error)
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
  }
})

// PUT /api/projects/:id - Update project
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const updates = req.body
    
    const project = await projectService.updateProject(id, updates)
    
    if (!project) {
      return res.status(404).json({ 
        success: false, 
        error: 'Project not found' 
      })
    }
    
    res.json({ success: true, project })
  } catch (error) {
    logger.error('Failed to update project:', error)
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
  }
})

// DELETE /api/projects/:id - Delete project
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const success = projectService.deleteProject(id)
    
    if (!success) {
      return res.status(404).json({ 
        success: false, 
        error: 'Project not found' 
      })
    }
    
    res.json({ success: true })
  } catch (error) {
    logger.error('Failed to delete project:', error)
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
  }
})

// GET /api/projects/:id/capabilities - Get project capabilities
router.get('/:id/capabilities', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const capabilities = await projectService.getProjectCapabilities(id)
    
    res.json({ success: true, capabilities })
  } catch (error) {
    logger.error('Failed to get project capabilities:', error)
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
  }
})

// POST /api/projects/:id/validate - Validate project
router.post('/:id/validate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const validation = await projectService.validateProject(id)
    
    res.json({ success: true, validation })
  } catch (error) {
    logger.error('Failed to validate project:', error)
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
  }
})

// POST /api/projects/detect - Detect project type
router.post('/detect', async (req: Request, res: Response) => {
  try {
    const { path } = req.body
    
    if (!path) {
      return res.status(400).json({ 
        success: false, 
        error: 'Project path is required' 
      })
    }
    
    const detection = await projectService.detectProject(path)
    
    if (!detection) {
      return res.status(400).json({ 
        success: false, 
        error: 'Failed to detect project type' 
      })
    }
    
    res.json({ success: true, detection })
  } catch (error) {
    logger.error('Failed to detect project:', error)
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
  }
})

export { router as projectRoutes }

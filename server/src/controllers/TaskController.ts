import { Router, Request, Response } from 'express'
import { TaskService } from '../services/TaskService'
import { logger } from '../utils/logger'

const router = Router()
const taskService = new TaskService()

// Initialize service
taskService.initialize().catch(error => {
  logger.error('Failed to initialize task service:', error)
})

// POST /api/tasks - Start new task
router.post('/', async (req: Request, res: Response) => {
  try {
    const { projectId, type, platform, options } = req.body
    
    if (!projectId || !type || !platform) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: projectId, type, platform' 
      })
    }
    
    const result = await taskService.startTask({
      projectId,
      type,
      platform,
      options: options || {}
    })
    
    if (result.success) {
      res.status(201).json({ success: true, taskId: result.taskId })
    } else {
      res.status(400).json({ 
        success: false, 
        error: result.error 
      })
    }
  } catch (error) {
    logger.error('Failed to start task:', error)
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
  }
})

// GET /api/tasks/:id - Get task status
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const task = await taskService.getTaskStatus(id)
    
    if (!task) {
      return res.status(404).json({ 
        success: false, 
        error: 'Task not found' 
      })
    }
    
    res.json({ success: true, task })
  } catch (error) {
    logger.error('Failed to get task status:', error)
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
  }
})

// POST /api/tasks/:id/stop - Stop task
router.post('/:id/stop', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const success = await taskService.stopTask(id)
    
    if (!success) {
      return res.status(404).json({ 
        success: false, 
        error: 'Task not found or already stopped' 
      })
    }
    
    res.json({ success: true })
  } catch (error) {
    logger.error('Failed to stop task:', error)
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
  }
})

// GET /api/tasks/project/:projectId - Get tasks for project
router.get('/project/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params
    const tasks = taskService.getTasksByProject(projectId)
    
    res.json({ success: true, tasks })
  } catch (error) {
    logger.error('Failed to get tasks for project:', error)
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
  }
})

// GET /api/tasks/:id/logs - Get task logs
router.get('/:id/logs', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { level, startTime, endTime } = req.query
    
    // This would need to be implemented in TaskService
    // For now, return empty logs
    res.json({ success: true, logs: [] })
  } catch (error) {
    logger.error('Failed to get task logs:', error)
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
  }
})

// POST /api/tasks/:id/retry - Retry failed task
router.post('/:id/retry', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { options } = req.body
    
    // This would need to be implemented in TaskService
    // For now, return not implemented
    res.status(501).json({ 
      success: false, 
      error: 'Retry functionality not implemented' 
    })
  } catch (error) {
    logger.error('Failed to retry task:', error)
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
  }
})

// POST /api/tasks/:id/recover - Attempt recovery for failed task
router.post('/:id/recover', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { recoveryAction } = req.body
    
    // This would need to be implemented in TaskService
    // For now, return not implemented
    res.status(501).json({ 
      success: false, 
      error: 'Recovery functionality not implemented' 
    })
  } catch (error) {
    logger.error('Failed to recover task:', error)
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
  }
})

export { router as taskRoutes }

import { spawn, ChildProcess } from 'child_process'
import { EventEmitter } from 'events'
import { DatabaseService, Task } from './DatabaseService'
import { PluginManager } from './PluginManager'
import { RecoveryService } from './RecoveryService'
import { LogService } from './LogService'
import { logger } from '../utils/logger'
import { v4 as uuidv4 } from 'uuid'

export interface TaskOptions {
  projectId: string
  type: 'deploy' | 'build' | 'test' | 'analyze'
  platform: string
  options?: Record<string, any>
}

export interface TaskResult {
  success: boolean
  taskId?: string
  error?: string
  result?: any
}

export class TaskService extends EventEmitter {
  private database: DatabaseService
  private pluginManager: PluginManager
  private recoveryService: RecoveryService
  private logService: LogService
  private activeTasks: Map<string, ChildProcess> = new Map()

  constructor() {
    super()
    this.database = new DatabaseService()
    this.pluginManager = new PluginManager()
    this.recoveryService = new RecoveryService()
    this.logService = new LogService()
  }

  public async initialize(): Promise<void> {
    await this.database.initialize()
    await this.pluginManager.initialize()
    await this.recoveryService.initialize()
    await this.logService.initialize()
  }

  public async startTask(options: TaskOptions): Promise<TaskResult> {
    try {
      const taskId = uuidv4()
      
      // Create task record
      const task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> = {
        projectId: options.projectId,
        type: options.type,
        platform: options.platform,
        status: 'pending',
        progress: 0,
        logs: ''
      }

      const createdTask = await this.database.createTask(task)
      logger.info(`Task ${taskId} created for project ${options.projectId}`)

      // Start task execution
      this.executeTask(createdTask, options)

      return {
        success: true,
        taskId: createdTask.id
      }
    } catch (error) {
      logger.error('Failed to start task:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private async executeTask(task: Task, options: TaskOptions): Promise<void> {
    try {
      // Update task status to running
      await this.database.updateTask(task.id, {
        status: 'running',
        startedAt: new Date().toISOString(),
        progress: 10
      })

      this.emit('task:started', task)

      // Get project details
      const project = this.database.getProject(task.projectId)
      if (!project) {
        throw new Error('Project not found')
      }

      // Detect project type and get build configuration
      const plugin = this.pluginManager.getPlugin(task.platform)
      if (!plugin) {
        throw new Error(`Plugin not found for platform: ${task.platform}`)
      }

      const projectConfig = await plugin.detectProject(project.path)
      if (!projectConfig) {
        throw new Error('Failed to detect project configuration')
      }

      // Execute build process
      await this.executeBuildProcess(task, projectConfig, options)

      // Execute deployment
      await this.executeDeployment(task, projectConfig, options)

      // Update task status to success
      await this.database.updateTask(task.id, {
        status: 'success',
        completedAt: new Date().toISOString(),
        progress: 100
      })

      this.emit('task:completed', task)
      logger.info(`Task ${task.id} completed successfully`)

    } catch (error) {
      logger.error(`Task ${task.id} failed:`, error)
      
      // Update task status to error
      await this.database.updateTask(task.id, {
        status: 'error',
        completedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      })

      // Attempt recovery
      await this.attemptRecovery(task, error)

      this.emit('task:failed', task, error)
    }
  }

  private async executeBuildProcess(task: Task, projectConfig: any, options: TaskOptions): Promise<void> {
    const buildCommand = projectConfig.buildCommand || 'npm run build'
    
    logger.info(`Executing build command: ${buildCommand}`)
    
    return new Promise((resolve, reject) => {
      const process = spawn('npm', ['run', 'build'], {
        cwd: projectConfig.path,
        stdio: ['pipe', 'pipe', 'pipe']
      })

      this.activeTasks.set(task.id, process)

      let output = ''
      
      process.stdout?.on('data', (data) => {
        const logMessage = data.toString()
        output += logMessage
        this.logService.log(task.id, 'info', logMessage.trim())
        this.emit('task:log', task.id, logMessage)
      })

      process.stderr?.on('data', (data) => {
        const logMessage = data.toString()
        output += logMessage
        this.logService.log(task.id, 'warn', logMessage.trim())
        this.emit('task:log', task.id, logMessage)
      })

      process.on('close', (code) => {
        this.activeTasks.delete(task.id)
        
        if (code === 0) {
          // Update task progress
          this.database.updateTask(task.id, { progress: 50 })
          resolve()
        } else {
          reject(new Error(`Build process exited with code ${code}`))
        }
      })

      process.on('error', (error) => {
        this.activeTasks.delete(task.id)
        reject(error)
      })
    })
  }

  private async executeDeployment(task: Task, projectConfig: any, options: TaskOptions): Promise<void> {
    const plugin = this.pluginManager.getPlugin(task.platform)
    if (!plugin) {
      throw new Error(`Plugin not found for platform: ${task.platform}`)
    }

    // Authenticate with platform
    const authResult = await plugin.authenticate()
    if (!authResult.success) {
      throw new Error(`Authentication failed: ${authResult.error}`)
    }

    // Deploy to platform
    const deployResult = await plugin.deploy(projectConfig.path, {
      buildOutput: projectConfig.outputDir,
      token: authResult.token,
      ...options.options
    })

    if (!deployResult.success) {
      throw new Error(`Deployment failed: ${deployResult.error}`)
    }

    // Update task with deployment result
    await this.database.updateTask(task.id, {
      progress: 90,
      result: JSON.stringify({
        deployId: deployResult.deployId,
        url: deployResult.url
      })
    })

    // Poll for deployment status
    await this.pollDeploymentStatus(task, plugin, deployResult.deployId!)
  }

  private async pollDeploymentStatus(task: Task, plugin: any, deployId: string): Promise<void> {
    const maxAttempts = 30 // 5 minutes with 10-second intervals
    let attempts = 0

    while (attempts < maxAttempts) {
      try {
        const status = await plugin.getStatus(deployId)
        
        if (status.status === 'ready' || status.status === 'live') {
          // Update task with final result
          await this.database.updateTask(task.id, {
            progress: 100,
            result: JSON.stringify({
              deployId,
              url: status.url,
              status: status.status
            })
          })
          break
        } else if (status.status === 'error' || status.status === 'failed') {
          throw new Error(`Deployment failed: ${status.error || 'Unknown error'}`)
        }

        // Wait 10 seconds before next check
        await new Promise(resolve => setTimeout(resolve, 10000))
        attempts++
        
      } catch (error) {
        logger.error(`Error checking deployment status: ${error}`)
        throw error
      }
    }

    if (attempts >= maxAttempts) {
      throw new Error('Deployment timeout - status check exceeded maximum attempts')
    }
  }

  private async attemptRecovery(task: Task, error: any): Promise<void> {
    try {
      logger.info(`Attempting recovery for task ${task.id}`)
      
      // Create error signature
      const errorSignature = {
        type: 'build_error',
        hash: this.generateErrorHash(error.message),
        message: error.message,
        lines: error.stack?.split('\n') || [],
        context: {
          platform: task.platform,
          type: task.type,
          projectId: task.projectId
        }
      }

      // Get recovery action from RL service
      const recoveryAction = await this.recoveryService.recover(errorSignature)
      
      if (recoveryAction && recoveryAction.confidence > 0.5) {
        logger.info(`Recovery action suggested: ${recoveryAction.action}`)
        
        // Execute recovery action
        await this.executeRecoveryAction(task, recoveryAction)
        
        // Retry task
        await this.executeTask(task, {
          projectId: task.projectId,
          type: task.type as any,
          platform: task.platform,
          options: {}
        })
      }
    } catch (recoveryError) {
      logger.error(`Recovery failed for task ${task.id}:`, recoveryError)
    }
  }

  private async executeRecoveryAction(task: Task, action: any): Promise<void> {
    switch (action.action) {
      case 'retry_clean':
        // Clean build artifacts and retry
        logger.info('Executing clean retry recovery')
        break
      case 'refresh_token':
        // Refresh authentication token
        logger.info('Executing token refresh recovery')
        break
      case 'modify_config':
        // Modify project configuration
        logger.info('Executing config modification recovery')
        break
      default:
        logger.warn(`Unknown recovery action: ${action.action}`)
    }
  }

  public async stopTask(taskId: string): Promise<boolean> {
    const process = this.activeTasks.get(taskId)
    if (process) {
      process.kill('SIGTERM')
      this.activeTasks.delete(taskId)
      
      // Update task status
      await this.database.updateTask(taskId, {
        status: 'cancelled',
        completedAt: new Date().toISOString()
      })
      
      return true
    }
    return false
  }

  public getTaskStatus(taskId: string): Task | null {
    return this.database.getTask(taskId)
  }

  public getTasksByProject(projectId: string): Task[] {
    return this.database.getTasksByProject(projectId)
  }

  private generateErrorHash(message: string): string {
    // Simple hash function for error signatures
    let hash = 0
    for (let i = 0; i < message.length; i++) {
      const char = message.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36)
  }
}

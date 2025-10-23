import { EventEmitter } from 'events'
import { DatabaseService, Task } from '../services/DatabaseService'
import { PluginManager } from '../services/PluginManager'
import { CommandRunner } from '../services/CommandRunner'
import { ErrorDetector } from '../services/ErrorDetector'
import { RecoveryEngine } from '../services/RecoveryEngine'
import { logger } from '../utils/logger'

export type TaskState = 'pending' | 'running' | 'success' | 'failed' | 'cancelled'

export type TaskPhase = 'detecting' | 'installing' | 'building' | 'deploying'

export interface DeploymentOptions {
  projectId: string
  platform: string
  environment?: string
  envVars?: Record<string, string>
  buildCommand?: string
  outputDir?: string
}

export interface DeploymentResult {
  success: boolean
  deployId?: string
  url?: string
  error?: string
  logs?: string[]
}

export class DeploymentWorkflow extends EventEmitter {
  private database: DatabaseService
  private pluginManager: PluginManager
  private commandRunner: CommandRunner
  private errorDetector: ErrorDetector
  private recoveryEngine: RecoveryEngine
  private activeTasks: Map<string, Task> = new Map()

  constructor() {
    super()
    this.database = new DatabaseService()
    this.pluginManager = new PluginManager()
    this.commandRunner = new CommandRunner()
    this.errorDetector = new ErrorDetector()
    this.recoveryEngine = new RecoveryEngine()
  }

  public async initialize(): Promise<void> {
    await this.database.initialize()
    await this.pluginManager.initialize()
    await this.errorDetector.initialize()
    await this.recoveryEngine.initialize()
  }

  public async executeDeployment(options: DeploymentOptions): Promise<DeploymentResult> {
    const taskId = this.generateTaskId()
    
    try {
      // Create task record
      const task: Task = {
        id: taskId,
        projectId: options.projectId,
        type: 'deploy',
        platform: options.platform,
        status: 'pending',
        progress: 0,
        logs: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      await this.database.createTask(task)
      this.activeTasks.set(taskId, task)

      this.emit('task:created', { taskId, task })

      // Execute deployment phases
      await this.executePhase(taskId, 'detecting', () => this.detectProject(taskId, options))
      await this.executePhase(taskId, 'installing', () => this.installDependencies(taskId, options))
      await this.executePhase(taskId, 'building', () => this.buildProject(taskId, options))
      await this.executePhase(taskId, 'deploying', () => this.deployProject(taskId, options))

      // Mark as successful
      await this.updateTaskStatus(taskId, 'success', 100)
      
      const finalTask = this.activeTasks.get(taskId)!
      const result = JSON.parse(finalTask.result || '{}')

      this.emit('task:completed', { taskId, result })
      
      return {
        success: true,
        deployId: result.deployId,
        url: result.url,
        logs: finalTask.logs.split('\n').filter(line => line.trim())
      }

    } catch (error) {
      logger.error(`Deployment ${taskId} failed:`, error)
      
      await this.updateTaskStatus(taskId, 'failed', undefined, error instanceof Error ? error.message : 'Unknown error')
      
      this.emit('task:failed', { taskId, error })

      // Attempt recovery
      await this.attemptRecovery(taskId, error)

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    } finally {
      this.activeTasks.delete(taskId)
    }
  }

  private async executePhase(taskId: string, phase: TaskPhase, phaseFunction: () => Promise<void>): Promise<void> {
    try {
      await this.updateTaskStatus(taskId, 'running', undefined, undefined, phase)
      this.emit('task:phase', { taskId, phase })
      
      await phaseFunction()
      
    } catch (error) {
      logger.error(`Phase ${phase} failed for task ${taskId}:`, error)
      throw error
    }
  }

  private async detectProject(taskId: string, options: DeploymentOptions): Promise<void> {
    const project = await this.database.getProject(options.projectId)
    if (!project) {
      throw new Error('Project not found')
    }

    const plugin = this.pluginManager.getPlugin(options.platform)
    if (!plugin) {
      throw new Error(`Plugin not found for platform: ${options.platform}`)
    }

    const projectConfig = await plugin.detectProject(project.path)
    if (!projectConfig) {
      throw new Error('Failed to detect project configuration')
    }

    // Update task with detected configuration
    await this.updateTaskStatus(taskId, 'running', 10)
    this.emit('task:log', { taskId, message: `Detected ${projectConfig.framework} project` })
    
    // Store project config in task metadata (we'll need to extend the Task interface)
    await this.database.updateTask(taskId, {
      logs: JSON.stringify({
        projectConfig,
        buildCommand: options.buildCommand || projectConfig.buildCommand,
        outputDir: options.outputDir || projectConfig.outputDir
      })
    })
  }

  private async installDependencies(taskId: string, options: DeploymentOptions): Promise<void> {
    const project = await this.database.getProject(options.projectId)
    if (!project) {
      throw new Error('Project not found')
    }
    
    const task = this.activeTasks.get(taskId)!
    const metadata = JSON.parse(task.logs || '{}')
    
    const installCommand = metadata.projectConfig?.packageManager === 'npm' ? 'npm install' : 
                          metadata.projectConfig?.packageManager === 'yarn' ? 'yarn install' :
                          metadata.projectConfig?.packageManager === 'pnpm' ? 'pnpm install' : 'npm install'

    this.emit('task:log', { taskId, message: `Installing dependencies: ${installCommand}` })

    const result = await this.commandRunner.execute(
      installCommand.split(' ')[0],
      installCommand.split(' ').slice(1),
      project.path,
      {
        env: {
          NODE_ENV: 'production',
          ...options.envVars
        }
      }
    )

    if (!result.success) {
      throw new Error(`Dependency installation failed: ${result.stderr}`)
    }

    await this.updateTaskStatus(taskId, 'running', 30)
    this.emit('task:log', { taskId, message: 'Dependencies installed successfully' })
  }

  private async buildProject(taskId: string, options: DeploymentOptions): Promise<void> {
    const project = await this.database.getProject(options.projectId)
    if (!project) {
      throw new Error('Project not found')
    }
    
    const task = this.activeTasks.get(taskId)!
    const metadata = JSON.parse(task.logs || '{}')
    
    const buildCommand = options.buildCommand || metadata.buildCommand || 'npm run build'
    
    this.emit('task:log', { taskId, message: `Building project: ${buildCommand}` })

    const result = await this.commandRunner.execute(
      buildCommand.split(' ')[0],
      buildCommand.split(' ').slice(1),
      project.path,
      {
        env: {
          NODE_ENV: 'production',
          ...options.envVars
        }
      }
    )

    if (!result.success) {
      // Detect error and attempt recovery
      const errorSignature = this.errorDetector.detectError(result.stderr, result.stdout)
      if (errorSignature) {
        const recoveryAction = await this.recoveryEngine.getRecoveryAction(errorSignature)
        if (recoveryAction && recoveryAction.confidence > 0.7) {
          this.emit('task:recovery', { taskId, errorSignature, recoveryAction })
          
          // Wait for user approval (in real implementation, this would be handled via WebSocket)
          // For now, auto-apply high-confidence fixes
          if (recoveryAction.confidence > 0.9) {
            await this.executeRecoveryAction(taskId, recoveryAction)
            // Retry build
            return this.buildProject(taskId, options)
          }
        }
      }
      
      throw new Error(`Build failed: ${result.stderr}`)
    }

    await this.updateTaskStatus(taskId, 'running', 60)
    this.emit('task:log', { taskId, message: 'Build completed successfully' })
  }

  private async deployProject(taskId: string, options: DeploymentOptions): Promise<void> {
    const project = await this.database.getProject(options.projectId)
    if (!project) {
      throw new Error('Project not found')
    }
    
    const task = this.activeTasks.get(taskId)!
    const metadata = JSON.parse(task.logs || '{}')
    
    const plugin = this.pluginManager.getPlugin(options.platform)!

    // Authenticate with platform
    const authResult = await plugin.authenticate()
    if (!authResult.success) {
      throw new Error(`Authentication failed: ${authResult.error}`)
    }

    this.emit('task:log', { taskId, message: `Deploying to ${options.platform}...` })

    // Deploy to platform
    const deployResult = await plugin.deploy(project.path, {
      token: authResult.token || '',
      buildOutput: metadata.outputDir,
      environment: options.environment || 'production',
      envVars: options.envVars
    })

    if (!deployResult.success) {
      throw new Error(`Deployment failed: ${deployResult.error}`)
    }

    await this.updateTaskStatus(taskId, 'running', 80)
    this.emit('task:log', { taskId, message: `Deployment created: ${deployResult.deployId}` })

    // Poll for deployment completion
    await this.pollDeploymentStatus(taskId, plugin, deployResult.deployId!)
  }

  private async pollDeploymentStatus(taskId: string, plugin: any, deployId: string): Promise<void> {
    const maxAttempts = 30 // 5 minutes with 10-second intervals
    let attempts = 0

    while (attempts < maxAttempts) {
      try {
        const status = await plugin.getStatus(deployId)
        
        if (status.status === 'ready' || status.status === 'live') {
          // Update task with final result
          await this.database.updateTask(taskId, {
            result: JSON.stringify({
              deployId,
              url: status.url,
              status: status.status
            })
          })
          
          this.emit('task:log', { taskId, message: `Deployment successful: ${status.url}` })
          break
        } else if (status.status === 'error' || status.status === 'failed') {
          throw new Error(`Deployment failed: ${status.error || 'Unknown error'}`)
        }

        this.emit('task:log', { taskId, message: `Deployment status: ${status.status}` })

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

  private async attemptRecovery(taskId: string, error: any): Promise<void> {
    try {
      logger.info(`Attempting recovery for task ${taskId}`)
      
      const errorSignature = this.errorDetector.detectError(error.message, '')
      if (!errorSignature) return

      const recoveryAction = await this.recoveryEngine.getRecoveryAction(errorSignature)
      if (!recoveryAction || recoveryAction.confidence < 0.5) return

      this.emit('task:recovery', { taskId, errorSignature, recoveryAction })
      
      // In a real implementation, this would wait for user approval
      // For now, we'll just log the suggested recovery
      logger.info(`Recovery suggested: ${recoveryAction.action} (confidence: ${recoveryAction.confidence})`)
      
    } catch (recoveryError) {
      logger.error(`Recovery analysis failed for task ${taskId}:`, recoveryError)
    }
  }

  private async executeRecoveryAction(taskId: string, action: any): Promise<void> {
    const project = await this.database.getProject(this.activeTasks.get(taskId)!.projectId)
    if (!project) {
      throw new Error('Project not found')
    }
    
    switch (action.action) {
      case 'install_dependency':
        this.emit('task:log', { taskId, message: `Installing missing dependency: ${action.params.package}` })
        await this.commandRunner.execute('npm', ['install', action.params.package], project.path)
        break
        
      case 'clear_cache':
        this.emit('task:log', { taskId, message: 'Clearing build cache...' })
        await this.commandRunner.execute('npm', ['run', 'clean'], project.path)
        break
        
      case 'retry_with_clean':
        this.emit('task:log', { taskId, message: 'Cleaning and retrying...' })
        await this.commandRunner.execute('rm', ['-rf', 'node_modules', 'dist', 'build'], project.path)
        break
        
      default:
        logger.warn(`Unknown recovery action: ${action.action}`)
    }
  }

  private async updateTaskStatus(
    taskId: string, 
    status: TaskState, 
    progress?: number, 
    error?: string, 
    phase?: TaskPhase
  ): Promise<void> {
    const updates: any = {
      status,
      updatedAt: new Date().toISOString()
    }

    if (progress !== undefined) updates.progress = progress
    if (error) updates.error = error
    if (phase) updates.phase = phase

    await this.database.updateTask(taskId, updates)
    
    const task = this.activeTasks.get(taskId)
    if (task) {
      Object.assign(task, updates)
    }

    this.emit('task:status', { taskId, status, progress, phase })
  }

  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  public async cancelTask(taskId: string): Promise<boolean> {
    const task = this.activeTasks.get(taskId)
    if (!task) return false

    await this.updateTaskStatus(taskId, 'cancelled')
    this.activeTasks.delete(taskId)
    
    this.emit('task:cancelled', { taskId })
    return true
  }

  public async getTaskStatus(taskId: string): Promise<Task | null> {
    return this.activeTasks.get(taskId) || await this.database.getTask(taskId)
  }
}

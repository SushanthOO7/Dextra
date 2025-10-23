import { EventEmitter } from 'events'
import { DatabaseService, Task } from './DatabaseService'
import { DeploymentWorkflow, DeploymentOptions, DeploymentResult } from '../workflows/DeploymentWorkflow'
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
  private deploymentWorkflow: DeploymentWorkflow
  private activeTasks: Map<string, Task> = new Map()

  constructor() {
    super()
    this.database = new DatabaseService()
    this.deploymentWorkflow = new DeploymentWorkflow()
    
    // Forward events from deployment workflow
    this.deploymentWorkflow.on('task:created', (data) => this.emit('task:created', data))
    this.deploymentWorkflow.on('task:phase', (data) => this.emit('task:phase', data))
    this.deploymentWorkflow.on('task:log', (data) => this.emit('task:log', data))
    this.deploymentWorkflow.on('task:status', (data) => this.emit('task:status', data))
    this.deploymentWorkflow.on('task:completed', (data) => this.emit('task:completed', data))
    this.deploymentWorkflow.on('task:failed', (data) => this.emit('task:failed', data))
    this.deploymentWorkflow.on('task:recovery', (data) => this.emit('task:recovery', data))
  }

  public async initialize(): Promise<void> {
    await this.database.initialize()
    await this.deploymentWorkflow.initialize()
  }

  public async startTask(options: TaskOptions): Promise<TaskResult> {
    try {
      if (options.type === 'deploy') {
        return await this.startDeploymentTask(options)
      } else {
        return await this.startGenericTask(options)
      }
    } catch (error) {
      logger.error('Failed to start task:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private async startDeploymentTask(options: TaskOptions): Promise<TaskResult> {
    const deploymentOptions: DeploymentOptions = {
      projectId: options.projectId,
      platform: options.platform,
      environment: options.options?.environment || 'production',
      envVars: options.options?.envVars || {},
      buildCommand: options.options?.buildCommand,
      outputDir: options.options?.outputDir
    }

    const result = await this.deploymentWorkflow.executeDeployment(deploymentOptions)
    
    return {
      success: result.success,
      taskId: result.success ? 'deployment_task' : undefined,
      error: result.error,
      result: result.success ? {
        deployId: result.deployId,
        url: result.url,
        logs: result.logs
      } : undefined
    }
  }

  private async startGenericTask(options: TaskOptions): Promise<TaskResult> {
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
    logger.info(`Generic task ${taskId} created for project ${options.projectId}`)

    // For now, just mark as completed for non-deployment tasks
    await this.database.updateTask(createdTask.id, {
      status: 'success',
      progress: 100,
      completedAt: new Date().toISOString()
    })

    return {
      success: true,
      taskId: createdTask.id
    }
  }

  public async stopTask(taskId: string): Promise<boolean> {
    try {
      const cancelled = await this.deploymentWorkflow.cancelTask(taskId)
      if (cancelled) {
        await this.database.updateTask(taskId, {
          status: 'cancelled',
          completedAt: new Date().toISOString()
        })
        return true
      }
      return false
    } catch (error) {
      logger.error(`Failed to stop task ${taskId}:`, error)
      return false
    }
  }

  public async getTaskStatus(taskId: string): Promise<Task | null> {
    return await this.deploymentWorkflow.getTaskStatus(taskId) || this.database.getTask(taskId)
  }

  public getTasksByProject(projectId: string): Task[] {
    return this.database.getTasksByProject(projectId)
  }

  public getActiveTasks(): Task[] {
    return Array.from(this.activeTasks.values())
  }
}

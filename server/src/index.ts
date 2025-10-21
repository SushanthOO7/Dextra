import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import dotenv from 'dotenv'
import { DatabaseService } from './services/DatabaseService'
import { TaskService } from './services/TaskService'
import { ProjectService } from './services/ProjectService'
import { CredentialService } from './services/CredentialService'
import { LogService } from './services/LogService'
import { PluginManager } from './services/PluginManager'
import { RecoveryService } from './services/RecoveryService'
import { projectRoutes } from './controllers/ProjectController'
import { taskRoutes } from './controllers/TaskController'
import { settingsRoutes } from './controllers/SettingsController'
import { logger } from './utils/logger'

// Load environment variables
dotenv.config()

class OrchestratorServer {
  private app: express.Application
  private server: any
  private wss: WebSocketServer
  private port: number
  private services: {
    database: DatabaseService
    task: TaskService
    project: ProjectService
    credential: CredentialService
    log: LogService
    plugin: PluginManager
    recovery: RecoveryService
  }

  constructor() {
    this.app = express()
    this.port = parseInt(process.env.PORT || '3001', 10)
    this.setupMiddleware()
    this.setupRoutes()
    this.setupServices()
  }

  private setupMiddleware(): void {
    this.app.use(helmet())
    this.app.use(cors())
    this.app.use(compression())
    this.app.use(express.json({ limit: '10mb' }))
    this.app.use(express.urlencoded({ extended: true }))
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() })
    })

    // API routes
    this.app.use('/api/projects', projectRoutes)
    this.app.use('/api/tasks', taskRoutes)
    this.app.use('/api/settings', settingsRoutes)

    // Error handling
    this.app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('Unhandled error:', err)
      res.status(500).json({ error: 'Internal server error' })
    })

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({ error: 'Not found' })
    })
  }

  private async setupServices(): Promise<void> {
    try {
      // Initialize database
      this.services = {
        database: new DatabaseService(),
        task: new TaskService(),
        project: new ProjectService(),
        credential: new CredentialService(),
        log: new LogService(),
        plugin: new PluginManager(),
        recovery: new RecoveryService()
      }

      // Initialize database
      await this.services.database.initialize()
      logger.info('Database initialized')

      // Initialize plugins
      await this.services.plugin.initialize()
      logger.info('Plugins initialized')

      // Initialize recovery service
      await this.services.recovery.initialize()
      logger.info('Recovery service initialized')

    } catch (error) {
      logger.error('Failed to initialize services:', error)
      process.exit(1)
    }
  }

  private setupWebSocket(): void {
    this.wss = new WebSocketServer({ server: this.server })
    
    this.wss.on('connection', (ws) => {
      logger.info('WebSocket client connected')
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString())
          this.handleWebSocketMessage(ws, message)
        } catch (error) {
          logger.error('Invalid WebSocket message:', error)
        }
      })

      ws.on('close', () => {
        logger.info('WebSocket client disconnected')
      })
    })
  }

  private handleWebSocketMessage(ws: any, message: any): void {
    switch (message.type) {
      case 'subscribe_task':
        // Subscribe to task updates
        break
      case 'unsubscribe_task':
        // Unsubscribe from task updates
        break
      default:
        logger.warn('Unknown WebSocket message type:', message.type)
    }
  }

  public async start(): Promise<void> {
    try {
      // Create HTTP server
      this.server = createServer(this.app)
      
      // Setup WebSocket
      this.setupWebSocket()

      // Start server
      this.server.listen(this.port, () => {
        logger.info(`Orchestrator server running on port ${this.port}`)
      })

      // Graceful shutdown
      process.on('SIGTERM', () => this.shutdown())
      process.on('SIGINT', () => this.shutdown())

    } catch (error) {
      logger.error('Failed to start server:', error)
      process.exit(1)
    }
  }

  private async shutdown(): Promise<void> {
    logger.info('Shutting down server...')
    
    try {
      // Close WebSocket connections
      if (this.wss) {
        this.wss.close()
      }

      // Close HTTP server
      if (this.server) {
        this.server.close()
      }

      // Close database connections
      if (this.services?.database) {
        await this.services.database.close()
      }

      logger.info('Server shutdown complete')
      process.exit(0)
    } catch (error) {
      logger.error('Error during shutdown:', error)
      process.exit(1)
    }
  }
}

// Start server if this file is run directly
if (require.main === module) {
  const server = new OrchestratorServer()
  server.start().catch((error) => {
    logger.error('Failed to start server:', error)
    process.exit(1)
  })
}

export { OrchestratorServer }

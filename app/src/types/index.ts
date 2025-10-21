export interface Project {
  id: string
  name: string
  path: string
  type: 'node' | 'react' | 'vue' | 'angular' | 'python' | 'unknown'
  buildCommand?: string
  outputDir?: string
  lastDeployed?: string
  status: 'active' | 'inactive' | 'error'
  createdAt: string
  updatedAt: string
}

export interface Task {
  id: string
  projectId: string
  type: 'deploy' | 'build' | 'test' | 'analyze'
  platform: 'vercel' | 'render' | 'github' | 'docker' | 'local'
  status: 'pending' | 'running' | 'success' | 'error' | 'cancelled'
  progress: number
  startedAt?: string
  completedAt?: string
  logs: string[]
  error?: string
  result?: {
    url?: string
    deployId?: string
    buildId?: string
  }
}

export interface DeployOptions {
  platform: string
  environment?: string
  buildCommand?: string
  outputDir?: string
  envVars?: Record<string, string>
  autoDeploy?: boolean
}

export interface Settings {
  theme: 'light' | 'dark' | 'system'
  telemetry: boolean
  autoUpdate: boolean
  defaultPlatform: string
  notifications: boolean
  logLevel: 'debug' | 'info' | 'warn' | 'error'
}

export interface Credential {
  id: string
  platform: string
  name: string
  type: 'oauth' | 'pat' | 'key'
  encrypted: boolean
  createdAt: string
  lastUsed?: string
}

export interface LogEntry {
  id: string
  taskId: string
  timestamp: string
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  data?: any
}

export interface ErrorSignature {
  type: string
  hash: string
  message: string
  lines: string[]
  context: Record<string, any>
}

export interface RecoveryAction {
  action: string
  params: Record<string, any>
  expectedEffect: string
  confidence: number
  fallback?: RecoveryAction[]
}

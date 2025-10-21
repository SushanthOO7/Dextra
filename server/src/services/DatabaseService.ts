import sqlite3 from 'sqlite3'
import path from 'path'
import fs from 'fs'
import { logger } from '../utils/logger'

export interface Project {
  id: string
  name: string
  path: string
  type: string
  buildCommand?: string
  outputDir?: string
  status: 'active' | 'inactive' | 'error'
  createdAt: string
  updatedAt: string
  lastDeployed?: string
}

export interface Task {
  id: string
  projectId: string
  type: string
  platform: string
  status: 'pending' | 'running' | 'success' | 'error' | 'cancelled'
  progress: number
  startedAt?: string
  completedAt?: string
  logs: string
  error?: string
  result?: string
  createdAt: string
  updatedAt: string
}

export interface LogEntry {
  id: string
  taskId: string
  timestamp: string
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  data?: string
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

export class DatabaseService {
  private db: sqlite3.Database | null = null
  private dbPath: string

  constructor() {
    // Create data directory if it doesn't exist
    const dataDir = path.join(process.cwd(), 'data')
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }
    
    this.dbPath = path.join(dataDir, 'dextra.db')
  }

  public async initialize(): Promise<void> {
    try {
      this.db = new sqlite3.Database(this.dbPath)
      
      // Set pragmas
      this.db.run('PRAGMA journal_mode = WAL')
      this.db.run('PRAGMA foreign_keys = ON')
      
      await this.createTables()
      logger.info('Database initialized successfully')
    } catch (error) {
      logger.error('Failed to initialize database:', error)
      throw error
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    const createTableQueries = [
      // Projects table
      `CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        path TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL,
        buildCommand TEXT,
        outputDir TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        lastDeployed TEXT
      )`,
      
      // Tasks table
      `CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        projectId TEXT NOT NULL,
        type TEXT NOT NULL,
        platform TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        progress INTEGER NOT NULL DEFAULT 0,
        startedAt TEXT,
        completedAt TEXT,
        logs TEXT DEFAULT '',
        error TEXT,
        result TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (projectId) REFERENCES projects (id) ON DELETE CASCADE
      )`,
      
      // Log entries table
      `CREATE TABLE IF NOT EXISTS log_entries (
        id TEXT PRIMARY KEY,
        taskId TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        data TEXT,
        FOREIGN KEY (taskId) REFERENCES tasks (id) ON DELETE CASCADE
      )`,
      
      // Credentials table
      `CREATE TABLE IF NOT EXISTS credentials (
        id TEXT PRIMARY KEY,
        platform TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        encrypted BOOLEAN NOT NULL DEFAULT 1,
        createdAt TEXT NOT NULL,
        lastUsed TEXT
      )`,
      
      // Settings table
      `CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )`,
      
      // Indexes
      `CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks (projectId)`,
      `CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks (status)`,
      `CREATE INDEX IF NOT EXISTS idx_log_entries_task_id ON log_entries (taskId)`,
      `CREATE INDEX IF NOT EXISTS idx_log_entries_timestamp ON log_entries (timestamp)`,
      `CREATE INDEX IF NOT EXISTS idx_credentials_platform ON credentials (platform)`
    ]

    for (const query of createTableQueries) {
      await this.runQuery(query)
    }
  }

  // Helper methods for sqlite3
  private runQuery(sql: string, params: any[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }
      
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }

  private getQuery(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }
      
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err)
        } else {
          resolve(row)
        }
      })
    })
  }

  private allQuery(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }
      
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err)
        } else {
          resolve(rows)
        }
      })
    })
  }

  // Project methods
  public async createProject(projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
    if (!this.db) throw new Error('Database not initialized')

    const id = this.generateId()
    const now = new Date().toISOString()
    
    await this.runQuery(`
      INSERT INTO projects (id, name, path, type, buildCommand, outputDir, status, createdAt, updatedAt, lastDeployed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      projectData.name,
      projectData.path,
      projectData.type,
      projectData.buildCommand || null,
      projectData.outputDir || null,
      projectData.status,
      now,
      now,
      projectData.lastDeployed || null
    ])

    const createdProject = await this.getProject(id)
    if (!createdProject) {
      throw new Error('Failed to create project')
    }
    return createdProject
  }

  public async getProject(id: string): Promise<Project | null> {
    const row = await this.getQuery('SELECT * FROM projects WHERE id = ?', [id])
    return row ? this.mapRowToProject(row) : null
  }

  public async getAllProjects(): Promise<Project[]> {
    const rows = await this.allQuery('SELECT * FROM projects ORDER BY updatedAt DESC')
    return rows.map(row => this.mapRowToProject(row))
  }

  public async updateProject(id: string, updates: Partial<Project>): Promise<Project | null> {
    const updateFields = Object.keys(updates).filter(key => key !== 'id')
    if (updateFields.length === 0) return this.getProject(id)

    const setClause = updateFields.map(field => `${field} = ?`).join(', ')
    const values = updateFields.map(field => (updates as any)[field])
    values.push(new Date().toISOString(), id) // updatedAt, id

    await this.runQuery(`
      UPDATE projects 
      SET ${setClause}, updatedAt = ? 
      WHERE id = ?
    `, values)
    
    return this.getProject(id)
  }

  public async deleteProject(id: string): Promise<boolean> {
    await this.runQuery('DELETE FROM projects WHERE id = ?', [id])
    return true // sqlite3 doesn't return affected rows count easily
  }

  // Task methods
  public async createTask(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    if (!this.db) throw new Error('Database not initialized')

    const id = this.generateId()
    const now = new Date().toISOString()
    
    await this.runQuery(`
      INSERT INTO tasks (id, projectId, type, platform, status, progress, startedAt, completedAt, logs, error, result, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      taskData.projectId,
      taskData.type,
      taskData.platform,
      taskData.status,
      taskData.progress,
      taskData.startedAt || null,
      taskData.completedAt || null,
      taskData.logs || '',
      taskData.error || null,
      taskData.result || null,
      now,
      now
    ])

    const createdTask = await this.getTask(id)
    if (!createdTask) {
      throw new Error('Failed to create task')
    }
    return createdTask
  }

  public async getTask(id: string): Promise<Task | null> {
    const row = await this.getQuery('SELECT * FROM tasks WHERE id = ?', [id])
    return row ? this.mapRowToTask(row) : null
  }

  public async getTasksByProject(projectId: string): Promise<Task[]> {
    const rows = await this.allQuery('SELECT * FROM tasks WHERE projectId = ? ORDER BY createdAt DESC', [projectId])
    return rows.map(row => this.mapRowToTask(row))
  }

  public async updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
    const updateFields = Object.keys(updates).filter(key => key !== 'id')
    if (updateFields.length === 0) return this.getTask(id)

    const setClause = updateFields.map(field => `${field} = ?`).join(', ')
    const values = updateFields.map(field => (updates as any)[field])
    values.push(new Date().toISOString(), id) // updatedAt, id

    await this.runQuery(`
      UPDATE tasks 
      SET ${setClause}, updatedAt = ? 
      WHERE id = ?
    `, values)
    
    return this.getTask(id)
  }

  // Log entry methods
  public async createLogEntry(logEntry: Omit<LogEntry, 'id'>): Promise<LogEntry> {
    if (!this.db) throw new Error('Database not initialized')

    const id = this.generateId()
    
    await this.runQuery(`
      INSERT INTO log_entries (id, taskId, timestamp, level, message, data)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      id,
      logEntry.taskId,
      logEntry.timestamp,
      logEntry.level,
      logEntry.message,
      logEntry.data || null
    ])

    return { ...logEntry, id }
  }

  public async getLogEntries(taskId: string): Promise<LogEntry[]> {
    const rows = await this.allQuery('SELECT * FROM log_entries WHERE taskId = ? ORDER BY timestamp ASC', [taskId])
    return rows.map(row => ({
      id: row.id,
      taskId: row.taskId,
      timestamp: row.timestamp,
      level: row.level,
      message: row.message,
      data: row.data
    }))
  }

  // Settings methods
  public async getSetting(key: string): Promise<string | null> {
    const row = await this.getQuery('SELECT value FROM settings WHERE key = ?', [key])
    return row ? row.value : null
  }

  public async setSetting(key: string, value: string): Promise<void> {
    const now = new Date().toISOString()
    await this.runQuery(`
      INSERT OR REPLACE INTO settings (key, value, updatedAt)
      VALUES (?, ?, ?)
    `, [key, value, now])
  }

  public close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  private mapRowToProject(row: any): Project {
    return {
      id: row.id,
      name: row.name,
      path: row.path,
      type: row.type,
      buildCommand: row.buildCommand,
      outputDir: row.outputDir,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      lastDeployed: row.lastDeployed
    }
  }

  private mapRowToTask(row: any): Task {
    return {
      id: row.id,
      projectId: row.projectId,
      type: row.type,
      platform: row.platform,
      status: row.status,
      progress: row.progress,
      startedAt: row.startedAt,
      completedAt: row.completedAt,
      logs: row.logs,
      error: row.error,
      result: row.result,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }
  }
}
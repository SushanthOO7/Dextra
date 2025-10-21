import { DatabaseService } from './DatabaseService'
import { logger } from '../utils/logger'
import { v4 as uuidv4 } from 'uuid'

export interface LogEntry {
  id: string
  taskId: string
  timestamp: string
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  data?: any
}

export class LogService {
  private database: DatabaseService

  constructor() {
    this.database = new DatabaseService()
  }

  public async initialize(): Promise<void> {
    await this.database.initialize()
  }

  public async log(
    taskId: string,
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    data?: any
  ): Promise<void> {
    try {
      const logEntry: Omit<LogEntry, 'id'> = {
        taskId,
        timestamp: new Date().toISOString(),
        level,
        message,
        data: data ? JSON.stringify(data) : undefined
      }

      await this.database.createLogEntry(logEntry)
      
      // Also log to console for development
      if (process.env.NODE_ENV === 'development') {
        const logMessage = `[${taskId}] ${level.toUpperCase()}: ${message}`
        switch (level) {
          case 'debug':
            logger.debug(logMessage)
            break
          case 'info':
            logger.info(logMessage)
            break
          case 'warn':
            logger.warn(logMessage)
            break
          case 'error':
            logger.error(logMessage)
            break
        }
      }
    } catch (error) {
      logger.error('Failed to create log entry:', error)
    }
  }

  public getLogEntries(taskId: string): LogEntry[] {
    return this.database.getLogEntries(taskId)
  }

  public async getLogEntriesByLevel(
    taskId: string,
    level: 'debug' | 'info' | 'warn' | 'error'
  ): Promise<LogEntry[]> {
    const allEntries = this.getLogEntries(taskId)
    return allEntries.filter(entry => entry.level === level)
  }

  public async getLogEntriesByTimeRange(
    taskId: string,
    startTime: string,
    endTime: string
  ): Promise<LogEntry[]> {
    const allEntries = this.getLogEntries(taskId)
    return allEntries.filter(entry => 
      entry.timestamp >= startTime && entry.timestamp <= endTime
    )
  }

  public async clearLogs(taskId: string): Promise<void> {
    // This would need to be implemented in DatabaseService
    // For now, we'll just log the action
    logger.info(`Clearing logs for task ${taskId}`)
  }

  public async exportLogs(taskId: string, format: 'json' | 'txt' = 'json'): Promise<string> {
    const entries = this.getLogEntries(taskId)
    
    if (format === 'json') {
      return JSON.stringify(entries, null, 2)
    } else {
      return entries
        .map(entry => `[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}`)
        .join('\n')
    }
  }

  public async getLogSummary(taskId: string): Promise<{
    total: number
    byLevel: Record<string, number>
    firstEntry?: string
    lastEntry?: string
  }> {
    const entries = this.getLogEntries(taskId)
    
    const summary = {
      total: entries.length,
      byLevel: {
        debug: 0,
        info: 0,
        warn: 0,
        error: 0
      },
      firstEntry: entries[0]?.timestamp,
      lastEntry: entries[entries.length - 1]?.timestamp
    }

    entries.forEach(entry => {
      summary.byLevel[entry.level]++
    })

    return summary
  }
}

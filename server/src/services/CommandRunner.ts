import { spawn, ChildProcess } from 'child_process'
import { EventEmitter } from 'events'
import { logger } from '../utils/logger'

export interface CommandResult {
  success: boolean
  stdout: string
  stderr: string
  exitCode: number
  duration: number
}

export interface CommandOptions {
  cwd?: string
  env?: Record<string, string>
  timeout?: number
  shell?: boolean
}

export class CommandRunner extends EventEmitter {
  private activeProcesses: Map<string, ChildProcess> = new Map()
  private processCounter = 0

  public async execute(
    command: string,
    args: string[] = [],
    cwd: string = process.cwd(),
    options: CommandOptions = {}
  ): Promise<CommandResult> {
    const processId = `cmd_${++this.processCounter}_${Date.now()}`
    const startTime = Date.now()
    
    logger.info(`Executing command: ${command} ${args.join(' ')} in ${cwd}`)

    return new Promise((resolve, reject) => {
      const childProcess = spawn(command, args, {
        cwd,
        env: { ...process.env, ...options.env },
        shell: options.shell || false,
        stdio: ['pipe', 'pipe', 'pipe']
      })

      this.activeProcesses.set(processId, childProcess)

      let stdout = ''
      let stderr = ''
      let timeoutId: NodeJS.Timeout | null = null

      // Set timeout if specified
      if (options.timeout) {
        timeoutId = setTimeout(() => {
          logger.warn(`Command timeout after ${options.timeout}ms: ${command} ${args.join(' ')}`)
          childProcess.kill('SIGTERM')
          
          // Force kill after 5 seconds
          setTimeout(() => {
            if (!childProcess.killed) {
              childProcess.kill('SIGKILL')
            }
          }, 5000)
        }, options.timeout)
      }

      // Handle stdout
      childProcess.stdout?.on('data', (data) => {
        const output = data.toString()
        stdout += output
        
        // Emit real-time output
        this.emit('stdout', {
          processId,
          command,
          output,
          timestamp: Date.now()
        })
        
        logger.debug(`[${processId}] stdout: ${output.trim()}`)
      })

      // Handle stderr
      childProcess.stderr?.on('data', (data) => {
        const output = data.toString()
        stderr += output
        
        // Emit real-time output
        this.emit('stderr', {
          processId,
          command,
          output,
          timestamp: Date.now()
        })
        
        logger.debug(`[${processId}] stderr: ${output.trim()}`)
      })

      // Handle process completion
      childProcess.on('close', (code, signal) => {
        this.activeProcesses.delete(processId)
        
        if (timeoutId) {
          clearTimeout(timeoutId)
        }

        const duration = Date.now() - startTime
        
        logger.info(`Command completed: ${command} ${args.join(' ')} (exit code: ${code}, duration: ${duration}ms)`)

        const result: CommandResult = {
          success: code === 0,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code || 0,
          duration
        }

        // Emit completion event
        this.emit('completed', {
          processId,
          command,
          result,
          timestamp: Date.now()
        })

        resolve(result)
      })

      // Handle process errors
      childProcess.on('error', (error) => {
        this.activeProcesses.delete(processId)
        
        if (timeoutId) {
          clearTimeout(timeoutId)
        }

        logger.error(`Command error: ${command} ${args.join(' ')}`, error)

        const result: CommandResult = {
          success: false,
          stdout: stdout.trim(),
          stderr: stderr.trim() + (stderr ? '\n' : '') + error.message,
          exitCode: -1,
          duration: Date.now() - startTime
        }

        this.emit('error', {
          processId,
          command,
          error,
          result,
          timestamp: Date.now()
        })

        reject(error)
      })

      // Handle process termination
      childProcess.on('exit', (code, signal) => {
        if (signal) {
          logger.info(`Command terminated by signal ${signal}: ${command} ${args.join(' ')}`)
        }
      })
    })
  }

  public async executeWithStream(
    command: string,
    args: string[] = [],
    cwd: string = process.cwd(),
    options: CommandOptions = {}
  ): Promise<{ processId: string; promise: Promise<CommandResult> }> {
    const processId = `cmd_${++this.processCounter}_${Date.now()}`
    const startTime = Date.now()
    
    logger.info(`Executing streaming command: ${command} ${args.join(' ')} in ${cwd}`)

    return new Promise((resolve) => {
      const childProcess = spawn(command, args, {
        cwd,
        env: { ...process.env, ...options.env },
        shell: options.shell || false,
        stdio: ['pipe', 'pipe', 'pipe']
      })

      this.activeProcesses.set(processId, childProcess)

      let stdout = ''
      let stderr = ''
      let timeoutId: NodeJS.Timeout | null = null

      // Set timeout if specified
      if (options.timeout) {
        timeoutId = setTimeout(() => {
          logger.warn(`Command timeout after ${options.timeout}ms: ${command} ${args.join(' ')}`)
          childProcess.kill('SIGTERM')
        }, options.timeout)
      }

      // Handle stdout
      childProcess.stdout?.on('data', (data) => {
        const output = data.toString()
        stdout += output
        
        this.emit('stdout', {
          processId,
          command,
          output,
          timestamp: Date.now()
        })
      })

      // Handle stderr
      childProcess.stderr?.on('data', (data) => {
        const output = data.toString()
        stderr += output
        
        this.emit('stderr', {
          processId,
          command,
          output,
          timestamp: Date.now()
        })
      })

      const promise = new Promise<CommandResult>((resolvePromise, rejectPromise) => {
        childProcess.on('close', (code, signal) => {
          this.activeProcesses.delete(processId)
          
          if (timeoutId) {
            clearTimeout(timeoutId)
          }

          const duration = Date.now() - startTime
          
          const result: CommandResult = {
            success: code === 0,
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            exitCode: code || 0,
            duration
          }

          this.emit('completed', {
            processId,
            command,
            result,
            timestamp: Date.now()
          })

          resolvePromise(result)
        })

        childProcess.on('error', (error) => {
          this.activeProcesses.delete(processId)
          
          if (timeoutId) {
            clearTimeout(timeoutId)
          }

          const result: CommandResult = {
            success: false,
            stdout: stdout.trim(),
            stderr: stderr.trim() + (stderr ? '\n' : '') + error.message,
            exitCode: -1,
            duration: Date.now() - startTime
          }

          this.emit('error', {
            processId,
            command,
            error,
            result,
            timestamp: Date.now()
          })

          rejectPromise(error)
        })
      })

      resolve({ processId, promise })
    })
  }

  public killProcess(processId: string): boolean {
    const process = this.activeProcesses.get(processId)
    if (!process) return false

    logger.info(`Killing process: ${processId}`)
    
    try {
      process.kill('SIGTERM')
      
      // Force kill after 5 seconds if still running
      setTimeout(() => {
        if (!process.killed) {
          process.kill('SIGKILL')
        }
      }, 5000)
      
      this.activeProcesses.delete(processId)
      return true
    } catch (error) {
      logger.error(`Failed to kill process ${processId}:`, error)
      return false
    }
  }

  public killAllProcesses(): void {
    logger.info(`Killing all active processes (${this.activeProcesses.size})`)
    
    for (const [processId, process] of this.activeProcesses) {
      try {
        process.kill('SIGTERM')
      } catch (error) {
        logger.error(`Failed to kill process ${processId}:`, error)
      }
    }
    
    // Force kill all after 5 seconds
    setTimeout(() => {
      for (const [processId, process] of this.activeProcesses) {
        if (!process.killed) {
          try {
            process.kill('SIGKILL')
          } catch (error) {
            logger.error(`Failed to force kill process ${processId}:`, error)
          }
        }
      }
      this.activeProcesses.clear()
    }, 5000)
  }

  public getActiveProcesses(): string[] {
    return Array.from(this.activeProcesses.keys())
  }

  public isProcessActive(processId: string): boolean {
    return this.activeProcesses.has(processId)
  }

  public getProcessCount(): number {
    return this.activeProcesses.size
  }
}

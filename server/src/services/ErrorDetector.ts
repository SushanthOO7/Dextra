import { logger } from '../utils/logger'
import crypto from 'crypto'

export interface ErrorSignature {
  type: 'build_error' | 'dependency_error' | 'config_error' | 'auth_error' | 'network_error' | 'permission_error'
  hash: string
  message: string
  file?: string
  line?: number
  command: string
  exitCode: number
  context: {
    framework?: string
    nodeVersion?: string
    dependencies?: Record<string, string>
    platform?: string
  }
  severity: 'low' | 'medium' | 'high' | 'critical'
  suggestions: string[]
}

export class ErrorDetector {
  private errorPatterns: Map<string, RegExp> = new Map()
  private initialized = false

  public async initialize(): Promise<void> {
    this.setupErrorPatterns()
    this.initialized = true
    logger.info('ErrorDetector initialized')
  }

  private setupErrorPatterns(): void {
    // Dependency errors
    this.errorPatterns.set('missing_dependency', /Cannot find module ['"]([^'"]+)['"]/)
    this.errorPatterns.set('missing_package', /Module not found: Error: Can't resolve ['"]([^'"]+)['"]/)
    this.errorPatterns.set('peer_dependency', /requires a peer of ([^@\s]+@[^\s]+)/)
    this.errorPatterns.set('version_mismatch', /version ([^\s]+) of ([^\s]+) is not compatible/)

    // Build errors
    this.errorPatterns.set('typescript_error', /error TS(\d+):/)
    this.errorPatterns.set('syntax_error', /SyntaxError: (.+) at line (\d+)/)
    this.errorPatterns.set('import_error', /Error: Cannot resolve module ['"]([^'"]+)['"]/)
    this.errorPatterns.set('build_failed', /Build failed with errors/)

    // Environment errors
    this.errorPatterns.set('missing_env_var', /['"]([A-Z_]+)['"] is not defined/)
    this.errorPatterns.set('env_file_missing', /ENOENT.*\.env/)
    this.errorPatterns.set('invalid_env_value', /Invalid value for environment variable/)

    // Network errors
    this.errorPatterns.set('network_timeout', /timeout of (\d+)ms exceeded/)
    this.errorPatterns.set('connection_refused', /ECONNREFUSED/)
    this.errorPatterns.set('dns_error', /ENOTFOUND/)
    this.errorPatterns.set('ssl_error', /SSL.*error/)

    // Permission errors
    this.errorPatterns.set('permission_denied', /EACCES: permission denied/)
    this.errorPatterns.set('read_only_filesystem', /EROFS: read-only file system/)
    this.errorPatterns.set('file_not_found', /ENOENT: no such file or directory/)

    // Authentication errors
    this.errorPatterns.set('auth_failed', /Authentication failed/)
    this.errorPatterns.set('token_expired', /token.*expired/i)
    this.errorPatterns.set('invalid_token', /invalid.*token/i)
    this.errorPatterns.set('unauthorized', /401.*unauthorized/i)

    // Platform-specific errors
    this.errorPatterns.set('vercel_error', /vercel.*error/i)
    this.errorPatterns.set('render_error', /render.*error/i)
    this.errorPatterns.set('docker_error', /docker.*error/i)
  }

  public detectError(stderr: string, stdout: string = ''): ErrorSignature | null {
    if (!this.initialized) {
      logger.warn('ErrorDetector not initialized')
      return null
    }

    const combinedOutput = stderr + '\n' + stdout
    const lines = combinedOutput.split('\n')

    for (const [errorType, pattern] of this.errorPatterns) {
      const match = combinedOutput.match(pattern)
      if (match) {
        return this.createErrorSignature(errorType, match, combinedOutput, lines)
      }
    }

    // If no specific pattern matches, create a generic error signature
    if (stderr.trim()) {
      return this.createGenericErrorSignature(stderr, combinedOutput, lines)
    }

    return null
  }

  private createErrorSignature(
    errorType: string,
    match: RegExpMatchArray,
    fullOutput: string,
    lines: string[]
  ): ErrorSignature {
    const hash = this.generateErrorHash(fullOutput)
    const message = match[0] || fullOutput.split('\n')[0] || 'Unknown error'
    
    let type: ErrorSignature['type'] = 'build_error'
    let severity: ErrorSignature['severity'] = 'medium'
    let suggestions: string[] = []

    // Determine error type and severity
    switch (errorType) {
      case 'missing_dependency':
      case 'missing_package':
        type = 'dependency_error'
        severity = 'high'
        suggestions = [
          `Install missing package: npm install ${match[1]}`,
          'Check if package is in dependencies vs devDependencies',
          'Verify package name spelling'
        ]
        break

      case 'peer_dependency':
        type = 'dependency_error'
        severity = 'medium'
        suggestions = [
          `Install peer dependency: npm install ${match[1]}`,
          'Check package documentation for required peer dependencies'
        ]
        break

      case 'version_mismatch':
        type = 'dependency_error'
        severity = 'high'
        suggestions = [
          'Update package versions to compatible ranges',
          'Use npm ls to check dependency tree',
          'Consider using npm update'
        ]
        break

      case 'typescript_error':
      case 'syntax_error':
        type = 'build_error'
        severity = 'high'
        suggestions = [
          'Fix TypeScript/syntax errors in source code',
          'Check TypeScript configuration',
          'Update TypeScript version if needed'
        ]
        break

      case 'missing_env_var':
        type = 'config_error'
        severity = 'medium'
        suggestions = [
          `Set environment variable: ${match[1]}=value`,
          'Create .env file with required variables',
          'Check deployment platform environment settings'
        ]
        break

      case 'auth_failed':
      case 'token_expired':
      case 'invalid_token':
        type = 'auth_error'
        severity = 'critical'
        suggestions = [
          'Refresh authentication token',
          'Re-authenticate with platform',
          'Check token permissions and scope'
        ]
        break

      case 'network_timeout':
      case 'connection_refused':
      case 'dns_error':
        type = 'network_error'
        severity = 'medium'
        suggestions = [
          'Check internet connection',
          'Verify API endpoints are accessible',
          'Try again after network issues resolve'
        ]
        break

      case 'permission_denied':
      case 'read_only_filesystem':
        type = 'permission_error'
        severity = 'high'
        suggestions = [
          'Check file/folder permissions',
          'Run with appropriate user privileges',
          'Verify write access to target directory'
        ]
        break

      default:
        type = 'build_error'
        severity = 'medium'
        suggestions = ['Check error logs for more details', 'Try rebuilding the project']
    }

    // Extract file and line information if available
    let file: string | undefined
    let line: number | undefined

    for (const lineText of lines) {
      const fileMatch = lineText.match(/at (.+):(\d+):(\d+)/)
      if (fileMatch) {
        file = fileMatch[1]
        line = parseInt(fileMatch[2])
        break
      }
    }

    return {
      type,
      hash,
      message,
      file,
      line,
      command: this.extractCommand(fullOutput),
      exitCode: this.extractExitCode(fullOutput),
      context: this.extractContext(fullOutput),
      severity,
      suggestions
    }
  }

  private createGenericErrorSignature(
    stderr: string,
    fullOutput: string,
    lines: string[]
  ): ErrorSignature {
    const hash = this.generateErrorHash(fullOutput)
    const message = stderr.split('\n')[0] || 'Unknown error'

    return {
      type: 'build_error',
      hash,
      message,
      command: this.extractCommand(fullOutput),
      exitCode: this.extractExitCode(fullOutput),
      context: this.extractContext(fullOutput),
      severity: 'medium',
      suggestions: [
        'Check error logs for more details',
        'Verify project configuration',
        'Try rebuilding the project'
      ]
    }
  }

  private generateErrorHash(content: string): string {
    // Normalize content for consistent hashing
    const normalized = content
      .replace(/\d+/g, '0') // Replace numbers with 0
      .replace(/\/[^\s]+/g, '/path') // Replace file paths
      .replace(/at line \d+/g, 'at line 0') // Replace line numbers
      .toLowerCase()
      .trim()

    return crypto.createHash('sha256').update(normalized).digest('hex').substring(0, 16)
  }

  private extractCommand(output: string): string {
    const commandMatch = output.match(/\$ ([^\n]+)/)
    return commandMatch ? commandMatch[1] : 'unknown'
  }

  private extractExitCode(output: string): number {
    const exitMatch = output.match(/exited with code (\d+)/)
    return exitMatch ? parseInt(exitMatch[1]) : 1
  }

  private extractContext(output: string): ErrorSignature['context'] {
    const context: ErrorSignature['context'] = {}

    // Extract Node.js version
    const nodeMatch = output.match(/node v(\d+\.\d+\.\d+)/)
    if (nodeMatch) {
      context.nodeVersion = nodeMatch[1]
    }

    // Extract framework information
    if (output.includes('react')) context.framework = 'react'
    else if (output.includes('vue')) context.framework = 'vue'
    else if (output.includes('angular')) context.framework = 'angular'
    else if (output.includes('next')) context.framework = 'next'
    else if (output.includes('nuxt')) context.framework = 'nuxt'

    // Extract platform information
    if (output.includes('vercel')) context.platform = 'vercel'
    else if (output.includes('render')) context.platform = 'render'
    else if (output.includes('docker')) context.platform = 'docker'
    else if (output.includes('github')) context.platform = 'github'

    return context
  }

  public getErrorPatterns(): Map<string, RegExp> {
    return new Map(this.errorPatterns)
  }

  public addErrorPattern(name: string, pattern: RegExp): void {
    this.errorPatterns.set(name, pattern)
    logger.info(`Added error pattern: ${name}`)
  }

  public removeErrorPattern(name: string): boolean {
    const removed = this.errorPatterns.delete(name)
    if (removed) {
      logger.info(`Removed error pattern: ${name}`)
    }
    return removed
  }

  public isInitialized(): boolean {
    return this.initialized
  }
}

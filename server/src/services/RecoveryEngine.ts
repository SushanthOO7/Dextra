import { ErrorSignature } from './ErrorDetector'
import { logger } from '../utils/logger'

export interface RecoveryAction {
  action: string
  params: Record<string, any>
  confidence: number
  description: string
  estimatedTime: number // in seconds
  riskLevel: 'low' | 'medium' | 'high'
  prerequisites?: string[]
  alternatives?: RecoveryAction[]
}

export interface RecoveryRule {
  errorPattern: RegExp
  actionGenerator: (match: RegExpMatchArray, context: ErrorSignature) => RecoveryAction
  priority: number
  enabled: boolean
}

export class RecoveryEngine {
  private recoveryRules: RecoveryRule[] = []
  private initialized = false

  public async initialize(): Promise<void> {
    this.setupRecoveryRules()
    this.initialized = true
    logger.info('RecoveryEngine initialized')
  }

  private setupRecoveryRules(): void {
    // Missing dependency recovery
    this.addRecoveryRule({
      errorPattern: /Cannot find module ['"]([^'"]+)['"]/,
      actionGenerator: (match, context) => ({
        action: 'install_dependency',
        params: { package: match[1] },
        confidence: 0.95,
        description: `Install missing package: ${match[1]}`,
        estimatedTime: 30,
        riskLevel: 'low',
        prerequisites: ['npm', 'yarn', 'pnpm'],
        alternatives: [
          {
            action: 'install_dev_dependency',
            params: { package: match[1] },
            confidence: 0.80,
            description: `Install as dev dependency: ${match[1]}`,
            estimatedTime: 30,
            riskLevel: 'low'
          }
        ]
      }),
      priority: 1,
      enabled: true
    })

    // Peer dependency recovery
    this.addRecoveryRule({
      errorPattern: /requires a peer of ([^@\s]+@[^\s]+)/,
      actionGenerator: (match, context) => ({
        action: 'install_peer_dependency',
        params: { package: match[1] },
        confidence: 0.90,
        description: `Install peer dependency: ${match[1]}`,
        estimatedTime: 30,
        riskLevel: 'low'
      }),
      priority: 1,
      enabled: true
    })

    // Missing environment variable recovery
    this.addRecoveryRule({
      errorPattern: /['"]([A-Z_]+)['"] is not defined/,
      actionGenerator: (match, context) => ({
        action: 'set_env_variable',
        params: { 
          key: match[1],
          promptUser: true,
          defaultValue: ''
        },
        confidence: 0.85,
        description: `Set environment variable: ${match[1]}`,
        estimatedTime: 60,
        riskLevel: 'low',
        prerequisites: ['user_input']
      }),
      priority: 2,
      enabled: true
    })

    // Missing .env file recovery
    this.addRecoveryRule({
      errorPattern: /ENOENT.*\.env/,
      actionGenerator: (match, context) => ({
        action: 'create_env_file',
        params: { 
          template: 'basic',
          promptUser: true
        },
        confidence: 0.80,
        description: 'Create .env file with required variables',
        estimatedTime: 120,
        riskLevel: 'low',
        prerequisites: ['user_input']
      }),
      priority: 2,
      enabled: true
    })

    // Build cache issues recovery
    this.addRecoveryRule({
      errorPattern: /Build failed with errors/,
      actionGenerator: (match, context) => ({
        action: 'clear_cache_and_retry',
        params: { 
          clearNodeModules: false,
          clearBuildOutput: true,
          clearPackageLock: false
        },
        confidence: 0.70,
        description: 'Clear build cache and retry',
        estimatedTime: 60,
        riskLevel: 'low',
        alternatives: [
          {
            action: 'clear_all_cache',
            params: { 
              clearNodeModules: true,
              clearBuildOutput: true,
              clearPackageLock: true
            },
            confidence: 0.85,
            description: 'Clear all cache and reinstall dependencies',
            estimatedTime: 180,
            riskLevel: 'medium'
          }
        ]
      }),
      priority: 3,
      enabled: true
    })

    // TypeScript version mismatch recovery
    this.addRecoveryRule({
      errorPattern: /error TS(\d+):/,
      actionGenerator: (match, context) => {
        const tsErrorCode = parseInt(match[1])
        let action: RecoveryAction

        if (tsErrorCode >= 2300 && tsErrorCode < 2400) { // Module resolution errors
          action = {
            action: 'fix_typescript_config',
            params: { 
              errorCode: tsErrorCode,
              checkModuleResolution: true
            },
            confidence: 0.75,
            description: `Fix TypeScript configuration for error TS${tsErrorCode}`,
            estimatedTime: 120,
            riskLevel: 'medium',
            prerequisites: ['typescript_config']
          }
        } else {
          action = {
            action: 'fix_typescript_errors',
            params: { 
              errorCode: tsErrorCode,
              autoFix: false
            },
            confidence: 0.60,
            description: `Fix TypeScript error TS${tsErrorCode}`,
            estimatedTime: 300,
            riskLevel: 'medium',
            prerequisites: ['manual_fix']
          }
        }

        return action
      },
      priority: 2,
      enabled: true
    })

    // Authentication token issues recovery
    this.addRecoveryRule({
      errorPattern: /(token.*expired|invalid.*token|authentication.*failed)/i,
      actionGenerator: (match, context) => ({
        action: 'refresh_auth_token',
        params: { 
          platform: context.context.platform || 'unknown',
          reauthRequired: true
        },
        confidence: 0.90,
        description: 'Refresh authentication token',
        estimatedTime: 60,
        riskLevel: 'low',
        prerequisites: ['user_reauth']
      }),
      priority: 1,
      enabled: true
    })

    // Network timeout recovery
    this.addRecoveryRule({
      errorPattern: /timeout of (\d+)ms exceeded/,
      actionGenerator: (match, context) => ({
        action: 'retry_with_backoff',
        params: { 
          maxRetries: 3,
          backoffMultiplier: 2,
          initialDelay: 5000
        },
        confidence: 0.80,
        description: 'Retry with exponential backoff',
        estimatedTime: 30,
        riskLevel: 'low'
      }),
      priority: 3,
      enabled: true
    })

    // Permission denied recovery
    this.addRecoveryRule({
      errorPattern: /EACCES: permission denied/,
      actionGenerator: (match, context) => ({
        action: 'fix_permissions',
        params: { 
          targetPath: 'auto_detect',
          permissions: '755'
        },
        confidence: 0.85,
        description: 'Fix file/folder permissions',
        estimatedTime: 30,
        riskLevel: 'medium',
        prerequisites: ['admin_access']
      }),
      priority: 2,
      enabled: true
    })

    // Node.js version compatibility recovery
    this.addRecoveryRule({
      errorPattern: /version ([^\s]+) of ([^\s]+) is not compatible/,
      actionGenerator: (match, context) => ({
        action: 'upgrade_dependency',
        params: { 
          package: match[2],
          targetVersion: 'latest',
          checkCompatibility: true
        },
        confidence: 0.75,
        description: `Upgrade ${match[2]} to compatible version`,
        estimatedTime: 120,
        riskLevel: 'medium',
        alternatives: [
          {
            action: 'downgrade_dependency',
            params: { 
              package: match[2],
              targetVersion: 'compatible',
              checkCompatibility: true
            },
            confidence: 0.70,
            description: `Downgrade ${match[2]} to compatible version`,
            estimatedTime: 120,
            riskLevel: 'medium'
          }
        ]
      }),
      priority: 2,
      enabled: true
    })
  }

  public async getRecoveryAction(errorSignature: ErrorSignature): Promise<RecoveryAction | null> {
    if (!this.initialized) {
      logger.warn('RecoveryEngine not initialized')
      return null
    }

    // Sort rules by priority (higher priority first)
    const sortedRules = [...this.recoveryRules].sort((a, b) => b.priority - a.priority)

    for (const rule of sortedRules) {
      if (!rule.enabled) continue

      const match = errorSignature.message.match(rule.errorPattern)
      if (match) {
        try {
          const action = rule.actionGenerator(match, errorSignature)
          
          // Adjust confidence based on context
          const adjustedConfidence = this.adjustConfidence(action, errorSignature)
          
          logger.info(`Recovery action found: ${action.action} (confidence: ${adjustedConfidence})`)
          
          return {
            ...action,
            confidence: adjustedConfidence
          }
        } catch (error) {
          logger.error(`Error generating recovery action for rule:`, error)
        }
      }
    }

    // If no specific rule matches, return a generic recovery action
    return this.getGenericRecoveryAction(errorSignature)
  }

  private adjustConfidence(action: RecoveryAction, context: ErrorSignature): number {
    let confidence = action.confidence

    // Adjust based on error severity
    switch (context.severity) {
      case 'critical':
        confidence *= 0.9 // Slightly reduce confidence for critical errors
        break
      case 'high':
        confidence *= 1.0 // No change
        break
      case 'medium':
        confidence *= 1.1 // Slightly increase confidence
        break
      case 'low':
        confidence *= 1.2 // Increase confidence for low severity
        break
    }

    // Adjust based on framework compatibility
    if (context.context.framework && action.params.package) {
      const frameworkCompatibility = this.checkFrameworkCompatibility(
        context.context.framework,
        action.params.package
      )
      confidence *= frameworkCompatibility
    }

    // Ensure confidence stays within bounds
    return Math.max(0.1, Math.min(1.0, confidence))
  }

  private checkFrameworkCompatibility(framework: string, packageName: string): number {
    // This would contain framework-specific compatibility checks
    // For now, return a default multiplier
    const compatibilityMap: Record<string, number> = {
      'react': 1.0,
      'vue': 1.0,
      'angular': 1.0,
      'next': 1.0,
      'nuxt': 1.0
    }

    return compatibilityMap[framework] || 0.8
  }

  private getGenericRecoveryAction(errorSignature: ErrorSignature): RecoveryAction {
    return {
      action: 'generic_retry',
      params: { 
        maxRetries: 2,
        delay: 5000
      },
      confidence: 0.30,
      description: 'Generic retry with delay',
      estimatedTime: 30,
      riskLevel: 'low',
      alternatives: [
        {
          action: 'manual_investigation',
          params: {},
          confidence: 0.50,
          description: 'Manual investigation required',
          estimatedTime: 600,
          riskLevel: 'low',
          prerequisites: ['user_intervention']
        }
      ]
    }
  }

  public addRecoveryRule(rule: RecoveryRule): void {
    this.recoveryRules.push(rule)
    logger.info(`Added recovery rule: ${rule.errorPattern}`)
  }

  public removeRecoveryRule(pattern: RegExp): boolean {
    const index = this.recoveryRules.findIndex(rule => rule.errorPattern.source === pattern.source)
    if (index !== -1) {
      this.recoveryRules.splice(index, 1)
      logger.info(`Removed recovery rule: ${pattern}`)
      return true
    }
    return false
  }

  public enableRecoveryRule(pattern: RegExp): boolean {
    const rule = this.recoveryRules.find(rule => rule.errorPattern.source === pattern.source)
    if (rule) {
      rule.enabled = true
      logger.info(`Enabled recovery rule: ${pattern}`)
      return true
    }
    return false
  }

  public disableRecoveryRule(pattern: RegExp): boolean {
    const rule = this.recoveryRules.find(rule => rule.errorPattern.source === pattern.source)
    if (rule) {
      rule.enabled = false
      logger.info(`Disabled recovery rule: ${pattern}`)
      return true
    }
    return false
  }

  public getRecoveryRules(): RecoveryRule[] {
    return [...this.recoveryRules]
  }

  public isInitialized(): boolean {
    return this.initialized
  }

  public async validateRecoveryAction(action: RecoveryAction): Promise<boolean> {
    // Validate prerequisites
    if (action.prerequisites) {
      for (const prerequisite of action.prerequisites) {
        if (!await this.checkPrerequisite(prerequisite)) {
          logger.warn(`Prerequisite not met: ${prerequisite}`)
          return false
        }
      }
    }

    // Validate parameters
    if (!this.validateActionParameters(action)) {
      logger.warn(`Invalid parameters for action: ${action.action}`)
      return false
    }

    return true
  }

  private async checkPrerequisite(prerequisite: string): Promise<boolean> {
    switch (prerequisite) {
      case 'npm':
      case 'yarn':
      case 'pnpm':
        return await this.checkPackageManager(prerequisite)
      case 'typescript_config':
        return await this.checkTypeScriptConfig()
      case 'admin_access':
        return await this.checkAdminAccess()
      case 'user_input':
      case 'user_intervention':
      case 'user_reauth':
        return true // These require user interaction
      default:
        return true
    }
  }

  private async checkPackageManager(manager: string): Promise<boolean> {
    // This would check if the package manager is available
    // For now, assume they're available
    return true
  }

  private async checkTypeScriptConfig(): Promise<boolean> {
    // This would check if TypeScript configuration exists
    // For now, assume it exists
    return true
  }

  private async checkAdminAccess(): Promise<boolean> {
    // This would check if the process has admin privileges
    // For now, assume it does
    return true
  }

  private validateActionParameters(action: RecoveryAction): boolean {
    // Basic parameter validation
    if (action.confidence < 0 || action.confidence > 1) return false
    if (action.estimatedTime < 0) return false
    if (!['low', 'medium', 'high'].includes(action.riskLevel)) return false

    return true
  }
}

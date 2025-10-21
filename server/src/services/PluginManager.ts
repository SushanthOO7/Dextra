import { logger } from '../utils/logger'
import { VercelPlugin } from '../plugins/VercelPlugin'
import { RenderPlugin } from '../plugins/RenderPlugin'
import { GitHubPlugin } from '../plugins/GitHubPlugin'
import { DockerPlugin } from '../plugins/DockerPlugin'

export interface Plugin {
  name: string
  platform: string
  detectProject(projectPath: string): Promise<ProjectConfig | null>
  authenticate(): Promise<AuthResult>
  deploy(projectPath: string, options: DeployOptions): Promise<DeployResult>
  getStatus(deployId: string): Promise<DeployStatus>
  setEnvVars(deployId: string, envVars: Record<string, string>): Promise<void>
  rollback(deployId: string): Promise<void>
}

export interface ProjectConfig {
  type: string
  buildCommand?: string
  outputDir?: string
  framework?: string
  packageManager?: string
  path: string
}

export interface AuthResult {
  success: boolean
  token?: string
  error?: string
}

export interface DeployOptions {
  buildOutput?: string
  token?: string
  environment?: string
  envVars?: Record<string, string>
  [key: string]: any
}

export interface DeployResult {
  success: boolean
  deployId?: string
  url?: string
  error?: string
}

export interface DeployStatus {
  status: 'pending' | 'building' | 'ready' | 'error' | 'live'
  url?: string
  error?: string
  logs?: string[]
}

export class PluginManager {
  private plugins: Map<string, Plugin> = new Map()

  public async initialize(): Promise<void> {
    try {
      // Initialize built-in plugins
      this.registerPlugin(new VercelPlugin())
      this.registerPlugin(new RenderPlugin())
      this.registerPlugin(new GitHubPlugin())
      this.registerPlugin(new DockerPlugin())
      
      logger.info(`Initialized ${this.plugins.size} plugins`)
    } catch (error) {
      logger.error('Failed to initialize plugins:', error)
      throw error
    }
  }

  public registerPlugin(plugin: Plugin): void {
    this.plugins.set(plugin.platform, plugin)
    logger.info(`Registered plugin: ${plugin.name} (${plugin.platform})`)
  }

  public getPlugin(platform: string): Plugin | null {
    return this.plugins.get(platform) || null
  }

  public getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values())
  }

  public getSupportedPlatforms(): string[] {
    return Array.from(this.plugins.keys())
  }

  public async detectProjectType(projectPath: string): Promise<{
    platform: string
    config: ProjectConfig
    confidence: number
  }[]> {
    const results: {
      platform: string
      config: ProjectConfig
      confidence: number
    }[] = []

    for (const [platform, plugin] of this.plugins) {
      try {
        const config = await plugin.detectProject(projectPath)
        if (config) {
          // Calculate confidence based on how well the plugin can handle this project
          let confidence = 0.5 // Base confidence
          
          // Increase confidence based on specific indicators
          if (config.framework) confidence += 0.2
          if (config.buildCommand) confidence += 0.1
          if (config.outputDir) confidence += 0.1
          if (config.packageManager) confidence += 0.1

          results.push({
            platform,
            config,
            confidence: Math.min(confidence, 1.0)
          })
        }
      } catch (error) {
        logger.debug(`Plugin ${platform} failed to detect project:`, error)
      }
    }

    // Sort by confidence (highest first)
    return results.sort((a, b) => b.confidence - a.confidence)
  }

  public async validateProject(projectPath: string, platform: string): Promise<{
    valid: boolean
    issues: string[]
    suggestions: string[]
  }> {
    const plugin = this.getPlugin(platform)
    if (!plugin) {
      return {
        valid: false,
        issues: [`Platform ${platform} not supported`],
        suggestions: []
      }
    }

    const issues: string[] = []
    const suggestions: string[] = []

    try {
      const config = await plugin.detectProject(projectPath)
      if (!config) {
        issues.push('Project not compatible with this platform')
        return { valid: false, issues, suggestions }
      }

      // Validate build command
      if (!config.buildCommand) {
        issues.push('No build command detected')
        suggestions.push('Add a build script to package.json or create a build configuration')
      }

      // Validate output directory
      if (!config.outputDir) {
        issues.push('No output directory detected')
        suggestions.push('Specify an output directory in your build configuration')
      }

      // Platform-specific validations
      if (platform === 'vercel') {
        if (config.type === 'node' && !config.framework) {
          suggestions.push('Consider using a framework like Next.js or React for better Vercel integration')
        }
      } else if (platform === 'render') {
        if (config.type === 'static') {
          suggestions.push('Render works best with full-stack applications')
        }
      }

      return {
        valid: issues.length === 0,
        issues,
        suggestions
      }
    } catch (error) {
      return {
        valid: false,
        issues: [`Failed to validate project: ${error}`],
        suggestions: []
      }
    }
  }

  public async getPlatformCapabilities(platform: string): Promise<{
    features: string[]
    limitations: string[]
    requirements: string[]
  }> {
    const plugin = this.getPlugin(platform)
    if (!plugin) {
      return { features: [], limitations: [], requirements: [] }
    }

    // This would be implemented by each plugin
    // For now, return basic information
    const capabilities: Record<string, { features: string[]; limitations: string[]; requirements: string[] }> = {
      vercel: {
        features: ['Static sites', 'Serverless functions', 'Edge functions', 'Automatic deployments'],
        limitations: ['Build time limits', 'Function execution limits'],
        requirements: ['Node.js project', 'Build command', 'Output directory']
      },
      render: {
        features: ['Full-stack apps', 'Docker support', 'Auto-scaling', 'Custom domains'],
        limitations: ['Resource limits', 'Cold starts'],
        requirements: ['Dockerfile or build command', 'Port configuration']
      },
      github: {
        features: ['Static sites', 'GitHub Actions', 'Custom domains', 'HTTPS'],
        limitations: ['Static content only', 'Build time limits'],
        requirements: ['GitHub repository', 'Static files', 'index.html']
      },
      docker: {
        features: ['Any language', 'Custom environments', 'Port mapping', 'Volume mounting'],
        limitations: ['Local deployment only', 'Manual management'],
        requirements: ['Dockerfile', 'Docker daemon']
      }
    }

    return capabilities[platform] || { features: [], limitations: [], requirements: [] }
  }
}

import { DatabaseService, Project } from './DatabaseService'
import { PluginManager } from './PluginManager'
import { logger } from '../utils/logger'
import { existsSync, readFileSync } from 'fs'
import path from 'path'

export interface ProjectDetectionResult {
  type: string
  buildCommand?: string
  outputDir?: string
  packageManager?: string
  framework?: string
}

export class ProjectService {
  private database: DatabaseService
  private pluginManager: PluginManager

  constructor() {
    this.database = new DatabaseService()
    this.pluginManager = new PluginManager()
  }

  public async initialize(): Promise<void> {
    await this.database.initialize()
    await this.pluginManager.initialize()
  }

  public async addProject(projectPath: string): Promise<{ success: boolean; project?: Project; error?: string }> {
    try {
      // Validate project path
      if (!existsSync(projectPath)) {
        return { success: false, error: 'Project path does not exist' }
      }

      // Detect project type and configuration
      const detection = await this.detectProject(projectPath)
      if (!detection) {
        return { success: false, error: 'Failed to detect project type' }
      }

      // Create project record
      const project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'> = {
        name: path.basename(projectPath),
        path: projectPath,
        type: detection.type,
        buildCommand: detection.buildCommand,
        outputDir: detection.outputDir,
        status: 'active'
      }

      const createdProject = await this.database.createProject(project)
      logger.info(`Project added: ${createdProject.name} (${createdProject.id})`)

      return { success: true, project: createdProject }
    } catch (error) {
      logger.error('Failed to add project:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  public async detectProject(projectPath: string): Promise<ProjectDetectionResult | null> {
    try {
      // Check for package.json (Node.js/React/Vue/Angular)
      const packageJsonPath = path.join(projectPath, 'package.json')
      if (existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
        
        // Detect framework
        let framework = 'node'
        let buildCommand = 'npm run build'
        let outputDir = 'dist'

        if (packageJson.dependencies?.react || packageJson.devDependencies?.react) {
          framework = 'react'
          buildCommand = 'npm run build'
          outputDir = 'build'
        } else if (packageJson.dependencies?.vue || packageJson.devDependencies?.vue) {
          framework = 'vue'
          buildCommand = 'npm run build'
          outputDir = 'dist'
        } else if (packageJson.dependencies?.['@angular/core'] || packageJson.devDependencies?.['@angular/core']) {
          framework = 'angular'
          buildCommand = 'ng build'
          outputDir = 'dist'
        } else if (packageJson.dependencies?.next || packageJson.devDependencies?.next) {
          framework = 'next'
          buildCommand = 'npm run build'
          outputDir = '.next'
        } else if (packageJson.dependencies?.nuxt || packageJson.devDependencies?.nuxt) {
          framework = 'nuxt'
          buildCommand = 'npm run build'
          outputDir = '.nuxt'
        }

        return {
          type: framework,
          buildCommand,
          outputDir,
          packageManager: 'npm',
          framework
        }
      }

      // Check for requirements.txt (Python)
      const requirementsPath = path.join(projectPath, 'requirements.txt')
      if (existsSync(requirementsPath)) {
        return {
          type: 'python',
          buildCommand: 'pip install -r requirements.txt',
          outputDir: '.',
          packageManager: 'pip'
        }
      }

      // Check for Dockerfile
      const dockerfilePath = path.join(projectPath, 'Dockerfile')
      if (existsSync(dockerfilePath)) {
        return {
          type: 'docker',
          buildCommand: 'docker build .',
          outputDir: '.',
          packageManager: 'docker'
        }
      }

      // Check for Cargo.toml (Rust)
      const cargoPath = path.join(projectPath, 'Cargo.toml')
      if (existsSync(cargoPath)) {
        return {
          type: 'rust',
          buildCommand: 'cargo build --release',
          outputDir: 'target/release',
          packageManager: 'cargo'
        }
      }

      // Check for go.mod (Go)
      const goModPath = path.join(projectPath, 'go.mod')
      if (existsSync(goModPath)) {
        return {
          type: 'go',
          buildCommand: 'go build',
          outputDir: '.',
          packageManager: 'go'
        }
      }

      return null
    } catch (error) {
      logger.error('Failed to detect project:', error)
      return null
    }
  }

  public getAllProjects(): Project[] {
    return this.database.getAllProjects()
  }

  public getProject(id: string): Project | null {
    return this.database.getProject(id)
  }

  public async updateProject(id: string, updates: Partial<Project>): Promise<Project | null> {
    return await this.database.updateProject(id, updates)
  }

  public deleteProject(id: string): boolean {
    return this.database.deleteProject(id)
  }

  public async getProjectCapabilities(projectId: string): Promise<string[]> {
    const project = this.database.getProject(projectId)
    if (!project) return []

    const capabilities: string[] = []

    // Check if project can be deployed to different platforms
    const platforms = ['vercel', 'render', 'github', 'docker']
    
    for (const platform of platforms) {
      const plugin = this.pluginManager.getPlugin(platform)
      if (plugin) {
        try {
          const config = await plugin.detectProject(project.path)
          if (config) {
            capabilities.push(platform)
          }
        } catch (error) {
          // Platform not compatible
        }
      }
    }

    return capabilities
  }

  public async validateProject(projectId: string): Promise<{ valid: boolean; issues: string[] }> {
    const project = this.database.getProject(projectId)
    if (!project) {
      return { valid: false, issues: ['Project not found'] }
    }

    const issues: string[] = []

    // Check if project path exists
    if (!existsSync(project.path)) {
      issues.push('Project path does not exist')
    }

    // Check if build command is valid
    if (project.buildCommand) {
      // This would need more sophisticated validation
      // For now, just check if it's not empty
      if (project.buildCommand.trim() === '') {
        issues.push('Build command is empty')
      }
    }

    // Check if output directory is valid
    if (project.outputDir) {
      const outputPath = path.join(project.path, project.outputDir)
      if (!existsSync(outputPath)) {
        issues.push('Output directory does not exist')
      }
    }

    return {
      valid: issues.length === 0,
      issues
    }
  }
}

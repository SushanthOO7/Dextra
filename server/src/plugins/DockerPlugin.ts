import { Plugin, ProjectConfig, AuthResult, DeployOptions, DeployResult, DeployStatus } from '../services/PluginManager'
import { logger } from '../utils/logger'
import { existsSync, readFileSync } from 'fs'
import path from 'path'
import { spawn } from 'child_process'

export class DockerPlugin implements Plugin {
  public name = 'Docker'
  public platform = 'docker'
  private dockerProcess: any = null

  public async detectProject(projectPath: string): Promise<ProjectConfig | null> {
    try {
      // Check for Dockerfile
      const dockerfilePath = path.join(projectPath, 'Dockerfile')
      if (existsSync(dockerfilePath)) {
        return {
          type: 'docker',
          buildCommand: 'docker build .',
          outputDir: '.',
          framework: 'docker',
          packageManager: 'docker',
          path: projectPath
        }
      }

      // Check for docker-compose.yml
      const composePath = path.join(projectPath, 'docker-compose.yml')
      if (existsSync(composePath)) {
        return {
          type: 'docker-compose',
          buildCommand: 'docker-compose up --build',
          outputDir: '.',
          framework: 'docker-compose',
          packageManager: 'docker-compose',
          path: projectPath
        }
      }

      return null
    } catch (error) {
      logger.error('Failed to detect Docker project:', error)
      return null
    }
  }

  public async authenticate(): Promise<AuthResult> {
    try {
      // Docker doesn't require authentication for local deployment
      return {
        success: true,
        token: 'local-docker'
      }
    } catch (error) {
      logger.error('Failed to authenticate with Docker:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  public async deploy(projectPath: string, options: DeployOptions): Promise<DeployResult> {
    try {
      const { buildOutput, environment = 'production' } = options
      
      // Build Docker image
      const buildResult = await this.buildDockerImage(projectPath, environment)
      
      if (!buildResult.success) {
        return buildResult
      }

      // Run Docker container
      const runResult = await this.runDockerContainer(buildResult.imageId!, environment)
      
      if (!runResult.success) {
        return runResult
      }

      return {
        success: true,
        deployId: runResult.containerId,
        url: `http://localhost:${runResult.port}`
      }
    } catch (error) {
      logger.error('Failed to deploy with Docker:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  public async getStatus(deployId: string): Promise<DeployStatus> {
    try {
      // Check if container is running
      const isRunning = await this.isContainerRunning(deployId)
      
      if (isRunning) {
        return {
          status: 'ready',
          url: `http://localhost:${deployId}`
        }
      } else {
        return {
          status: 'error',
          error: 'Container is not running'
        }
      }
    } catch (error) {
      logger.error('Failed to get Docker container status:', error)
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  public async setEnvVars(deployId: string, envVars: Record<string, string>): Promise<void> {
    try {
      // This would update environment variables for the container
      logger.info(`Setting environment variables for container ${deployId}`)
    } catch (error) {
      logger.error('Failed to set environment variables:', error)
      throw error
    }
  }

  public async rollback(deployId: string): Promise<void> {
    try {
      // Stop and remove container
      await this.stopContainer(deployId)
      logger.info(`Rolled back container ${deployId}`)
    } catch (error) {
      logger.error('Failed to rollback container:', error)
      throw error
    }
  }

  private async buildDockerImage(
    projectPath: string,
    environment: string
  ): Promise<{ success: boolean; imageId?: string; error?: string }> {
    try {
      const imageId = `dextra-${Date.now()}`
      
      return new Promise((resolve) => {
        const process = spawn('docker', ['build', '-t', imageId, '.'], {
          cwd: projectPath,
          stdio: 'pipe'
        })

        let output = ''
        let errorOutput = ''

        process.stdout?.on('data', (data) => {
          output += data.toString()
        })

        process.stderr?.on('data', (data) => {
          errorOutput += data.toString()
        })

        process.on('close', (code) => {
          if (code === 0) {
            resolve({ success: true, imageId })
          } else {
            resolve({ 
              success: false, 
              error: `Docker build failed: ${errorOutput}` 
            })
          }
        })

        process.on('error', (error) => {
          resolve({ 
            success: false, 
            error: `Docker build error: ${error.message}` 
          })
        })
      })
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private async runDockerContainer(
    imageId: string,
    environment: string
  ): Promise<{ success: boolean; containerId?: string; port?: number; error?: string }> {
    try {
      const containerId = `dextra-container-${Date.now()}`
      const port = 3000 + Math.floor(Math.random() * 1000)
      
      return new Promise((resolve) => {
        const process = spawn('docker', [
          'run',
          '-d',
          '-p', `${port}:3000`,
          '--name', containerId,
          imageId
        ], {
          stdio: 'pipe'
        })

        let output = ''
        let errorOutput = ''

        process.stdout?.on('data', (data) => {
          output += data.toString()
        })

        process.stderr?.on('data', (data) => {
          errorOutput += data.toString()
        })

        process.on('close', (code) => {
          if (code === 0) {
            resolve({ success: true, containerId, port })
          } else {
            resolve({ 
              success: false, 
              error: `Docker run failed: ${errorOutput}` 
            })
          }
        })

        process.on('error', (error) => {
          resolve({ 
            success: false, 
            error: `Docker run error: ${error.message}` 
          })
        })
      })
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private async isContainerRunning(containerId: string): Promise<boolean> {
    try {
      return new Promise((resolve) => {
        const process = spawn('docker', ['ps', '-q', '-f', `name=${containerId}`], {
          stdio: 'pipe'
        })

        let output = ''

        process.stdout?.on('data', (data) => {
          output += data.toString()
        })

        process.on('close', (code) => {
          resolve(code === 0 && output.trim() !== '')
        })

        process.on('error', () => {
          resolve(false)
        })
      })
    } catch (error) {
      return false
    }
  }

  private async stopContainer(containerId: string): Promise<void> {
    try {
      return new Promise((resolve, reject) => {
        const process = spawn('docker', ['stop', containerId], {
          stdio: 'pipe'
        })

        process.on('close', (code) => {
          if (code === 0) {
            resolve()
          } else {
            reject(new Error(`Failed to stop container: ${code}`))
          }
        })

        process.on('error', reject)
      })
    } catch (error) {
      logger.error('Failed to stop container:', error)
      throw error
    }
  }
}

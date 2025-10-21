import { useState } from 'react'
import { FolderOpen, Plus, Zap, Shield, GitBranch } from 'lucide-react'
import { useProjects } from '../hooks/useProjects'
import toast from 'react-hot-toast'

export default function Welcome() {
  const [isAddingProject, setIsAddingProject] = useState(false)
  const { addProject } = useProjects()

  const handleAddProject = async () => {
    try {
      setIsAddingProject(true)
      const result = await window.electronAPI.openDirectory()
      
      if (!result.canceled && result.filePaths.length > 0) {
        const projectPath = result.filePaths[0]
        const addResult = await addProject(projectPath)
        
        if (addResult.success) {
          toast.success('Project added successfully!')
        } else {
          toast.error(addResult.error || 'Failed to add project')
        }
      }
    } catch (error) {
      toast.error('Failed to open directory')
    } finally {
      setIsAddingProject(false)
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-2xl mx-auto text-center">
        <div className="mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Welcome to Dextra
          </h1>
          <p className="text-xl text-muted-foreground">
            AI-powered deployment automation with intelligent error recovery
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="p-6 bg-card rounded-lg border border-border">
            <Zap className="w-8 h-8 text-primary mb-3" />
            <h3 className="font-semibold text-foreground mb-2">Smart Deployments</h3>
            <p className="text-sm text-muted-foreground">
              Deploy to Vercel, Render, GitHub, and Docker with AI-powered optimization
            </p>
          </div>
          
          <div className="p-6 bg-card rounded-lg border border-border">
            <Shield className="w-8 h-8 text-primary mb-3" />
            <h3 className="font-semibold text-foreground mb-2">Error Recovery</h3>
            <p className="text-sm text-muted-foreground">
              Automatic error detection and recovery using reinforcement learning
            </p>
          </div>
          
          <div className="p-6 bg-card rounded-lg border border-border">
            <GitBranch className="w-8 h-8 text-primary mb-3" />
            <h3 className="font-semibold text-foreground mb-2">Visual Tasks</h3>
            <p className="text-sm text-muted-foreground">
              AI-powered GUI automation for complex deployment workflows
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleAddProject}
            disabled={isAddingProject}
            className="inline-flex items-center space-x-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <FolderOpen className="w-5 h-5" />
            <span>{isAddingProject ? 'Adding Project...' : 'Add Your First Project'}</span>
          </button>
          
          <p className="text-sm text-muted-foreground">
            Select a project folder to get started with automated deployments
          </p>
        </div>
      </div>
    </div>
  )
}

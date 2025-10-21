import { useState } from 'react'
import { Plus, FolderOpen, Play, Settings, History } from 'lucide-react'
import { useProjects } from '../hooks/useProjects'
import { useTasks } from '../hooks/useTasks'
import { Project, Task } from '../types'
import toast from 'react-hot-toast'

export default function Dashboard() {
  const { projects, addProject } = useProjects()
  const { startTask } = useTasks()
  const [isAddingProject, setIsAddingProject] = useState(false)

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

  const handleDeploy = async (project: Project, platform: string) => {
    try {
      const result = await startTask({
        projectId: project.id,
        type: 'deploy',
        platform,
        options: {}
      })
      
      if (result.success) {
        toast.success(`Deployment started on ${platform}`)
      } else {
        toast.error(result.error || 'Failed to start deployment')
      }
    } catch (error) {
      toast.error('Failed to start deployment')
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Manage your projects and deployments</p>
        </div>
        
        <button
          onClick={handleAddProject}
          disabled={isAddingProject}
          className="inline-flex items-center space-x-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          <span>{isAddingProject ? 'Adding...' : 'Add Project'}</span>
        </button>
      </div>

      {/* Projects Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onDeploy={handleDeploy}
          />
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid md:grid-cols-4 gap-4">
          <QuickActionButton
            icon={FolderOpen}
            label="Add Project"
            description="Import a new project"
            onClick={handleAddProject}
            disabled={isAddingProject}
          />
          <QuickActionButton
            icon={Play}
            label="Deploy All"
            description="Deploy all projects"
            onClick={() => toast.info('Deploy all feature coming soon')}
          />
          <QuickActionButton
            icon={History}
            label="View History"
            description="Check deployment history"
            onClick={() => toast.info('History feature coming soon')}
          />
          <QuickActionButton
            icon={Settings}
            label="Settings"
            description="Configure preferences"
            onClick={() => window.location.href = '/settings'}
          />
        </div>
      </div>
    </div>
  )
}

interface ProjectCardProps {
  project: Project
  onDeploy: (project: Project, platform: string) => void
}

function ProjectCard({ project, onDeploy }: ProjectCardProps) {
  const platforms = [
    { id: 'vercel', name: 'Vercel', color: 'bg-black' },
    { id: 'render', name: 'Render', color: 'bg-blue-500' },
    { id: 'github', name: 'GitHub Pages', color: 'bg-gray-600' },
    { id: 'docker', name: 'Docker', color: 'bg-blue-400' }
  ]

  return (
    <div className="bg-card rounded-lg border border-border p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-foreground">{project.name}</h3>
          <p className="text-sm text-muted-foreground">{project.type}</p>
        </div>
        <div className={`w-3 h-3 rounded-full ${
          project.status === 'active' ? 'bg-green-500' : 
          project.status === 'error' ? 'bg-red-500' : 'bg-gray-400'
        }`} />
      </div>
      
      <div className="space-y-3">
        <div className="text-sm text-muted-foreground">
          <p className="truncate">{project.path}</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {platforms.map((platform) => (
            <button
              key={platform.id}
              onClick={() => onDeploy(project, platform.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium text-white ${platform.color} hover:opacity-80 transition-opacity`}
            >
              Deploy to {platform.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

interface QuickActionButtonProps {
  icon: any
  label: string
  description: string
  onClick: () => void
  disabled?: boolean
}

function QuickActionButton({ icon: Icon, label, description, onClick, disabled }: QuickActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="p-4 bg-muted rounded-lg hover:bg-accent transition-colors text-left disabled:opacity-50"
    >
      <Icon className="w-6 h-6 text-primary mb-2" />
      <div className="font-medium text-foreground">{label}</div>
      <div className="text-sm text-muted-foreground">{description}</div>
    </button>
  )
}

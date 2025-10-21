import { useParams } from 'react-router-dom'
import { useState } from 'react'
import { Play, Settings, History, FileText, RefreshCw } from 'lucide-react'
import { useProjects } from '../hooks/useProjects'
import { useTasks } from '../hooks/useTasks'
import { Task } from '../types'
import toast from 'react-hot-toast'

export default function ProjectDetail() {
  const { id } = useParams()
  const { projects } = useProjects()
  const { startTask, tasks } = useTasks()
  const [selectedPlatform, setSelectedPlatform] = useState('vercel')
  
  const project = projects.find(p => p.id === id)
  const projectTasks = tasks.filter(t => t.projectId === id)

  if (!project) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Project Not Found</h1>
          <p className="text-muted-foreground">The requested project could not be found.</p>
        </div>
      </div>
    )
  }

  const handleDeploy = async () => {
    try {
      const result = await startTask({
        projectId: project.id,
        type: 'deploy',
        platform: selectedPlatform,
        options: {}
      })
      
      if (result.success) {
        toast.success(`Deployment started on ${selectedPlatform}`)
      } else {
        toast.error(result.error || 'Failed to start deployment')
      }
    } catch (error) {
      toast.error('Failed to start deployment')
    }
  }

  const platforms = [
    { id: 'vercel', name: 'Vercel', description: 'Frontend deployments' },
    { id: 'render', name: 'Render', description: 'Full-stack applications' },
    { id: 'github', name: 'GitHub Pages', description: 'Static sites' },
    { id: 'docker', name: 'Docker', description: 'Containerized apps' }
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
          <p className="text-muted-foreground">{project.path}</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors">
            <Settings className="w-5 h-5" />
          </button>
          <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Project Info */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="font-semibold text-foreground mb-2">Project Type</h3>
          <p className="text-muted-foreground capitalize">{project.type}</p>
        </div>
        
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="font-semibold text-foreground mb-2">Status</h3>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              project.status === 'active' ? 'bg-green-500' : 
              project.status === 'error' ? 'bg-red-500' : 'bg-gray-400'
            }`} />
            <span className="text-muted-foreground capitalize">{project.status}</span>
          </div>
        </div>
        
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="font-semibold text-foreground mb-2">Last Deployed</h3>
          <p className="text-muted-foreground">
            {project.lastDeployed ? new Date(project.lastDeployed).toLocaleDateString() : 'Never'}
          </p>
        </div>
      </div>

      {/* Deployment Section */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Deploy Project</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Select Platform
            </label>
            <div className="grid md:grid-cols-2 gap-3">
              {platforms.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => setSelectedPlatform(platform.id)}
                  className={`p-4 rounded-lg border text-left transition-colors ${
                    selectedPlatform === platform.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:bg-accent'
                  }`}
                >
                  <div className="font-medium text-foreground">{platform.name}</div>
                  <div className="text-sm text-muted-foreground">{platform.description}</div>
                </button>
              ))}
            </div>
          </div>
          
          <button
            onClick={handleDeploy}
            className="inline-flex items-center space-x-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            <Play className="w-5 h-5" />
            <span>Deploy to {platforms.find(p => p.id === selectedPlatform)?.name}</span>
          </button>
        </div>
      </div>

      {/* Recent Tasks */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Recent Tasks</h2>
        
        {projectTasks.length === 0 ? (
          <div className="text-center py-8">
            <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No tasks yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {projectTasks.map((task) => (
              <TaskItem key={task.id} task={task} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface TaskItemProps {
  task: Task
}

function TaskItem({ task }: TaskItemProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-500'
      case 'error': return 'text-red-500'
      case 'running': return 'text-blue-500'
      case 'pending': return 'text-yellow-500'
      default: return 'text-muted-foreground'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return '✓'
      case 'error': return '✗'
      case 'running': return '⟳'
      case 'pending': return '⏳'
      default: return '○'
    }
  }

  return (
    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
      <div className="flex items-center space-x-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          task.status === 'success' ? 'bg-green-100 text-green-700' :
          task.status === 'error' ? 'bg-red-100 text-red-700' :
          task.status === 'running' ? 'bg-blue-100 text-blue-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          {getStatusIcon(task.status)}
        </div>
        
        <div>
          <div className="font-medium text-foreground">
            {task.type} to {task.platform}
          </div>
          <div className="text-sm text-muted-foreground">
            {task.startedAt && new Date(task.startedAt).toLocaleString()}
          </div>
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className={`text-sm font-medium ${getStatusColor(task.status)}`}>
          {task.status}
        </div>
        
        {task.status === 'running' && (
          <div className="w-24 bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${task.progress}%` }}
            />
          </div>
        )}
        
        <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors">
          <FileText className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

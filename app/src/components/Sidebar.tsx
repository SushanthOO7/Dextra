import { Link, useLocation } from 'react-router-dom'
import { Home, Settings, Plus, FolderOpen } from 'lucide-react'
import { Project } from '../types'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  projects: Project[]
}

export default function Sidebar({ isOpen, onClose, projects }: SidebarProps) {
  const location = useLocation()

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-card border-r border-border
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col
      `}>
        {/* Header */}
        <div className="p-4 border-b border-border">
          <h1 className="text-xl font-bold text-foreground">Dextra</h1>
          <p className="text-sm text-muted-foreground">AI-Powered Deployment</p>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          <Link
            to="/"
            className={`
              flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors
              ${location.pathname === '/' 
                ? 'bg-primary text-primary-foreground' 
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }
            `}
            onClick={onClose}
          >
            <Home className="w-5 h-5" />
            <span>Dashboard</span>
          </Link>
          
          <Link
            to="/settings"
            className={`
              flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors
              ${location.pathname === '/settings' 
                ? 'bg-primary text-primary-foreground' 
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }
            `}
            onClick={onClose}
          >
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </Link>
        </nav>
        
        {/* Projects Section */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-foreground">Projects</h3>
            <button className="text-muted-foreground hover:text-foreground">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-1">
            {projects.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                No projects yet
              </div>
            ) : (
              projects.map((project) => (
                <Link
                  key={project.id}
                  to={`/project/${project.id}`}
                  className={`
                    flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors
                    ${location.pathname === `/project/${project.id}` 
                      ? 'bg-primary text-primary-foreground' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    }
                  `}
                  onClick={onClose}
                >
                  <FolderOpen className="w-4 h-4" />
                  <span className="truncate">{project.name}</span>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  )
}

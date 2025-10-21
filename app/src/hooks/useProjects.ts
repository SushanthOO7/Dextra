import { useState, useEffect } from 'react'
import { Project } from '../types'

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      setLoading(true)
      const result = await window.electronAPI.listProjects()
      if (result.success) {
        setProjects(result.projects)
      } else {
        setError(result.error || 'Failed to load projects')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const addProject = async (projectPath: string) => {
    try {
      const result = await window.electronAPI.addProject(projectPath)
      if (result.success) {
        setProjects(prev => [...prev, result.project])
        return { success: true, project: result.project }
      } else {
        return { success: false, error: result.error }
      }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }

  const removeProject = (projectId: string) => {
    setProjects(prev => prev.filter(p => p.id !== projectId))
  }

  const updateProject = (projectId: string, updates: Partial<Project>) => {
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, ...updates } : p))
  }

  return {
    projects,
    loading,
    error,
    addProject,
    removeProject,
    updateProject,
    refreshProjects: loadProjects
  }
}

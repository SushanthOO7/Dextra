import { useState, useEffect } from 'react'
import { Task } from '../types'

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Set up event listeners for real-time updates
    const handleTaskLog = (data: string) => {
      console.log('Task log:', data)
      // Update task logs in real-time
    }

    const handleTaskError = (data: string) => {
      console.error('Task error:', data)
      setError(data)
    }

    const handleTaskComplete = (data: any) => {
      console.log('Task complete:', data)
      // Update task status
    }

    window.electronAPI.onTaskLog(handleTaskLog)
    window.electronAPI.onTaskError(handleTaskError)
    window.electronAPI.onTaskComplete(handleTaskComplete)

    return () => {
      window.electronAPI.removeAllListeners('task:log')
      window.electronAPI.removeAllListeners('task:error')
      window.electronAPI.removeAllListeners('task:complete')
    }
  }, [])

  const startTask = async (taskData: {
    projectId: string
    type: string
    platform: string
    options?: any
  }) => {
    try {
      setLoading(true)
      setError(null)
      
      const result = await window.electronAPI.startTask(taskData)
      if (result.success) {
        const newTask: Task = {
          id: result.taskId,
          projectId: taskData.projectId,
          type: taskData.type as any,
          platform: taskData.platform as any,
          status: 'running',
          progress: 0,
          startedAt: new Date().toISOString(),
          logs: []
        }
        setTasks(prev => [newTask, ...prev])
        return { success: true, taskId: result.taskId }
      } else {
        setError(result.error)
        return { success: false, error: result.error }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const stopTask = async (taskId: string) => {
    try {
      const result = await window.electronAPI.stopTask(taskId)
      if (result.success) {
        setTasks(prev => prev.map(t => 
          t.id === taskId ? { ...t, status: 'cancelled' } : t
        ))
        return { success: true }
      } else {
        return { success: false, error: result.error }
      }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }

  const getTaskStatus = async (taskId: string) => {
    try {
      const result = await window.electronAPI.getTaskStatus(taskId)
      return result
    } catch (err) {
      return { status: 'error', progress: 0 }
    }
  }

  return {
    tasks,
    loading,
    error,
    startTask,
    stopTask,
    getTaskStatus
  }
}

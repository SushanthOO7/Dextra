import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useTheme } from '../hooks/useTheme'
import { useProjects } from '../hooks/useProjects'
import Layout from '../components/Layout'
import Dashboard from '../components/Dashboard'
import ProjectDetail from '../components/ProjectDetail'
import Settings from '../components/Settings'
import Welcome from '../components/Welcome'

function App() {
  const { theme } = useTheme()
  const { projects } = useProjects()
  

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'dark' : ''}`}>
      <Routes>
        <Route path="/" element={<Layout />}>
          {projects.length === 0 ? (
            <Route index element={<Welcome />} />
          ) : (
            <Route index element={<Dashboard />} />
          )}
          <Route path="/project/:id" element={<ProjectDetail />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'hsl(var(--card))',
            color: 'hsl(var(--card-foreground))',
            border: '1px solid hsl(var(--border))',
          },
        }}
      />
    </div>
  )
}

export default App

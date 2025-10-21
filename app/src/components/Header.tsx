import { Menu, Sun, Moon, Monitor } from 'lucide-react'

interface HeaderProps {
  onMenuClick: () => void
  theme: 'light' | 'dark' | 'system'
  onThemeChange: (theme: 'light' | 'dark' | 'system') => void
}

export default function Header({ onMenuClick, theme, onThemeChange }: HeaderProps) {
  return (
    <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-accent transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        
        <div className="hidden lg:block">
          <h2 className="text-lg font-semibold text-foreground">Dextra</h2>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        {/* Theme toggle */}
        <div className="flex items-center space-x-1 bg-muted rounded-lg p-1">
          <button
            onClick={() => onThemeChange('light')}
            className={`p-2 rounded transition-colors ${
              theme === 'light' ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Light theme"
          >
            <Sun className="w-4 h-4" />
          </button>
          <button
            onClick={() => onThemeChange('dark')}
            className={`p-2 rounded transition-colors ${
              theme === 'dark' ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Dark theme"
          >
            <Moon className="w-4 h-4" />
          </button>
          <button
            onClick={() => onThemeChange('system')}
            className={`p-2 rounded transition-colors ${
              theme === 'system' ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
            title="System theme"
          >
            <Monitor className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  )
}

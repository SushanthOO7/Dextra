# Dextra - AI-Powered Deployment Automation

Dextra is an installable desktop application that automates deployment workflows with AI-powered error recovery and visual task execution.

## Architecture

- **Frontend**: Electron + React + TypeScript + Tailwind CSS
- **Backend**: Node.js orchestrator with SQLite database
- **ML Services**: Python services for Agent-S (visual tasks) and RL recovery
- **Plugins**: Platform integrations (Vercel, Render, GitHub, Docker)
- **Security**: OS keychain integration with encrypted fallback

## Quick Start

```bash
# Install dependencies
npm install

# Start development servers
npm run dev

# Build for production
npm run build

# Package desktop app
npm run package
```

## Project Structure

```
/Dextra
├── app/                # Electron + React frontend
├── server/             # Node.js orchestrator + plugins
├── ml/                 # Python ML services (Agent-S + RL)
├── plugins/            # Platform plugins
├── scripts/            # Build and packaging scripts
├── config/             # Configuration files
└── docs/               # Documentation
```

## Features

- 🎯 **Visual Task Execution**: AI-powered GUI automation
- 🔄 **Error Recovery**: RL-based automatic error resolution
- 🚀 **Multi-Platform Deploy**: Vercel, Render, GitHub, Docker
- 🔒 **Secure Credentials**: OS keychain integration
- 📊 **Real-time Monitoring**: Live logs and progress tracking
- 🎨 **Modern UI**: Clean, intuitive interface

## Development

### Prerequisites

- Node.js 18+
- Python 3.9+
- Git

### Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Start development: `npm run dev`

### Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:app
npm run test:server
npm run test:ml
```

## Security

- Credentials stored in OS keychain (Windows Credential Manager / macOS Keychain)
- Encrypted fallback storage for unsupported systems
- OAuth flows with minimal required scopes
- Optional offline-only mode
- Telemetry opt-in with privacy controls

## License

MIT License - see LICENSE file for details.

# Dextra Architecture

## Overview

Dextra is a comprehensive deployment automation platform that combines AI-powered error recovery with visual task execution. The system is designed as a desktop application with a modular architecture supporting multiple deployment platforms.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Dextra Desktop App                       │
├─────────────────────────────────────────────────────────────────┤
│  Electron + React Frontend  │  Node.js Orchestrator  │  Python ML │
│  - Project Management       │  - Task Orchestration  │  - Agent-S │
│  - Deployment UI            │  - Plugin Management    │  - RL Recovery │
│  - Real-time Logs          │  - Credential Storage    │  - Vision Analysis │
│  - Settings & Config       │  - Database (SQLite)    │  - FastAPI Service │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Platform Plugins                            │
├─────────────────────────────────────────────────────────────────┤
│  Vercel Plugin  │  Render Plugin  │  GitHub Plugin  │  Docker Plugin │
│  - API Integration │  - API Integration │  - API Integration │  - Local Engine │
│  - OAuth Flow    │  - OAuth Flow    │  - OAuth Flow    │  - Container Mgmt │
│  - Deploy Logic  │  - Deploy Logic  │  - Deploy Logic  │  - Deploy Logic │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Electron Desktop App (Frontend)

**Technology Stack:**

- Electron 28+ for desktop app framework
- React 18+ with TypeScript for UI
- Vite for build tooling
- Tailwind CSS for styling
- Zustand for state management

**Key Features:**

- Project selection and management
- Real-time deployment monitoring
- Interactive error recovery suggestions
- Settings and credential management
- Cross-platform compatibility (Windows, macOS, Linux)

**Key Files:**

- `app/src/main/main.ts` - Electron main process
- `app/src/renderer/App.tsx` - React application
- `app/src/components/` - UI components
- `app/src/hooks/` - Custom React hooks

### 2. Node.js Orchestrator (Backend)

**Technology Stack:**

- Express.js for API server
- SQLite with better-sqlite3 for database
- WebSocket for real-time communication
- Winston for logging
- Keytar for credential storage

**Key Features:**

- Task orchestration and state management
- Plugin system for platform integrations
- Credential management with encryption
- Real-time logging and monitoring
- Error recovery coordination

**Key Files:**

- `server/src/index.ts` - Main orchestrator server
- `server/src/services/` - Core business logic
- `server/src/controllers/` - API endpoints
- `server/src/plugins/` - Platform integrations

### 3. Python ML Services

**Technology Stack:**

- FastAPI for ML service API
- PyTorch for deep learning models
- Transformers for pre-trained models
- Stable-Baselines3 for reinforcement learning
- OpenCV and EasyOCR for computer vision

**Key Features:**

- Agent-S model for GUI action prediction
- RL-based error recovery system
- Computer vision for screenshot analysis
- OCR for text extraction
- Model training and fine-tuning

**Key Files:**

- `ml/main.py` - FastAPI ML service
- `ml/services/agent_s_service.py` - GUI action prediction
- `ml/services/rl_recovery_service.py` - Error recovery
- `ml/services/vision_service.py` - Computer vision

## Data Flow

### 1. Project Addition Flow

```
User selects project folder
    ↓
Orchestrator detects project type
    ↓
Plugin system validates compatibility
    ↓
Project stored in SQLite database
    ↓
UI updates with project information
```

### 2. Deployment Flow

```
User initiates deployment
    ↓
Orchestrator starts task
    ↓
Plugin authenticates with platform
    ↓
Build process execution
    ↓
Deployment to platform
    ↓
Status monitoring and logging
    ↓
Success/failure handling
```

### 3. Error Recovery Flow

```
Error detected during deployment
    ↓
Error signature generation
    ↓
RL model analyzes error
    ↓
Recovery action suggested
    ↓
Action executed automatically
    ↓
Retry deployment
    ↓
Success or escalate to human
```

## Database Schema

### Projects Table

```sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  path TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  buildCommand TEXT,
  outputDir TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  lastDeployed TEXT
);
```

### Tasks Table

```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL,
  type TEXT NOT NULL,
  platform TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  progress INTEGER NOT NULL DEFAULT 0,
  startedAt TEXT,
  completedAt TEXT,
  logs TEXT DEFAULT '',
  error TEXT,
  result TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (projectId) REFERENCES projects (id)
);
```

### Log Entries Table

```sql
CREATE TABLE log_entries (
  id TEXT PRIMARY KEY,
  taskId TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  level TEXT NOT NULL,
  message TEXT NOT NULL,
  data TEXT,
  FOREIGN KEY (taskId) REFERENCES tasks (id)
);
```

## Security Architecture

### Credential Storage

- **Primary**: OS keychain (Windows Credential Manager, macOS Keychain)
- **Fallback**: Encrypted local storage using libsodium
- **Encryption**: Argon2 key derivation + ChaCha20-Poly1305

### OAuth Flow

- Platform-specific OAuth implementations
- Secure token storage and refresh
- Minimal required scopes
- Token expiration handling

### Data Privacy

- Local processing by default
- Optional telemetry with user consent
- No code or logs sent to cloud without permission
- Encrypted local database

## Plugin System

### Plugin Interface

```typescript
interface Plugin {
  name: string;
  platform: string;
  detectProject(projectPath: string): Promise<ProjectConfig | null>;
  authenticate(): Promise<AuthResult>;
  deploy(projectPath: string, options: DeployOptions): Promise<DeployResult>;
  getStatus(deployId: string): Promise<DeployStatus>;
  setEnvVars(deployId: string, envVars: Record<string, string>): Promise<void>;
  rollback(deployId: string): Promise<void>;
}
```

### Supported Platforms

- **Vercel**: Frontend deployments, serverless functions
- **Render**: Full-stack applications, Docker containers
- **GitHub Pages**: Static site hosting
- **Docker**: Local container deployment

## ML Models

### Agent-S Model

- **Purpose**: GUI action prediction from screenshots
- **Architecture**: CLIP + Transformer hybrid
- **Input**: Screenshot + context
- **Output**: Action coordinates and type
- **Training**: Fine-tuned on GUI interaction data

### RL Recovery Model

- **Purpose**: Error recovery action selection
- **Architecture**: PPO (Proximal Policy Optimization)
- **Input**: Error signature + context
- **Output**: Recovery action + confidence
- **Training**: Simulated error scenarios

### Vision Service

- **Purpose**: Screenshot analysis and OCR
- **Models**: CLIP, EasyOCR, OpenCV
- **Features**: UI element detection, text extraction, error analysis

## Deployment Architecture

### Development

- Local development with hot reload
- Mock services for testing
- Development database
- Local ML model inference

### Production

- Packaged desktop application
- Optimized ML models
- Production database
- Signed and notarized binaries

### Distribution

- GitHub Releases for updates
- Auto-updater integration
- Cross-platform installers
- Code signing and notarization

## Performance Considerations

### Frontend

- Lazy loading of components
- Virtual scrolling for large lists
- Optimized bundle size
- Efficient state management

### Backend

- Connection pooling for database
- Caching for frequently accessed data
- Streaming for large log files
- Background task processing

### ML Services

- Model quantization for faster inference
- GPU acceleration when available
- Batch processing for multiple requests
- Model caching and preloading

## Monitoring and Observability

### Logging

- Structured logging with Winston
- Log levels: debug, info, warn, error
- Log rotation and retention
- Local log storage

### Metrics

- Task success/failure rates
- Recovery action effectiveness
- Performance metrics
- User interaction analytics

### Error Handling

- Graceful error recovery
- User-friendly error messages
- Automatic retry mechanisms
- Fallback strategies

## Future Enhancements

### Planned Features

- Additional platform integrations
- Advanced ML model training
- Collaborative features
- Cloud synchronization
- Enterprise features

### Technical Improvements

- Microservices architecture
- Container-based deployment
- Advanced monitoring
- Performance optimization
- Security hardening

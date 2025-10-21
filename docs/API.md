# Dextra API Documentation

## Overview

Dextra provides a comprehensive API for deployment automation, project management, and AI-powered error recovery. The API is designed as a RESTful service with WebSocket support for real-time communication.

## Base URL

- **Development**: `http://localhost:3001`
- **Production**: Embedded in desktop application

## Authentication

Most endpoints require authentication via API key or session token. Authentication is handled automatically by the desktop application.

## API Endpoints

### Health Check

#### GET /health

Check service health status.

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Projects API

### List Projects

#### GET /api/projects

Get all projects.

**Response:**

```json
{
  "success": true,
  "projects": [
    {
      "id": "proj_123",
      "name": "my-app",
      "path": "/path/to/project",
      "type": "react",
      "buildCommand": "npm run build",
      "outputDir": "dist",
      "status": "active",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "lastDeployed": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### Get Project

#### GET /api/projects/:id

Get specific project by ID.

**Parameters:**

- `id` (string): Project ID

**Response:**

```json
{
  "success": true,
  "project": {
    "id": "proj_123",
    "name": "my-app",
    "path": "/path/to/project",
    "type": "react",
    "buildCommand": "npm run build",
    "outputDir": "dist",
    "status": "active",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "lastDeployed": "2024-01-01T00:00:00.000Z"
  }
}
```

### Add Project

#### POST /api/projects

Add new project.

**Request Body:**

```json
{
  "path": "/path/to/project"
}
```

**Response:**

```json
{
  "success": true,
  "project": {
    "id": "proj_123",
    "name": "my-app",
    "path": "/path/to/project",
    "type": "react",
    "buildCommand": "npm run build",
    "outputDir": "dist",
    "status": "active",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Update Project

#### PUT /api/projects/:id

Update project.

**Parameters:**

- `id` (string): Project ID

**Request Body:**

```json
{
  "name": "updated-name",
  "buildCommand": "npm run build:prod"
}
```

**Response:**

```json
{
  "success": true,
  "project": {
    "id": "proj_123",
    "name": "updated-name",
    "path": "/path/to/project",
    "type": "react",
    "buildCommand": "npm run build:prod",
    "outputDir": "dist",
    "status": "active",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Delete Project

#### DELETE /api/projects/:id

Delete project.

**Parameters:**

- `id` (string): Project ID

**Response:**

```json
{
  "success": true
}
```

### Get Project Capabilities

#### GET /api/projects/:id/capabilities

Get supported platforms for project.

**Parameters:**

- `id` (string): Project ID

**Response:**

```json
{
  "success": true,
  "capabilities": ["vercel", "render", "github"]
}
```

### Validate Project

#### POST /api/projects/:id/validate

Validate project configuration.

**Parameters:**

- `id` (string): Project ID

**Response:**

```json
{
  "success": true,
  "validation": {
    "valid": true,
    "issues": [],
    "suggestions": [
      "Consider using a framework like Next.js for better Vercel integration"
    ]
  }
}
```

### Detect Project Type

#### POST /api/projects/detect

Detect project type and configuration.

**Request Body:**

```json
{
  "path": "/path/to/project"
}
```

**Response:**

```json
{
  "success": true,
  "detection": {
    "type": "react",
    "buildCommand": "npm run build",
    "outputDir": "dist",
    "framework": "react",
    "packageManager": "npm"
  }
}
```

## Tasks API

### Start Task

#### POST /api/tasks

Start new deployment task.

**Request Body:**

```json
{
  "projectId": "proj_123",
  "type": "deploy",
  "platform": "vercel",
  "options": {
    "environment": "production",
    "envVars": {
      "NODE_ENV": "production"
    }
  }
}
```

**Response:**

```json
{
  "success": true,
  "taskId": "task_456"
}
```

### Get Task Status

#### GET /api/tasks/:id

Get task status and progress.

**Parameters:**

- `id` (string): Task ID

**Response:**

```json
{
  "success": true,
  "task": {
    "id": "task_456",
    "projectId": "proj_123",
    "type": "deploy",
    "platform": "vercel",
    "status": "running",
    "progress": 75,
    "startedAt": "2024-01-01T00:00:00.000Z",
    "completedAt": null,
    "logs": "Building project...\nDeploying to Vercel...",
    "error": null,
    "result": null,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Stop Task

#### POST /api/tasks/:id/stop

Stop running task.

**Parameters:**

- `id` (string): Task ID

**Response:**

```json
{
  "success": true
}
```

### Get Project Tasks

#### GET /api/tasks/project/:projectId

Get all tasks for a project.

**Parameters:**

- `projectId` (string): Project ID

**Response:**

```json
{
  "success": true,
  "tasks": [
    {
      "id": "task_456",
      "projectId": "proj_123",
      "type": "deploy",
      "platform": "vercel",
      "status": "success",
      "progress": 100,
      "startedAt": "2024-01-01T00:00:00.000Z",
      "completedAt": "2024-01-01T00:05:00.000Z",
      "logs": "Build completed successfully...",
      "error": null,
      "result": "{\"deployId\": \"dpl_789\", \"url\": \"https://my-app.vercel.app\"}",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:05:00.000Z"
    }
  ]
}
```

### Get Task Logs

#### GET /api/tasks/:id/logs

Get task logs.

**Parameters:**

- `id` (string): Task ID

**Query Parameters:**

- `level` (string, optional): Log level filter
- `startTime` (string, optional): Start time filter
- `endTime` (string, optional): End time filter

**Response:**

```json
{
  "success": true,
  "logs": [
    {
      "id": "log_789",
      "taskId": "task_456",
      "timestamp": "2024-01-01T00:00:00.000Z",
      "level": "info",
      "message": "Building project...",
      "data": null
    }
  ]
}
```

### Retry Task

#### POST /api/tasks/:id/retry

Retry failed task.

**Parameters:**

- `id` (string): Task ID

**Request Body:**

```json
{
  "options": {
    "cleanCache": true,
    "maxRetries": 3
  }
}
```

**Response:**

```json
{
  "success": true,
  "taskId": "task_456"
}
```

### Recover Task

#### POST /api/tasks/:id/recover

Attempt recovery for failed task.

**Parameters:**

- `id` (string): Task ID

**Request Body:**

```json
{
  "recoveryAction": {
    "action": "retry_clean",
    "params": {
      "cleanCache": true,
      "cleanDependencies": false
    }
  }
}
```

**Response:**

```json
{
  "success": true,
  "recovery": {
    "action": "retry_clean",
    "confidence": 0.8,
    "expectedEffect": "Clean retry with cache clearing"
  }
}
```

## Settings API

### Get Settings

#### GET /api/settings

Get all application settings.

**Response:**

```json
{
  "success": true,
  "settings": {
    "theme": "system",
    "telemetry": false,
    "autoUpdate": true,
    "defaultPlatform": "vercel",
    "notifications": true,
    "logLevel": "info"
  }
}
```

### Update Settings

#### PUT /api/settings

Update application settings.

**Request Body:**

```json
{
  "settings": {
    "theme": "dark",
    "telemetry": true,
    "defaultPlatform": "render"
  }
}
```

**Response:**

```json
{
  "success": true
}
```

### Get Setting

#### GET /api/settings/:key

Get specific setting.

**Parameters:**

- `key` (string): Setting key

**Response:**

```json
{
  "success": true,
  "value": "dark"
}
```

### Update Setting

#### PUT /api/settings/:key

Update specific setting.

**Parameters:**

- `key` (string): Setting key

**Request Body:**

```json
{
  "value": "dark"
}
```

**Response:**

```json
{
  "success": true
}
```

### Delete Setting

#### DELETE /api/settings/:key

Delete specific setting.

**Parameters:**

- `key` (string): Setting key

**Response:**

```json
{
  "success": true
}
```

### Reset Settings

#### POST /api/settings/reset

Reset all settings to defaults.

**Response:**

```json
{
  "success": true,
  "settings": {
    "theme": "system",
    "telemetry": false,
    "autoUpdate": true,
    "defaultPlatform": "vercel",
    "notifications": true,
    "logLevel": "info"
  }
}
```

### Export Settings

#### GET /api/settings/export

Export settings.

**Response:**

```json
{
  "success": true,
  "settings": {
    "theme": "dark",
    "telemetry": true,
    "autoUpdate": true,
    "defaultPlatform": "vercel",
    "notifications": true,
    "logLevel": "info"
  }
}
```

### Import Settings

#### POST /api/settings/import

Import settings.

**Request Body:**

```json
{
  "settings": {
    "theme": "dark",
    "telemetry": true,
    "autoUpdate": true,
    "defaultPlatform": "vercel",
    "notifications": true,
    "logLevel": "info"
  }
}
```

**Response:**

```json
{
  "success": true
}
```

## ML Services API

### Predict Action

#### POST /predict_action

Predict GUI actions from screenshot.

**Request Body:**

```json
{
  "image_base64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "context": {
    "current_page": "login",
    "target_element": "submit button",
    "previous_actions": ["click", "type"]
  },
  "task_description": "Submit login form"
}
```

**Response:**

```json
{
  "actions": [
    {
      "type": "click",
      "coordinates": {
        "x": 100,
        "y": 200,
        "width": 80,
        "height": 30
      },
      "confidence": 0.95,
      "timestamp": "2024-01-01T00:00:00.000Z",
      "context": {}
    }
  ],
  "explanation": "Click at coordinates (100, 200) with confidence 0.95",
  "confidence": 0.95
}
```

### Get Recovery Action

#### POST /recover

Get recovery action for error.

**Request Body:**

```json
{
  "error_signature": {
    "type": "build_error",
    "hash": "abc123",
    "message": "Module not found: Can't resolve 'react'",
    "lines": [
      "import React from 'react';",
      "Module not found: Can't resolve 'react'"
    ],
    "context": {
      "platform": "vercel",
      "type": "deploy",
      "projectId": "proj_123"
    }
  },
  "context": {
    "platform": "vercel",
    "projectId": "proj_123",
    "recovery_history": []
  }
}
```

**Response:**

```json
{
  "action": "retry_clean",
  "params": {
    "cleanCache": true,
    "cleanDependencies": false,
    "maxRetries": 3
  },
  "expectedEffect": "Clean retry with cache clearing",
  "confidence": 0.8,
  "fallback": [
    {
      "action": "refresh_token",
      "confidence": 0.6,
      "description": "Refresh authentication token and retry"
    }
  ]
}
```

### Analyze Vision

#### POST /analyze_vision

Analyze screenshot for features.

**Request Body:**

```json
{
  "image_base64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "analysis_type": "screenshot"
}
```

**Response:**

```json
{
  "analysis": {
    "app_type": "web",
    "color_scheme": "light",
    "layout_type": "form",
    "dimensions": {
      "width": 1920,
      "height": 1080
    },
    "aspect_ratio": 1.78
  },
  "confidence": 0.8,
  "suggestions": [
    "Consider using a mobile-responsive design",
    "Add more visual hierarchy to improve usability"
  ]
}
```

## WebSocket Events

### Connection

Connect to WebSocket for real-time updates.

**URL:** `ws://localhost:3001`

### Events

#### task:log

Task log update.

**Data:**

```json
{
  "taskId": "task_456",
  "level": "info",
  "message": "Building project...",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### task:status

Task status update.

**Data:**

```json
{
  "taskId": "task_456",
  "status": "running",
  "progress": 75,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### task:complete

Task completion.

**Data:**

```json
{
  "taskId": "task_456",
  "status": "success",
  "result": {
    "deployId": "dpl_789",
    "url": "https://my-app.vercel.app"
  },
  "timestamp": "2024-01-01T00:05:00.000Z"
}
```

#### task:error

Task error.

**Data:**

```json
{
  "taskId": "task_456",
  "error": "Build failed: Module not found",
  "timestamp": "2024-01-01T00:02:00.000Z"
}
```

## Error Responses

### 400 Bad Request

```json
{
  "success": false,
  "error": "Invalid request parameters"
}
```

### 404 Not Found

```json
{
  "success": false,
  "error": "Resource not found"
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "error": "Internal server error"
}
```

## Rate Limiting

- **General API**: 1000 requests per hour
- **ML Services**: 100 requests per hour
- **WebSocket**: 10 connections per client

## Authentication

Authentication is handled automatically by the desktop application. No manual API key management is required.

## SDKs

### JavaScript/TypeScript

```typescript
import { DextraClient } from "@dextra/sdk";

const client = new DextraClient({
  baseUrl: "http://localhost:3001",
});

// Start deployment
const task = await client.tasks.start({
  projectId: "proj_123",
  type: "deploy",
  platform: "vercel",
});

// Monitor progress
client.tasks.onStatus(task.id, (status) => {
  console.log("Task status:", status);
});
```

### Python

```python
from dextra_sdk import DextraClient

client = DextraClient(base_url='http://localhost:3001')

# Start deployment
task = client.tasks.start(
    project_id='proj_123',
    type='deploy',
    platform='vercel'
)

# Monitor progress
client.tasks.on_status(task.id, lambda status: print(f'Task status: {status}'))
```

## Examples

### Complete Deployment Flow

```javascript
// 1. Add project
const project = await client.projects.add({
  path: "/path/to/project",
});

// 2. Start deployment
const task = await client.tasks.start({
  projectId: project.id,
  type: "deploy",
  platform: "vercel",
  options: {
    environment: "production",
  },
});

// 3. Monitor progress
client.tasks.onStatus(task.id, (status) => {
  console.log(`Progress: ${status.progress}%`);
});

// 4. Handle completion
client.tasks.onComplete(task.id, (result) => {
  console.log(`Deployment URL: ${result.url}`);
});
```

### Error Recovery

```javascript
// 1. Start deployment
const task = await client.tasks.start({
  projectId: "proj_123",
  type: "deploy",
  platform: "vercel",
});

// 2. Handle errors
client.tasks.onError(task.id, async (error) => {
  // Get recovery action
  const recovery = await client.ml.recover({
    error_signature: {
      type: "build_error",
      message: error.message,
      context: { platform: "vercel" },
    },
  });

  // Execute recovery
  if (recovery.confidence > 0.7) {
    await client.tasks.recover(task.id, recovery);
  }
});
```

## Changelog

### v1.0.0

- Initial API release
- Project management
- Task orchestration
- ML services integration
- WebSocket support

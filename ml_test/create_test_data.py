"""
Create sample test data for ML testing
This script generates sample screenshots, error logs, and project data for testing
"""

import os
import json
import logging
from PIL import Image, ImageDraw, ImageFont
import numpy as np

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_sample_screenshots():
    """Create sample Vercel screenshots for testing"""
    logger.info("Creating sample Vercel screenshots...")
    
    screenshots_dir = "./test_data/screenshots"
    os.makedirs(screenshots_dir, exist_ok=True)
    
    # Create sample screenshots with different states
    screenshots = {
        "vercel_login.png": {
            "title": "Vercel Login",
            "elements": [
                {"type": "text", "text": "Sign in to Vercel", "position": (400, 100), "color": (0, 0, 0)},
                {"type": "input", "text": "Email", "position": (300, 200), "size": (200, 40)},
                {"type": "input", "text": "Password", "position": (300, 280), "size": (200, 40)},
                {"type": "button", "text": "Sign In", "position": (350, 360), "size": (100, 40), "color": (0, 100, 200)}
            ]
        },
        "vercel_dashboard.png": {
            "title": "Vercel Dashboard",
            "elements": [
                {"type": "text", "text": "Dashboard", "position": (100, 50), "color": (0, 0, 0)},
                {"type": "button", "text": "New Project", "position": (200, 150), "size": (120, 40), "color": (0, 100, 200)},
                {"type": "text", "text": "Recent Projects", "position": (100, 250), "color": (0, 0, 0)},
                {"type": "card", "text": "my-app", "position": (100, 300), "size": (200, 100), "color": (240, 240, 240)}
            ]
        },
        "vercel_new_project.png": {
            "title": "New Project",
            "elements": [
                {"type": "text", "text": "Create New Project", "position": (300, 50), "color": (0, 0, 0)},
                {"type": "button", "text": "Import Project", "position": (250, 150), "size": (150, 40), "color": (0, 100, 200)},
                {"type": "button", "text": "Deploy Template", "position": (450, 150), "size": (150, 40), "color": (100, 100, 100)},
                {"type": "text", "text": "Connect Git Repository", "position": (200, 250), "color": (0, 0, 0)}
            ]
        },
        "vercel_auth_error.png": {
            "title": "Authentication Error",
            "elements": [
                {"type": "text", "text": "Sign in to Vercel", "position": (400, 100), "color": (0, 0, 0)},
                {"type": "error_box", "text": "Authentication failed. Invalid credentials.", "position": (250, 200), "size": (300, 60), "color": (255, 0, 0)},
                {"type": "input", "text": "Email", "position": (300, 300), "size": (200, 40)},
                {"type": "input", "text": "Password", "position": (300, 380), "size": (200, 40)},
                {"type": "button", "text": "Sign In", "position": (350, 460), "size": (100, 40), "color": (0, 100, 200)}
            ]
        },
        "vercel_build_error.png": {
            "title": "Build Error",
            "elements": [
                {"type": "text", "text": "Deployment Failed", "position": (300, 50), "color": (255, 0, 0)},
                {"type": "error_box", "text": "Build Error: Module not found", "position": (200, 150), "size": (400, 100), "color": (255, 200, 200)},
                {"type": "text", "text": "npm ERR! Can't resolve 'react'", "position": (220, 200), "color": (0, 0, 0)},
                {"type": "text", "text": "Please check your dependencies", "position": (220, 220), "color": (0, 0, 0)},
                {"type": "button", "text": "Retry Deploy", "position": (300, 300), "size": (120, 40), "color": (0, 100, 200)}
            ]
        },
        "vercel_deploy_error.png": {
            "title": "Deployment Error",
            "elements": [
                {"type": "text", "text": "Deployment Error", "position": (300, 50), "color": (255, 0, 0)},
                {"type": "error_box", "text": "Connection timeout after 30 seconds", "position": (200, 150), "size": (400, 80), "color": (255, 200, 200)},
                {"type": "text", "text": "The deployment could not complete", "position": (220, 200), "color": (0, 0, 0)},
                {"type": "button", "text": "Retry", "position": (300, 280), "size": (80, 40), "color": (0, 100, 200)},
                {"type": "button", "text": "View Logs", "position": (400, 280), "size": (100, 40), "color": (100, 100, 100)}
            ]
        }
    }
    
    for filename, screenshot_data in screenshots.items():
        filepath = os.path.join(screenshots_dir, filename)
        create_screenshot(filepath, screenshot_data)
    
    logger.info(f"✓ Created {len(screenshots)} sample screenshots")

def create_screenshot(filepath: str, data: dict):
    """Create a single screenshot with specified elements"""
    try:
        # Create image
        img = Image.new('RGB', (800, 600), color=(255, 255, 255))
        draw = ImageDraw.Draw(img)
        
        # Try to use a default font
        try:
            font = ImageFont.truetype("arial.ttf", 16)
        except:
            font = ImageFont.load_default()
        
        # Draw elements
        for element in data["elements"]:
            if element["type"] == "text":
                draw.text(element["position"], element["text"], fill=element["color"], font=font)
            
            elif element["type"] == "button":
                x, y = element["position"]
                w, h = element["size"]
                draw.rectangle([x, y, x+w, y+h], fill=element["color"])
                draw.text((x+10, y+10), element["text"], fill=(255, 255, 255), font=font)
            
            elif element["type"] == "input":
                x, y = element["position"]
                w, h = element["size"]
                draw.rectangle([x, y, x+w, y+h], outline=(200, 200, 200))
                draw.text((x+5, y+10), element["text"], fill=(100, 100, 100), font=font)
            
            elif element["type"] == "error_box":
                x, y = element["position"]
                w, h = element["size"]
                draw.rectangle([x, y, x+w, y+h], fill=element["color"])
                draw.text((x+10, y+20), element["text"], fill=(0, 0, 0), font=font)
            
            elif element["type"] == "card":
                x, y = element["position"]
                w, h = element["size"]
                draw.rectangle([x, y, x+w, y+h], fill=element["color"])
                draw.text((x+10, y+40), element["text"], fill=(0, 0, 0), font=font)
        
        # Save image
        img.save(filepath)
        
    except Exception as e:
        logger.error(f"Failed to create screenshot {filepath}: {e}")

def create_sample_project():
    """Create sample project for testing"""
    logger.info("Creating sample project...")
    
    project_dir = "./test_data/sample_project"
    os.makedirs(project_dir, exist_ok=True)
    
    # Create package.json
    package_json = {
        "name": "test-react-app",
        "version": "1.0.0",
        "description": "Sample React app for testing",
        "main": "index.js",
        "scripts": {
            "start": "react-scripts start",
            "build": "react-scripts build",
            "test": "react-scripts test"
        },
        "dependencies": {
            "react": "^18.0.0",
            "react-dom": "^18.0.0",
            "react-scripts": "5.0.1"
        },
        "devDependencies": {
            "@types/react": "^18.0.0",
            "@types/react-dom": "^18.0.0"
        }
    }
    
    with open(os.path.join(project_dir, "package.json"), 'w') as f:
        json.dump(package_json, f, indent=2)
    
    # Create basic React files
    src_dir = os.path.join(project_dir, "src")
    os.makedirs(src_dir, exist_ok=True)
    
    # App.js
    app_js = """import React from 'react';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Test React App</h1>
        <p>This is a sample React app for testing Dextra deployment.</p>
      </header>
    </div>
  );
}

export default App;
"""
    
    with open(os.path.join(src_dir, "App.js"), 'w') as f:
        f.write(app_js)
    
    # App.css
    app_css = """body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.App {
  text-align: center;
}

.App-header {
  background-color: #282c34;
  padding: 20px;
  color: white;
}
"""
    
    with open(os.path.join(src_dir, "App.css"), 'w') as f:
        f.write(app_css)
    
    # index.js
    index_js = """import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
"""
    
    with open(os.path.join(src_dir, "index.js"), 'w') as f:
        f.write(index_js)
    
    # index.css
    index_css = """body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
    monospace;
}
"""
    
    with open(os.path.join(src_dir, "index.css"), 'w') as f:
        f.write(index_css)
    
    # public/index.html
    public_dir = os.path.join(project_dir, "public")
    os.makedirs(public_dir, exist_ok=True)
    
    index_html = """<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="Test React app for Dextra" />
    <title>Test React App</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>
"""
    
    with open(os.path.join(public_dir, "index.html"), 'w') as f:
        f.write(index_html)
    
    logger.info("✓ Sample project created")

def create_sample_error_logs():
    """Create sample error logs for testing"""
    logger.info("Creating sample error logs...")
    
    logs_dir = "./test_data/error_logs"
    os.makedirs(logs_dir, exist_ok=True)
    
    error_logs = {
        "vercel_auth_error.log": """Error: Authentication failed
Details: Invalid token provided
Timestamp: 2024-01-15T10:30:00Z
Request ID: req_123456789
Status: 401 Unauthorized
""",
        "vercel_build_error.log": """Build Error: Module not found
npm ERR! Can't resolve 'react' in '/vercel/path0/src'
npm ERR! 
npm ERR! If you do not want npm to install a package and
npm ERR! you are sure that the package exists (and is installed correctly),
npm ERR! please check that:
npm ERR! 1. the name of the package to install is correct
npm ERR! 2. the package was not installed under a different name
npm ERR! 3. the package is not a part of another package
npm ERR! 
npm ERR! To see a list of your installed packages, run:
npm ERR!   npm list
""",
        "vercel_deployment_error.log": """Deployment Error: Connection timeout
Error: Request timeout after 30 seconds
Details: The deployment process could not complete within the allocated time
Timestamp: 2024-01-15T10:35:00Z
Status: 408 Request Timeout
""",
        "vercel_config_error.log": """Configuration Error: Missing environment variable
Error: API_KEY is required but not provided
Details: The application requires the API_KEY environment variable to function
Timestamp: 2024-01-15T10:40:00Z
Status: 500 Internal Server Error
""",
        "vercel_timeout_error.log": """Timeout Error: Operation timed out
Error: Operation timed out after 60 seconds
Details: The build process exceeded the maximum allowed time
Timestamp: 2024-01-15T10:45:00Z
Status: 408 Request Timeout
"""
    }
    
    for filename, content in error_logs.items():
        filepath = os.path.join(logs_dir, filename)
        with open(filepath, 'w') as f:
            f.write(content)
    
    logger.info(f"✓ Created {len(error_logs)} sample error logs")

def main():
    """Create all sample test data"""
    logger.info("Creating sample test data for ML testing...")
    
    try:
        create_sample_screenshots()
        create_sample_project()
        create_sample_error_logs()
        
        logger.info("🎉 All sample test data created successfully!")
        
    except Exception as e:
        logger.error(f"Failed to create sample test data: {e}")

if __name__ == "__main__":
    main()

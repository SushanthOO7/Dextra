#!/bin/bash
# VS Remote Tunnel Setup Script for Agent-S3 Testing

echo "🚀 VS Remote Tunnel Setup for Agent-S3 Testing"
echo "=============================================="

# Check if we're in the right directory
if [ ! -f "requirements.txt" ]; then
    echo "❌ Please run this script from the ml_test directory"
    exit 1
fi

# Check if running in VS Remote Tunnel environment
if [ -z "$VSCODE_INJECTION" ] && [ -z "$REMOTE_CONTAINERS" ]; then
    echo "⚠️  Warning: This doesn't appear to be a VS Remote Tunnel environment"
    echo "   Some features may not work optimally"
fi

# Install system dependencies for headless browser
echo "📦 Installing system dependencies for headless browser..."
sudo apt-get update
sudo apt-get install -y \
    xvfb \
    x11-utils \
    x11-xserver-utils \
    libxrandr2 \
    libxss1 \
    libgconf-2-4 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxtst6 \
    libnss3 \
    libcups2 \
    libdrm2 \
    libxss1 \
    libasound2 \
    libatspi2.0-0 \
    libgtk-3-0 \
    libgbm1

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip install -r requirements.txt

# Install additional dependencies for VS Remote Tunnel
echo "📦 Installing VS Remote Tunnel specific dependencies..."
pip install \
    pyvirtualdisplay \
    selenium \
    webdriver-manager \
    pillow \
    opencv-python

# Create virtual display setup script
echo "🔧 Creating virtual display setup..."
cat > setup_virtual_display.sh << 'EOF'
#!/bin/bash
# Virtual Display Setup for VS Remote Tunnel

echo "🖥️  Setting up virtual display for headless browser..."

# Kill any existing Xvfb processes
pkill -f Xvfb

# Start virtual display
export DISPLAY=:99
Xvfb :99 -screen 0 1920x1080x24 -ac +extension GLX +render -noreset &

# Wait for display to start
sleep 2

# Test display
if xdpyinfo -display :99 >/dev/null 2>&1; then
    echo "✅ Virtual display :99 is running"
    echo "   Resolution: 1920x1080"
    echo "   Color depth: 24-bit"
else
    echo "❌ Failed to start virtual display"
    exit 1
fi

# Set display environment variable
export DISPLAY=:99
echo "✅ Display environment set to :99"
EOF

chmod +x setup_virtual_display.sh

# Create VS Remote Tunnel specific test script
echo "🧪 Creating VS Remote Tunnel test script..."
cat > test_vs_remote_tunnel.py << 'EOF'
#!/usr/bin/env python3
"""
VS Remote Tunnel Test Script for Agent-S3
Tests browser automation in headless mode
"""

import os
import asyncio
import subprocess
from playwright.async_api import async_playwright
from PIL import Image
import io

class VSRemoteTunnelTester:
    def __init__(self):
        self.display = os.getenv("DISPLAY", ":99")
        self.headless = True
        
    async def test_virtual_display(self):
        """Test if virtual display is working"""
        print("🖥️  Testing virtual display...")
        
        try:
            # Test display with xdpyinfo
            result = subprocess.run(
                ["xdpyinfo", "-display", self.display],
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                print(f"✅ Virtual display {self.display} is working")
                return True
            else:
                print(f"❌ Virtual display {self.display} failed: {result.stderr}")
                return False
                
        except Exception as e:
            print(f"❌ Error testing display: {e}")
            return False
    
    async def test_browser_automation(self):
        """Test Playwright browser automation in headless mode"""
        print("🌐 Testing browser automation...")
        
        try:
            async with async_playwright() as p:
                # Launch browser in headless mode
                browser = await p.chromium.launch(
                    headless=True,
                    args=[
                        f"--display={self.display}",
                        "--no-sandbox",
                        "--disable-dev-shm-usage",
                        "--disable-gpu",
                        "--disable-web-security"
                    ]
                )
                
                # Create page
                page = await browser.new_page()
                
                # Navigate to a test page
                await page.goto("https://vercel.com")
                
                # Take screenshot
                screenshot = await page.screenshot()
                
                # Save screenshot for verification
                with open("test_screenshot.png", "wb") as f:
                    f.write(screenshot)
                
                # Get page title
                title = await page.title()
                
                await browser.close()
                
                print(f"✅ Browser automation successful")
                print(f"   Page title: {title}")
                print(f"   Screenshot saved: test_screenshot.png")
                
                return True
                
        except Exception as e:
            print(f"❌ Browser automation failed: {e}")
            return False
    
    async def test_agent_s3_setup(self):
        """Test Agent-S3 model loading"""
        print("🤖 Testing Agent-S3 setup...")
        
        try:
            # Test if models directory exists
            if not os.path.exists("./models"):
                print("❌ Models directory not found. Run setup_supercomputer.py first.")
                return False
            
            # Test if config is valid
            from config import TEST_CONFIG
            agent_config = TEST_CONFIG["agent_s3"]
            
            print(f"✅ Agent-S3 configuration loaded")
            print(f"   Model: {agent_config['model']}")
            print(f"   Grounding model: {agent_config['ground_model']}")
            print(f"   Headless mode: {agent_config['headless_mode']}")
            print(f"   Display: {agent_config['display_server']}")
            
            return True
            
        except Exception as e:
            print(f"❌ Agent-S3 setup failed: {e}")
            return False
    
    async def run_all_tests(self):
        """Run all VS Remote Tunnel tests"""
        print("🧪 Running VS Remote Tunnel Tests")
        print("=" * 40)
        
        tests = [
            ("Virtual Display", self.test_virtual_display),
            ("Browser Automation", self.test_browser_automation),
            ("Agent-S3 Setup", self.test_agent_s3_setup)
        ]
        
        results = {}
        
        for test_name, test_func in tests:
            print(f"\n🔍 Running {test_name} test...")
            try:
                results[test_name] = await test_func()
            except Exception as e:
                print(f"❌ {test_name} test failed: {e}")
                results[test_name] = False
        
        # Summary
        print("\n📊 Test Results Summary")
        print("=" * 40)
        
        passed = 0
        total = len(tests)
        
        for test_name, result in results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{test_name}: {status}")
            if result:
                passed += 1
        
        print(f"\nOverall: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All tests passed! VS Remote Tunnel setup is ready.")
        else:
            print("⚠️  Some tests failed. Check the output above for details.")
        
        return passed == total

async def main():
    tester = VSRemoteTunnelTester()
    await tester.run_all_tests()

if __name__ == "__main__":
    asyncio.run(main())
EOF

chmod +x test_vs_remote_tunnel.py

# Create VS Remote Tunnel specific startup script
echo "🚀 Creating VS Remote Tunnel startup script..."
cat > start_vs_remote_tunnel.sh << 'EOF'
#!/bin/bash
# VS Remote Tunnel Startup Script for Agent-S3

echo "🚀 Starting Agent-S3 for VS Remote Tunnel..."

# Set environment variables
export DISPLAY=:99
export AGENT_S_HEADLESS=true
export AGENT_S_DISPLAY=:99

# Start virtual display
echo "🖥️  Starting virtual display..."
./setup_virtual_display.sh

# Wait for display to be ready
sleep 3

# Start vLLM server for main model
echo "🤖 Starting Agent-S3 model server..."
python3 start_vllm_server.py --model ./models/microsoft/Agent-S3 --port 8000 --gpu-memory-utilization 0.6 &
VLLM_PID=$!

# Wait for vLLM to start
sleep 30

# Start grounding server
echo "🎯 Starting grounding model server..."
python3 start_grounding_server.py --port 8001 &
GROUNDING_PID=$!

# Wait for both servers to start
sleep 20

# Test the setup
echo "🧪 Testing VS Remote Tunnel setup..."
python3 test_vs_remote_tunnel.py

echo "✅ VS Remote Tunnel setup complete!"
echo "vLLM Server: http://localhost:8000"
echo "Grounding Server: http://localhost:8001"
echo "Display: :99 (headless)"
echo ""
echo "To stop servers: kill $VLLM_PID $GROUNDING_PID"

# Keep script running
wait
EOF

chmod +x start_vs_remote_tunnel.sh

# Create VS Remote Tunnel specific environment file
echo "📝 Creating VS Remote Tunnel environment file..."
cat > .env.vs_remote_tunnel << 'EOF'
# VS Remote Tunnel Environment Configuration

# Vercel API Configuration (optional)
VERCEL_API_TOKEN=your_vercel_api_token_here

# Agent-S3 Local Model Configuration - VS Remote Tunnel Optimized
AGENT_S_PROVIDER=huggingface
AGENT_S_MODEL=microsoft/Agent-S3
AGENT_S_MODEL_URL=http://localhost:8000
AGENT_S_API_KEY=

# Agent-S3 Grounding Model Configuration
AGENT_S_GROUND_PROVIDER=huggingface
AGENT_S_GROUND_URL=http://localhost:8001
AGENT_S_GROUND_MODEL=UI-TARS-72B
AGENT_S_GROUND_API_KEY=

# Grounding Model Dimensions (UI-TARS-72B: 1000x1000)
AGENT_S_GROUNDING_WIDTH=1000
AGENT_S_GROUNDING_HEIGHT=1000

# Agent-S3 Settings - Optimized for VS Remote Tunnel
AGENT_S_TEMPERATURE=0.7
AGENT_S_MAX_TRAJECTORY=12
AGENT_S_REFLECTION=true
AGENT_S_LOCAL_ENV=true

# Platform and Screen Settings - VS Remote Tunnel Optimized
AGENT_S_PLATFORM=linux
AGENT_S_SCREEN_WIDTH=1920
AGENT_S_SCREEN_HEIGHT=1080

# VS Remote Tunnel Specific Settings
AGENT_S_HEADLESS=true              # Run browser in headless mode (required for remote)
AGENT_S_DISPLAY=:99                # Virtual display for headless browser
AGENT_S_BROWSER_TIMEOUT=30000      # Browser timeout in milliseconds
AGENT_S_SCREENSHOT_QUALITY=90      # High quality screenshots for better AI analysis

# GPU Settings - Optimized for Supercomputer
CUDA_AVAILABLE=true
AGENT_S_GPU_MEMORY=0.8

# Performance Tuning (Optional)
VLLM_GPU_MEMORY_UTILIZATION=0.8
VLLM_MAX_MODEL_LEN=8192
VLLM_TENSOR_PARALLEL_SIZE=1
EOF

echo ""
echo "🎉 VS Remote Tunnel Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Copy environment: cp .env.vs_remote_tunnel .env"
echo "2. Start virtual display: ./setup_virtual_display.sh"
echo "3. Test setup: python test_vs_remote_tunnel.py"
echo "4. Start models: ./start_vs_remote_tunnel.sh"
echo "5. Run Agent-S3 tests: python run_tests.py"
echo ""
echo "VS Remote Tunnel specific features:"
echo "✅ Headless browser automation"
echo "✅ Virtual display support"
echo "✅ Optimized for remote development"
echo "✅ High-quality screenshots"
echo "✅ Browser timeout handling"
echo ""
echo "Your supercomputer setup is now optimized for VS Remote Tunnel! 🚀"

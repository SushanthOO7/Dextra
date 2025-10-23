# VS Remote Tunnel Setup Guide - Agent-S3 Testing

This guide helps you set up Agent-S3 testing on your supercomputer using **Visual Studio Remote Tunnel**, optimized for remote development environments.

## 🚀 **VS Remote Tunnel Optimizations**

### **Key Features for Remote Development:**

- **Headless Browser Automation**: Runs browsers without GUI (required for remote)
- **Virtual Display Support**: Uses Xvfb for headless browser rendering
- **High-Quality Screenshots**: Optimized for AI analysis over network
- **Network-Optimized**: Reduced bandwidth usage for remote connections
- **Timeout Handling**: Robust error handling for network delays

## 🛠️ **Quick Setup for VS Remote Tunnel**

### **1. Run VS Remote Tunnel Setup**

```bash
cd ml_test
chmod +x setup_vs_remote_tunnel.sh
./setup_vs_remote_tunnel.sh
```

This will:

- ✅ Install system dependencies for headless browser
- ✅ Install Python dependencies optimized for remote
- ✅ Create virtual display setup scripts
- ✅ Configure environment for VS Remote Tunnel
- ✅ Create test scripts for remote validation

### **2. Configure Environment**

```bash
# Copy VS Remote Tunnel optimized environment
cp .env.vs_remote_tunnel .env

# Edit if needed
nano .env
```

### **3. Start Virtual Display**

```bash
# Start virtual display for headless browser
./setup_virtual_display.sh
```

### **4. Test VS Remote Tunnel Setup**

```bash
# Test all components
python test_vs_remote_tunnel.py
```

### **5. Start Agent-S3 Models**

```bash
# Start models optimized for VS Remote Tunnel
./start_vs_remote_tunnel.sh
```

## 🔧 **VS Remote Tunnel Specific Configuration**

### **Environment Variables**

```bash
# VS Remote Tunnel Specific Settings
AGENT_S_HEADLESS=true              # Run browser in headless mode
AGENT_S_DISPLAY=:99                # Virtual display for headless browser
AGENT_S_BROWSER_TIMEOUT=30000      # Browser timeout (30 seconds)
AGENT_S_SCREENSHOT_QUALITY=90      # High quality screenshots
```

### **Virtual Display Setup**

```bash
# Start virtual display
export DISPLAY=:99
Xvfb :99 -screen 0 1920x1080x24 -ac +extension GLX +render -noreset &

# Test display
xdpyinfo -display :99
```

### **Browser Configuration**

```python
# Playwright configuration for VS Remote Tunnel
browser = await playwright.chromium.launch(
    headless=True,
    args=[
        "--display=:99",
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-web-security",
        "--remote-debugging-port=9222"
    ]
)
```

## 📊 **VS Remote Tunnel Performance**

### **Expected Performance:**

| Component              | Local          | VS Remote Tunnel | Impact       |
| ---------------------- | -------------- | ---------------- | ------------ |
| **Model Loading**      | 5-10min        | 5-10min          | No impact    |
| **Inference Speed**    | 20-40 tokens/s | 20-40 tokens/s   | No impact    |
| **Browser Automation** | 2-5s/action    | 3-8s/action      | +50% latency |
| **Screenshot Quality** | 90%            | 90%              | No impact    |
| **Network Usage**      | N/A            | ~1MB/min         | Minimal      |

### **Optimization Tips:**

1. **Use Headless Mode**: Always run browsers in headless mode
2. **Optimize Screenshots**: Use 90% quality for balance of quality/speed
3. **Increase Timeouts**: Set 30s timeout for network delays
4. **Virtual Display**: Use Xvfb for consistent rendering
5. **Monitor Resources**: Use `htop` and `nvidia-smi` to monitor usage

## 🧪 **Testing VS Remote Tunnel Setup**

### **Test Script Features:**

```python
# test_vs_remote_tunnel.py tests:

1. Virtual Display Test
   - Checks if Xvfb is running
   - Validates display resolution
   - Tests display accessibility

2. Browser Automation Test
   - Launches headless browser
   - Navigates to test page
   - Takes screenshot
   - Validates functionality

3. Agent-S3 Setup Test
   - Checks model configuration
   - Validates environment variables
   - Tests model loading
```

### **Run Tests:**

```bash
# Test individual components
python -c "from test_vs_remote_tunnel import VSRemoteTunnelTester; import asyncio; asyncio.run(VSRemoteTunnelTester().test_virtual_display())"

# Test browser automation
python -c "from test_vs_remote_tunnel import VSRemoteTunnelTester; import asyncio; asyncio.run(VSRemoteTunnelTester().test_browser_automation())"

# Test Agent-S3 setup
python -c "from test_vs_remote_tunnel import VSRemoteTunnelTester; import asyncio; asyncio.run(VSRemoteTunnelTester().test_agent_s3_setup())"
```

## 🔍 **Troubleshooting VS Remote Tunnel**

### **Common Issues:**

1. **Virtual Display Not Working**

   ```bash
   # Check if Xvfb is running
   ps aux | grep Xvfb

   # Restart virtual display
   pkill -f Xvfb
   ./setup_virtual_display.sh
   ```

2. **Browser Launch Fails**

   ```bash
   # Check display
   echo $DISPLAY

   # Test display
   xdpyinfo -display :99

   # Install missing dependencies
   sudo apt-get install -y libxss1 libasound2 libatspi2.0-0
   ```

3. **Screenshot Quality Issues**

   ```bash
   # Check screenshot file
   file test_screenshot.png

   # Verify image properties
   python -c "from PIL import Image; img = Image.open('test_screenshot.png'); print(f'Size: {img.size}, Mode: {img.mode}')"
   ```

4. **Network Timeout Issues**

   ```bash
   # Increase timeout in .env
   AGENT_S_BROWSER_TIMEOUT=60000  # 60 seconds

   # Check network connectivity
   ping vercel.com
   ```

### **Performance Monitoring:**

```bash
# Monitor system resources
htop

# Monitor GPU usage
nvidia-smi

# Monitor display
xrandr --display :99

# Monitor browser processes
ps aux | grep chromium
```

## 🎯 **VS Remote Tunnel Workflow**

### **Complete Workflow:**

1. **Connect to VS Remote Tunnel**

   ```bash
   # Connect via VS Code Remote Tunnel
   # Your local VS Code connects to supercomputer
   ```

2. **Start Virtual Display**

   ```bash
   ./setup_virtual_display.sh
   ```

3. **Start Agent-S3 Models**

   ```bash
   ./start_vs_remote_tunnel.sh
   ```

4. **Test Deployment Automation**

   ```bash
   python run_tests.py
   ```

5. **Monitor Progress**

   ```bash
   # Check logs
   tail -f vllm_server.log

   # Check screenshots
   ls -la *.png
   ```

## 💡 **Pro Tips for VS Remote Tunnel**

1. **Use Screen/Tmux**: Keep sessions running even if connection drops
2. **Monitor Bandwidth**: Use `iftop` to monitor network usage
3. **Optimize Screenshots**: Use 90% quality for best balance
4. **Increase Timeouts**: Set longer timeouts for network delays
5. **Use Virtual Display**: Always use Xvfb for consistent rendering
6. **Monitor Resources**: Keep an eye on CPU, memory, and GPU usage
7. **Save Screenshots**: Keep screenshots for debugging and analysis

## 🚀 **Expected Results**

With VS Remote Tunnel setup, you should achieve:

- **Model Loading**: 5-10 minutes (same as local)
- **Inference Speed**: 20-40 tokens/second (same as local)
- **Browser Automation**: 3-8 seconds per action (+50% latency)
- **Screenshot Quality**: 90% (optimized for remote)
- **Network Usage**: ~1MB/minute (minimal impact)
- **Success Rate**: 85%+ (same as local)

## 🔄 **Next Steps**

1. **Test the setup**: Run `python test_vs_remote_tunnel.py`
2. **Start models**: Run `./start_vs_remote_tunnel.sh`
3. **Test Agent-S3**: Run `python run_tests.py`
4. **Monitor performance**: Use monitoring tools
5. **Optimize settings**: Adjust timeouts and quality as needed

Your VS Remote Tunnel setup is now optimized for Agent-S3 testing on your supercomputer! 🚀

## 📞 **Support**

If you encounter issues:

1. Check the troubleshooting section above
2. Run the test script to identify problems
3. Monitor system resources and network connectivity
4. Adjust timeouts and quality settings as needed

The VS Remote Tunnel setup provides a robust environment for testing Agent-S3 deployment automation remotely! 🎉

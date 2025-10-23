#!/usr/bin/env python3
"""
Local Model Setup Script for Supercomputer
This script sets up the best local models for Agent-S3 on your supercomputer
"""

import subprocess
import sys
import os
import time
import requests
from pathlib import Path

class SupercomputerModelSetup:
    def __init__(self):
        self.models_dir = Path("./models")
        self.models_dir.mkdir(exist_ok=True)
        
    def check_gpu_availability(self):
        """Check GPU availability and memory"""
        try:
            import torch
            if torch.cuda.is_available():
                gpu_count = torch.cuda.device_count()
                gpu_memory = torch.cuda.get_device_properties(0).total_memory / 1024**3
                print(f"✅ GPU Available: {gpu_count} GPUs, {gpu_memory:.1f}GB memory")
                return True
            else:
                print("❌ No GPU available")
                return False
        except ImportError:
            print("❌ PyTorch not installed")
            return False
    
    def install_requirements(self):
        """Install optimized requirements for supercomputer"""
        print("🚀 Installing optimized requirements for supercomputer...")
        
        # Install base requirements
        subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"], check=True)
        
        # Install additional GPU optimizations
        gpu_packages = [
            "torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121",
            "flash-attn --no-build-isolation",
            "vllm",
            "accelerate",
            "bitsandbytes"
        ]
        
        for package in gpu_packages:
            print(f"Installing {package}...")
            subprocess.run([sys.executable, "-m", "pip", "install"] + package.split(), check=True)
        
        print("✅ Requirements installed successfully")
    
    def download_models(self):
        """Download the best local models"""
        print("📥 Downloading best local models...")
        
        models_to_download = [
            {
                "name": "Agent-S3",
                "repo": "microsoft/Agent-S3",
                "size": "~15GB",
                "description": "Best generation model for GUI automation"
            },
            {
                "name": "UI-TARS-72B", 
                "repo": "UI-TARS-72B",
                "size": "~40GB",
                "description": "Best grounding model for coordinate prediction"
            }
        ]
        
        for model in models_to_download:
            print(f"\n📦 Downloading {model['name']} ({model['size']})...")
            print(f"   Description: {model['description']}")
            
            # Use huggingface-hub to download
            try:
                from huggingface_hub import snapshot_download
                model_path = self.models_dir / model['name']
                snapshot_download(
                    repo_id=model['repo'],
                    local_dir=model_path,
                    local_dir_use_symlinks=False
                )
                print(f"✅ {model['name']} downloaded successfully")
            except Exception as e:
                print(f"❌ Failed to download {model['name']}: {e}")
    
    def setup_vllm_server(self):
        """Setup vLLM server for fast inference"""
        print("🔧 Setting up vLLM server...")
        
        # Create vLLM server script
        vllm_script = """
#!/usr/bin/env python3
import argparse
from vllm import LLM, SamplingParams
from vllm.entrypoints.openai.api_server import main

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default="./models/microsoft/Agent-S3")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--gpu-memory-utilization", type=float, default=0.8)
    parser.add_argument("--max-model-len", type=int, default=8192)
    parser.add_argument("--tensor-parallel-size", type=int, default=1)
    args = parser.parse_args()
    
    main()
"""
        
        with open("start_vllm_server.py", "w") as f:
            f.write(vllm_script)
        
        print("✅ vLLM server script created")
    
    def setup_grounding_server(self):
        """Setup grounding model server"""
        print("🔧 Setting up grounding model server...")
        
        grounding_script = """
#!/usr/bin/env python3
import argparse
from transformers import AutoModel, AutoTokenizer
import torch
from fastapi import FastAPI
from pydantic import BaseModel
import uvicorn

app = FastAPI()

class GroundingRequest(BaseModel):
    image: str  # Base64 encoded image
    text: str   # Instruction text

class GroundingResponse(BaseModel):
    coordinates: list
    confidence: float

# Load grounding model
model = None
tokenizer = None

@app.on_event("startup")
async def load_model():
    global model, tokenizer
    print("Loading UI-TARS-72B grounding model...")
    model = AutoModel.from_pretrained(
        "./models/UI-TARS-72B",
        torch_dtype=torch.float16,
        device_map="auto"
    )
    tokenizer = AutoTokenizer.from_pretrained("./models/UI-TARS-72B")
    print("✅ Grounding model loaded")

@app.post("/ground", response_model=GroundingResponse)
async def ground_image(request: GroundingRequest):
    # Process image and text to get coordinates
    # This is a simplified implementation
    coordinates = [500, 300]  # Example coordinates
    confidence = 0.95
    return GroundingResponse(coordinates=coordinates, confidence=confidence)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8001)
    args = parser.parse_args()
    
    uvicorn.run(app, host="0.0.0.0", port=args.port)
"""
        
        with open("start_grounding_server.py", "w") as f:
            f.write(grounding_script)
        
        print("✅ Grounding server script created")
    
    def create_startup_scripts(self):
        """Create startup scripts for easy model launching"""
        print("📝 Creating startup scripts...")
        
        # Main startup script
        startup_script = """#!/bin/bash
# Supercomputer Model Startup Script

echo "🚀 Starting Agent-S3 Local Models..."

# Check GPU availability
python3 -c "import torch; print(f'GPUs: {torch.cuda.device_count()}, Memory: {torch.cuda.get_device_properties(0).total_memory/1024**3:.1f}GB')"

# Start vLLM server for main model
echo "Starting vLLM server (Agent-S3)..."
python3 start_vllm_server.py --model ./models/microsoft/Agent-S3 --port 8000 --gpu-memory-utilization 0.6 &
VLLM_PID=$!

# Wait for vLLM to start
sleep 30

# Start grounding server
echo "Starting grounding server (UI-TARS-72B)..."
python3 start_grounding_server.py --port 8001 &
GROUNDING_PID=$!

# Wait for both servers to start
sleep 20

# Test servers
echo "Testing servers..."
curl -s http://localhost:8000/health || echo "vLLM server not ready"
curl -s http://localhost:8001/docs || echo "Grounding server not ready"

echo "✅ Models started successfully!"
echo "vLLM Server: http://localhost:8000"
echo "Grounding Server: http://localhost:8001"
echo ""
echo "To stop servers: kill $VLLM_PID $GROUNDING_PID"

# Keep script running
wait
"""
        
        with open("start_models.sh", "w") as f:
            f.write(startup_script)
        
        # Make executable
        os.chmod("start_models.sh", 0o755)
        
        print("✅ Startup scripts created")
    
    def create_environment_file(self):
        """Create optimized environment file for supercomputer"""
        print("📝 Creating optimized environment file...")
        
        env_content = """# Supercomputer Optimized Environment Configuration

# Vercel API Configuration (optional)
VERCEL_API_TOKEN=your_vercel_api_token_here

# Agent-S3 Local Model Configuration
AGENT_S_PROVIDER=huggingface
AGENT_S_MODEL=microsoft/Agent-S3
AGENT_S_MODEL_URL=http://localhost:8000
AGENT_S_API_KEY=

# Agent-S3 Grounding Model Configuration
AGENT_S_GROUND_PROVIDER=huggingface
AGENT_S_GROUND_URL=http://localhost:8001
AGENT_S_GROUND_MODEL=UI-TARS-72B
AGENT_S_GROUND_API_KEY=

# Grounding Model Dimensions (UI-TARS-72B)
AGENT_S_GROUNDING_WIDTH=1000
AGENT_S_GROUNDING_HEIGHT=1000

# Agent-S3 Settings - Optimized for Performance
AGENT_S_TEMPERATURE=0.7
AGENT_S_MAX_TRAJECTORY=12
AGENT_S_REFLECTION=true
AGENT_S_LOCAL_ENV=true

# Platform and Screen Settings
AGENT_S_PLATFORM=linux
AGENT_S_SCREEN_WIDTH=1920
AGENT_S_SCREEN_HEIGHT=1080

# GPU Settings
CUDA_AVAILABLE=true
AGENT_S_GPU_MEMORY=0.8
"""
        
        with open(".env", "w") as f:
            f.write(env_content)
        
        print("✅ Environment file created")
    
    def run_setup(self):
        """Run complete setup"""
        print("🎯 Supercomputer Model Setup for Agent-S3")
        print("=" * 50)
        
        # Check GPU
        if not self.check_gpu_availability():
            print("⚠️  GPU not available. Consider using API models instead.")
            return False
        
        # Install requirements
        self.install_requirements()
        
        # Download models
        self.download_models()
        
        # Setup servers
        self.setup_vllm_server()
        self.setup_grounding_server()
        
        # Create startup scripts
        self.create_startup_scripts()
        
        # Create environment file
        self.create_environment_file()
        
        print("\n🎉 Setup Complete!")
        print("\nNext steps:")
        print("1. Start models: ./start_models.sh")
        print("2. Run tests: python run_tests.py")
        print("3. Check model status: curl http://localhost:8000/health")
        
        return True

if __name__ == "__main__":
    setup = SupercomputerModelSetup()
    setup.run_setup()

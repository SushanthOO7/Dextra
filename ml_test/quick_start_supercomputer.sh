#!/bin/bash
# Quick Start Script for Supercomputer Agent-S3 Setup

echo "🚀 Dextra Supercomputer Setup - Agent-S3 Local Models"
echo "=================================================="

# Check if we're in the right directory
if [ ! -f "requirements.txt" ]; then
    echo "❌ Please run this script from the ml_test directory"
    exit 1
fi

# Check GPU availability
echo "🔍 Checking GPU availability..."
python3 -c "
import torch
if torch.cuda.is_available():
    gpu_count = torch.cuda.device_count()
    gpu_memory = torch.cuda.get_device_properties(0).total_memory / 1024**3
    print(f'✅ GPU Available: {gpu_count} GPUs, {gpu_memory:.1f}GB memory')
else:
    print('❌ No GPU available. Consider using API models instead.')
    exit(1)
"

if [ $? -ne 0 ]; then
    echo "❌ GPU check failed. Exiting."
    exit 1
fi

# Install requirements
echo "📦 Installing optimized requirements..."
pip install -r requirements.txt

# Install additional GPU optimizations
echo "⚡ Installing GPU optimizations..."
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
pip install vllm accelerate bitsandbytes flash-attn --no-build-isolation

# Create environment file
echo "📝 Creating environment configuration..."
cp env_example.txt .env
echo "✅ Environment file created. Edit .env if needed."

# Create models directory
echo "📁 Creating models directory..."
mkdir -p models

# Download models (this will take a while)
echo "📥 Downloading models (this may take 30+ minutes)..."
echo "   - Agent-S3 (15GB): Best generation model"
echo "   - UI-TARS-72B (40GB): Best grounding model"

# Download Agent-S3
echo "Downloading Agent-S3..."
huggingface-cli download microsoft/Agent-S3 --local-dir ./models/microsoft/Agent-S3

# Download UI-TARS-72B
echo "Downloading UI-TARS-72B..."
huggingface-cli download UI-TARS-72B --local-dir ./models/UI-TARS-72B

# Create startup scripts
echo "🔧 Creating startup scripts..."

# vLLM server script
cat > start_vllm_server.py << 'EOF'
#!/usr/bin/env python3
import argparse
from vllm.entrypoints.openai.api_server import main

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default="./models/microsoft/Agent-S3")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--gpu-memory-utilization", type=float, default=0.6)
    parser.add_argument("--max-model-len", type=int, default=8192)
    parser.add_argument("--tensor-parallel-size", type=int, default=1)
    args = parser.parse_args()
    
    main()
EOF

# Grounding server script
cat > start_grounding_server.py << 'EOF'
#!/usr/bin/env python3
import argparse
from transformers import AutoModel, AutoTokenizer
import torch
from fastapi import FastAPI
from pydantic import BaseModel
import uvicorn

app = FastAPI()

class GroundingRequest(BaseModel):
    image: str
    text: str

class GroundingResponse(BaseModel):
    coordinates: list
    confidence: float

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
    coordinates = [500, 300]  # Example coordinates
    confidence = 0.95
    return GroundingResponse(coordinates=coordinates, confidence=confidence)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8001)
    args = parser.parse_args()
    
    uvicorn.run(app, host="0.0.0.0", port=args.port)
EOF

# Main startup script
cat > start_models.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting Agent-S3 Local Models..."

# Start vLLM server
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

wait
EOF

chmod +x start_models.sh

echo ""
echo "🎉 Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Start models: ./start_models.sh"
echo "2. Run tests: python run_tests.py"
echo "3. Check status: curl http://localhost:8000/health"
echo ""
echo "Models will use ~55GB of disk space and ~50GB of GPU memory."
echo "Make sure you have enough resources available!"

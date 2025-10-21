from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uvicorn
import logging
from loguru import logger
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger.add("logs/ml_service.log", rotation="10 MB", retention="7 days")

# Import ML services
from services.agent_s_service import AgentSService
from services.rl_recovery_service import RLRecoveryService
from services.vision_service import VisionService

# Initialize FastAPI app
app = FastAPI(
    title="Dextra ML Services",
    description="AI-powered services for Dextra deployment automation",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize ML services
agent_s_service = AgentSService()
rl_recovery_service = RLRecoveryService()
vision_service = VisionService()

# Pydantic models
class PredictActionRequest(BaseModel):
    image_base64: str
    context: Dict[str, Any]
    task_description: Optional[str] = None

class PredictActionResponse(BaseModel):
    actions: List[Dict[str, Any]]
    explanation: str
    confidence: float

class RecoverRequest(BaseModel):
    error_signature: Dict[str, Any]
    context: Dict[str, Any]

class RecoverResponse(BaseModel):
    action: str
    params: Dict[str, Any]
    expected_effect: str
    confidence: float
    fallback: Optional[List[Dict[str, Any]]] = None

class VisionAnalysisRequest(BaseModel):
    image_base64: str
    analysis_type: str  # "screenshot", "error", "ui_element"

class VisionAnalysisResponse(BaseModel):
    analysis: Dict[str, Any]
    confidence: float
    suggestions: List[str]

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "dextra-ml"}

# Agent-S endpoints
@app.post("/predict_action", response_model=PredictActionResponse)
async def predict_action(request: PredictActionRequest):
    """Predict GUI actions based on screenshot and context"""
    try:
        result = await agent_s_service.predict_action(
            image_base64=request.image_base64,
            context=request.context,
            task_description=request.task_description
        )
        return PredictActionResponse(**result)
    except Exception as e:
        logger.error(f"Failed to predict action: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict_action_batch")
async def predict_action_batch(requests: List[PredictActionRequest]):
    """Predict GUI actions for multiple screenshots"""
    try:
        results = []
        for request in requests:
            result = await agent_s_service.predict_action(
                image_base64=request.image_base64,
                context=request.context,
                task_description=request.task_description
            )
            results.append(result)
        return {"results": results}
    except Exception as e:
        logger.error(f"Failed to predict actions batch: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# RL Recovery endpoints
@app.post("/recover", response_model=RecoverResponse)
async def recover(request: RecoverRequest):
    """Get recovery action for error using RL model"""
    try:
        result = await rl_recovery_service.recover(
            error_signature=request.error_signature,
            context=request.context
        )
        return RecoverResponse(**result)
    except Exception as e:
        logger.error(f"Failed to get recovery action: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/recover_batch")
async def recover_batch(requests: List[RecoverRequest]):
    """Get recovery actions for multiple errors"""
    try:
        results = []
        for request in requests:
            result = await rl_recovery_service.recover(
                error_signature=request.error_signature,
                context=request.context
            )
            results.append(result)
        return {"results": results}
    except Exception as e:
        logger.error(f"Failed to get recovery actions batch: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Vision analysis endpoints
@app.post("/analyze_vision", response_model=VisionAnalysisResponse)
async def analyze_vision(request: VisionAnalysisRequest):
    """Analyze screenshot for UI elements, errors, or other features"""
    try:
        result = await vision_service.analyze(
            image_base64=request.image_base64,
            analysis_type=request.analysis_type
        )
        return VisionAnalysisResponse(**result)
    except Exception as e:
        logger.error(f"Failed to analyze vision: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/detect_ui_elements")
async def detect_ui_elements(request: VisionAnalysisRequest):
    """Detect and classify UI elements in screenshot"""
    try:
        result = await vision_service.detect_ui_elements(
            image_base64=request.image_base64
        )
        return result
    except Exception as e:
        logger.error(f"Failed to detect UI elements: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/extract_text")
async def extract_text(request: VisionAnalysisRequest):
    """Extract text from screenshot using OCR"""
    try:
        result = await vision_service.extract_text(
            image_base64=request.image_base64
        )
        return result
    except Exception as e:
        logger.error(f"Failed to extract text: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Model management endpoints
@app.get("/models/status")
async def get_models_status():
    """Get status of all ML models"""
    try:
        status = {
            "agent_s": await agent_s_service.get_model_status(),
            "rl_recovery": await rl_recovery_service.get_model_status(),
            "vision": await vision_service.get_model_status()
        }
        return status
    except Exception as e:
        logger.error(f"Failed to get models status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/models/reload")
async def reload_models():
    """Reload all ML models"""
    try:
        await agent_s_service.reload_model()
        await rl_recovery_service.reload_model()
        await vision_service.reload_model()
        return {"status": "models_reloaded"}
    except Exception as e:
        logger.error(f"Failed to reload models: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Training endpoints (for future use)
@app.post("/train/agent_s")
async def train_agent_s(training_data: List[Dict[str, Any]]):
    """Train Agent-S model with new data"""
    try:
        result = await agent_s_service.train(training_data)
        return result
    except Exception as e:
        logger.error(f"Failed to train Agent-S: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/train/rl_recovery")
async def train_rl_recovery(training_data: List[Dict[str, Any]]):
    """Train RL recovery model with new data"""
    try:
        result = await rl_recovery_service.train(training_data)
        return result
    except Exception as e:
        logger.error(f"Failed to train RL recovery: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize ML services on startup"""
    try:
        logger.info("Initializing ML services...")
        await agent_s_service.initialize()
        await rl_recovery_service.initialize()
        await vision_service.initialize()
        logger.info("ML services initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize ML services: {e}")
        raise

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup ML services on shutdown"""
    try:
        logger.info("Shutting down ML services...")
        await agent_s_service.cleanup()
        await rl_recovery_service.cleanup()
        await vision_service.cleanup()
        logger.info("ML services shutdown complete")
    except Exception as e:
        logger.error(f"Error during ML services shutdown: {e}")

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )

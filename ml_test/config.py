# Test Configuration - Updated for Agent-S3
import os
from dotenv import load_dotenv

load_dotenv()

# Test Configuration
TEST_CONFIG = {
    "vercel": {
        "test_url": "https://vercel.com/dashboard",
        "login_url": "https://vercel.com/login",
        "deploy_url": "https://vercel.com/new",
        "api_token": os.getenv("VERCEL_API_TOKEN", "test_token"),
    },
    "agent_s3": {
        # Agent-S3 Configuration - Optimized for Local Supercomputer
        "provider": os.getenv("AGENT_S_PROVIDER", "huggingface"),  # huggingface for local models
        "model": os.getenv("AGENT_S_MODEL", "microsoft/Agent-S3"),  # Best local generation model
        "model_url": os.getenv("AGENT_S_MODEL_URL", "http://localhost:8000"),  # Local vLLM server
        "model_api_key": os.getenv("AGENT_S_API_KEY", ""),  # Not needed for local
        
        # Grounding Model Configuration - Best Local Grounding Model
        "ground_provider": os.getenv("AGENT_S_GROUND_PROVIDER", "huggingface"),
        "ground_url": os.getenv("AGENT_S_GROUND_URL", "http://localhost:8001"),  # Local grounding server
        "ground_model": os.getenv("AGENT_S_GROUND_MODEL", "UI-TARS-72B"),  # Best grounding model
        "ground_api_key": os.getenv("AGENT_S_GROUND_API_KEY", ""),  # Not needed for local
        
        # Grounding dimensions (UI-TARS-72B: 1000x1000)
        "grounding_width": int(os.getenv("AGENT_S_GROUNDING_WIDTH", "1000")),  # UI-TARS-72B dimensions
        "grounding_height": int(os.getenv("AGENT_S_GROUNDING_HEIGHT", "1000")),  # UI-TARS-72B dimensions
        
        # Agent-S3 Settings - Optimized for Performance
        "model_temperature": float(os.getenv("AGENT_S_TEMPERATURE", "0.7")),  # Lower temp for consistency
        "max_trajectory_length": int(os.getenv("AGENT_S_MAX_TRAJECTORY", "12")),  # Longer memory
        "enable_reflection": os.getenv("AGENT_S_REFLECTION", "true").lower() == "true",
        "enable_local_env": os.getenv("AGENT_S_LOCAL_ENV", "true").lower() == "true",  # Enable local code execution
        
        # Platform and Screen Settings - Optimized for VS Remote Tunnel
        "platform": os.getenv("AGENT_S_PLATFORM", "linux"),  # linux, darwin, windows
        "screen_width": int(os.getenv("AGENT_S_SCREEN_WIDTH", "1920")),
        "screen_height": int(os.getenv("AGENT_S_SCREEN_HEIGHT", "1080")),
        
        # VS Remote Tunnel Specific Settings
        "headless_mode": os.getenv("AGENT_S_HEADLESS", "true").lower() == "true",  # Run browser in headless mode
        "display_server": os.getenv("AGENT_S_DISPLAY", ":99"),  # Virtual display for headless
        "browser_timeout": int(os.getenv("AGENT_S_BROWSER_TIMEOUT", "30000")),  # 30 second timeout
        "screenshot_quality": int(os.getenv("AGENT_S_SCREENSHOT_QUALITY", "90")),  # High quality screenshots
        
        # Confidence and Performance - Higher thresholds for local models
        "confidence_threshold": 0.8,  # Higher threshold for better accuracy
        "device": "cuda",  # Force CUDA for supercomputer
        "gpu_memory_fraction": float(os.getenv("AGENT_S_GPU_MEMORY", "0.8")),  # Use 80% of GPU memory
    },
    "rl_recovery": {
        "model_path": "./models/rl_recovery_model.zip",
        "vector_db_path": "./data/error_embeddings",
    },
    "test_data": {
        "screenshots_dir": "./test_data/screenshots",
        "error_logs_dir": "./test_data/error_logs",
        "sample_project_path": "./test_data/sample_project",
    }
}

# Create directories if they don't exist
def setup_test_directories():
    """Create necessary directories for testing"""
    directories = [
        TEST_CONFIG["test_data"]["screenshots_dir"],
        TEST_CONFIG["test_data"]["error_logs_dir"],
        TEST_CONFIG["test_data"]["sample_project_path"],
        "./models",
        "./data",
    ]
    
    for directory in directories:
        os.makedirs(directory, exist_ok=True)
        print(f"Created directory: {directory}")

if __name__ == "__main__":
    setup_test_directories()

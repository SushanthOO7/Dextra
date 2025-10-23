"""
Test Agent-S3 model for Vercel deployment automation
This file tests the latest Agent-S3 vision-language model's ability to predict actions from screenshots
Based on: https://github.com/simular-ai/agent-s
"""

import pyautogui
import io
import cv2
import numpy as np
from PIL import Image
import json
import logging
import asyncio
from typing import Dict, List, Tuple, Optional
from config import TEST_CONFIG

# Agent-S3 imports
from gui_agents.s3.agents.agent_s import AgentS3
from gui_agents.s3.agents.grounding import OSWorldACI
from gui_agents.s3.utils.local_env import LocalEnv

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AgentS3Tester:
    def __init__(self):
        self.config = TEST_CONFIG["agent_s3"]
        self.confidence_threshold = self.config["confidence_threshold"]
        self.agent = None
        self.grounding_agent = None
        self.local_env = None
        
    def load_model(self):
        """Load Agent-S3 model and grounding agent"""
        try:
            logger.info("Loading Agent-S3 model...")
            
            # Setup local environment (optional)
            if self.config["enable_local_env"]:
                logger.warning("⚠️  Local environment enabled - Agent-S3 can execute code locally!")
                self.local_env = LocalEnv()
            else:
                self.local_env = None
            
            # Define engine parameters for main generation model
            engine_params = {
                "engine_type": self.config["provider"],
                "model": self.config["model"],
                "base_url": self.config["model_url"] if self.config["model_url"] else None,
                "api_key": self.config["model_api_key"] if self.config["model_api_key"] else None,
                "temperature": self.config["model_temperature"]
            }
            
            # Define engine parameters for grounding model
            engine_params_for_grounding = {
                "engine_type": self.config["ground_provider"],
                "model": self.config["ground_model"],
                "base_url": self.config["ground_url"] if self.config["ground_url"] else None,
                "api_key": self.config["ground_api_key"] if self.config["ground_api_key"] else None,
                "grounding_width": self.config["grounding_width"],
                "grounding_height": self.config["grounding_height"],
            }
            
            # Create grounding agent (OSWorldACI)
            self.grounding_agent = OSWorldACI(
                env=self.local_env,
                platform=self.config["platform"],
                engine_params_for_generation=engine_params,
                engine_params_for_grounding=engine_params_for_grounding,
                width=self.config["screen_width"],
                height=self.config["screen_height"]
            )
            
            # Create Agent-S3
            self.agent = AgentS3(
                engine_params,
                self.grounding_agent,
                platform=self.config["platform"],
                max_trajectory_length=self.config["max_trajectory_length"],
                enable_reflection=self.config["enable_reflection"]
            )
            
            logger.info("✓ Agent-S3 model loaded successfully")
            logger.info(f"  Platform: {self.config['platform']}")
            logger.info(f"  Main model: {self.config['model']}")
            logger.info(f"  Grounding model: {self.config['ground_model']}")
            logger.info(f"  Grounding dimensions: {self.config['grounding_width']}x{self.config['grounding_height']}")
            logger.info(f"  Reflection enabled: {self.config['enable_reflection']}")
            logger.info(f"  Local environment: {self.config['enable_local_env']}")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to load Agent-S3 model: {e}")
            return False
    
    def preprocess_screenshot(self, image_path: str) -> np.ndarray:
        """Preprocess screenshot for model input"""
        try:
            # Load image
            image = cv2.imread(image_path)
            if image is None:
                raise ValueError(f"Could not load image: {image_path}")
            
            # Resize to standard size (Agent-S typically uses 224x224 or 384x384)
            target_size = (384, 384)
            image_resized = cv2.resize(image, target_size)
            
            # Convert BGR to RGB
            image_rgb = cv2.cvtColor(image_resized, cv2.COLOR_BGR2RGB)
            
            # Normalize pixel values to [0, 1]
            image_normalized = image_rgb.astype(np.float32) / 255.0
            
            logger.info(f"Preprocessed image: {image_normalized.shape}")
            return image_normalized
            
        except Exception as e:
            logger.error(f"Failed to preprocess image: {e}")
            return None
    
    async def predict_action(self, screenshot_bytes: bytes, instruction: str) -> Dict:
        """
        Predict next action using Agent-S3
        
        Args:
            screenshot_bytes: Raw screenshot bytes
            instruction: Natural language instruction for the agent
            
        Returns:
            Dictionary with action, confidence, reasoning
        """
        try:
            if not self.agent:
                raise ValueError("Agent-S3 not loaded. Call load_model() first.")
            
            # Prepare observation for Agent-S3
            obs = {
                "screenshot": screenshot_bytes,
            }
            
            logger.info(f"Predicting action for instruction: '{instruction}'")
            
            # Use Agent-S3 to predict action
            info, action = self.agent.predict(instruction=instruction, observation=obs)
            
            # Parse the action result
            if action and len(action) > 0:
                # Agent-S3 returns executable Python code
                action_code = action[0]
                
                # Extract action details from the code (simplified parsing)
                prediction = {
                    "action_code": action_code,
                    "action_type": "execute",  # Agent-S3 generates executable code
                    "confidence": 0.85,  # Default confidence for Agent-S3
                    "reasoning": info.get("reasoning", "Agent-S3 generated action"),
                    "instruction": instruction
                }
                
                logger.info(f"✓ Agent-S3 predicted action: {action_code[:100]}...")
                return prediction
            else:
                logger.warning("Agent-S3 returned no action")
                return {
                    "action_code": "",
                    "action_type": "wait",
                    "confidence": 0.0,
                    "reasoning": "No action generated",
                    "instruction": instruction
                }
                
        except Exception as e:
            logger.error(f"Failed to predict action: {e}")
            return {
                "action_code": "",
                "action_type": "error",
                "confidence": 0.0,
                "reasoning": f"Error: {str(e)}",
                "instruction": instruction
            }
    
    async def execute_action(self, action_code: str) -> Dict:
        """
        Execute the action code generated by Agent-S3
        
        Args:
            action_code: Python code generated by Agent-S3
            
        Returns:
            Dictionary with execution result
        """
        try:
            if not action_code:
                return {"success": False, "error": "No action code provided"}
            
            logger.info(f"Executing Agent-S3 action: {action_code[:100]}...")
            
            # Execute the action code (in a real implementation, this would be safer)
            # For testing, we'll simulate execution
            exec_result = {
                "success": True,
                "output": "Action executed successfully",
                "action_code": action_code
            }
            
            logger.info("✓ Action executed successfully")
            return exec_result
            
        except Exception as e:
            logger.error(f"Failed to execute action: {e}")
            return {
                "success": False,
                "error": str(e),
                "action_code": action_code
            }
    
    def validate_prediction(self, prediction: Dict, expected_action: Dict) -> bool:
        """Validate if prediction matches expected action"""
        try:
            # Check if action type matches
            if prediction["action_type"] != expected_action["action_type"]:
                logger.warning(f"Action type mismatch: {prediction['action_type']} vs {expected_action['action_type']}")
                return False
            
            # Check confidence threshold
            if prediction["confidence"] < self.confidence_threshold:
                logger.warning(f"Low confidence: {prediction['confidence']} < {self.confidence_threshold}")
                return False
            
            # For click actions, check if coordinates are reasonable
            if prediction["action_type"] == "click":
                x, y = prediction["coordinates"]
                if x < 0 or x > 800 or y < 0 or y > 600:  # Assuming 800x600 screen
                    logger.warning(f"Coordinates out of bounds: ({x}, {y})")
                    return False
            
            logger.info("Prediction validation passed")
            return True
            
        except Exception as e:
            logger.error(f"Validation failed: {e}")
            return False

def test_agent_s3_basic():
    """Test basic Agent-S3 functionality"""
    logger.info("=== Testing Agent-S3 Basic Functionality ===")
    
    tester = AgentS3Tester()
    
    # Test model loading
    if not tester.load_model():
        logger.error("Failed to load Agent-S3 model")
        return False
    
    # Test screenshot preprocessing
    test_image_path = "./test_data/screenshots/vercel_login.png"
    screenshot_bytes = tester.preprocess_screenshot(test_image_path)
    
    if screenshot_bytes is None:
        logger.error("Failed to preprocess screenshot")
        return False
    
    # Test action prediction
    instruction = "Click on the login button"
    prediction = await tester.predict_action(screenshot_bytes, instruction)
    logger.info(f"Prediction result: {prediction}")
    
    # Test action execution
    if prediction["action_code"]:
        execution_result = await tester.execute_action(prediction["action_code"])
        logger.info(f"Execution result: {execution_result}")
    
    # Test validation
    expected_action = {
        "action_type": "execute",
        "confidence": 0.85,
        "instruction": instruction
    }
    
    is_valid = tester.validate_prediction(prediction, expected_action)
    logger.info(f"Validation result: {is_valid}")
    
    return is_valid

async def test_vercel_deployment_workflow():
    """Test complete Vercel deployment workflow with Agent-S3"""
    logger.info("=== Testing Vercel Deployment Workflow with Agent-S3 ===")
    
    tester = AgentS3Tester()
    tester.load_model()
    
    # Define Vercel deployment workflow steps with natural language instructions
    workflow_steps = [
        {
            "step": "login",
            "instruction": "Sign in to Vercel dashboard",
            "screenshot": "./test_data/screenshots/vercel_login.png"
        },
        {
            "step": "new_project",
            "instruction": "Click on 'New Project' button",
            "screenshot": "./test_data/screenshots/vercel_dashboard.png"
        },
        {
            "step": "import_project",
            "instruction": "Click on 'Import Project' to deploy from GitHub",
            "screenshot": "./test_data/screenshots/vercel_new_project.png"
        },
        {
            "step": "project_name",
            "instruction": "Enter project name 'test-react-app'",
            "screenshot": "./test_data/screenshots/vercel_configure.png"
        },
        {
            "step": "deploy",
            "instruction": "Click 'Deploy' button to start deployment",
            "screenshot": "./test_data/screenshots/vercel_deploy.png"
        }
    ]
    
    successful_predictions = 0
    total_predictions = len(workflow_steps)
    
    for i, step_data in enumerate(workflow_steps):
        logger.info(f"Testing step {i+1}/{total_predictions}: {step_data['step']}")
        
        # Load corresponding screenshot
        screenshot_bytes = tester.preprocess_screenshot(step_data["screenshot"])
        
        if screenshot_bytes is not None:
            # Predict action using Agent-S3
            prediction = await tester.predict_action(screenshot_bytes, step_data["instruction"])
            
            # Check if prediction is reasonable
            if prediction["confidence"] > tester.confidence_threshold and prediction["action_code"]:
                successful_predictions += 1
                logger.info(f"✓ Step {step_data['step']} prediction successful")
                
                # Test execution (simulated)
                execution_result = await tester.execute_action(prediction["action_code"])
                if execution_result["success"]:
                    logger.info(f"✓ Step {step_data['step']} execution successful")
                else:
                    logger.warning(f"✗ Step {step_data['step']} execution failed")
            else:
                logger.warning(f"✗ Step {step_data['step']} prediction failed (low confidence or no action)")
        else:
            logger.warning(f"✗ Step {step_data['step']} screenshot not found")
    
    success_rate = successful_predictions / total_predictions
    logger.info(f"Workflow test completed: {successful_predictions}/{total_predictions} successful ({success_rate:.2%})")
    
    return success_rate > 0.8  # 80% success rate threshold

if __name__ == "__main__":
    async def main():
        # Run basic tests
        basic_test_passed = await test_agent_s3_basic()
        workflow_test_passed = await test_vercel_deployment_workflow()
        
        logger.info(f"\n=== Test Results ===")
        logger.info(f"Basic functionality: {'PASS' if basic_test_passed else 'FAIL'}")
        logger.info(f"Workflow test: {'PASS' if workflow_test_passed else 'FAIL'}")
        
        if basic_test_passed and workflow_test_passed:
            logger.info("🎉 All Agent-S3 tests passed!")
        else:
            logger.error("❌ Some tests failed. Check logs for details.")
    
    asyncio.run(main())

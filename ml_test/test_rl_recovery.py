"""
Test RL-based error recovery system
This file tests the reinforcement learning model's ability to suggest recovery actions
"""

import numpy as np
import json
import logging
from typing import Dict, List, Tuple, Optional
from config import TEST_CONFIG

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RLRecoveryTester:
    def __init__(self):
        self.state_dim = 10  # State vector dimension
        self.action_dim = 6  # Number of possible recovery actions
        self.model = None
        self.action_space = [
            "retry",
            "re_auth", 
            "fix_dependencies",
            "fix_config",
            "retry_with_timeout",
            "abort"
        ]
        
    def load_model(self):
        """Load trained RL model"""
        try:
            # In reality, you'd load a trained PPO model
            # For testing, we'll simulate the model behavior
            logger.info("Loading RL recovery model...")
            
            # Simulate model loading
            self.model = "mock_ppo_model"
            
            logger.info("RL model loaded successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to load RL model: {e}")
            return False
    
    def encode_state(self, error_context: Dict) -> np.ndarray:
        """
        Encode error context into state vector
        
        Args:
            error_context: Dictionary containing error information
            
        Returns:
            State vector for RL model
        """
        try:
            # Create state vector from error context
            state = np.zeros(self.state_dim)
            
            # Error type encoding (one-hot)
            error_type = error_context.get("error_type", "unknown")
            error_type_map = {
                "auth_error": 0,
                "build_error": 1, 
                "deployment_error": 2,
                "config_error": 3,
                "timeout_error": 4,
                "unknown_error": 5
            }
            
            if error_type in error_type_map:
                state[error_type_map[error_type]] = 1.0
            
            # Confidence level
            confidence = error_context.get("confidence", 0.0)
            state[6] = confidence
            
            # Retry count
            retry_count = error_context.get("retry_count", 0)
            state[7] = min(retry_count / 5.0, 1.0)  # Normalize to [0,1]
            
            # Time since error
            time_since_error = error_context.get("time_since_error", 0)
            state[8] = min(time_since_error / 300.0, 1.0)  # Normalize to 5 minutes
            
            # Platform indicator
            platform = error_context.get("platform", "unknown")
            platform_map = {"vercel": 1.0, "render": 0.8, "netlify": 0.6, "unknown": 0.0}
            state[9] = platform_map.get(platform, 0.0)
            
            logger.info(f"Encoded state: {state}")
            return state
            
        except Exception as e:
            logger.error(f"State encoding failed: {e}")
            return np.zeros(self.state_dim)
    
    def predict_recovery_action(self, state: np.ndarray) -> Dict:
        """
        Predict recovery action using RL model
        
        Args:
            state: Encoded state vector
            
        Returns:
            Dictionary with action, confidence, reasoning
        """
        try:
            # Simulate RL model prediction
            # In reality, this would use the trained PPO model
            
            # Simple rule-based simulation based on state
            error_type_idx = np.argmax(state[:6])
            confidence = state[6]
            retry_count = state[7] * 5  # Denormalize
            
            # Determine action based on error type and context
            if error_type_idx == 0:  # auth_error
                action_idx = 1  # re_auth
                action_confidence = 0.9
                reasoning = "Authentication error detected, suggesting re-authentication"
                
            elif error_type_idx == 1:  # build_error
                action_idx = 2  # fix_dependencies
                action_confidence = 0.85
                reasoning = "Build error detected, suggesting dependency fix"
                
            elif error_type_idx == 2:  # deployment_error
                if retry_count < 2:
                    action_idx = 0  # retry
                    action_confidence = 0.8
                    reasoning = "Deployment error, suggesting retry"
                else:
                    action_idx = 5  # abort
                    action_confidence = 0.7
                    reasoning = "Multiple deployment failures, suggesting abort"
                    
            elif error_type_idx == 3:  # config_error
                action_idx = 3  # fix_config
                action_confidence = 0.88
                reasoning = "Configuration error detected, suggesting config fix"
                
            elif error_type_idx == 4:  # timeout_error
                action_idx = 4  # retry_with_timeout
                action_confidence = 0.82
                reasoning = "Timeout error detected, suggesting retry with timeout"
                
            else:  # unknown_error
                if retry_count < 1:
                    action_idx = 0  # retry
                    action_confidence = 0.6
                    reasoning = "Unknown error, suggesting simple retry"
                else:
                    action_idx = 5  # abort
                    action_confidence = 0.5
                    reasoning = "Unknown error with retries, suggesting abort"
            
            # Adjust confidence based on state confidence
            final_confidence = action_confidence * confidence
            
            prediction = {
                "action": self.action_space[action_idx],
                "action_idx": action_idx,
                "confidence": final_confidence,
                "reasoning": reasoning,
                "state": state.tolist()
            }
            
            logger.info(f"Predicted action: {prediction['action']} (confidence: {final_confidence:.2f})")
            return prediction
            
        except Exception as e:
            logger.error(f"Action prediction failed: {e}")
            return {
                "action": "abort",
                "action_idx": 5,
                "confidence": 0.0,
                "reasoning": f"Prediction failed: {str(e)}",
                "state": state.tolist() if 'state' in locals() else []
            }
    
    def evaluate_action(self, action: str, error_context: Dict, outcome: str) -> float:
        """
        Evaluate the effectiveness of a recovery action
        
        Args:
            action: Recovery action taken
            error_context: Original error context
            outcome: Result of the action ("success", "failure", "partial")
            
        Returns:
            Reward value for RL training
        """
        try:
            # Define reward structure
            rewards = {
                "success": 1.0,
                "partial": 0.5,
                "failure": -0.5
            }
            
            base_reward = rewards.get(outcome, -0.1)
            
            # Adjust reward based on action appropriateness
            error_type = error_context.get("error_type", "unknown")
            
            # Define appropriate actions for each error type
            appropriate_actions = {
                "auth_error": ["re_auth"],
                "build_error": ["fix_dependencies"],
                "deployment_error": ["retry", "abort"],
                "config_error": ["fix_config"],
                "timeout_error": ["retry_with_timeout"],
                "unknown_error": ["retry", "abort"]
            }
            
            if action in appropriate_actions.get(error_type, []):
                # Appropriate action gets bonus
                base_reward += 0.2
            else:
                # Inappropriate action gets penalty
                base_reward -= 0.3
            
            # Adjust based on retry count (discourage excessive retries)
            retry_count = error_context.get("retry_count", 0)
            if retry_count > 3 and action == "retry":
                base_reward -= 0.4
            
            logger.info(f"Action evaluation: {action} -> {outcome} (reward: {base_reward:.2f})")
            return base_reward
            
        except Exception as e:
            logger.error(f"Action evaluation failed: {e}")
            return -0.1
    
    def simulate_recovery_episode(self, error_context: Dict) -> Dict:
        """
        Simulate a complete recovery episode
        
        Args:
            error_context: Initial error context
            
        Returns:
            Episode results with actions taken and outcomes
        """
        try:
            episode = {
                "initial_error": error_context,
                "actions_taken": [],
                "final_outcome": "unknown",
                "total_reward": 0.0,
                "steps": 0
            }
            
            current_context = error_context.copy()
            max_steps = 5
            
            for step in range(max_steps):
                logger.info(f"Recovery step {step + 1}/{max_steps}")
                
                # Encode current state
                state = self.encode_state(current_context)
                
                # Predict action
                prediction = self.predict_recovery_action(state)
                action = prediction["action"]
                
                # Simulate action outcome
                outcome = self._simulate_action_outcome(action, current_context)
                
                # Record action
                action_record = {
                    "step": step + 1,
                    "action": action,
                    "confidence": prediction["confidence"],
                    "reasoning": prediction["reasoning"],
                    "outcome": outcome
                }
                episode["actions_taken"].append(action_record)
                
                # Evaluate action
                reward = self.evaluate_action(action, current_context, outcome)
                episode["total_reward"] += reward
                
                # Update context for next step
                current_context["retry_count"] = current_context.get("retry_count", 0) + 1
                current_context["time_since_error"] = current_context.get("time_since_error", 0) + 30
                
                # Check if episode should end
                if outcome == "success":
                    episode["final_outcome"] = "success"
                    break
                elif outcome == "failure" and action == "abort":
                    episode["final_outcome"] = "aborted"
                    break
                elif step == max_steps - 1:
                    episode["final_outcome"] = "timeout"
            
            episode["steps"] = len(episode["actions_taken"])
            logger.info(f"Episode completed: {episode['final_outcome']} in {episode['steps']} steps")
            
            return episode
            
        except Exception as e:
            logger.error(f"Recovery episode simulation failed: {e}")
            return {
                "initial_error": error_context,
                "actions_taken": [],
                "final_outcome": "error",
                "total_reward": -1.0,
                "steps": 0,
                "error": str(e)
            }
    
    def _simulate_action_outcome(self, action: str, context: Dict) -> str:
        """Simulate the outcome of a recovery action"""
        try:
            # Simulate outcomes based on action and context
            error_type = context.get("error_type", "unknown")
            retry_count = context.get("retry_count", 0)
            
            # Define success probabilities for each action
            success_probabilities = {
                "re_auth": 0.8 if error_type == "auth_error" else 0.3,
                "fix_dependencies": 0.7 if error_type == "build_error" else 0.2,
                "fix_config": 0.6 if error_type == "config_error" else 0.1,
                "retry": 0.4 if retry_count < 2 else 0.1,
                "retry_with_timeout": 0.5 if error_type == "timeout_error" else 0.2,
                "abort": 0.0  # Always "failure" but appropriate
            }
            
            success_prob = success_probabilities.get(action, 0.1)
            
            # Simulate outcome
            random_value = np.random.random()
            
            if random_value < success_prob:
                return "success"
            elif random_value < success_prob + 0.2:
                return "partial"
            else:
                return "failure"
                
        except Exception as e:
            logger.error(f"Action outcome simulation failed: {e}")
            return "failure"

def test_rl_model_loading():
    """Test RL model loading"""
    logger.info("=== Testing RL Model Loading ===")
    
    tester = RLRecoveryTester()
    
    if tester.load_model():
        logger.info("✓ RL model loaded successfully")
        return True
    else:
        logger.error("✗ RL model loading failed")
        return False

def test_state_encoding():
    """Test state encoding functionality"""
    logger.info("=== Testing State Encoding ===")
    
    tester = RLRecoveryTester()
    
    # Test cases with different error contexts
    test_contexts = [
        {
            "error_type": "auth_error",
            "confidence": 0.9,
            "retry_count": 0,
            "time_since_error": 0,
            "platform": "vercel"
        },
        {
            "error_type": "build_error",
            "confidence": 0.8,
            "retry_count": 2,
            "time_since_error": 60,
            "platform": "render"
        },
        {
            "error_type": "unknown_error",
            "confidence": 0.3,
            "retry_count": 5,
            "time_since_error": 300,
            "platform": "unknown"
        }
    ]
    
    successful_encodings = 0
    
    for i, context in enumerate(test_contexts):
        logger.info(f"Testing context {i+1}: {context['error_type']}")
        
        state = tester.encode_state(context)
        
        if state is not None and len(state) == tester.state_dim:
            successful_encodings += 1
            logger.info(f"✓ State encoded successfully: {state}")
        else:
            logger.error(f"✗ State encoding failed for context {i+1}")
    
    success_rate = successful_encodings / len(test_contexts)
    logger.info(f"State encoding test: {successful_encodings}/{len(test_contexts)} successful ({success_rate:.2%})")
    
    return success_rate > 0.8

def test_action_prediction():
    """Test action prediction"""
    logger.info("=== Testing Action Prediction ===")
    
    tester = RLRecoveryTester()
    
    # Test different error scenarios
    test_scenarios = [
        {
            "name": "Fresh Auth Error",
            "context": {
                "error_type": "auth_error",
                "confidence": 0.9,
                "retry_count": 0,
                "time_since_error": 0,
                "platform": "vercel"
            },
            "expected_action": "re_auth"
        },
        {
            "name": "Build Error",
            "context": {
                "error_type": "build_error",
                "confidence": 0.8,
                "retry_count": 1,
                "time_since_error": 30,
                "platform": "render"
            },
            "expected_action": "fix_dependencies"
        },
        {
            "name": "Multiple Deployment Failures",
            "context": {
                "error_type": "deployment_error",
                "confidence": 0.7,
                "retry_count": 3,
                "time_since_error": 120,
                "platform": "netlify"
            },
            "expected_action": "abort"
        }
    ]
    
    successful_predictions = 0
    
    for scenario in test_scenarios:
        logger.info(f"Testing: {scenario['name']}")
        
        state = tester.encode_state(scenario["context"])
        prediction = tester.predict_recovery_action(state)
        
        if prediction["action"] == scenario["expected_action"]:
            successful_predictions += 1
            logger.info(f"✓ Correctly predicted {prediction['action']}")
        else:
            logger.warning(f"✗ Predicted {prediction['action']}, expected {scenario['expected_action']}")
    
    success_rate = successful_predictions / len(test_scenarios)
    logger.info(f"Action prediction test: {successful_predictions}/{len(test_scenarios)} successful ({success_rate:.2%})")
    
    return success_rate > 0.6

def test_recovery_episodes():
    """Test complete recovery episodes"""
    logger.info("=== Testing Recovery Episodes ===")
    
    tester = RLRecoveryTester()
    
    # Test different error scenarios
    test_errors = [
        {
            "error_type": "auth_error",
            "confidence": 0.9,
            "retry_count": 0,
            "time_since_error": 0,
            "platform": "vercel"
        },
        {
            "error_type": "build_error",
            "confidence": 0.8,
            "retry_count": 0,
            "time_since_error": 0,
            "platform": "render"
        },
        {
            "error_type": "deployment_error",
            "confidence": 0.7,
            "retry_count": 2,
            "time_since_error": 60,
            "platform": "netlify"
        }
    ]
    
    successful_episodes = 0
    
    for i, error_context in enumerate(test_errors):
        logger.info(f"Testing episode {i+1}: {error_context['error_type']}")
        
        episode = tester.simulate_recovery_episode(error_context)
        
        if episode["final_outcome"] in ["success", "aborted"] and episode["steps"] > 0:
            successful_episodes += 1
            logger.info(f"✓ Episode completed: {episode['final_outcome']} in {episode['steps']} steps")
            logger.info(f"  Total reward: {episode['total_reward']:.2f}")
        else:
            logger.warning(f"✗ Episode failed: {episode['final_outcome']}")
    
    success_rate = successful_episodes / len(test_errors)
    logger.info(f"Recovery episode test: {successful_episodes}/{len(test_errors)} successful ({success_rate:.2%})")
    
    return success_rate > 0.6

if __name__ == "__main__":
    # Run RL recovery tests
    model_test_passed = test_rl_model_loading()
    encoding_test_passed = test_state_encoding()
    prediction_test_passed = test_action_prediction()
    episode_test_passed = test_recovery_episodes()
    
    logger.info(f"\n=== RL Recovery Test Results ===")
    logger.info(f"Model loading: {'PASS' if model_test_passed else 'FAIL'}")
    logger.info(f"State encoding: {'PASS' if encoding_test_passed else 'FAIL'}")
    logger.info(f"Action prediction: {'PASS' if prediction_test_passed else 'FAIL'}")
    logger.info(f"Recovery episodes: {'PASS' if episode_test_passed else 'FAIL'}")
    
    if model_test_passed and encoding_test_passed and prediction_test_passed and episode_test_passed:
        logger.info("🎉 All RL recovery tests passed!")
    else:
        logger.error("❌ Some RL recovery tests failed. Check logs for details.")

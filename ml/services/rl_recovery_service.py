import torch
import torch.nn as nn
import numpy as np
from typing import Dict, List, Any, Optional
import json
import os
import pickle
from loguru import logger
from stable_baselines3 import PPO
from stable_baselines3.common.env_util import make_vec_env
from stable_baselines3.common.vec_env import VecEnv
import gymnasium as gym
from gymnasium import spaces

class ErrorRecoveryEnv(gym.Env):
    """Environment for error recovery using RL"""
    
    def __init__(self):
        super().__init__()
        
        # Action space: recovery actions
        self.action_space = spaces.Discrete(10)  # 10 different recovery actions
        
        # Observation space: error signature features
        self.observation_space = spaces.Box(
            low=-np.inf, 
            high=np.inf, 
            shape=(64,), 
            dtype=np.float32
        )
        
        self.current_error = None
        self.recovery_attempts = 0
        self.max_attempts = 5
        
    def reset(self, seed=None, options=None):
        """Reset the environment"""
        super().reset(seed=seed)
        self.recovery_attempts = 0
        self.current_error = None
        return np.zeros(64, dtype=np.float32), {}
    
    def step(self, action):
        """Execute recovery action"""
        self.recovery_attempts += 1
        
        # Simulate recovery attempt
        success = self._simulate_recovery(action)
        
        # Calculate reward
        if success:
            reward = 1.0
            terminated = True
        elif self.recovery_attempts >= self.max_attempts:
            reward = -1.0
            terminated = True
        else:
            reward = -0.1  # Small penalty for failed attempt
            terminated = False
        
        # Return observation, reward, terminated, truncated, info
        return np.zeros(64, dtype=np.float32), reward, terminated, False, {}
    
    def _simulate_recovery(self, action: int) -> bool:
        """Simulate recovery attempt"""
        # This would implement actual recovery logic
        # For now, return random success
        return np.random.random() > 0.7

class RecoveryPolicy(nn.Module):
    """Neural network policy for recovery actions"""
    
    def __init__(self, input_dim: int = 64, hidden_dim: int = 128, output_dim: int = 10):
        super().__init__()
        
        self.network = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(hidden_dim, output_dim)
        )
        
    def forward(self, x):
        return self.network(x)

class RLRecoveryService:
    """Service for RL-based error recovery"""
    
    def __init__(self):
        self.model = None
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model_path = "models/rl_recovery_model.pkl"
        self.is_initialized = False
        
        # Recovery action mappings
        self.action_mappings = {
            0: "retry_clean",
            1: "refresh_token", 
            2: "clear_cache",
            3: "restart_service",
            4: "increase_timeout",
            5: "check_dependencies",
            6: "modify_config",
            7: "rollback_changes",
            8: "escalate_support",
            9: "manual_intervention"
        }
        
        # Recovery action descriptions
        self.action_descriptions = {
            "retry_clean": "Retry the operation with clean cache and dependencies",
            "refresh_token": "Refresh authentication token and retry",
            "clear_cache": "Clear all caches and retry",
            "restart_service": "Restart the service and retry",
            "increase_timeout": "Increase timeout limits and retry",
            "check_dependencies": "Check and update dependencies",
            "modify_config": "Modify configuration and retry",
            "rollback_changes": "Rollback recent changes and retry",
            "escalate_support": "Escalate to human support",
            "manual_intervention": "Requires manual intervention"
        }
    
    async def initialize(self):
        """Initialize the RL recovery model"""
        try:
            logger.info("Initializing RL recovery service...")
            
            # Create environment
            self.env = make_vec_env(ErrorRecoveryEnv, n_envs=1)
            
            # Load or create model
            if os.path.exists(self.model_path):
                logger.info("Loading pre-trained RL recovery model...")
                self.model = PPO.load(self.model_path)
                logger.info("RL recovery model loaded successfully")
            else:
                logger.warning("No pre-trained model found, creating new model")
                self.model = PPO("MlpPolicy", self.env, verbose=1)
            
            self.is_initialized = True
            logger.info("RL recovery service initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize RL recovery service: {e}")
            raise
    
    async def recover(self, error_signature: Dict[str, Any], 
                     context: Dict[str, Any]) -> Dict[str, Any]:
        """Get recovery action using RL model"""
        try:
            if not self.is_initialized:
                await self.initialize()
            
            # Encode error signature
            observation = self._encode_error_signature(error_signature, context)
            
            # Get action from model
            action, _ = self.model.predict(observation, deterministic=True)
            action_id = int(action[0])
            
            # Map action to string
            action_str = self.action_mappings.get(action_id, "retry_clean")
            
            # Get confidence (simplified)
            confidence = self._calculate_confidence(action_id, error_signature)
            
            # Generate parameters
            params = self._generate_action_params(action_str, error_signature, context)
            
            # Generate fallback actions
            fallback = self._generate_fallback_actions(action_id, error_signature)
            
            return {
                'action': action_str,
                'params': params,
                'expected_effect': self.action_descriptions.get(action_str, "Unknown action"),
                'confidence': confidence,
                'fallback': fallback
            }
            
        except Exception as e:
            logger.error(f"Failed to get recovery action: {e}")
            raise
    
    def _encode_error_signature(self, error_signature: Dict[str, Any], 
                               context: Dict[str, Any]) -> np.ndarray:
        """Encode error signature into observation vector"""
        try:
            # Create feature vector
            features = np.zeros(64, dtype=np.float32)
            
            # Error type features
            error_type = error_signature.get('type', 'unknown')
            type_features = self._encode_error_type(error_type)
            features[:len(type_features)] = type_features
            
            # Error message features
            message = error_signature.get('message', '')
            message_features = self._encode_error_message(message)
            features[10:20] = message_features
            
            # Context features
            platform = context.get('platform', 'unknown')
            platform_features = self._encode_platform(platform)
            features[20:30] = platform_features
            
            # Historical features
            history = context.get('recovery_history', [])
            history_features = self._encode_recovery_history(history)
            features[30:40] = history_features
            
            # Time features
            timestamp = context.get('timestamp', 0)
            time_features = self._encode_timestamp(timestamp)
            features[40:50] = time_features
            
            # Additional context features
            additional = context.get('additional_context', {})
            additional_features = self._encode_additional_context(additional)
            features[50:64] = additional_features
            
            return features
            
        except Exception as e:
            logger.error(f"Failed to encode error signature: {e}")
            return np.zeros(64, dtype=np.float32)
    
    def _encode_error_type(self, error_type: str) -> np.ndarray:
        """Encode error type into features"""
        type_mapping = {
            'build_error': [1, 0, 0, 0, 0],
            'network_error': [0, 1, 0, 0, 0],
            'auth_error': [0, 0, 1, 0, 0],
            'timeout_error': [0, 0, 0, 1, 0],
            'memory_error': [0, 0, 0, 0, 1]
        }
        return np.array(type_mapping.get(error_type, [0, 0, 0, 0, 0]), dtype=np.float32)
    
    def _encode_error_message(self, message: str) -> np.ndarray:
        """Encode error message into features"""
        # Simple bag-of-words encoding
        keywords = ['timeout', 'memory', 'network', 'auth', 'build', 'deploy', 'error', 'failed']
        features = np.zeros(10, dtype=np.float32)
        
        for i, keyword in enumerate(keywords):
            if keyword.lower() in message.lower():
                features[i] = 1.0
        
        return features
    
    def _encode_platform(self, platform: str) -> np.ndarray:
        """Encode platform into features"""
        platform_mapping = {
            'vercel': [1, 0, 0, 0, 0],
            'render': [0, 1, 0, 0, 0],
            'github': [0, 0, 1, 0, 0],
            'docker': [0, 0, 0, 1, 0],
            'local': [0, 0, 0, 0, 1]
        }
        return np.array(platform_mapping.get(platform, [0, 0, 0, 0, 0]), dtype=np.float32)
    
    def _encode_recovery_history(self, history: List[Dict[str, Any]]) -> np.ndarray:
        """Encode recovery history into features"""
        features = np.zeros(10, dtype=np.float32)
        
        if not history:
            return features
        
        # Count successful recoveries
        successful = sum(1 for h in history if h.get('success', False))
        features[0] = successful / len(history) if history else 0
        
        # Count failed recoveries
        failed = sum(1 for h in history if not h.get('success', False))
        features[1] = failed / len(history) if history else 0
        
        # Most common action
        if history:
            actions = [h.get('action', '') for h in history]
            most_common = max(set(actions), key=actions.count)
            features[2] = hash(most_common) % 1000 / 1000.0
        
        return features
    
    def _encode_timestamp(self, timestamp: float) -> np.ndarray:
        """Encode timestamp into features"""
        features = np.zeros(10, dtype=np.float32)
        
        if timestamp > 0:
            # Normalize timestamp
            features[0] = (timestamp % 86400) / 86400  # Time of day
            features[1] = (timestamp % 604800) / 604800  # Day of week
            features[2] = (timestamp % 2592000) / 2592000  # Day of month
        
        return features
    
    def _encode_additional_context(self, context: Dict[str, Any]) -> np.ndarray:
        """Encode additional context into features"""
        features = np.zeros(14, dtype=np.float32)
        
        # Project type
        project_type = context.get('project_type', 'unknown')
        features[0] = hash(project_type) % 1000 / 1000.0
        
        # Build command complexity
        build_command = context.get('build_command', '')
        features[1] = len(build_command) / 100.0
        
        # Dependencies count
        dependencies = context.get('dependencies', [])
        features[2] = len(dependencies) / 100.0
        
        # Environment
        environment = context.get('environment', 'production')
        features[3] = 1.0 if environment == 'production' else 0.0
        
        return features
    
    def _calculate_confidence(self, action_id: int, error_signature: Dict[str, Any]) -> float:
        """Calculate confidence for recovery action"""
        try:
            # Base confidence
            base_confidence = 0.5
            
            # Adjust based on error type
            error_type = error_signature.get('type', 'unknown')
            if error_type in ['build_error', 'network_error']:
                base_confidence += 0.2
            elif error_type in ['auth_error', 'timeout_error']:
                base_confidence += 0.1
            
            # Adjust based on action
            if action_id in [0, 1, 2]:  # Common recovery actions
                base_confidence += 0.1
            
            return min(base_confidence, 1.0)
            
        except Exception as e:
            logger.error(f"Failed to calculate confidence: {e}")
            return 0.5
    
    def _generate_action_params(self, action: str, error_signature: Dict[str, Any], 
                               context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate parameters for recovery action"""
        params = {}
        
        if action == "retry_clean":
            params = {
                "clean_cache": True,
                "clean_dependencies": False,
                "max_retries": 3
            }
        elif action == "refresh_token":
            params = {
                "platform": context.get('platform', 'unknown'),
                "retry_auth": True
            }
        elif action == "clear_cache":
            params = {
                "cache_types": ["npm", "build", "temp"],
                "force": True
            }
        elif action == "restart_service":
            params = {
                "service_name": context.get('service_name', 'dextra'),
                "wait_time": 5
            }
        elif action == "increase_timeout":
            params = {
                "timeout_multiplier": 2.0,
                "max_timeout": 300
            }
        elif action == "check_dependencies":
            params = {
                "update_outdated": True,
                "check_security": True
            }
        elif action == "modify_config":
            params = {
                "config_file": context.get('config_file', 'package.json'),
                "backup": True
            }
        elif action == "rollback_changes":
            params = {
                "rollback_steps": 1,
                "backup_restore": True
            }
        elif action == "escalate_support":
            params = {
                "priority": "high",
                "include_logs": True
            }
        elif action == "manual_intervention":
            params = {
                "description": f"Manual intervention required for {error_signature.get('type', 'unknown')} error",
                "estimated_time": "30 minutes"
            }
        
        return params
    
    def _generate_fallback_actions(self, primary_action_id: int, 
                                  error_signature: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate fallback actions"""
        fallback_actions = []
        
        # Get alternative actions
        alternative_actions = [0, 1, 2, 3, 4]  # Common recovery actions
        alternative_actions = [a for a in alternative_actions if a != primary_action_id]
        
        for action_id in alternative_actions[:3]:  # Top 3 alternatives
            action_str = self.action_mappings.get(action_id, "retry_clean")
            fallback_actions.append({
                'action': action_str,
                'confidence': 0.3,  # Lower confidence for fallback
                'description': self.action_descriptions.get(action_str, "Unknown action")
            })
        
        return fallback_actions
    
    async def get_model_status(self) -> Dict[str, Any]:
        """Get model status and information"""
        return {
            'initialized': self.is_initialized,
            'model_path': self.model_path,
            'model_exists': os.path.exists(self.model_path),
            'action_mappings': len(self.action_mappings)
        }
    
    async def reload_model(self):
        """Reload the model"""
        try:
            logger.info("Reloading RL recovery model...")
            await self.initialize()
            logger.info("RL recovery model reloaded successfully")
        except Exception as e:
            logger.error(f"Failed to reload RL recovery model: {e}")
            raise
    
    async def train(self, training_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Train the model with new data"""
        try:
            logger.info(f"Training RL recovery model with {len(training_data)} samples...")
            
            # This would implement the actual training logic
            # For now, return a mock response
            return {
                'status': 'training_started',
                'samples': len(training_data),
                'message': 'Training functionality not implemented yet'
            }
        except Exception as e:
            logger.error(f"Failed to train RL recovery model: {e}")
            raise
    
    async def cleanup(self):
        """Cleanup resources"""
        try:
            if self.model:
                del self.model
            if hasattr(self, 'env'):
                self.env.close()
            logger.info("RL recovery service cleanup complete")
        except Exception as e:
            logger.error(f"Error during RL recovery service cleanup: {e}")

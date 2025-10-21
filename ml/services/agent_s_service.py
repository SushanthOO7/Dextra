import torch
import torch.nn as nn
from transformers import AutoTokenizer, AutoModel
from PIL import Image
import base64
import io
import numpy as np
from typing import Dict, List, Any, Optional
import json
import os
from loguru import logger

class AgentSModel(nn.Module):
    """Agent-S model for GUI action prediction"""
    
    def __init__(self, vision_model_name: str = "openai/clip-vit-base-patch32", 
                 text_model_name: str = "distilbert-base-uncased"):
        super().__init__()
        
        # Vision encoder (CLIP)
        from transformers import CLIPModel, CLIPProcessor
        self.vision_model = CLIPModel.from_pretrained(vision_model_name)
        self.vision_processor = CLIPProcessor.from_pretrained(vision_model_name)
        
        # Text encoder
        self.text_model = AutoModel.from_pretrained(text_model_name)
        self.text_tokenizer = AutoTokenizer.from_pretrained(text_model_name)
        
        # Action prediction head
        self.action_head = nn.Sequential(
            nn.Linear(768 + 768, 512),  # vision + text features
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(512, 256),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(256, 128),
            nn.ReLU(),
            nn.Linear(128, 64)  # action features
        )
        
        # Action type classifier
        self.action_type_classifier = nn.Linear(64, 5)  # click, type, wait, scroll, other
        
        # Coordinate regressor
        self.coordinate_regressor = nn.Linear(64, 4)  # x, y, width, height
        
        # Confidence predictor
        self.confidence_predictor = nn.Linear(64, 1)
        
    def forward(self, image_features, text_features):
        # Combine vision and text features
        combined_features = torch.cat([image_features, text_features], dim=-1)
        
        # Get action features
        action_features = self.action_head(combined_features)
        
        # Predict action type
        action_type_logits = self.action_type_classifier(action_features)
        
        # Predict coordinates
        coordinates = self.coordinate_regressor(action_features)
        
        # Predict confidence
        confidence = torch.sigmoid(self.confidence_predictor(action_features))
        
        return {
            'action_type_logits': action_type_logits,
            'coordinates': coordinates,
            'confidence': confidence
        }

class AgentSService:
    """Service for Agent-S GUI action prediction"""
    
    def __init__(self):
        self.model = None
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model_path = "models/agent_s_model.pth"
        self.is_initialized = False
        
    async def initialize(self):
        """Initialize the Agent-S model"""
        try:
            logger.info("Initializing Agent-S service...")
            
            # Create model
            self.model = AgentSModel()
            self.model.to(self.device)
            
            # Load pre-trained weights if available
            if os.path.exists(self.model_path):
                logger.info("Loading pre-trained Agent-S model...")
                checkpoint = torch.load(self.model_path, map_location=self.device)
                self.model.load_state_dict(checkpoint['model_state_dict'])
                logger.info("Agent-S model loaded successfully")
            else:
                logger.warning("No pre-trained model found, using random weights")
            
            self.model.eval()
            self.is_initialized = True
            logger.info("Agent-S service initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize Agent-S service: {e}")
            raise
    
    async def predict_action(self, image_base64: str, context: Dict[str, Any], 
                           task_description: Optional[str] = None) -> Dict[str, Any]:
        """Predict GUI actions based on screenshot and context"""
        try:
            if not self.is_initialized:
                await self.initialize()
            
            # Decode image
            image = self._decode_image(image_base64)
            
            # Extract features
            image_features = await self._extract_image_features(image)
            text_features = await self._extract_text_features(context, task_description)
            
            # Predict actions
            with torch.no_grad():
                predictions = self.model(image_features, text_features)
            
            # Process predictions
            actions = self._process_predictions(predictions, context)
            
            return {
                'actions': actions,
                'explanation': self._generate_explanation(actions, context),
                'confidence': float(predictions['confidence'].item())
            }
            
        except Exception as e:
            logger.error(f"Failed to predict action: {e}")
            raise
    
    def _decode_image(self, image_base64: str) -> Image.Image:
        """Decode base64 image"""
        try:
            image_data = base64.b64decode(image_base64)
            image = Image.open(io.BytesIO(image_data))
            return image.convert('RGB')
        except Exception as e:
            logger.error(f"Failed to decode image: {e}")
            raise
    
    async def _extract_image_features(self, image: Image.Image) -> torch.Tensor:
        """Extract features from image using CLIP"""
        try:
            inputs = self.model.vision_processor(images=image, return_tensors="pt")
            inputs = {k: v.to(self.device) for k, v in inputs.items()}
            
            with torch.no_grad():
                outputs = self.model.vision_model(**inputs)
                image_features = outputs.image_embeds
            
            return image_features
        except Exception as e:
            logger.error(f"Failed to extract image features: {e}")
            raise
    
    async def _extract_text_features(self, context: Dict[str, Any], 
                                   task_description: Optional[str] = None) -> torch.Tensor:
        """Extract features from text context"""
        try:
            # Combine context and task description
            text_parts = []
            
            if task_description:
                text_parts.append(f"Task: {task_description}")
            
            if 'current_page' in context:
                text_parts.append(f"Current page: {context['current_page']}")
            
            if 'target_element' in context:
                text_parts.append(f"Target element: {context['target_element']}")
            
            if 'previous_actions' in context:
                text_parts.append(f"Previous actions: {context['previous_actions']}")
            
            text = " ".join(text_parts) if text_parts else "GUI interaction"
            
            # Tokenize and encode
            inputs = self.model.text_tokenizer(
                text, 
                return_tensors="pt", 
                padding=True, 
                truncation=True, 
                max_length=512
            )
            inputs = {k: v.to(self.device) for k, v in inputs.items()}
            
            with torch.no_grad():
                outputs = self.model.text_model(**inputs)
                text_features = outputs.last_hidden_state.mean(dim=1)  # Pooled representation
            
            return text_features
        except Exception as e:
            logger.error(f"Failed to extract text features: {e}")
            raise
    
    def _process_predictions(self, predictions: Dict[str, torch.Tensor], 
                           context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Process model predictions into actionable format"""
        try:
            actions = []
            
            # Get action type
            action_type_logits = predictions['action_type_logits']
            action_type_probs = torch.softmax(action_type_logits, dim=-1)
            action_type = torch.argmax(action_type_probs, dim=-1).item()
            
            # Get coordinates
            coordinates = predictions['coordinates']
            x, y, width, height = coordinates[0].tolist()
            
            # Map action type to string
            action_types = ['click', 'type', 'wait', 'scroll', 'other']
            action_type_str = action_types[action_type]
            
            # Create action
            action = {
                'type': action_type_str,
                'coordinates': {
                    'x': int(x),
                    'y': int(y),
                    'width': int(width),
                    'height': int(height)
                },
                'confidence': float(action_type_probs[0][action_type].item()),
                'timestamp': context.get('timestamp', ''),
                'context': context
            }
            
            # Add type-specific parameters
            if action_type_str == 'click':
                action['button'] = 'left'  # Default to left click
            elif action_type_str == 'type':
                action['text'] = context.get('text_to_type', '')
            elif action_type_str == 'wait':
                action['duration'] = 1.0  # Default wait time
            elif action_type_str == 'scroll':
                action['direction'] = 'down'  # Default scroll direction
                action['amount'] = 100  # Default scroll amount
            
            actions.append(action)
            
            return actions
            
        except Exception as e:
            logger.error(f"Failed to process predictions: {e}")
            raise
    
    def _generate_explanation(self, actions: List[Dict[str, Any]], 
                            context: Dict[str, Any]) -> str:
        """Generate human-readable explanation for actions"""
        try:
            if not actions:
                return "No actions predicted"
            
            action = actions[0]
            action_type = action['type']
            coords = action['coordinates']
            
            if action_type == 'click':
                return f"Click at coordinates ({coords['x']}, {coords['y']}) with confidence {action['confidence']:.2f}"
            elif action_type == 'type':
                text = action.get('text', '')
                return f"Type '{text}' at coordinates ({coords['x']}, {coords['y']}) with confidence {action['confidence']:.2f}"
            elif action_type == 'wait':
                duration = action.get('duration', 1.0)
                return f"Wait for {duration} seconds with confidence {action['confidence']:.2f}"
            elif action_type == 'scroll':
                direction = action.get('direction', 'down')
                amount = action.get('amount', 100)
                return f"Scroll {direction} by {amount} pixels with confidence {action['confidence']:.2f}"
            else:
                return f"Perform {action_type} action with confidence {action['confidence']:.2f}"
                
        except Exception as e:
            logger.error(f"Failed to generate explanation: {e}")
            return "Unable to generate explanation"
    
    async def get_model_status(self) -> Dict[str, Any]:
        """Get model status and information"""
        return {
            'initialized': self.is_initialized,
            'device': str(self.device),
            'model_path': self.model_path,
            'model_exists': os.path.exists(self.model_path)
        }
    
    async def reload_model(self):
        """Reload the model"""
        try:
            logger.info("Reloading Agent-S model...")
            await self.initialize()
            logger.info("Agent-S model reloaded successfully")
        except Exception as e:
            logger.error(f"Failed to reload Agent-S model: {e}")
            raise
    
    async def train(self, training_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Train the model with new data"""
        try:
            logger.info(f"Training Agent-S model with {len(training_data)} samples...")
            
            # This would implement the actual training logic
            # For now, return a mock response
            return {
                'status': 'training_started',
                'samples': len(training_data),
                'message': 'Training functionality not implemented yet'
            }
        except Exception as e:
            logger.error(f"Failed to train Agent-S model: {e}")
            raise
    
    async def cleanup(self):
        """Cleanup resources"""
        try:
            if self.model:
                del self.model
            torch.cuda.empty_cache() if torch.cuda.is_available() else None
            logger.info("Agent-S service cleanup complete")
        except Exception as e:
            logger.error(f"Error during Agent-S service cleanup: {e}")

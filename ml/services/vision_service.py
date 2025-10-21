import torch
import torch.nn as nn
from transformers import CLIPModel, CLIPProcessor
from PIL import Image
import base64
import io
import numpy as np
import cv2
from typing import Dict, List, Any, Optional
import json
import os
from loguru import logger
import easyocr

class VisionService:
    """Service for computer vision analysis"""
    
    def __init__(self):
        self.clip_model = None
        self.clip_processor = None
        self.ocr_reader = None
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.is_initialized = False
        
        # UI element classes
        self.ui_element_classes = [
            'button', 'input', 'link', 'image', 'text', 'dropdown', 
            'checkbox', 'radio', 'table', 'form', 'navigation', 'modal'
        ]
        
        # Error types
        self.error_types = [
            'build_error', 'network_error', 'auth_error', 'timeout_error',
            'memory_error', 'dependency_error', 'config_error', 'deployment_error'
        ]
    
    async def initialize(self):
        """Initialize the vision service"""
        try:
            logger.info("Initializing vision service...")
            
            # Initialize CLIP model for image understanding
            self.clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
            self.clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
            self.clip_model.to(self.device)
            
            # Initialize OCR reader
            self.ocr_reader = easyocr.Reader(['en'])
            
            self.is_initialized = True
            logger.info("Vision service initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize vision service: {e}")
            raise
    
    async def analyze(self, image_base64: str, analysis_type: str) -> Dict[str, Any]:
        """Analyze image for various features"""
        try:
            if not self.is_initialized:
                await self.initialize()
            
            # Decode image
            image = self._decode_image(image_base64)
            
            # Perform analysis based on type
            if analysis_type == "screenshot":
                return await self._analyze_screenshot(image)
            elif analysis_type == "error":
                return await self._analyze_error(image)
            elif analysis_type == "ui_element":
                return await self._analyze_ui_elements(image)
            else:
                return await self._analyze_general(image)
                
        except Exception as e:
            logger.error(f"Failed to analyze image: {e}")
            raise
    
    async def detect_ui_elements(self, image_base64: str) -> Dict[str, Any]:
        """Detect and classify UI elements in image"""
        try:
            if not self.is_initialized:
                await self.initialize()
            
            # Decode image
            image = self._decode_image(image_base64)
            
            # Convert to OpenCV format
            cv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            
            # Detect UI elements
            elements = await self._detect_ui_elements_cv(cv_image)
            
            # Classify elements
            classified_elements = []
            for element in elements:
                classification = await self._classify_ui_element(image, element)
                classified_elements.append({
                    'type': classification,
                    'bbox': element['bbox'],
                    'confidence': element['confidence']
                })
            
            return {
                'elements': classified_elements,
                'total_elements': len(classified_elements),
                'analysis': self._analyze_ui_layout(classified_elements)
            }
            
        except Exception as e:
            logger.error(f"Failed to detect UI elements: {e}")
            raise
    
    async def extract_text(self, image_base64: str) -> Dict[str, Any]:
        """Extract text from image using OCR"""
        try:
            if not self.is_initialized:
                await self.initialize()
            
            # Decode image
            image = self._decode_image(image_base64)
            
            # Convert to OpenCV format
            cv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            
            # Extract text using OCR
            results = self.ocr_reader.readtext(cv_image)
            
            # Process results
            text_blocks = []
            full_text = ""
            
            for (bbox, text, confidence) in results:
                if confidence > 0.5:  # Filter low confidence results
                    text_blocks.append({
                        'text': text,
                        'bbox': bbox,
                        'confidence': confidence
                    })
                    full_text += text + " "
            
            return {
                'text_blocks': text_blocks,
                'full_text': full_text.strip(),
                'total_blocks': len(text_blocks),
                'average_confidence': np.mean([b['confidence'] for b in text_blocks]) if text_blocks else 0
            }
            
        except Exception as e:
            logger.error(f"Failed to extract text: {e}")
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
    
    async def _analyze_screenshot(self, image: Image.Image) -> Dict[str, Any]:
        """Analyze screenshot for general features"""
        try:
            # Get image features using CLIP
            inputs = self.clip_processor(images=image, return_tensors="pt")
            inputs = {k: v.to(self.device) for k, v in inputs.items()}
            
            with torch.no_grad():
                image_features = self.clip_model.get_image_features(**inputs)
                image_features = image_features / image_features.norm(dim=-1, keepdim=True)
            
            # Analyze image properties
            width, height = image.size
            aspect_ratio = width / height
            
            # Detect if it's a web page, mobile app, or desktop app
            app_type = await self._classify_app_type(image, image_features)
            
            # Detect color scheme
            color_scheme = await self._detect_color_scheme(image)
            
            # Detect layout type
            layout_type = await self._detect_layout_type(image)
            
            return {
                'app_type': app_type,
                'color_scheme': color_scheme,
                'layout_type': layout_type,
                'dimensions': {'width': width, 'height': height},
                'aspect_ratio': aspect_ratio,
                'confidence': 0.8
            }
            
        except Exception as e:
            logger.error(f"Failed to analyze screenshot: {e}")
            raise
    
    async def _analyze_error(self, image: Image.Image) -> Dict[str, Any]:
        """Analyze image for error indicators"""
        try:
            # Extract text to look for error messages
            text_result = await self.extract_text(self._encode_image(image))
            error_text = text_result['full_text'].lower()
            
            # Detect error type based on text content
            error_type = self._classify_error_type(error_text)
            
            # Detect error severity
            severity = self._classify_error_severity(error_text)
            
            # Detect error location
            location = self._detect_error_location(image, text_result['text_blocks'])
            
            return {
                'error_type': error_type,
                'severity': severity,
                'location': location,
                'error_text': error_text,
                'confidence': 0.7
            }
            
        except Exception as e:
            logger.error(f"Failed to analyze error: {e}")
            raise
    
    async def _analyze_ui_elements(self, image: Image.Image) -> Dict[str, Any]:
        """Analyze UI elements in image"""
        try:
            # Detect UI elements
            elements_result = await self.detect_ui_elements(self._encode_image(image))
            
            # Analyze element distribution
            element_types = [e['type'] for e in elements_result['elements']]
            type_counts = {t: element_types.count(t) for t in set(element_types)}
            
            # Detect form elements
            form_elements = [e for e in elements_result['elements'] if e['type'] in ['input', 'button', 'dropdown']]
            
            # Detect navigation elements
            nav_elements = [e for e in elements_result['elements'] if e['type'] in ['link', 'button']]
            
            return {
                'total_elements': elements_result['total_elements'],
                'element_types': type_counts,
                'form_elements': len(form_elements),
                'navigation_elements': len(nav_elements),
                'layout_analysis': elements_result['analysis']
            }
            
        except Exception as e:
            logger.error(f"Failed to analyze UI elements: {e}")
            raise
    
    async def _analyze_general(self, image: Image.Image) -> Dict[str, Any]:
        """General image analysis"""
        try:
            # Basic image properties
            width, height = image.size
            aspect_ratio = width / height
            
            # Color analysis
            colors = image.getcolors(maxcolors=256*256*256)
            dominant_colors = sorted(colors, key=lambda x: x[0], reverse=True)[:5]
            
            # Brightness analysis
            brightness = await self._calculate_brightness(image)
            
            # Contrast analysis
            contrast = await self._calculate_contrast(image)
            
            return {
                'dimensions': {'width': width, 'height': height},
                'aspect_ratio': aspect_ratio,
                'dominant_colors': dominant_colors,
                'brightness': brightness,
                'contrast': contrast
            }
            
        except Exception as e:
            logger.error(f"Failed to analyze general image: {e}")
            raise
    
    async def _detect_ui_elements_cv(self, cv_image: np.ndarray) -> List[Dict[str, Any]]:
        """Detect UI elements using OpenCV"""
        try:
            elements = []
            
            # Convert to grayscale
            gray = cv2.cvtColor(cv_image, cv2.COLOR_BGR2GRAY)
            
            # Detect buttons (rectangular shapes)
            edges = cv2.Canny(gray, 50, 150)
            contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            for contour in contours:
                area = cv2.contourArea(contour)
                if area > 100:  # Filter small contours
                    x, y, w, h = cv2.boundingRect(contour)
                    aspect_ratio = w / h
                    
                    # Classify based on aspect ratio and size
                    if 0.5 < aspect_ratio < 3.0 and w > 20 and h > 10:
                        elements.append({
                            'bbox': [x, y, x + w, y + h],
                            'confidence': 0.7,
                            'type': 'button' if aspect_ratio > 1.5 else 'input'
                        })
            
            return elements
            
        except Exception as e:
            logger.error(f"Failed to detect UI elements: {e}")
            return []
    
    async def _classify_ui_element(self, image: Image.Image, element: Dict[str, Any]) -> str:
        """Classify UI element type"""
        try:
            # Extract element region
            bbox = element['bbox']
            x1, y1, x2, y2 = bbox
            element_image = image.crop((x1, y1, x2, y2))
            
            # Use CLIP to classify element
            inputs = self.clip_processor(images=element_image, return_tensors="pt")
            inputs = {k: v.to(self.device) for k, v in inputs.items()}
            
            with torch.no_grad():
                image_features = self.clip_model.get_image_features(**inputs)
                image_features = image_features / image_features.norm(dim=-1, keepdim=True)
            
            # Simple classification based on features
            # This would be more sophisticated in practice
            if element['type'] == 'button':
                return 'button'
            elif element['type'] == 'input':
                return 'input'
            else:
                return 'unknown'
                
        except Exception as e:
            logger.error(f"Failed to classify UI element: {e}")
            return 'unknown'
    
    def _analyze_ui_layout(self, elements: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze UI layout"""
        try:
            if not elements:
                return {'layout_type': 'empty', 'complexity': 'low'}
            
            # Calculate layout metrics
            total_elements = len(elements)
            element_types = [e['type'] for e in elements]
            unique_types = len(set(element_types))
            
            # Determine layout complexity
            if total_elements < 5:
                complexity = 'low'
            elif total_elements < 15:
                complexity = 'medium'
            else:
                complexity = 'high'
            
            # Determine layout type
            if 'form' in element_types or 'input' in element_types:
                layout_type = 'form'
            elif 'navigation' in element_types or 'link' in element_types:
                layout_type = 'navigation'
            elif 'table' in element_types:
                layout_type = 'data'
            else:
                layout_type = 'general'
            
            return {
                'layout_type': layout_type,
                'complexity': complexity,
                'total_elements': total_elements,
                'unique_types': unique_types
            }
            
        except Exception as e:
            logger.error(f"Failed to analyze UI layout: {e}")
            return {'layout_type': 'unknown', 'complexity': 'unknown'}
    
    def _classify_error_type(self, error_text: str) -> str:
        """Classify error type based on text content"""
        error_indicators = {
            'build_error': ['build', 'compile', 'syntax', 'module not found'],
            'network_error': ['connection', 'timeout', 'network', 'unreachable'],
            'auth_error': ['unauthorized', 'authentication', 'token', 'login'],
            'timeout_error': ['timeout', 'timed out', 'expired'],
            'memory_error': ['memory', 'out of memory', 'heap'],
            'dependency_error': ['dependency', 'package', 'npm', 'pip'],
            'config_error': ['configuration', 'config', 'settings'],
            'deployment_error': ['deploy', 'deployment', 'publish']
        }
        
        for error_type, indicators in error_indicators.items():
            if any(indicator in error_text for indicator in indicators):
                return error_type
        
        return 'unknown'
    
    def _classify_error_severity(self, error_text: str) -> str:
        """Classify error severity"""
        if any(word in error_text for word in ['critical', 'fatal', 'error', 'failed']):
            return 'high'
        elif any(word in error_text for word in ['warning', 'caution', 'notice']):
            return 'medium'
        else:
            return 'low'
    
    def _detect_error_location(self, image: Image.Image, text_blocks: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Detect error location in image"""
        try:
            if not text_blocks:
                return {'x': 0, 'y': 0, 'width': 0, 'height': 0}
            
            # Find error text blocks
            error_blocks = [block for block in text_blocks if 'error' in block['text'].lower()]
            
            if error_blocks:
                # Calculate bounding box for error blocks
                all_bboxes = [block['bbox'] for block in error_blocks]
                x_coords = [point[0] for bbox in all_bboxes for point in bbox]
                y_coords = [point[1] for bbox in all_bboxes for point in bbox]
                
                return {
                    'x': min(x_coords),
                    'y': min(y_coords),
                    'width': max(x_coords) - min(x_coords),
                    'height': max(y_coords) - min(y_coords)
                }
            else:
                return {'x': 0, 'y': 0, 'width': 0, 'height': 0}
                
        except Exception as e:
            logger.error(f"Failed to detect error location: {e}")
            return {'x': 0, 'y': 0, 'width': 0, 'height': 0}
    
    async def _classify_app_type(self, image: Image.Image, features: torch.Tensor) -> str:
        """Classify application type"""
        # This would use CLIP to classify app type
        # For now, return a simple classification
        width, height = image.size
        
        if width > height * 1.5:  # Wide aspect ratio
            return 'desktop'
        elif height > width * 1.5:  # Tall aspect ratio
            return 'mobile'
        else:
            return 'web'
    
    async def _detect_color_scheme(self, image: Image.Image) -> str:
        """Detect color scheme (light/dark)"""
        # Convert to grayscale and calculate average brightness
        gray = image.convert('L')
        brightness = sum(gray.getdata()) / (gray.size[0] * gray.size[1])
        
        return 'dark' if brightness < 128 else 'light'
    
    async def _detect_layout_type(self, image: Image.Image) -> str:
        """Detect layout type"""
        # Simple layout detection based on image dimensions
        width, height = image.size
        
        if width > height * 2:
            return 'wide'
        elif height > width * 2:
            return 'tall'
        else:
            return 'square'
    
    async def _calculate_brightness(self, image: Image.Image) -> float:
        """Calculate image brightness"""
        gray = image.convert('L')
        return sum(gray.getdata()) / (gray.size[0] * gray.size[1])
    
    async def _calculate_contrast(self, image: Image.Image) -> float:
        """Calculate image contrast"""
        gray = image.convert('L')
        pixels = list(gray.getdata())
        return max(pixels) - min(pixels)
    
    def _encode_image(self, image: Image.Image) -> str:
        """Encode image to base64"""
        buffer = io.BytesIO()
        image.save(buffer, format='PNG')
        return base64.b64encode(buffer.getvalue()).decode()
    
    async def get_model_status(self) -> Dict[str, Any]:
        """Get model status and information"""
        return {
            'initialized': self.is_initialized,
            'device': str(self.device),
            'clip_model': self.clip_model is not None,
            'ocr_reader': self.ocr_reader is not None
        }
    
    async def reload_model(self):
        """Reload the model"""
        try:
            logger.info("Reloading vision service...")
            await self.initialize()
            logger.info("Vision service reloaded successfully")
        except Exception as e:
            logger.error(f"Failed to reload vision service: {e}")
            raise
    
    async def cleanup(self):
        """Cleanup resources"""
        try:
            if self.clip_model:
                del self.clip_model
            if self.ocr_reader:
                del self.ocr_reader
            torch.cuda.empty_cache() if torch.cuda.is_available() else None
            logger.info("Vision service cleanup complete")
        except Exception as e:
            logger.error(f"Error during vision service cleanup: {e}")

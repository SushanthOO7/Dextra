"""
Test error detection system for Vercel deployment failures
This file tests the ability to detect and classify errors from screenshots and logs
"""

import cv2
import numpy as np
from PIL import Image
import re
import json
import logging
from typing import Dict, List, Tuple, Optional
from config import TEST_CONFIG

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ErrorDetectorTester:
    def __init__(self):
        self.error_patterns = self._load_error_patterns()
        self.visual_error_indicators = self._load_visual_indicators()
        
    def _load_error_patterns(self) -> Dict[str, Dict]:
        """Load error patterns for different error types"""
        return {
            "auth_error": {
                "patterns": [
                    r"authentication failed",
                    r"invalid token",
                    r"unauthorized",
                    r"login required",
                    r"session expired"
                ],
                "severity": "high",
                "recovery_action": "re_auth"
            },
            "build_error": {
                "patterns": [
                    r"build failed",
                    r"compilation error",
                    r"module not found",
                    r"dependency error",
                    r"npm err",
                    r"yarn err"
                ],
                "severity": "high", 
                "recovery_action": "fix_dependencies"
            },
            "deployment_error": {
                "patterns": [
                    r"deployment failed",
                    r"deploy error",
                    r"failed to deploy",
                    r"timeout",
                    r"connection error"
                ],
                "severity": "high",
                "recovery_action": "retry_deploy"
            },
            "config_error": {
                "patterns": [
                    r"configuration error",
                    r"invalid config",
                    r"missing environment variable",
                    r"env var not found"
                ],
                "severity": "medium",
                "recovery_action": "fix_config"
            },
            "timeout_error": {
                "patterns": [
                    r"timeout",
                    r"request timeout",
                    r"operation timed out",
                    r"connection timeout"
                ],
                "severity": "medium",
                "recovery_action": "retry_with_timeout"
            }
        }
    
    def _load_visual_indicators(self) -> Dict[str, List]:
        """Load visual indicators for error detection"""
        return {
            "error_colors": [
                (255, 0, 0),    # Red
                (220, 20, 60), # Crimson
                (255, 69, 0),  # Red-orange
            ],
            "error_text_keywords": [
                "error", "failed", "timeout", "unauthorized", 
                "invalid", "missing", "not found", "denied"
            ],
            "warning_colors": [
                (255, 165, 0), # Orange
                (255, 140, 0), # Dark orange
                (255, 215, 0), # Gold
            ]
        }
    
    def detect_error_from_logs(self, logs: str) -> Optional[Dict]:
        """
        Detect error from text logs
        
        Args:
            logs: Raw log text
            
        Returns:
            Dictionary with error_type, message, severity, confidence
        """
        try:
            logs_lower = logs.lower()
            
            for error_type, error_info in self.error_patterns.items():
                for pattern in error_info["patterns"]:
                    match = re.search(pattern, logs_lower)
                    if match:
                        error_message = match.group(0)
                        confidence = min(1.0, len(match.group(0)) / 20.0)  # Simple confidence based on match length
                        
                        logger.info(f"Detected {error_type}: {error_message}")
                        
                        return {
                            "error_type": error_type,
                            "message": error_message,
                            "severity": error_info["severity"],
                            "confidence": confidence,
                            "recovery_action": error_info["recovery_action"],
                            "raw_logs": logs
                        }
            
            # No specific pattern matched
            if any(keyword in logs_lower for keyword in ["error", "failed", "timeout"]):
                return {
                    "error_type": "unknown_error",
                    "message": logs.split('\n')[0][:100],  # First line, truncated
                    "severity": "low",
                    "confidence": 0.3,
                    "recovery_action": "retry",
                    "raw_logs": logs
                }
            
            return None
            
        except Exception as e:
            logger.error(f"Error detection failed: {e}")
            return None
    
    def detect_error_from_screenshot(self, image_path: str) -> Optional[Dict]:
        """
        Detect error from screenshot using visual analysis
        
        Args:
            image_path: Path to screenshot
            
        Returns:
            Dictionary with error_type, confidence, visual_indicators
        """
        try:
            # Load image
            image = cv2.imread(image_path)
            if image is None:
                logger.warning(f"Could not load image: {image_path}")
                return None
            
            # Convert to RGB
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            # Detect error colors
            error_regions = self._detect_error_colors(image_rgb)
            
            # Detect error text (simplified OCR simulation)
            error_text = self._detect_error_text(image_rgb)
            
            # Calculate confidence based on visual indicators
            confidence = 0.0
            error_type = "unknown"
            
            if error_regions > 0:
                confidence += 0.4
                error_type = "visual_error"
            
            if error_text:
                confidence += 0.6
                error_type = "text_error"
            
            if confidence > 0.5:
                logger.info(f"Visual error detected: {error_type} (confidence: {confidence:.2f})")
                return {
                    "error_type": error_type,
                    "confidence": confidence,
                    "visual_indicators": {
                        "error_regions": error_regions,
                        "error_text": error_text
                    },
                    "image_path": image_path
                }
            
            return None
            
        except Exception as e:
            logger.error(f"Visual error detection failed: {e}")
            return None
    
    def _detect_error_colors(self, image: np.ndarray) -> int:
        """Detect regions with error colors"""
        try:
            error_regions = 0
            
            for color in self.visual_error_indicators["error_colors"]:
                # Create mask for this color (with tolerance)
                lower = np.array([max(0, c-30) for c in color])
                upper = np.array([min(255, c+30) for c in color])
                
                mask = cv2.inRange(image, lower, upper)
                contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                
                # Count significant regions
                for contour in contours:
                    area = cv2.contourArea(contour)
                    if area > 100:  # Minimum area threshold
                        error_regions += 1
            
            return error_regions
            
        except Exception as e:
            logger.error(f"Color detection failed: {e}")
            return 0
    
    def _detect_error_text(self, image: np.ndarray) -> List[str]:
        """Detect error text in image (simplified simulation)"""
        try:
            # This is a placeholder - in reality you'd use OCR like Tesseract
            # For testing, we'll simulate based on image characteristics
            
            # Convert to grayscale
            gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
            
            # Detect text regions (simplified)
            edges = cv2.Canny(gray, 50, 150)
            contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            text_regions = 0
            for contour in contours:
                area = cv2.contourArea(contour)
                if 100 < area < 10000:  # Text-like area
                    text_regions += 1
            
            # Simulate error text detection
            detected_text = []
            if text_regions > 5:  # Many text regions might indicate error messages
                detected_text = ["error", "failed"]  # Simulated detection
            
            return detected_text
            
        except Exception as e:
            logger.error(f"Text detection failed: {e}")
            return []
    
    def classify_error(self, error_detection: Dict) -> Dict:
        """
        Classify error and suggest recovery action
        
        Args:
            error_detection: Result from detect_error_from_logs or detect_error_from_screenshot
            
        Returns:
            Enhanced error classification with recovery suggestions
        """
        try:
            error_type = error_detection.get("error_type", "unknown")
            confidence = error_detection.get("confidence", 0.0)
            
            # Get recovery action from patterns
            recovery_action = self.error_patterns.get(error_type, {}).get("recovery_action", "retry")
            
            # Enhance with additional context
            classification = {
                "error_type": error_type,
                "confidence": confidence,
                "severity": self.error_patterns.get(error_type, {}).get("severity", "low"),
                "recovery_action": recovery_action,
                "suggested_steps": self._get_recovery_steps(recovery_action),
                "timestamp": error_detection.get("timestamp", "unknown"),
                "context": error_detection
            }
            
            logger.info(f"Error classified: {error_type} -> {recovery_action}")
            return classification
            
        except Exception as e:
            logger.error(f"Error classification failed: {e}")
            return {
                "error_type": "classification_error",
                "confidence": 0.0,
                "severity": "low",
                "recovery_action": "manual_intervention",
                "suggested_steps": ["Check logs manually", "Contact support"],
                "error": str(e)
            }
    
    def _get_recovery_steps(self, recovery_action: str) -> List[str]:
        """Get suggested recovery steps for each action type"""
        recovery_steps = {
            "re_auth": [
                "Refresh authentication token",
                "Re-login to platform",
                "Check token permissions"
            ],
            "fix_dependencies": [
                "Check package.json for missing dependencies",
                "Run npm install or yarn install",
                "Clear node_modules and reinstall"
            ],
            "retry_deploy": [
                "Wait 30 seconds and retry",
                "Check platform status",
                "Verify project configuration"
            ],
            "fix_config": [
                "Check environment variables",
                "Verify build settings",
                "Update configuration files"
            ],
            "retry_with_timeout": [
                "Increase timeout settings",
                "Check network connection",
                "Retry with exponential backoff"
            ],
            "retry": [
                "Simple retry",
                "Check for temporary issues"
            ],
            "manual_intervention": [
                "Review error logs",
                "Contact platform support",
                "Check platform status page"
            ]
        }
        
        return recovery_steps.get(recovery_action, ["Unknown recovery action"])

def test_error_detection_logs():
    """Test error detection from log text"""
    logger.info("=== Testing Error Detection from Logs ===")
    
    tester = ErrorDetectorTester()
    
    # Test cases with different error types
    test_cases = [
        {
            "name": "Authentication Error",
            "logs": "Error: Authentication failed. Invalid token provided.",
            "expected_type": "auth_error"
        },
        {
            "name": "Build Error", 
            "logs": "npm ERR! Module not found: Can't resolve 'react'",
            "expected_type": "build_error"
        },
        {
            "name": "Deployment Error",
            "logs": "Deployment failed: Connection timeout after 30 seconds",
            "expected_type": "deployment_error"
        },
        {
            "name": "Config Error",
            "logs": "Missing environment variable: API_KEY is required",
            "expected_type": "config_error"
        },
        {
            "name": "Timeout Error",
            "logs": "Request timeout: Operation timed out after 60 seconds",
            "expected_type": "timeout_error"
        }
    ]
    
    successful_detections = 0
    
    for test_case in test_cases:
        logger.info(f"Testing: {test_case['name']}")
        
        detection = tester.detect_error_from_logs(test_case["logs"])
        
        if detection and detection["error_type"] == test_case["expected_type"]:
            successful_detections += 1
            logger.info(f"✓ Correctly detected {test_case['expected_type']}")
        else:
            logger.warning(f"✗ Failed to detect {test_case['expected_type']}")
            if detection:
                logger.warning(f"  Detected: {detection['error_type']}")
    
    success_rate = successful_detections / len(test_cases)
    logger.info(f"Log detection test: {successful_detections}/{len(test_cases)} successful ({success_rate:.2%})")
    
    return success_rate > 0.8

def test_error_detection_screenshots():
    """Test error detection from screenshots"""
    logger.info("=== Testing Error Detection from Screenshots ===")
    
    tester = ErrorDetectorTester()
    
    # Test cases with screenshot paths
    test_cases = [
        {
            "name": "Vercel Login Error",
            "image_path": "./test_data/screenshots/vercel_auth_error.png",
            "expected_type": "visual_error"
        },
        {
            "name": "Vercel Build Error",
            "image_path": "./test_data/screenshots/vercel_build_error.png", 
            "expected_type": "text_error"
        },
        {
            "name": "Vercel Deployment Error",
            "image_path": "./test_data/screenshots/vercel_deploy_error.png",
            "expected_type": "visual_error"
        }
    ]
    
    successful_detections = 0
    
    for test_case in test_cases:
        logger.info(f"Testing: {test_case['name']}")
        
        detection = tester.detect_error_from_screenshot(test_case["image_path"])
        
        if detection and detection["confidence"] > 0.5:
            successful_detections += 1
            logger.info(f"✓ Detected error with confidence {detection['confidence']:.2f}")
        else:
            logger.warning(f"✗ Failed to detect error in {test_case['name']}")
    
    success_rate = successful_detections / len(test_cases)
    logger.info(f"Screenshot detection test: {successful_detections}/{len(test_cases)} successful ({success_rate:.2%})")
    
    return success_rate > 0.6  # Lower threshold for visual detection

def test_error_classification():
    """Test error classification and recovery suggestions"""
    logger.info("=== Testing Error Classification ===")
    
    tester = ErrorDetectorTester()
    
    # Test classification with different error detections
    test_detections = [
        {
            "error_type": "auth_error",
            "confidence": 0.85,
            "message": "Authentication failed"
        },
        {
            "error_type": "build_error", 
            "confidence": 0.92,
            "message": "Module not found"
        },
        {
            "error_type": "unknown_error",
            "confidence": 0.3,
            "message": "Something went wrong"
        }
    ]
    
    successful_classifications = 0
    
    for detection in test_detections:
        logger.info(f"Classifying: {detection['error_type']}")
        
        classification = tester.classify_error(detection)
        
        if classification["recovery_action"] and classification["suggested_steps"]:
            successful_classifications += 1
            logger.info(f"✓ Classification successful: {classification['recovery_action']}")
            logger.info(f"  Suggested steps: {classification['suggested_steps']}")
        else:
            logger.warning(f"✗ Classification failed for {detection['error_type']}")
    
    success_rate = successful_classifications / len(test_detections)
    logger.info(f"Classification test: {successful_classifications}/{len(test_detections)} successful ({success_rate:.2%})")
    
    return success_rate > 0.8

if __name__ == "__main__":
    # Run error detection tests
    logs_test_passed = test_error_detection_logs()
    screenshots_test_passed = test_error_detection_screenshots()
    classification_test_passed = test_error_classification()
    
    logger.info(f"\n=== Error Detection Test Results ===")
    logger.info(f"Log detection: {'PASS' if logs_test_passed else 'FAIL'}")
    logger.info(f"Screenshot detection: {'PASS' if screenshots_test_passed else 'FAIL'}")
    logger.info(f"Classification: {'PASS' if classification_test_passed else 'FAIL'}")
    
    if logs_test_passed and screenshots_test_passed and classification_test_passed:
        logger.info("🎉 All error detection tests passed!")
    else:
        logger.error("❌ Some error detection tests failed. Check logs for details.")

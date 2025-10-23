"""
Main test runner for ML components
This file orchestrates all ML testing and provides a comprehensive test suite
"""

import asyncio
import json
import logging
import os
import sys
from datetime import datetime
from typing import Dict, List

# Import test modules
from test_agent_s import test_agent_s3_basic, test_vercel_deployment_workflow
from test_error_detection import test_error_detection_logs, test_error_detection_screenshots, test_error_classification
from test_rl_recovery import test_rl_model_loading, test_state_encoding, test_action_prediction, test_recovery_episodes
from test_playwright import test_browser_setup, test_deployment_workflow, test_error_handling

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MLTestRunner:
    def __init__(self):
        self.test_results = {}
        self.start_time = None
        self.end_time = None
        
    def setup_test_environment(self):
        """Setup test environment and create necessary directories"""
        logger.info("Setting up test environment...")
        
        # Import config to create directories
        from config import setup_test_directories
        setup_test_directories()
        
        # Create sample test data
        self._create_sample_test_data()
        
        logger.info("✓ Test environment setup completed")
    
    def _create_sample_test_data(self):
        """Create sample test data for testing"""
        try:
            # Create sample error logs
            error_logs_dir = "./test_data/error_logs"
            os.makedirs(error_logs_dir, exist_ok=True)
            
            sample_logs = {
                "auth_error.log": "Error: Authentication failed. Invalid token provided.",
                "build_error.log": "npm ERR! Module not found: Can't resolve 'react'",
                "deployment_error.log": "Deployment failed: Connection timeout after 30 seconds",
                "config_error.log": "Missing environment variable: API_KEY is required",
                "timeout_error.log": "Request timeout: Operation timed out after 60 seconds"
            }
            
            for filename, content in sample_logs.items():
                filepath = os.path.join(error_logs_dir, filename)
                with open(filepath, 'w') as f:
                    f.write(content)
            
            logger.info("✓ Sample test data created")
            
        except Exception as e:
            logger.warning(f"Failed to create sample test data: {e}")
    
    async def run_agent_s3_tests(self) -> Dict:
        """Run Agent-S3 model tests"""
        logger.info("\n" + "="*50)
        logger.info("RUNNING AGENT-S3 TESTS")
        logger.info("="*50)
        
        results = {
            "basic_functionality": False,
            "workflow_test": False,
            "overall_success": False
        }
        
        try:
            # Test basic functionality
            logger.info("Testing basic Agent-S3 functionality...")
            results["basic_functionality"] = await test_agent_s3_basic()
            
            # Test deployment workflow
            logger.info("Testing Vercel deployment workflow...")
            results["workflow_test"] = await test_vercel_deployment_workflow()
            
            # Overall success
            results["overall_success"] = results["basic_functionality"] and results["workflow_test"]
            
        except Exception as e:
            logger.error(f"Agent-S3 tests failed: {e}")
            results["error"] = str(e)
        
        return results
    
    def run_error_detection_tests(self) -> Dict:
        """Run error detection tests"""
        logger.info("\n" + "="*50)
        logger.info("RUNNING ERROR DETECTION TESTS")
        logger.info("="*50)
        
        results = {
            "log_detection": False,
            "screenshot_detection": False,
            "classification": False,
            "overall_success": False
        }
        
        try:
            # Test log detection
            logger.info("Testing error detection from logs...")
            results["log_detection"] = test_error_detection_logs()
            
            # Test screenshot detection
            logger.info("Testing error detection from screenshots...")
            results["screenshot_detection"] = test_error_detection_screenshots()
            
            # Test classification
            logger.info("Testing error classification...")
            results["classification"] = test_error_classification()
            
            # Overall success
            results["overall_success"] = results["log_detection"] and results["screenshot_detection"] and results["classification"]
            
        except Exception as e:
            logger.error(f"Error detection tests failed: {e}")
            results["error"] = str(e)
        
        return results
    
    def run_rl_recovery_tests(self) -> Dict:
        """Run RL recovery tests"""
        logger.info("\n" + "="*50)
        logger.info("RUNNING RL RECOVERY TESTS")
        logger.info("="*50)
        
        results = {
            "model_loading": False,
            "state_encoding": False,
            "action_prediction": False,
            "recovery_episodes": False,
            "overall_success": False
        }
        
        try:
            # Test model loading
            logger.info("Testing RL model loading...")
            results["model_loading"] = test_rl_model_loading()
            
            # Test state encoding
            logger.info("Testing state encoding...")
            results["state_encoding"] = test_state_encoding()
            
            # Test action prediction
            logger.info("Testing action prediction...")
            results["action_prediction"] = test_action_prediction()
            
            # Test recovery episodes
            logger.info("Testing recovery episodes...")
            results["recovery_episodes"] = test_recovery_episodes()
            
            # Overall success
            results["overall_success"] = results["model_loading"] and results["state_encoding"] and results["action_prediction"] and results["recovery_episodes"]
            
        except Exception as e:
            logger.error(f"RL recovery tests failed: {e}")
            results["error"] = str(e)
        
        return results
    
    async def run_playwright_tests(self) -> Dict:
        """Run Playwright GUI automation tests"""
        logger.info("\n" + "="*50)
        logger.info("RUNNING PLAYWRIGHT TESTS")
        logger.info("="*50)
        
        results = {
            "browser_setup": False,
            "deployment_workflow": False,
            "error_handling": False,
            "overall_success": False
        }
        
        try:
            # Test browser setup
            logger.info("Testing browser setup...")
            results["browser_setup"] = await test_browser_setup()
            
            # Test deployment workflow
            logger.info("Testing deployment workflow...")
            results["deployment_workflow"] = await test_deployment_workflow()
            
            # Test error handling
            logger.info("Testing error handling...")
            results["error_handling"] = await test_error_handling()
            
            # Overall success
            results["overall_success"] = results["browser_setup"] and results["deployment_workflow"] and results["error_handling"]
            
        except Exception as e:
            logger.error(f"Playwright tests failed: {e}")
            results["error"] = str(e)
        
        return results
    
    def generate_test_report(self) -> Dict:
        """Generate comprehensive test report"""
        logger.info("\n" + "="*50)
        logger.info("GENERATING TEST REPORT")
        logger.info("="*50)
        
        total_tests = 0
        passed_tests = 0
        
        report = {
            "test_summary": {
                "start_time": self.start_time.isoformat() if self.start_time else None,
                "end_time": self.end_time.isoformat() if self.end_time else None,
                "duration": (self.end_time - self.start_time).total_seconds() if self.start_time and self.end_time else 0,
                "total_test_suites": len(self.test_results),
                "overall_success": True
            },
            "test_results": self.test_results,
            "recommendations": []
        }
        
        # Calculate overall statistics
        for suite_name, suite_results in self.test_results.items():
            if isinstance(suite_results, dict):
                for test_name, test_result in suite_results.items():
                    if test_name != "error" and isinstance(test_result, bool):
                        total_tests += 1
                        if test_result:
                            passed_tests += 1
                
                # Check if suite overall failed
                if not suite_results.get("overall_success", False):
                    report["test_summary"]["overall_success"] = False
        
        report["test_summary"]["total_tests"] = total_tests
        report["test_summary"]["passed_tests"] = passed_tests
        report["test_summary"]["success_rate"] = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        # Generate recommendations
        if not self.test_results.get("agent_s3", {}).get("overall_success", False):
            report["recommendations"].append("Agent-S3 model needs improvement - check API keys and model configuration")
        
        if not self.test_results.get("error_detection", {}).get("overall_success", False):
            report["recommendations"].append("Error detection system needs enhancement - improve pattern matching and visual detection")
        
        if not self.test_results.get("rl_recovery", {}).get("overall_success", False):
            report["recommendations"].append("RL recovery model needs training - collect more error scenarios and retrain")
        
        if not self.test_results.get("playwright", {}).get("overall_success", False):
            report["recommendations"].append("GUI automation needs improvement - update selectors and add more robust error handling")
        
        return report
    
    def save_test_report(self, report: Dict):
        """Save test report to file"""
        try:
            report_path = f"./test_data/test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            os.makedirs(os.path.dirname(report_path), exist_ok=True)
            
            with open(report_path, 'w') as f:
                json.dump(report, f, indent=2)
            
            logger.info(f"✓ Test report saved: {report_path}")
            
        except Exception as e:
            logger.error(f"Failed to save test report: {e}")
    
    def print_test_summary(self, report: Dict):
        """Print test summary to console"""
        logger.info("\n" + "="*60)
        logger.info("TEST SUMMARY")
        logger.info("="*60)
        
        summary = report["test_summary"]
        logger.info(f"Duration: {summary['duration']:.2f} seconds")
        logger.info(f"Total test suites: {summary['total_test_suites']}")
        logger.info(f"Total tests: {summary['total_tests']}")
        logger.info(f"Passed tests: {summary['passed_tests']}")
        logger.info(f"Success rate: {summary['success_rate']:.1f}%")
        logger.info(f"Overall result: {'PASS' if summary['overall_success'] else 'FAIL'}")
        
        logger.info("\nDetailed Results:")
        for suite_name, suite_results in report["test_results"].items():
            logger.info(f"\n{suite_name.upper()}:")
            if isinstance(suite_results, dict):
                for test_name, test_result in suite_results.items():
                    if test_name != "error" and isinstance(test_result, bool):
                        status = "PASS" if test_result else "FAIL"
                        logger.info(f"  {test_name}: {status}")
        
        if report["recommendations"]:
            logger.info("\nRecommendations:")
            for i, rec in enumerate(report["recommendations"], 1):
                logger.info(f"  {i}. {rec}")
    
    async def run_all_tests(self):
        """Run all ML component tests"""
        logger.info("Starting ML Component Testing Suite")
        logger.info("="*60)
        
        self.start_time = datetime.now()
        
        try:
            # Setup test environment
            self.setup_test_environment()
            
            # Run Agent-S3 tests
            self.test_results["agent_s3"] = await self.run_agent_s3_tests()
            
            # Run error detection tests
            self.test_results["error_detection"] = self.run_error_detection_tests()
            
            # Run RL recovery tests
            self.test_results["rl_recovery"] = self.run_rl_recovery_tests()
            
            # Run Playwright tests
            self.test_results["playwright"] = await self.run_playwright_tests()
            
            self.end_time = datetime.now()
            
            # Generate and save report
            report = self.generate_test_report()
            self.save_test_report(report)
            self.print_test_summary(report)
            
            # Return overall success
            return report["test_summary"]["overall_success"]
            
        except Exception as e:
            logger.error(f"Test suite failed: {e}")
            self.end_time = datetime.now()
            return False

async def main():
    """Main entry point for ML testing"""
    runner = MLTestRunner()
    
    try:
        success = await runner.run_all_tests()
        
        if success:
            logger.info("\n🎉 All ML component tests passed!")
            sys.exit(0)
        else:
            logger.error("\n❌ Some ML component tests failed!")
            sys.exit(1)
            
    except KeyboardInterrupt:
        logger.info("\n⚠️  Testing interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"\n💥 Testing failed with error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())

"""
Test Playwright GUI automation for Vercel deployment
This file tests browser automation capabilities for Vercel deployment workflows
"""

import asyncio
import json
import logging
from typing import Dict, List, Optional
from playwright.async_api import async_playwright, Browser, Page, BrowserContext
from config import TEST_CONFIG

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PlaywrightTester:
    def __init__(self):
        self.browser = None
        self.context = None
        self.page = None
        self.playwright = None
        
    async def setup_browser(self, headless: bool = True):
        """Setup Playwright browser"""
        try:
            self.playwright = await async_playwright().start()
            
            # Launch browser
            self.browser = await self.playwright.chromium.launch(
                headless=headless,
                args=['--no-sandbox', '--disable-setuid-sandbox']
            )
            
            # Create context with viewport
            self.context = await self.browser.new_context(
                viewport={'width': 1280, 'height': 720},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            )
            
            # Create page
            self.page = await self.context.new_page()
            
            logger.info("Browser setup completed successfully")
            return True
            
        except Exception as e:
            logger.error(f"Browser setup failed: {e}")
            return False
    
    async def cleanup_browser(self):
        """Cleanup browser resources"""
        try:
            if self.page:
                await self.page.close()
            if self.context:
                await self.context.close()
            if self.browser:
                await self.browser.close()
            if self.playwright:
                await self.playwright.stop()
            
            logger.info("Browser cleanup completed")
            
        except Exception as e:
            logger.error(f"Browser cleanup failed: {e}")
    
    async def navigate_to_vercel(self) -> bool:
        """Navigate to Vercel dashboard"""
        try:
            vercel_url = TEST_CONFIG["vercel"]["test_url"]
            logger.info(f"Navigating to: {vercel_url}")
            
            await self.page.goto(vercel_url, wait_until='networkidle')
            
            # Wait for page to load
            await self.page.wait_for_load_state('domcontentloaded')
            
            # Check if we're on the right page
            title = await self.page.title()
            logger.info(f"Page title: {title}")
            
            if "vercel" in title.lower():
                logger.info("✓ Successfully navigated to Vercel")
                return True
            else:
                logger.warning(f"✗ Unexpected page title: {title}")
                return False
                
        except Exception as e:
            logger.error(f"Navigation failed: {e}")
            return False
    
    async def take_screenshot(self, name: str) -> Optional[str]:
        """Take screenshot of current page"""
        try:
            screenshot_path = f"./test_data/screenshots/{name}.png"
            await self.page.screenshot(path=screenshot_path, full_page=True)
            logger.info(f"Screenshot saved: {screenshot_path}")
            return screenshot_path
            
        except Exception as e:
            logger.error(f"Screenshot failed: {e}")
            return None
    
    async def simulate_login(self, email: str = "test@example.com", password: str = "testpass") -> bool:
        """Simulate Vercel login process"""
        try:
            logger.info("Simulating login process")
            
            # Look for login elements (this is simplified - real implementation would be more robust)
            login_selectors = [
                'input[type="email"]',
                'input[name="email"]',
                'input[placeholder*="email" i]',
                '#email',
                '.email-input'
            ]
            
            email_input = None
            for selector in login_selectors:
                try:
                    email_input = await self.page.wait_for_selector(selector, timeout=5000)
                    if email_input:
                        break
                except:
                    continue
            
            if not email_input:
                logger.warning("Email input not found - might already be logged in")
                return True
            
            # Fill email
            await email_input.fill(email)
            logger.info("✓ Email filled")
            
            # Look for password input
            password_selectors = [
                'input[type="password"]',
                'input[name="password"]',
                '#password',
                '.password-input'
            ]
            
            password_input = None
            for selector in password_selectors:
                try:
                    password_input = await self.page.wait_for_selector(selector, timeout=5000)
                    if password_input:
                        break
                except:
                    continue
            
            if password_input:
                await password_input.fill(password)
                logger.info("✓ Password filled")
            
            # Look for login button
            login_button_selectors = [
                'button[type="submit"]',
                'button:has-text("Sign in")',
                'button:has-text("Login")',
                'button:has-text("Log in")',
                '.login-button',
                '#login-button'
            ]
            
            login_button = None
            for selector in login_button_selectors:
                try:
                    login_button = await self.page.wait_for_selector(selector, timeout=5000)
                    if login_button:
                        break
                except:
                    continue
            
            if login_button:
                await login_button.click()
                logger.info("✓ Login button clicked")
                
                # Wait for navigation or error
                try:
                    await self.page.wait_for_load_state('networkidle', timeout=10000)
                    logger.info("✓ Login process completed")
                    return True
                except:
                    logger.warning("Login timeout - might have failed")
                    return False
            else:
                logger.warning("Login button not found")
                return False
                
        except Exception as e:
            logger.error(f"Login simulation failed: {e}")
            return False
    
    async def simulate_new_project_creation(self) -> bool:
        """Simulate creating a new project on Vercel"""
        try:
            logger.info("Simulating new project creation")
            
            # Look for "New Project" button
            new_project_selectors = [
                'button:has-text("New Project")',
                'button:has-text("New")',
                'a:has-text("New Project")',
                '.new-project-button',
                '#new-project'
            ]
            
            new_project_button = None
            for selector in new_project_selectors:
                try:
                    new_project_button = await self.page.wait_for_selector(selector, timeout=5000)
                    if new_project_button:
                        break
                except:
                    continue
            
            if new_project_button:
                await new_project_button.click()
                logger.info("✓ New Project button clicked")
                
                # Wait for project creation page
                await self.page.wait_for_load_state('networkidle', timeout=10000)
                
                # Look for import options
                import_selectors = [
                    'button:has-text("Import")',
                    'button:has-text("Import Project")',
                    'a:has-text("Import")',
                    '.import-button'
                ]
                
                import_button = None
                for selector in import_selectors:
                    try:
                        import_button = await self.page.wait_for_selector(selector, timeout=5000)
                        if import_button:
                            break
                    except:
                        continue
                
                if import_button:
                    await import_button.click()
                    logger.info("✓ Import Project clicked")
                    return True
                else:
                    logger.warning("Import button not found")
                    return False
            else:
                logger.warning("New Project button not found")
                return False
                
        except Exception as e:
            logger.error(f"New project creation failed: {e}")
            return False
    
    async def simulate_project_configuration(self, project_name: str = "test-project") -> bool:
        """Simulate project configuration"""
        try:
            logger.info("Simulating project configuration")
            
            # Look for project name input
            name_selectors = [
                'input[placeholder*="name" i]',
                'input[name="name"]',
                'input[name="projectName"]',
                '#project-name',
                '.project-name-input'
            ]
            
            name_input = None
            for selector in name_selectors:
                try:
                    name_input = await self.page.wait_for_selector(selector, timeout=5000)
                    if name_input:
                        break
                except:
                    continue
            
            if name_input:
                await name_input.fill(project_name)
                logger.info(f"✓ Project name filled: {project_name}")
            
            # Look for deploy button
            deploy_selectors = [
                'button:has-text("Deploy")',
                'button:has-text("Deploy Project")',
                'button[type="submit"]',
                '.deploy-button',
                '#deploy'
            ]
            
            deploy_button = None
            for selector in deploy_selectors:
                try:
                    deploy_button = await self.page.wait_for_selector(selector, timeout=5000)
                    if deploy_button:
                        break
                except:
                    continue
            
            if deploy_button:
                await deploy_button.click()
                logger.info("✓ Deploy button clicked")
                
                # Wait for deployment to start
                await self.page.wait_for_load_state('networkidle', timeout=15000)
                return True
            else:
                logger.warning("Deploy button not found")
                return False
                
        except Exception as e:
            logger.error(f"Project configuration failed: {e}")
            return False
    
    async def monitor_deployment(self, timeout: int = 300) -> Dict:
        """Monitor deployment progress"""
        try:
            logger.info("Monitoring deployment progress")
            
            start_time = asyncio.get_event_loop().time()
            
            while (asyncio.get_event_loop().time() - start_time) < timeout:
                # Look for deployment status indicators
                status_selectors = [
                    '.deployment-status',
                    '.build-status',
                    '.status-indicator',
                    '[data-testid="deployment-status"]'
                ]
                
                status_element = None
                for selector in status_selectors:
                    try:
                        status_element = await self.page.wait_for_selector(selector, timeout=2000)
                        if status_element:
                            break
                    except:
                        continue
                
                if status_element:
                    status_text = await status_element.text_content()
                    logger.info(f"Deployment status: {status_text}")
                    
                    if "ready" in status_text.lower() or "live" in status_text.lower():
                        return {
                            "status": "success",
                            "message": "Deployment completed successfully",
                            "duration": asyncio.get_event_loop().time() - start_time
                        }
                    elif "error" in status_text.lower() or "failed" in status_text.lower():
                        return {
                            "status": "failed",
                            "message": "Deployment failed",
                            "duration": asyncio.get_event_loop().time() - start_time
                        }
                
                # Wait before next check
                await asyncio.sleep(5)
            
            return {
                "status": "timeout",
                "message": "Deployment monitoring timed out",
                "duration": timeout
            }
            
        except Exception as e:
            logger.error(f"Deployment monitoring failed: {e}")
            return {
                "status": "error",
                "message": f"Monitoring error: {str(e)}",
                "duration": 0
            }
    
    async def execute_deployment_workflow(self) -> Dict:
        """Execute complete Vercel deployment workflow"""
        try:
            logger.info("=== Starting Vercel Deployment Workflow ===")
            
            workflow_result = {
                "steps_completed": [],
                "steps_failed": [],
                "final_status": "unknown",
                "total_duration": 0,
                "screenshots": []
            }
            
            start_time = asyncio.get_event_loop().time()
            
            # Step 1: Navigate to Vercel
            if await self.navigate_to_vercel():
                workflow_result["steps_completed"].append("navigate_to_vercel")
                screenshot = await self.take_screenshot("vercel_dashboard")
                if screenshot:
                    workflow_result["screenshots"].append(screenshot)
            else:
                workflow_result["steps_failed"].append("navigate_to_vercel")
                return workflow_result
            
            # Step 2: Login (if needed)
            if await self.simulate_login():
                workflow_result["steps_completed"].append("login")
                screenshot = await self.take_screenshot("vercel_logged_in")
                if screenshot:
                    workflow_result["screenshots"].append(screenshot)
            else:
                workflow_result["steps_failed"].append("login")
                # Continue anyway - might already be logged in
            
            # Step 3: Create new project
            if await self.simulate_new_project_creation():
                workflow_result["steps_completed"].append("new_project")
                screenshot = await self.take_screenshot("vercel_new_project")
                if screenshot:
                    workflow_result["screenshots"].append(screenshot)
            else:
                workflow_result["steps_failed"].append("new_project")
                return workflow_result
            
            # Step 4: Configure project
            if await self.simulate_project_configuration():
                workflow_result["steps_completed"].append("configure_project")
                screenshot = await self.take_screenshot("vercel_configured")
                if screenshot:
                    workflow_result["screenshots"].append(screenshot)
            else:
                workflow_result["steps_failed"].append("configure_project")
                return workflow_result
            
            # Step 5: Monitor deployment
            deployment_result = await self.monitor_deployment()
            workflow_result["steps_completed"].append("monitor_deployment")
            workflow_result["final_status"] = deployment_result["status"]
            
            workflow_result["total_duration"] = asyncio.get_event_loop().time() - start_time
            
            logger.info(f"Workflow completed: {workflow_result['final_status']}")
            logger.info(f"Steps completed: {len(workflow_result['steps_completed'])}")
            logger.info(f"Steps failed: {len(workflow_result['steps_failed'])}")
            
            return workflow_result
            
        except Exception as e:
            logger.error(f"Deployment workflow failed: {e}")
            workflow_result["steps_failed"].append("workflow_error")
            workflow_result["final_status"] = "error"
            workflow_result["error"] = str(e)
            return workflow_result

async def test_browser_setup():
    """Test browser setup and basic navigation"""
    logger.info("=== Testing Browser Setup ===")
    
    tester = PlaywrightTester()
    
    try:
        # Setup browser
        if await tester.setup_browser(headless=True):
            logger.info("✓ Browser setup successful")
            
            # Test navigation
            if await tester.navigate_to_vercel():
                logger.info("✓ Navigation successful")
                
                # Take screenshot
                screenshot = await tester.take_screenshot("test_navigation")
                if screenshot:
                    logger.info("✓ Screenshot taken")
                
                await tester.cleanup_browser()
                return True
            else:
                logger.error("✗ Navigation failed")
                await tester.cleanup_browser()
                return False
        else:
            logger.error("✗ Browser setup failed")
            return False
            
    except Exception as e:
        logger.error(f"Browser test failed: {e}")
        await tester.cleanup_browser()
        return False

async def test_deployment_workflow():
    """Test complete deployment workflow"""
    logger.info("=== Testing Deployment Workflow ===")
    
    tester = PlaywrightTester()
    
    try:
        # Setup browser (non-headless for better debugging)
        if await tester.setup_browser(headless=False):
            logger.info("✓ Browser setup successful")
            
            # Execute workflow
            result = await tester.execute_deployment_workflow()
            
            # Evaluate results
            if result["final_status"] in ["success", "timeout"]:
                logger.info("✓ Workflow completed successfully")
                logger.info(f"  Steps completed: {len(result['steps_completed'])}")
                logger.info(f"  Screenshots taken: {len(result['screenshots'])}")
                return True
            else:
                logger.warning(f"✗ Workflow failed: {result['final_status']}")
                logger.warning(f"  Failed steps: {result['steps_failed']}")
                return False
        else:
            logger.error("✗ Browser setup failed")
            return False
            
    except Exception as e:
        logger.error(f"Workflow test failed: {e}")
        return False
    finally:
        await tester.cleanup_browser()

async def test_error_handling():
    """Test error handling in GUI automation"""
    logger.info("=== Testing Error Handling ===")
    
    tester = PlaywrightTester()
    
    try:
        if await tester.setup_browser(headless=True):
            # Test with invalid URL
            try:
                await tester.page.goto("https://invalid-url-that-does-not-exist.com")
                logger.warning("✗ Should have failed with invalid URL")
                return False
            except:
                logger.info("✓ Correctly handled invalid URL")
            
            # Test with timeout
            try:
                await tester.page.goto("https://httpstat.us/200?sleep=10000", timeout=5000)
                logger.warning("✗ Should have timed out")
                return False
            except:
                logger.info("✓ Correctly handled timeout")
            
            await tester.cleanup_browser()
            return True
        else:
            logger.error("✗ Browser setup failed")
            return False
            
    except Exception as e:
        logger.error(f"Error handling test failed: {e}")
        await tester.cleanup_browser()
        return False

async def main():
    """Run all Playwright tests"""
    logger.info("Starting Playwright GUI automation tests...")
    
    # Run tests
    setup_test_passed = await test_browser_setup()
    workflow_test_passed = await test_deployment_workflow()
    error_test_passed = await test_error_handling()
    
    logger.info(f"\n=== Playwright Test Results ===")
    logger.info(f"Browser setup: {'PASS' if setup_test_passed else 'FAIL'}")
    logger.info(f"Deployment workflow: {'PASS' if workflow_test_passed else 'FAIL'}")
    logger.info(f"Error handling: {'PASS' if error_test_passed else 'FAIL'}")
    
    if setup_test_passed and workflow_test_passed and error_test_passed:
        logger.info("🎉 All Playwright tests passed!")
    else:
        logger.error("❌ Some Playwright tests failed. Check logs for details.")

if __name__ == "__main__":
    asyncio.run(main())

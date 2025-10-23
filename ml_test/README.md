# ML Testing Setup Instructions

This directory contains the ML component testing suite for Dextra. Follow these steps to set up and run the tests.

## Prerequisites

- Python 3.9 or higher
- pip (Python package installer)
- Git (for cloning the repository)

## Installation

### 1. Install Python Dependencies

```bash
cd ml_test
pip install -r requirements.txt
```

### 2. Install Playwright Browsers

```bash
playwright install chromium
```

### 3. Create Test Data

```bash
python create_test_data.py
```

This will create:

- Sample Vercel screenshots
- Sample error logs
- Sample React project for testing

## Running Tests

### Run All Tests

```bash
python run_tests.py
```

### Run Individual Test Suites

```bash
# Test Agent-S model
python test_agent_s.py

# Test error detection
python test_error_detection.py

# Test RL recovery
python test_rl_recovery.py

# Test Playwright automation
python test_playwright.py
```

## Test Structure

### 1. Agent-S Testing (`test_agent_s.py`)

- Tests vision-language model for GUI action prediction
- Simulates Vercel deployment workflow steps
- Validates action predictions and confidence scores

### 2. Error Detection Testing (`test_error_detection.py`)

- Tests error detection from log text
- Tests visual error detection from screenshots
- Tests error classification and recovery suggestions

### 3. RL Recovery Testing (`test_rl_recovery.py`)

- Tests RL model loading and state encoding
- Tests action prediction for recovery scenarios
- Simulates complete recovery episodes

### 4. Playwright Testing (`test_playwright.py`)

- Tests browser automation setup
- Tests complete Vercel deployment workflow
- Tests error handling in GUI automation

## Configuration

Edit `config.py` to modify test settings:

```python
TEST_CONFIG = {
    "vercel": {
        "test_url": "https://vercel.com/dashboard",
        "api_token": "your_vercel_token_here",
    },
    "agent_s": {
        "model_name": "microsoft/Agent-S",
        "device": "cuda",  # or "cpu"
        "confidence_threshold": 0.7,
    },
    # ... other settings
}
```

## Test Data

The test suite uses sample data located in `./test_data/`:

- `screenshots/` - Sample Vercel screenshots
- `error_logs/` - Sample error log files
- `sample_project/` - Sample React project for deployment testing

## Expected Results

### Success Criteria

- **Agent-S Tests**: 80%+ success rate for action predictions
- **Error Detection**: 80%+ accuracy for log detection, 60%+ for visual detection
- **RL Recovery**: 60%+ success rate for recovery episodes
- **Playwright**: All browser automation tests should pass

### Sample Output

```
=== TEST SUMMARY ===
Duration: 45.2 seconds
Total test suites: 4
Total tests: 12
Passed tests: 10
Success rate: 83.3%
Overall result: PASS

AGENT_S:
  basic_functionality: PASS
  workflow_test: PASS

ERROR_DETECTION:
  log_detection: PASS
  screenshot_detection: PASS
  classification: PASS

RL_RECOVERY:
  model_loading: PASS
  state_encoding: PASS
  action_prediction: PASS
  recovery_episodes: PASS

PLAYWRIGHT:
  browser_setup: PASS
  deployment_workflow: PASS
  error_handling: PASS
```

## Troubleshooting

### Common Issues

1. **Playwright Installation Issues**

   ```bash
   # Reinstall Playwright
   pip uninstall playwright
   pip install playwright
   playwright install chromium
   ```

2. **Model Loading Errors**
   - Ensure you have sufficient disk space for model downloads
   - Check internet connection for model downloads
   - Verify CUDA availability if using GPU

3. **Screenshot Test Failures**
   - Ensure test data was created: `python create_test_data.py`
   - Check file permissions in `./test_data/screenshots/`

4. **Browser Automation Issues**
   - Run tests in non-headless mode for debugging: modify `headless=False` in test files
   - Check if Vercel website is accessible
   - Verify Playwright browser installation

### Debug Mode

To run tests in debug mode with more verbose output:

```bash
# Set debug logging
export PYTHONPATH=.
python -c "
import logging
logging.basicConfig(level=logging.DEBUG)
import run_tests
import asyncio
asyncio.run(run_tests.main())
"
```

## Next Steps

After running the ML tests:

1. **If tests pass**: Proceed with full Dextra implementation
2. **If tests fail**:
   - Review test logs for specific failures
   - Improve model implementations based on recommendations
   - Re-run tests after fixes

3. **For production**:
   - Replace mock implementations with real models
   - Add more comprehensive test cases
   - Integrate with actual Vercel API for end-to-end testing

## Contributing

To add new tests:

1. Create new test file following the naming convention `test_*.py`
2. Implement test functions with descriptive names
3. Add test to `run_tests.py` in the appropriate test suite
4. Update this README with new test information

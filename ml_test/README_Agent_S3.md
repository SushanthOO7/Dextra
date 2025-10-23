# ML Testing Setup Instructions - Agent-S3 Edition

This directory contains the ML component testing suite for Dextra using the latest **Agent-S3** model. Follow these steps to set up and run the tests.

## Prerequisites

- Python 3.9 or higher
- pip (Python package installer)
- Git (for cloning the repository)
- **OpenAI API Key** (or other LLM provider API key)
- **Vercel API Token** (for testing Vercel deployments)

## Installation

### 1. Install Python Dependencies

```bash
cd ml_test
pip install -r requirements.txt
```

### 2. Install Agent-S3 Package

```bash
pip install gui-agents>=0.3.1
```

### 3. Install Playwright Browsers

```bash
playwright install chromium
```

### 4. Configure Environment Variables

Copy the environment template and fill in your API keys:

```bash
cp env_example.txt .env
# Edit .env with your actual API keys
```

**Required Environment Variables:**

- `AGENT_S_API_KEY`: Your OpenAI API key (or other LLM provider)
- `AGENT_S_GROUND_API_KEY`: API key for grounding model (can be same as main)
- `VERCEL_API_TOKEN`: Your Vercel API token (optional for testing)

### 5. Create Test Data

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
# Test Agent-S3 model
python test_agent_s.py

# Test error detection
python test_error_detection.py

# Test RL recovery
python test_rl_recovery.py

# Test Playwright automation
python test_playwright.py
```

## Test Structure

### 1. Agent-S3 Testing (`test_agent_s.py`)

- Tests the latest Agent-S3 vision-language model for GUI action prediction
- Uses natural language instructions instead of coordinate-based actions
- Simulates Vercel deployment workflow steps with executable code generation
- Validates action predictions and confidence scores

**Key Features:**

- **Natural Language Instructions**: "Click on the login button" instead of coordinates
- **Executable Code Generation**: Agent-S3 generates Python code for actions
- **Reflection Agent**: Optional reflection agent to assist the worker agent
- **Local Environment**: Optional local code execution capability

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
    "agent_s3": {
        "provider": "openai",  # openai, anthropic, etc.
        "model": "gpt-4o",  # Main generation model
        "ground_model": "gpt-4o",  # Grounding model
        "grounding_width": 1920,  # UI-TARS-1.5-7B: 1920, UI-TARS-72B: 1000
        "grounding_height": 1080,  # UI-TARS-1.5-7B: 1080, UI-TARS-72B: 1000
        "enable_reflection": True,
        "enable_local_env": False,  # WARNING: Executes code locally
        "platform": "linux",  # linux, darwin, windows
    },
    # ... other settings
}
```

## Agent-S3 Specific Features

### Grounding Model Requirements

Agent-S3 requires a **grounding model** in addition to the main generation model:

- **UI-TARS-1.5-7B**: Use `grounding_width=1920, grounding_height=1080`
- **UI-TARS-72B**: Use `grounding_width=1000, grounding_height=1000`

### Local Environment (Optional)

When enabled, Agent-S3 can execute Python and Bash code locally:

```python
# Enable local environment (WARNING: Executes arbitrary code)
AGENT_S_LOCAL_ENV=true
```

**Use Cases:**

- Data processing (CSV files, databases)
- File operations (bulk processing, content extraction)
- System automation (configuration changes)
- Code development (writing, editing, executing)

**Security Warning:**

- Only enable in trusted environments
- Agent runs with same permissions as user
- Consider sandboxed environment for untrusted tasks

### Reflection Agent

Agent-S3 includes an optional reflection agent that assists the worker agent:

```python
# Enable reflection agent
AGENT_S_REFLECTION=true
```

## Test Data

The test suite uses sample data located in `./test_data/`:

- `screenshots/` - Sample Vercel screenshots
- `error_logs/` - Sample error log files
- `sample_project/` - Sample React project for deployment testing

## Expected Results

### Success Criteria

- **Agent-S3 Tests**: 80%+ success rate for action predictions
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

AGENT_S3:
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

1. **Agent-S3 Installation Issues**

   ```bash
   # Install latest version
   pip install --upgrade gui-agents

   # Check installation
   python -c "import gui_agents; print(gui_agents.__version__)"
   ```

2. **API Key Issues**
   - Ensure `AGENT_S_API_KEY` is set correctly
   - Verify API key has sufficient credits
   - Check API key permissions

3. **Grounding Model Issues**
   - Ensure grounding model API key is set
   - Verify grounding dimensions match your model
   - Check grounding model availability

4. **Playwright Installation Issues**

   ```bash
   # Reinstall Playwright
   pip uninstall playwright
   pip install playwright
   playwright install chromium
   ```

5. **Model Loading Errors**
   - Ensure you have sufficient disk space for model downloads
   - Check internet connection for model downloads
   - Verify CUDA availability if using GPU

6. **Screenshot Test Failures**
   - Ensure test data was created: `python create_test_data.py`
   - Check file permissions in `./test_data/screenshots/`

7. **Browser Automation Issues**
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

## Agent-S3 vs Previous Versions

### Key Differences

1. **Code Generation**: Agent-S3 generates executable Python code instead of coordinate-based actions
2. **Natural Language**: Uses natural language instructions instead of structured context
3. **Grounding Model**: Requires separate grounding model for coordinate prediction
4. **Reflection**: Optional reflection agent for improved decision making
5. **Local Environment**: Optional local code execution capability

### Migration from Agent-S/S2

If migrating from previous Agent-S versions:

1. Update imports: `from gui_agents.s3.agents.agent_s import AgentS3`
2. Add grounding model configuration
3. Update action handling to work with executable code
4. Configure reflection and local environment options

## Next Steps

After running the ML tests:

1. **If tests pass**: Proceed with full Dextra implementation
2. **If tests fail**:
   - Review test logs for specific failures
   - Check API key configuration
   - Verify grounding model setup
   - Re-run tests after fixes

3. **For production**:
   - Replace mock implementations with real models
   - Add more comprehensive test cases
   - Integrate with actual Vercel API for end-to-end testing
   - Consider fine-tuning Agent-S3 on deployment workflows

## Contributing

To add new tests:

1. Create new test file following the naming convention `test_*.py`
2. Implement test functions with descriptive names
3. Add test to `run_tests.py` in the appropriate test suite
4. Update this README with new test information

## References

- [Agent-S3 GitHub Repository](https://github.com/simular-ai/agent-s)
- [Agent-S3 Technical Paper](https://arxiv.org/abs/2510.02250)
- [Agent-S3 Documentation](https://github.com/simular-ai/agent-s?tab=readme-ov-file#%EF%B8%8F-installation--setup)

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("🚀 Building Dextra...");

// Build order
const buildSteps = [
  {
    name: "Server",
    command: "cd server && npm run build",
    cwd: process.cwd(),
  },
  {
    name: "App",
    command: "cd app && npm run build",
    cwd: process.cwd(),
  },
];

// Execute build steps
for (const step of buildSteps) {
  console.log(`📦 Building ${step.name}...`);
  try {
    execSync(step.command, {
      cwd: step.cwd,
      stdio: "inherit",
      env: { ...process.env, NODE_ENV: "production" },
    });
    console.log(`✅ ${step.name} built successfully`);
  } catch (error) {
    console.error(`❌ Failed to build ${step.name}:`, error.message);
    process.exit(1);
  }
}

console.log("🎉 All builds completed successfully!");

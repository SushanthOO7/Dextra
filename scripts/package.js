const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("📦 Packaging Dextra...");

// Package order
const packageSteps = [
  {
    name: "Windows",
    command: "cd app && npm run package:win",
    cwd: process.cwd(),
  },
  {
    name: "macOS",
    command: "cd app && npm run package:mac",
    cwd: process.cwd(),
  },
  {
    name: "Linux",
    command: "cd app && npm run package:linux",
    cwd: process.cwd(),
  },
];

// Execute package steps
for (const step of packageSteps) {
  console.log(`📦 Packaging for ${step.name}...`);
  try {
    execSync(step.command, {
      cwd: step.cwd,
      stdio: "inherit",
      env: { ...process.env, NODE_ENV: "production" },
    });
    console.log(`✅ ${step.name} packaged successfully`);
  } catch (error) {
    console.error(`❌ Failed to package ${step.name}:`, error.message);
    // Continue with other platforms
  }
}

console.log("🎉 Packaging completed!");

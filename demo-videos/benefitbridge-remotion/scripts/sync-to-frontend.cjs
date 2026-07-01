#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const demoRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(demoRoot, "../..");
const outDir = path.join(demoRoot, "out");
const targetDir = path.join(repoRoot, "frontend", "public", "demo-videos");

const filesToSync = [
  "hero-loop.mp4",
  "hero-loop-poster.png",
];

fs.mkdirSync(targetDir, { recursive: true });

for (const file of filesToSync) {
  const source = path.join(outDir, file);
  const target = path.join(targetDir, file);
  fs.copyFileSync(source, target);
  console.log(`synced ${file}`);
}

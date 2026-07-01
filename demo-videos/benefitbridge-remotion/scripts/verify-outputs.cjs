#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const demoRoot = path.resolve(__dirname, "..");
const outDir = path.join(demoRoot, "out");
const expected = [
  {
    id: "SanJoseFamilyNavigator",
    video: "sanjose-family-navigator.mp4",
    still: "sanjose-family-navigator-still.png",
    minDuration: 30,
    maxDuration: 60,
  },
  {
    id: "SfFoodShelterHandoff",
    video: "sf-food-shelter-handoff.mp4",
    still: "sf-food-shelter-handoff-still.png",
    minDuration: 30,
    maxDuration: 60,
  },
  {
    id: "SpanishWicPrep",
    video: "spanish-wic-prep.mp4",
    still: "spanish-wic-prep-still.png",
    minDuration: 30,
    maxDuration: 60,
  },
  {
    id: "ConversationAtlasDemo",
    video: "conversation-atlas.mp4",
    still: "conversation-atlas-poster.png",
    minDuration: 24,
    maxDuration: 30,
  },
];

const failures = [];

for (const item of expected) {
  const videoPath = path.join(outDir, item.video);
  const stillPath = path.join(outDir, item.still);
  assertFile(videoPath, 1000000);
  assertFile(stillPath, 10000);
  const duration = probeDuration(videoPath);
  if (
    duration !== null &&
    (duration < item.minDuration || duration > item.maxDuration)
  ) {
    failures.push(`${item.id} duration out of range: ${duration}s`);
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Remotion output verification passed.");

function assertFile(filePath, minSize) {
  if (!fs.existsSync(filePath)) {
    failures.push(`Missing ${path.relative(demoRoot, filePath)}`);
    return;
  }
  const stats = fs.statSync(filePath);
  if (stats.size < minSize) {
    failures.push(
      `${path.relative(demoRoot, filePath)} too small: ${stats.size} bytes`,
    );
  }
}

function probeDuration(filePath) {
  const result = spawnSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      filePath,
    ],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    return null;
  }
  const parsed = Number.parseFloat(result.stdout.trim());
  return Number.isFinite(parsed) ? parsed : null;
}

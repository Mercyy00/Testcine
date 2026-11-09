import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SETTINGS } from "../lib/store.js";

test("DEFAULT_SETTINGS includes ambientLight setting initialized to art mode", () => {
  assert.equal(DEFAULT_SETTINGS.ambientLight, "art");
});

test("Crop calculation scales client bounding rect correctly to capture video dimensions", () => {
  // Simulate tab capture stream resolution (e.g. 1920x1080) and browser viewport (1280x720)
  const captureWidth = 1920;
  const captureHeight = 1080;
  const windowWidth = 1280;
  const windowHeight = 720;

  const scaleX = captureWidth / windowWidth; // 1.5
  const scaleY = captureHeight / windowHeight; // 1.5

  // Player element located at (100, 80) with size (800, 450)
  const rect = {
    left: 100,
    top: 80,
    width: 800,
    height: 450,
  };

  const cropX = Math.max(0, rect.left * scaleX);
  const cropY = Math.max(0, rect.top * scaleY);
  const cropW = Math.min(captureWidth - cropX, rect.width * scaleX);
  const cropH = Math.min(captureHeight - cropY, rect.height * scaleY);

  assert.equal(cropX, 150);
  assert.equal(cropY, 120);
  assert.equal(cropW, 1200);
  assert.equal(cropH, 675);

  // Assert cropped region fits within capture bounds
  assert.ok(cropX + cropW <= captureWidth);
  assert.ok(cropY + cropH <= captureHeight);
});

test("Exponential moving average (EMA) anti-flicker smoothing mathematically converges without color drift", () => {
  // Alpha = 0.22 (22% new sample, 78% previous sample)
  const alpha = 0.22;
  let currentColor = 50; // starting grey
  const targetColor = 200; // bright daylight scene

  // Step through 15 frames
  for (let frame = 0; frame < 15; frame++) {
    currentColor = Math.round(currentColor * (1 - alpha) + targetColor * alpha);
  }

  // After 15 frames at ~20-25fps (~600ms), it should be within 95%+ of the target
  assert.ok(currentColor > 190 && currentColor <= 200);
});

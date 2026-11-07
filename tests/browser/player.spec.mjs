import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

const titles = JSON.parse(readFileSync(new URL("../../lib/tmdb_titles.json", import.meta.url), "utf8"));
const title = (Array.isArray(titles) ? titles : Object.values(titles)).find((item) => item.type === "movie" && item.status !== "upcoming");
const watchPath = `/watch/${title.id}`;

test("plays HLS, seeks and preserves pause, time and quality mode across mirror switches", async ({ page }, testInfo) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(watchPath);
  const video = page.locator("video");
  await expect.poll(() => video.evaluate((element) => element.duration)).toBeGreaterThan(15);
  await page.getByRole("button", { name: "Play", exact: true }).first().click();
  await expect.poll(() => video.evaluate((element) => element.currentTime)).toBeGreaterThan(0.3);
  await page.getByRole("button", { name: "Pause", exact: true }).last().click();
  await page.getByRole("slider", { name: "Seek time" }).fill("8");
  await page.getByRole("combobox", { name: "Quality" }).selectOption("720");
  await page.getByRole("combobox", { name: "Server" }).selectOption("kratos");
  await expect.poll(() => video.evaluate((element) => element.readyState)).toBeGreaterThan(1);
  await expect.poll(() => video.evaluate((element) => element.currentTime)).toBeGreaterThan(7.5);
  expect(await video.evaluate((element) => element.paused)).toBe(true);
  await expect(page.getByRole("combobox", { name: "Quality" })).toHaveValue("720");
  await page.screenshot({ path: testInfo.outputPath("desktop-player.png") });
  await page.getByRole("button", { name: "Play", exact: true }).last().click();
  await page.getByRole("combobox", { name: "Server" }).selectOption("boreas");
  await expect.poll(() => video.evaluate((element) => !element.paused && element.currentTime > 8)).toBe(true);
  await page.getByRole("button", { name: "Mute", exact: true }).click();
  expect(await video.evaluate((element) => element.muted)).toBe(true);
  await expect(page.getByRole("combobox", { name: "Server" }).locator('option[value="zeus"]')).toBeDisabled();
  await page.getByRole("button", { name: "Pause", exact: true }).last().click();
  await page.getByRole("slider", { name: "Seek time" }).fill("4");
  await page.reload();
  await expect.poll(() => page.locator("video").evaluate((element) => element.currentTime)).toBeGreaterThan(3.5);
  expect(errors).toEqual([]);
});

test("falls back after a fatal manifest error and stops when all mirrors fail", async ({ page }) => {
  await page.route("**/boreas/**/master.m3u8", (route) => route.fulfill({ status: 404, body: "missing" }));
  await page.goto(watchPath);
  await expect(page.getByRole("combobox", { name: "Server" })).toHaveValue("kratos");
  await expect.poll(() => page.locator("video").evaluate((element) => element.duration)).toBeGreaterThan(15);
  await page.route("**/kratos/**/master.m3u8", (route) => route.fulfill({ status: 404, body: "missing" }));
  await page.reload();
  await expect(page.getByRole("alert").filter({ hasText: "Unable to play" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry playback" })).toBeVisible();
});

test("shows honest unavailable state and keeps controls inside narrow screens", async ({ page }, testInfo) => {
  await page.route("**/api/sources?**", (route) => route.fulfill({ json: { servers: [], default: null } }));
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto(watchPath);
  await expect(page.getByText("No streams are available for this title.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Play", exact: true })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("mobile.png"), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("keeps live controls accessible at mobile and desktop widths", async ({ page }, testInfo) => {
  await page.goto(watchPath);
  await expect(page.getByRole("combobox", { name: "Quality" })).toBeEnabled();
  for (const width of [320, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 800 });
    await expect(page.getByRole("combobox", { name: "Server" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Fullscreen" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await page.setViewportSize({ width: 320, height: 700 });
  await page.screenshot({ path: testInfo.outputPath("mobile-player.png"), fullPage: true });
  await page.getByRole("combobox", { name: "Server" }).focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("combobox", { name: "Server" })).toHaveValue("kratos");
});

test("uses native HLS when MediaSource is unavailable and preserves the playhead", async ({ page }) => {
  await page.addInitScript(() => {
    window.MediaSource = undefined;
    window.ManagedMediaSource = undefined;
    window.WebKitMediaSource = undefined;
  });
  await page.goto(watchPath);
  const video = page.locator("video");
  await expect.poll(() => video.evaluate((element) => element.duration)).toBeGreaterThan(15);
  await expect(page.getByRole("combobox", { name: "Quality" })).toBeDisabled();
  await page.getByRole("slider", { name: "Seek time" }).fill("7");
  await page.getByRole("combobox", { name: "Server" }).selectOption("kratos");
  await expect.poll(() => video.evaluate((element) => element.readyState)).toBeGreaterThan(1);
  await expect.poll(() => video.evaluate((element) => element.currentTime)).toBeGreaterThan(6.5);
  expect(await video.evaluate((element) => element.paused)).toBe(true);
});

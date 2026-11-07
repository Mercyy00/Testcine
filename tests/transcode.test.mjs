import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("encodes silent sources into playable HLS without upscaling and refuses existing output", () => {
  const root = mkdtempSync(join(tmpdir(), "vivarium-transcode-test-"));
  const input = join(root, "silent.mp4");
  const output = join(root, "output");
  const source = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-f", "lavfi",
    "-i", "color=size=320x180:rate=30", "-t", "4.2", "-c:v", "libx264", "-pix_fmt", "yuv420p", input], { encoding: "utf8" });
  assert.equal(source.status, 0, source.error?.message || source.stderr);
  const encode = spawnSync(process.execPath, ["scripts/transcode.mjs", input, output], { encoding: "utf8" });
  assert.equal(encode.status, 0, encode.stderr);
  const master = readFileSync(join(output, "master.m3u8"), "utf8");
  assert.match(master, /RESOLUTION=320x180/);
  assert.match(master, /180p\/index\.m3u8/);
  assert.match(readFileSync(join(output, "180p", "index.m3u8"), "utf8"), /#EXT-X-ENDLIST/);
  const probe = spawnSync("ffprobe", ["-v", "error", "-show_streams", "-of", "json",
    join(output, "180p", "segment_00000.ts")], { encoding: "utf8" });
  assert.equal(probe.status, 0, probe.stderr);
  assert.deepEqual(JSON.parse(probe.stdout).streams.map((stream) => stream.codec_type), ["video"]);
  const rerun = spawnSync(process.execPath, ["scripts/transcode.mjs", input, output], { encoding: "utf8" });
  assert.equal(rerun.status, 1);
  assert.equal(readFileSync(join(output, "master.m3u8"), "utf8"), master);
});

test("does not report success when FFmpeg emits an empty master for a subsecond source", () => {
  const root = mkdtempSync(join(tmpdir(), "vivarium-transcode-test-"));
  const input = join(root, "short.mp4");
  const source = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-f", "lavfi",
    "-i", "color=size=320x180:rate=30", "-t", "0.3", "-c:v", "libx264", input], { encoding: "utf8" });
  assert.equal(source.status, 0, source.error?.message || source.stderr);
  const encode = spawnSync(process.execPath, ["scripts/transcode.mjs", input, join(root, "output")], { encoding: "utf8" });
  assert.equal(encode.status, 1);
  assert.match(encode.stderr, /usable master playlist/);
});

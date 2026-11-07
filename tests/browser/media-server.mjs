import { createServer } from "node:http";
import { spawnSync } from "node:child_process";
import { createReadStream, mkdtempSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, basename } from "node:path";

// Synthetic video stays in the OS temp directory; no title media is downloaded.
const root = mkdtempSync(join(tmpdir(), "vivarium-hls-test-"));
const input = join(root, "input.mp4");
function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.error || result.status !== 0) throw new Error(result.error?.message || result.stderr);
}
run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", "testsrc2=size=1280x720:rate=30",
  "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000", "-t", "16", "-c:v", "libx264",
  "-preset", "ultrafast", "-pix_fmt", "yuv420p", "-c:a", "aac", input]);
run(process.execPath, ["scripts/transcode.mjs", input, join(root, "hls")]);

createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "http://127.0.0.1:4173");
  if (req.url === "/health") { res.end("ready"); return; }
  const path = new URL(req.url, "http://localhost").pathname;
  const match = path.match(/^\/(boreas|kratos|zeus)\/media\/(movie|series|anime)\/[^/]+\/(?:season-\d+\/episode-\d+\/)?(?:(\d+p)\/)?([^/]+)$/);
  if (!match || !/^(master\.m3u8|index\.m3u8|segment_\d+\.ts)$/.test(match[4])) {
    res.writeHead(404); res.end(); return;
  }
  const file = join(root, "hls", match[3] || "", basename(match[4]));
  try {
    res.setHeader("Content-Type", file.endsWith(".m3u8") ? "application/vnd.apple.mpegurl" : "video/mp2t");
    res.setHeader("Content-Length", statSync(file).size);
    createReadStream(file).pipe(res);
  } catch { res.writeHead(404); res.end(); }
}).listen(4174, "127.0.0.1");

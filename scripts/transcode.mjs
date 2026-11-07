import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const [inputArg, outputArg] = process.argv.slice(2);
if (!inputArg || !outputArg) {
  console.error("Usage: npm run transcode -- input.mp4 output-directory (requires FFmpeg and FFprobe)");
  process.exit(1);
}
const input = resolve(inputArg);
const output = resolve(outputArg);
if (!existsSync(input) || existsSync(output)) {
  console.error("Input must exist and output must be a new directory.");
  process.exit(1);
}
const probe = spawnSync("ffprobe", ["-v", "error", "-show_streams", "-of", "json", input], { encoding: "utf8" });
if (probe.error || probe.status !== 0) {
  console.error("FFprobe could not read the input. Check your FFmpeg installation.");
  process.exit(1);
}
const streams = JSON.parse(probe.stdout).streams;
const video = streams.find((stream) => stream.codec_type === "video");
if (!video?.height) { console.error("Input must contain video."); process.exit(1); }
const hasAudio = streams.some((stream) => stream.codec_type === "audio");
const ladder = [
  { height: 360, rate: "800k", max: "856k", buffer: "1200k" },
  { height: 720, rate: "2800k", max: "2996k", buffer: "4200k" },
  { height: 1080, rate: "5000k", max: "5350k", buffer: "7500k" },
].filter((level) => level.height <= video.height);
if (!ladder.length) ladder.push({ height: Math.max(2, Math.floor(video.height / 2) * 2), rate: "800k", max: "856k", buffer: "1200k" });
mkdirSync(output, { recursive: true });
const args = ["-hide_banner", "-nostdin", "-n", "-i", input];
ladder.forEach((level, index) => {
  mkdirSync(join(output, `${level.height}p`));
  args.push("-map", "0:v:0");
  if (hasAudio) args.push("-map", "0:a:0");
  args.push(`-filter:v:${index}`, `scale=-2:${level.height}`, `-b:v:${index}`, level.rate,
    `-maxrate:v:${index}`, level.max, `-bufsize:v:${index}`, level.buffer,
    `-r:v:${index}`, "30", `-g:v:${index}`, "120", `-keyint_min:v:${index}`, "120",
    `-sc_threshold:v:${index}`, "0", `-force_key_frames:v:${index}`, "expr:gte(t,n_forced*4)");
});
args.push("-c:v", "libx264", "-preset", "medium", "-pix_fmt", "yuv420p", "-flags:v", "+cgop");
if (hasAudio) args.push("-c:a", "aac", "-b:a", "128k", "-ac", "2", "-ar", "48000");
args.push("-f", "hls", "-hls_time", "4", "-hls_playlist_type", "vod", "-hls_flags", "independent_segments",
  "-master_pl_name", "master.m3u8", "-var_stream_map",
  ladder.map((level, index) => `v:${index}${hasAudio ? `,a:${index}` : ""},name:${level.height}p`).join(" "),
  // Relative forward-slash paths avoid Windows drive-letter parsing in the HLS muxer.
  "-hls_segment_filename", "%v/segment_%05d.ts", "%v/index.m3u8");
const result = spawnSync("ffmpeg", args, { stdio: "inherit", cwd: output });
if (result.error || result.status !== 0) {
  console.error("Transcoding failed. Inspect the output directory before retrying with a new directory.");
  process.exit(1);
}
const masterPath = join(output, "master.m3u8");
if (!existsSync(masterPath) || !readFileSync(masterPath, "utf8").includes("#EXT-X-STREAM-INF")) {
  console.error("FFmpeg did not produce a usable master playlist. The input may be too short; inspect the output before retrying.");
  process.exit(1);
}
console.log(`HLS ready: ${join(output, "master.m3u8")}`);

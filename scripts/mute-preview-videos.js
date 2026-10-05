import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const ffmpeg = require('@ffmpeg-installer/ffmpeg');

const ffmpegPath = ffmpeg.path;
const previewsDir = path.resolve(process.cwd(), 'public/previews');

function getAllVideoFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;

  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllVideoFiles(fullPath));
    } else if (file.endsWith('.mp4') || file.endsWith('.webm')) {
      results.push(fullPath);
    }
  }
  return results;
}

console.log('Using FFmpeg at:', ffmpegPath);
console.log('Scanning directory:', previewsDir);

const videoFiles = getAllVideoFiles(previewsDir);
console.log(`Found ${videoFiles.length} video files to process.\n`);

let processedCount = 0;
let errorCount = 0;

for (const videoPath of videoFiles) {
  const relativePath = path.relative(process.cwd(), videoPath);
  const tempPath = `${videoPath}.tmp.mp4`;

  try {
    const oldSize = fs.statSync(videoPath).size;
    
    // -c:v copy : zero re-encoding, lossless, instantaneous
    // -an : strip audio completely
    // -movflags +faststart : move moov atom to front for instant web streaming
    const cmd = `"${ffmpegPath}" -i "${videoPath}" -c:v copy -an -movflags +faststart "${tempPath}" -y`;
    execSync(cmd, { stdio: 'pipe' });

    if (fs.existsSync(tempPath) && fs.statSync(tempPath).size > 0) {
      fs.unlinkSync(videoPath);
      fs.renameSync(tempPath, videoPath);
      const newSize = fs.statSync(videoPath).size;
      console.log(`[OK] ${relativePath} (${(oldSize / 1024 / 1024).toFixed(2)} MB -> ${(newSize / 1024 / 1024).toFixed(2)} MB)`);
      processedCount++;
    } else {
      throw new Error('Temporary output file missing or empty');
    }
  } catch (err) {
    console.error(`[FAIL] ${relativePath}:`, err.message);
    if (fs.existsSync(tempPath)) {
      try { fs.unlinkSync(tempPath); } catch {}
    }
    errorCount++;
  }
}

console.log(`\nCompleted: ${processedCount} succeeded, ${errorCount} failed.`);

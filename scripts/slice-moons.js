import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

/**
 * Pure Node.js PNG Decoder & Encoder to slice 30 moon phases
 * without external dependencies (no OpenCV, no Python, no Pillow needed).
 */

function makeCrcTable() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  return table;
}

const crcTable = makeCrcTable();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  typeBuf.copy(chunk, 4);
  data.copy(chunk, 8);
  const toCrc = Buffer.concat([typeBuf, data]);
  chunk.writeUInt32BE(crc32(toCrc), 8 + len);
  return chunk;
}

function decodePng(buffer) {
  let offset = 8;
  let idatBuffers = [];
  let width = 0;
  let height = 0;

  while (offset < buffer.length) {
    const len = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    if (type === 'IHDR') {
      width = buffer.readUInt32BE(offset + 8);
      height = buffer.readUInt32BE(offset + 12);
    } else if (type === 'IDAT') {
      idatBuffers.push(buffer.subarray(offset + 8, offset + 8 + len));
    }
    offset += 12 + len;
  }

  const compressed = Buffer.concat(idatBuffers);
  const raw = zlib.inflateSync(compressed);
  const bpp = 4;
  const stride = width * bpp;
  const uncompressed = Buffer.alloc(width * height * 4);

  function paeth(a, b, c) {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc) return a;
    if (pb <= pc) return b;
    return c;
  }

  let srcPos = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[srcPos++];
    const prevLineOffset = (y - 1) * stride;
    const currLineOffset = y * stride;
    for (let x = 0; x < stride; x++) {
      const rawVal = raw[srcPos++];
      const a = x >= bpp ? uncompressed[currLineOffset + x - bpp] : 0;
      const b = y > 0 ? uncompressed[prevLineOffset + x] : 0;
      const c = (x >= bpp && y > 0) ? uncompressed[prevLineOffset + x - bpp] : 0;
      let val = 0;
      if (filter === 0) val = rawVal;
      else if (filter === 1) val = (rawVal + a) & 0xff;
      else if (filter === 2) val = (rawVal + b) & 0xff;
      else if (filter === 3) val = (rawVal + Math.floor((a + b) / 2)) & 0xff;
      else if (filter === 4) val = (rawVal + paeth(a, b, c)) & 0xff;
      uncompressed[currLineOffset + x] = val;
    }
  }

  return {
    width,
    height,
    data: uncompressed
  };
}

function encodePng(width, height, rgbaBuffer) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // 8-bit depth
  ihdrData.writeUInt8(6, 9); // RGBA color type
  ihdrData.writeUInt8(0, 10);
  ihdrData.writeUInt8(0, 11);
  ihdrData.writeUInt8(0, 12);
  const ihdr = createChunk('IHDR', ihdrData);

  const stride = width * 4;
  const rawScanlines = Buffer.alloc(height * (stride + 1));
  let destOffset = 0;
  for (let y = 0; y < height; y++) {
    rawScanlines[destOffset++] = 0;
    rgbaBuffer.copy(
      rawScanlines,
      destOffset,
      y * stride,
      (y + 1) * stride
    );
    destOffset += stride;
  }

  const compressed = zlib.deflateSync(rawScanlines, { level: 9 });
  const idat = createChunk('IDAT', compressed);
  const iend = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

function run() {
  const inputPath = path.resolve('public/assets/moon-30day.png');
  const outputDir = path.resolve('public/assets/moon');

  if (!fs.existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`);
    process.exit(1);
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`Decoding ${inputPath}...`);
  const fileBuf = fs.readFileSync(inputPath);
  const { width, height, data } = decodePng(fileBuf);
  console.log(`Image decoded: ${width}x${height}`);

  const cols = 6;
  const rows = 5;
  const cellW = width / cols;
  const cellH = height / rows;
  const outputSize = 256;
  const halfSize = outputSize / 2;

  // Exact moon diameter is ~186px (radius ~93px).
  // We apply circular mask with antialiasing feathering at boundary.
  const moonDiscRadius = 93.0;

  for (let day = 1; day <= 30; day++) {
    const idx = day - 1;
    const c = idx % cols;
    const r = Math.floor(idx / cols);

    const x0 = Math.floor(c * cellW);
    const x1 = Math.floor((c + 1) * cellW);
    const y0 = Math.floor(r * cellH);
    const y1 = Math.floor((r + 1) * cellH);

    // Compute centroid / bounding box of opaque pixels inside this cell
    let minX = 9999;
    let maxX = -1;
    let minY = 9999;
    let maxY = -1;

    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const p = (y * width + x) * 4;
        if (data[p + 3] > 10) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    // Default center if empty or edge case
    const cx = (minX < maxX) ? (minX + maxX) / 2 : (c + 0.5) * cellW;
    const cy = (minY < maxY) ? (minY + maxY) / 2 : (r + 0.5) * cellH;

    // Create 256x256 transparent RGBA image
    const outBuf = Buffer.alloc(outputSize * outputSize * 4, 0);

    for (let outY = 0; outY < outputSize; outY++) {
      for (let outX = 0; outX < outputSize; outX++) {
        const dx = outX - halfSize;
        const dy = outY - halfSize;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Circular feather mask
        if (dist > moonDiscRadius + 1.0) {
          continue;
        }

        // Soft antialiasing on outer edge
        let alphaMultiplier = 1.0;
        if (dist > moonDiscRadius - 1.0) {
          alphaMultiplier = (moonDiscRadius + 1.0 - dist) / 2.0;
          alphaMultiplier = Math.max(0.0, Math.min(1.0, alphaMultiplier));
        }

        const srcX = Math.round(cx + dx);
        const srcY = Math.round(cy + dy);

        if (srcX >= 0 && srcX < width && srcY >= 0 && srcY < height) {
          const srcIdx = (srcY * width + srcX) * 4;
          const destIdx = (outY * outputSize + outX) * 4;

          const rVal = data[srcIdx];
          const gVal = data[srcIdx + 1];
          const bVal = data[srcIdx + 2];
          const aVal = data[srcIdx + 3];

          outBuf[destIdx] = rVal;
          outBuf[destIdx + 1] = gVal;
          outBuf[destIdx + 2] = bVal;
          outBuf[destIdx + 3] = Math.round(aVal * alphaMultiplier);
        }
      }
    }

    const outPng = encodePng(outputSize, outputSize, outBuf);
    const fileName = `day-${day.toString().padStart(2, '0')}.png`;
    const destFile = path.join(outputDir, fileName);
    fs.writeFileSync(destFile, outPng);
    console.log(`Saved ${fileName} (${outPng.length} bytes, center: ${cx.toFixed(1)}, ${cy.toFixed(1)})`);
  }

  console.log(`All 30 moon phase PNGs successfully exported to ${outputDir}`);
}

run();

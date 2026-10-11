import fs from 'fs';
import zlib from 'zlib';
import path from 'path';

function crc32(buf) {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const body = Buffer.concat([typeBuf, data]);
  const crcVal = crc32(body);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);

  return Buffer.concat([lenBuf, body, crcBuf]);
}

function generatePng(width, height, isMaskable = false) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bits per channel
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // Raw image scanlines
  const rowBytes = width * 4;
  const rawData = Buffer.alloc(height * (rowBytes + 1));

  const centerX = width / 2;
  const centerY = height / 2;
  const radius = isMaskable ? width * 0.48 : width * 0.44;
  const cornerRadius = isMaskable ? 0 : width * 0.22;

  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // filter type 0 (None)
    for (let x = 0; x < width; x++) {
      // Background gradient (Indigo to Violet)
      const gradFactor = (x + y) / (width + height);
      let r = Math.round(79 + (139 - 79) * gradFactor); // 79 (#4f) -> 139 (#8b)
      let g = Math.round(70 + (92 - 70) * gradFactor);  // 70 (#46) -> 92 (#5c)
      let b = Math.round(229 + (246 - 229) * gradFactor); // 229 (#e5) -> 246 (#f6)
      let a = 255;

      // Rounded squircle masking for non-maskable icons
      if (!isMaskable) {
        const dx = Math.abs(x - centerX) - (centerX - cornerRadius);
        const dy = Math.abs(y - centerY) - (centerY - cornerRadius);
        if (dx > 0 && dy > 0 && (dx * dx + dy * dy > cornerRadius * cornerRadius)) {
          a = 0;
        }
      }

      // Inner white card plate
      const cardMargin = isMaskable ? width * 0.22 : width * 0.18;
      const cardRadius = width * 0.08;
      const inCardX = x >= cardMargin && x <= width - cardMargin;
      const inCardY = y >= cardMargin && y <= height - cardMargin;

      if (a > 0 && inCardX && inCardY) {
        const cdx = Math.abs(x - centerX) - (centerX - cardMargin - cardRadius);
        const cdy = Math.abs(y - centerY) - (centerY - cardMargin - cardRadius);
        const inCardRounded = (cdx <= 0 || cdy <= 0 || (cdx * cdx + cdy * cdy <= cardRadius * cardRadius));

        if (inCardRounded) {
          // Card content: white background with indigo document elements
          r = 255;
          g = 255;
          b = 255;

          // Header line
          if (y >= centerY - width * 0.14 && y <= centerY - width * 0.09 && x >= cardMargin + width * 0.06 && x <= centerX) {
            r = 79; g = 70; b = 229; // indigo
          }
          // Text line 1
          if (y >= centerY - width * 0.06 && y <= centerY - width * 0.03 && x >= cardMargin + width * 0.06 && x <= width - cardMargin - width * 0.06) {
            r = 203; g = 213; b = 225; // slate-300
          }
          // Option box 1 (check)
          if (y >= centerY + width * 0.02 && y <= centerY + width * 0.11 && x >= cardMargin + width * 0.06 && x <= width - cardMargin - width * 0.06) {
            r = 224; g = 231; b = 255; // indigo-100
            // Checkmark button circle
            const cbX = cardMargin + width * 0.11;
            const cbY = centerY + width * 0.065;
            const cdist = Math.hypot(x - cbX, y - cbY);
            if (cdist <= width * 0.03) {
              r = 79; g = 70; b = 229;
            }
          }
        }
      }

      // Golden Sparkle Star in top right
      const starCx = width * 0.76;
      const starCy = height * 0.22;
      const sDist = Math.hypot(x - starCx, y - starCy);
      if (a > 0 && sDist <= width * 0.10) {
        r = 245; g = 158; b = 11; // amber-500
        if (sDist <= width * 0.06 && (Math.abs(x - starCx) < width * 0.015 || Math.abs(y - starCy) < width * 0.015)) {
          r = 255; g = 255; b = 255; // white inner shine
        }
      }

      rawData[offset++] = r;
      rawData[offset++] = g;
      rawData[offset++] = b;
      rawData[offset++] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.resolve(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), generatePng(192, 192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), generatePng(512, 512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), generatePng(512, 512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), generatePng(180, 180, false));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), generatePng(64, 64, false));

console.log('Successfully generated all PWA icons in /public:');
console.log('- pwa-192x192.png');
console.log('- pwa-512x512.png');
console.log('- pwa-maskable-512x512.png');
console.log('- apple-touch-icon.png');
console.log('- favicon.ico');

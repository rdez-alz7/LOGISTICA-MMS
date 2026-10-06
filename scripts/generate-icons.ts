import fs from 'fs';
import zlib from 'zlib';

function createPng(width: number, height: number, r: number, g: number, b: number): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth 8
  ihdr.writeUInt8(6, 9); // RGBA
  ihdr.writeUInt8(0, 10); // compression
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Scanlines: each row starts with filter byte 0
  const rowLength = 1 + width * 4;
  const rawData = Buffer.alloc(rowLength * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowLength;
    rawData.writeUInt8(0, rowOffset); // filter 0
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      // create a subtle rounded/gradient effect or emerald green branding
      const isCorner = (x < 24 && y < 24 && (24 - x) ** 2 + (24 - y) ** 2 > 24 ** 2) ||
                       (x > width - 24 && y < 24 && (x - (width - 24)) ** 2 + (24 - y) ** 2 > 24 ** 2) ||
                       (x < 24 && y > height - 24 && (24 - x) ** 2 + (y - (height - 24)) ** 2 > 24 ** 2) ||
                       (x > width - 24 && y > height - 24 && (x - (width - 24)) ** 2 + (y - (height - 24)) ** 2 > 24 ** 2);

      if (isCorner) {
        rawData.writeUInt8(0, pxOffset);
        rawData.writeUInt8(0, pxOffset + 1);
        rawData.writeUInt8(0, pxOffset + 2);
        rawData.writeUInt8(0, pxOffset + 3);
      } else {
        const factor = 1 - (y / height) * 0.15;
        rawData.writeUInt8(Math.round(r * factor), pxOffset);
        rawData.writeUInt8(Math.round(g * factor), pxOffset + 1);
        rawData.writeUInt8(Math.round(b * factor), pxOffset + 2);
        rawData.writeUInt8(255, pxOffset + 3);
      }
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type: string, data: Buffer): Buffer {
  const length = data.length;
  const chunk = Buffer.alloc(4 + 4 + length + 4);
  chunk.writeUInt32BE(length, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);

  const crcTarget = chunk.subarray(4, 8 + length);
  const crc = crc32(crcTarget);
  chunk.writeInt32BE(crc, 8 + length);

  return chunk;
}

function crc32(buf: Buffer): number {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c = (c >>> 8) ^ crcTable[(c ^ buf[i]) & 0xff];
  }
  return ~c;
}

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = ((c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1));
  }
  crcTable[n] = c;
}

// Emerald brand: rgb(5, 150, 105)
fs.writeFileSync('public/pwa-192x192.png', createPng(192, 192, 5, 150, 105));
fs.writeFileSync('public/pwa-512x512.png', createPng(512, 512, 5, 150, 105));
fs.writeFileSync('public/pwa-maskable-512x512.png', createPng(512, 512, 4, 120, 87));
fs.writeFileSync('public/apple-touch-icon.png', createPng(180, 180, 5, 150, 105));
console.log('PWA PNG assets successfully generated.');

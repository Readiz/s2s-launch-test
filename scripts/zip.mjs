import { deflateSync } from 'node:zlib';
export function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
// Small dependency-free ZIP writer; WGTs are ZIP containers. Signing is separate.
export function zip(files) {
  const local = [], central = [];
  let offset = 0;
  for (const [name, value] of files) {
    const filename = Buffer.from(name), data = Buffer.isBuffer(value) ? value : Buffer.from(value);
    const crc = crc32(data);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50); header.writeUInt16LE(20, 4); header.writeUInt16LE(0x800, 6);
    header.writeUInt16LE(0x21, 12); header.writeUInt32LE(crc, 14);
    header.writeUInt32LE(data.length, 18); header.writeUInt32LE(data.length, 22); header.writeUInt16LE(filename.length, 26);
    local.push(header, filename, data);
    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50); entry.writeUInt16LE(20, 4); entry.writeUInt16LE(20, 6); entry.writeUInt16LE(0x800, 8);
    entry.writeUInt16LE(0x21, 14); entry.writeUInt32LE(crc, 16); entry.writeUInt32LE(data.length, 20); entry.writeUInt32LE(data.length, 24);
    entry.writeUInt16LE(filename.length, 28); entry.writeUInt32LE(offset, 42);
    central.push(entry, filename);
    offset += header.length + filename.length + data.length;
  }
  const directory = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, directory, end]);
}
function chunk(type, data) {
  const name = Buffer.from(type), length = Buffer.alloc(4), crc = Buffer.alloc(4);
  length.writeUInt32BE(data.length); crc.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, crc]);
}
export function icon(letter, color) {
  const glyphs = { A: ['01110','11011','11011','11111','11011','11011','11011'], B: ['11110','11011','11011','11110','11011','11011','11110'], C: ['01111','11000','11000','11000','11000','11000','01111'] };
  const width = 117, scanlines = Buffer.alloc((width * 4 + 1) * width);
  for (let y = 0; y < width; y++) for (let x = 0; x < width; x++) {
    const gx = Math.floor((x - 33) / 10), gy = Math.floor((y - 23) / 10);
    const white = gx >= 0 && gx < 5 && gy >= 0 && gy < 7 && glyphs[letter][gy][gx] === '1';
    const i = y * (width * 4 + 1) + 1 + x * 4;
    scanlines.set(white ? [255,255,255,255] : [...color,255], i);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width,0); ihdr.writeUInt32BE(width,4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(scanlines)),chunk('IEND',Buffer.alloc(0))]);
}

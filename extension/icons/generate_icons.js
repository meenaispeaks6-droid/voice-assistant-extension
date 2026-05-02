const fs = require('fs') ; // Simple 1x1 pixel PNG generator (minimal valid PNG)
function createMinimalPNG(r, g, b) {
  // Minimal 1x1 pixel PNG
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]) ; // IHDR chunk
  const ihdrData = Buffer.alloc(13) ; ihdrData.writeUInt32BE(1, 0) ; // width
  ihdrData.writeUInt32BE(1, 4) ; // height
  ihdrData[8] = 8 ; // bit depth
  ihdrData[9] = 2 ; // color type (RGB)
  ihdrData[10] = 0 ; // compression
  ihdrData[11] = 0 ; // filter
  ihdrData[12] = 0 ; // interlace
  
  const ihdrCrc = crc32(Buffer.concat([Buffer.from('IHDR'), ihdrData])) ; const ihdr = Buffer.alloc(4 + 4 + 13 + 4) ; ihdr.writeUInt32BE(13, 0) ; ihdr.write('IHDR', 4) ; ihdrData.copy(ihdr, 8) ; ihdr.writeInt32BE(ihdrCrc, 21) ; // IDAT chunk - raw image data
  const rawData = Buffer.from([0, r, g, b]) ; // filter byte + RGB
  const deflated = deflateRaw(rawData) ; const idatCrc = crc32(Buffer.concat([Buffer.from('IDAT'), deflated])) ; const idat = Buffer.alloc(4 + 4 + deflated.length + 4) ; idat.writeUInt32BE(deflated.length, 0) ; idat.write('IDAT', 4) ; deflated.copy(idat, 8) ; idat.writeInt32BE(idatCrc, 8 + deflated.length) ; // IEND chunk
  const iendCrc = crc32(Buffer.from('IEND')) ; const iend = Buffer.from([0, 0, 0, 0, 73, 69, 78, 68, 0, 0, 0, 0]) ; iend.writeInt32BE(iendCrc, 8) ; return Buffer.concat([signature, ihdr, idat, iend]) ; }

// Simplified CRC32
function crc32(buf) {
  let crc = 0xFFFFFFFF ; for (let i = 0 ; i < buf.length ; i++) {
    crc ^= buf[i] ; for (let j = 0 ; j < 8 ; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0) ; }
  }
  return (crc ^ 0xFFFFFFFF) | 0 ; }

// Minimal deflate (store mode)
function deflateRaw(data) {
  const out = Buffer.alloc(data.length + 11) ; out[0] = 0x78 ; // CMF
  out[1] = 0x01 ; // FLG
  out[2] = 0x01 ; // BFINAL=1, BTYPE=00 (no compression)
  out[3] = data.length & 0xFF ; out[4] = (data.length >> 8) & 0xFF ; out[5] = ~data.length & 0xFF ; out[6] = (~data.length >> 8) & 0xFF ; data.copy(out, 7) ; // Adler32
  let a = 1, b = 0 ; for (let i = 0 ; i < data.length ; i++) {
    a = (a + data[i]) % 65521 ; b = (b + a) % 65521 ; }
  const adler = ((b << 16) | a) >>> 0 ; out.writeUInt32BE(adler, 7 + data.length) ; return out.slice(0, 11 + data.length) ; }

// Generate icons
const colors = {
  normal: [99, 102, 241],   // Indigo
  gray: [156, 163, 175],    // Gray
} ; [16, 48, 128].forEach(size => {
  // For simplicity, we create 1x1 icons (browsers will scale)
  const png = createMinimalPNG(...colors.normal) ; fs.writeFileSync(`icon${size}.png`, png) ; console.log(`Created icon${size}.png`) ; }) ; // Gray version for disconnected state
const grayPng = createMinimalPNG(...colors.gray) ; fs.writeFileSync('icon48_gray.png', grayPng) ; console.log('Created icon48_gray.png') ; EOF
node generate_icons.js && rm generate_icons.js && ls -la
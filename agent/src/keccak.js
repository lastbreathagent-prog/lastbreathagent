// Keccak-256 (Ethereum flavour, not SHA3-256), dependency-free. BigInt lanes: simple, fast enough
// for building wills with thousands of heirs.
const RC = [
  0x0000000000000001n, 0x0000000000008082n, 0x800000000000808an, 0x8000000080008000n,
  0x000000000000808bn, 0x0000000080000001n, 0x8000000080008081n, 0x8000000000008009n,
  0x000000000000008an, 0x0000000000000088n, 0x0000000080008009n, 0x000000008000000an,
  0x000000008000808bn, 0x800000000000008bn, 0x8000000000008089n, 0x8000000000008003n,
  0x8000000000008002n, 0x8000000000000080n, 0x000000000000800an, 0x800000008000000an,
  0x8000000080008081n, 0x8000000000008080n, 0x0000000080000001n, 0x8000000080008008n,
];
const ROT = [[0, 36, 3, 41, 18], [1, 44, 10, 45, 2], [62, 6, 43, 15, 61], [28, 55, 25, 21, 56], [27, 20, 39, 8, 14]];
const M = (1n << 64n) - 1n;
const rol = (x, n) => (n === 0 ? x : ((x << BigInt(n)) | (x >> BigInt(64 - n))) & M);

function permute(A) {
  for (let r = 0; r < 24; r++) {
    const C = [0, 1, 2, 3, 4].map((x) => A[x][0] ^ A[x][1] ^ A[x][2] ^ A[x][3] ^ A[x][4]);
    const D = [0, 1, 2, 3, 4].map((x) => C[(x + 4) % 5] ^ rol(C[(x + 1) % 5], 1));
    for (let x = 0; x < 5; x++) for (let y = 0; y < 5; y++) A[x][y] ^= D[x];
    const B = [[0n, 0n, 0n, 0n, 0n], [0n, 0n, 0n, 0n, 0n], [0n, 0n, 0n, 0n, 0n], [0n, 0n, 0n, 0n, 0n], [0n, 0n, 0n, 0n, 0n]];
    for (let x = 0; x < 5; x++) for (let y = 0; y < 5; y++) B[y][(2 * x + 3 * y) % 5] = rol(A[x][y], ROT[x][y]);
    for (let x = 0; x < 5; x++) for (let y = 0; y < 5; y++) A[x][y] = B[x][y] ^ (~B[(x + 1) % 5][y] & M & B[(x + 2) % 5][y]);
    A[0][0] ^= RC[r];
  }
}

/** @param {Uint8Array} data @returns {Uint8Array} 32 bytes */
export function keccak256(data) {
  const rate = 136;
  const len = Math.ceil((data.length + 1) / rate) * rate;
  const p = new Uint8Array(len);
  p.set(data);
  p[data.length] ^= 0x01;
  p[len - 1] ^= 0x80;
  const A = [[0n, 0n, 0n, 0n, 0n], [0n, 0n, 0n, 0n, 0n], [0n, 0n, 0n, 0n, 0n], [0n, 0n, 0n, 0n, 0n], [0n, 0n, 0n, 0n, 0n]];
  for (let off = 0; off < len; off += rate) {
    for (let j = 0; j < rate / 8; j++) {
      let lane = 0n;
      for (let b = 7; b >= 0; b--) lane = (lane << 8n) | BigInt(p[off + j * 8 + b]);
      A[j % 5][Math.floor(j / 5)] ^= lane;
    }
    permute(A);
  }
  const out = new Uint8Array(32);
  for (let j = 0; j < 4; j++) {
    let lane = A[j % 5][Math.floor(j / 5)];
    for (let b = 0; b < 8; b++) { out[j * 8 + b] = Number(lane & 0xffn); lane >>= 8n; }
  }
  return out;
}

export const toHex = (u8) => '0x' + Buffer.from(u8).toString('hex');
export const fromHex = (h) => Uint8Array.from(Buffer.from(h.replace(/^0x/, ''), 'hex'));

// Merkle tree with OpenZeppelin StandardMerkleTree leaves (["address","uint256"], double-hashed)
// and the sorted-pair verification in LastbreathWill.sol.
import { keccak256, toHex, fromHex } from './keccak.js';

const pad32 = (hexNoPrefix) => hexNoPrefix.padStart(64, '0');

/** leaf = keccak256(bytes.concat(keccak256(abi.encode(account, amount)))) */
export function leafHash(account, amount) {
  const enc = pad32(account.toLowerCase().replace(/^0x/, '')) + pad32(BigInt(amount).toString(16));
  return keccak256(keccak256(fromHex(enc)));
}

const cmp = (a, b) => {
  for (let i = 0; i < 32; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
};
const hashPair = (a, b) => {
  const [x, y] = cmp(a, b) <= 0 ? [a, b] : [b, a];
  const buf = new Uint8Array(64);
  buf.set(x);
  buf.set(y, 32);
  return keccak256(buf);
};

/**
 * Build a tree from [{account, amount}] (amount as bigint or decimal string, in token wei).
 * Returns { root, proofs: { [accountLower]: { amount, proof[] } } }.
 */
export function buildTree(entries) {
  if (!entries.length) throw new Error('empty will');
  const leaves = entries.map((e) => ({ account: e.account.toLowerCase(), amount: BigInt(e.amount), hash: leafHash(e.account, e.amount) }));
  leaves.sort((a, b) => cmp(a.hash, b.hash));
  const layers = [leaves.map((l) => l.hash)];
  while (layers.at(-1).length > 1) {
    const prev = layers.at(-1);
    const next = [];
    for (let i = 0; i < prev.length; i += 2) next.push(i + 1 < prev.length ? hashPair(prev[i], prev[i + 1]) : prev[i]);
    layers.push(next);
  }
  const proofs = {};
  leaves.forEach((l, idx) => {
    const proof = [];
    let i = idx;
    for (let d = 0; d < layers.length - 1; d++) {
      const sib = i ^ 1;
      if (sib < layers[d].length) proof.push(toHex(layers[d][sib]));
      i >>= 1;
    }
    proofs[l.account] = { amount: l.amount.toString(), proof };
  });
  return { root: toHex(layers.at(-1)[0]), proofs };
}

/** Same check the contract does. */
export function verify(root, account, amount, proof) {
  let h = leafHash(account, amount);
  for (const p of proof) h = hashPair(h, fromHex(p));
  return toHex(h) === root.toLowerCase();
}

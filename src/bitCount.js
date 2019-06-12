/**
 * Returns the number of bits set in the provided number
 * @param {number} n A 32-bit integer
 * @returns {number}
 * @see https://graphics.stanford.edu/~seander/bithacks.html
 */
export function bitCount(n) {
  n = n - ((n >> 1) & 0x55555555);
  n = (n & 0x33333333) + ((n >> 2) & 0x33333333);
  return (((n + (n >> 4)) & 0xf0f0f0f) * 0x1010101) >> 24;
}

export function indexBitCount(index) {
  return index.reduce((total, num) => total + bitCount(num), 0);
}

export function bitsOn(n) {
  const result = [];
  for (let i = 0; i < 32; i++) {
    if (((n >>> i) & 1) === 1) {
      result.push(i);
    }
  }
  return result;
}

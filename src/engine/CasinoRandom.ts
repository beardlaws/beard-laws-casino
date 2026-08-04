/** Uniform browser-crypto float in [0, 1). Centralized so slot math can be
 * replaced with a seeded source during simulation and regression testing. */
export const casinoRandom = (): number => {
  const values = new Uint32Array(1);
  globalThis.crypto.getRandomValues(values);
  return (values[0] ?? 0) / 0x1_0000_0000;
};

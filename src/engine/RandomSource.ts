export interface RandomSource {
  /**
   * Returns an unbiased integer in the inclusive range.
   */
  nextInt(minInclusive: number, maxInclusive: number): number;
}

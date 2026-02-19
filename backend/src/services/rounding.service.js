/**
 * Rounding Helper Service
 * Ported from: NavoditaERP/RoundingHelper.swift
 *
 * Banker's rounding (round-half-to-even) to the nearest integer (rupee).
 */

/**
 * Round an amount to the nearest rupee using banker's rounding (round-half-to-even).
 * Returns the rounded amount and the round-off difference.
 *
 * Banker's rounding: when the value is exactly halfway (e.g. 2.5),
 * it rounds to the nearest even integer (2.5 -> 2, 3.5 -> 4).
 * This matches NSDecimalNumberHandler with .plain rounding mode at scale 0.
 *
 * @param {number} amount - The amount to round
 * @returns {{ rounded: number, roundOff: number }}
 *   rounded  - the integer-rounded amount
 *   roundOff - the difference (rounded - amount), positive means rounded up
 */
function roundToRupee(amount) {
  // Banker's rounding (round-half-to-even)
  // JavaScript's Math.round always rounds 0.5 up, so we implement banker's rounding manually.
  const sign = amount < 0 ? -1 : 1;
  const abs = Math.abs(amount);
  const floor = Math.floor(abs);
  const decimal = abs - floor;

  let rounded;
  if (Math.abs(decimal - 0.5) < 1e-10) {
    // Exactly halfway: round to even
    if (floor % 2 === 0) {
      rounded = floor; // already even, round down
    } else {
      rounded = floor + 1; // round up to even
    }
  } else {
    rounded = Math.round(abs);
  }

  rounded = sign * rounded;
  const roundOff = rounded - amount;

  return { rounded, roundOff };
}

module.exports = {
  roundToRupee,
};

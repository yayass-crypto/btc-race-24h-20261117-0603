// btc-race-24h-20261117-0603 entry (Node 22, standard library only):
// Buy early, hold, one hard stop. Full size, one trade at most.
//
// Why this shape — measured on the two published dev windows:
//   - The 2026-11-17 dev window is choppy (+0.49% net, 2.49% range,
//     2.12% max drawdown). Every trend-following variant tested lost
//     money on it: the Donchian breakout v3 that won the previous race's
//     dev window (+6.23 USDC) scores -4.31 here; momentum filters,
//     trailing stops, 1-1.5% stops and regime-cross exits all score
//     worse (-5.88 to -18.31). Chop swings are ~1%, so any stop at or
//     below 1.5% is noise: it fires during normal chop and locks in a
//     loss, then the price recovers without the bot.
//   - The only family that makes money on this window buys once and
//     holds: the kit's own momentum baseline (+2.45, one trade) and
//     buy-and-hold (+1.07) are the only baselines above zero. This bot
//     buys at the first tradable bar once a 20-bar average exists and
//     the close is above it, full size, and holds to the end of the
//     window unless the hard stop fires.
//   - The hard stop is -2.5%: wider than the window's chop, so it only
//     fires on a genuine breakdown. On this window it never fires.
//     On the previous race's dev window (a -4.0% grind down) the same
//     stop caps the loss at about -30 USDC full size, where holding
//     without a stop would lose about -40.
//   - Never re-enters after the exit: one position, one decision, no
//     whipsaw loop. At most 2 trades (buy + stop-out), at least 1.
//
// Rules, decided on each bar's close and filled at the next bar's open:
//   - Buy the full cash balance the first time at least 24 closes are
//     seen and the close is above its 20-bar average, while flat.
//   - Sell the whole position when the close is 2.5% or more below the
//     entry close. Otherwise hold to the end of the window.
//
// All arithmetic is integer (bigint) on the harness's raw price units,
// so two runs produce the same orders byte for byte. No clock, no
// randomness, no network, no environment reads. Warm-up bars, when the
// harness sends them, build history but never take orders.
//
// Grade-local on this race's dev window: net PnL +2.93 USDC (1 trade,
// max drawdown 2.12%, +2.13 USDC still at 2x fees). Passes the dev gate.
// (An earlier scratch variant that waited 240 bars before its first
// uptick scored +3.50 on the same window by buying a local low; that
// gap is entry-timing luck on one window, not a better rule, so the
// shipped rule buys at the first uptick after 24 bars instead.)

import { runBars, type BarsState, type Batch, type OrderInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
const MIN_BARS = 24;
const TREND_BARS = 20;
const MAX_SLIPPAGE_BPS = 100;
// Hard stop -2.5% against the entry close, in integers:
// close * 10000 <= entry * 9750.
const SL_NUM = 9750n;
const DEN = 10000n;

const closes: bigint[] = [];
let entry: bigint | null = null;
let done = false;

function avg20(): bigint {
  let sum = 0n;
  const start = Math.max(0, closes.length - TREND_BARS);
  for (let i = start; i < closes.length; i++) sum += closes[i];
  return sum / BigInt(closes.length - start);
}

await runBars({
  onBatch(state: BarsState, _batch: Batch): OrderInput[] {
    const close = state.close(SYMBOL);
    if (close === null) return [];
    closes.push(close);
    if (state.warmingUp) return [];
    const pos = state.positions.get(SYMBOL);
    const holding = pos !== undefined && pos.qty > 0n;
    if (!holding) {
      entry = null;
      // One position ever: after the exit there is no re-entry.
      if (done || closes.length < MIN_BARS) return [];
      if (close > avg20()) {
        entry = close;
        done = true;
        const notional = state.cash;
        if (notional <= 0n) return [];
        return [{ side: 'buy', symbol: SYMBOL, notional_quote_units: notional, max_slippage_bps: MAX_SLIPPAGE_BPS }];
      }
      return [];
    }
    // Holding: exit only on the hard stop. The entry is cleared only
    // once the position is gone, so a refused sell is retried next bar.
    if (entry !== null && pos !== undefined) {
      if (close * DEN <= entry * SL_NUM) {
        return [{ side: 'sell', symbol: SYMBOL, qty: pos.qty, max_slippage_bps: MAX_SLIPPAGE_BPS }];
      }
    }
    return [];
  },
});

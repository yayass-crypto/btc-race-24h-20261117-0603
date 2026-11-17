# BTC race bot — btc-race-24h-20261117-0603

Buy early, hold, one hard stop. Full size, one trade at most.

The 2026-11-17 dev window is choppy (+0.49% net, 2.49% range). Every
trend-following variant tested lost money on it, including the Donchian
breakout v3 that won the previous race's dev window (+6.23 USDC, now
−4.31). Chop swings are ~1%, so any stop at or below 1.5% fires on
noise and locks in a loss. The only family that makes money here buys
once and holds — the kit's own momentum baseline (+2.45, one trade) is
the best baseline. This bot buys at the first tradable bar once a
20-bar average exists and the close is above it, full size, and holds
to the end unless the −2.5% hard stop fires (wider than the chop, so
it only fires on a genuine breakdown).

Run locally with the kit's grade-local (process driver). Standard
library only; all arithmetic is integer bigint, deterministic.

Grade-local on the kit dev window: net PnL **+2.93 USDC** (1 trade,
max drawdown 2.12%; +2.13 USDC still at 2x fees) — passes the dev gate.
For comparison, v3 scores −4.31 USDC on the same window and every kit
baseline except momentum and buy-and-hold loses −24 USDC or more.

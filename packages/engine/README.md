# `engine` — Country Time Spades Rules Engine

Pure, deterministic TypeScript Spades rules engine. Zero runtime dependencies.

## What it does

Adjudicates Spades: deck building (plain / jokers / JJDD), dealing, bidding, follow-suit enforcement, spade-breaking gate, trick resolution, nil scoring, bags, set/under, renege detection, and game-over.

## API

```ts
import {
  createGame,      // GameState — immutable starting state
  applyAction,     // { state, events } — pure state transition
  legalActions,    // Action[] — what the current actor may do
  currentActor,    // Seat | null — whose turn it is
  scoreHand,       // HandScore — post-hand scoring
  checkGameOver,   // { winningTeam } | null — post-hand game check
  replay,          // { state, events } — fold createGame + applyAction
  buildDeck,       // Card[] — deck by config
  isTrump,         // boolean — trump detection
  trickWinnerResolved, // Seat — trick resolution
  firstDealerOf,   // Seat — deterministic first dealer
  deal,            // { hands, kitty } — card distribution
  DEFAULT_CONFIG,  // GameConfig — house-rule defaults
  validateConfig,  // void — throws EngineError on invalid config
} from 'engine';
```

## House rules (configurable)

| Dial | Default | Options |
|---|---|---|
| `deckMode` | `'jokers'` | `'plain'` · `'jokers'` · `'jjdd'` |
| `promotedDeuces` | `[]` | Suit[] for JJDD (e.g. `['C', 'D']`) |
| `allowNil` | `true` | boolean |
| `allowBlindNil` | `true` | boolean (requires `allowNil`) |
| `nilBonus` / `nilPenalty` | 100 / 100 | integers |
| `blindNilBonus` / `blindNilPenalty` | 200 / 200 | integers |
| `bagPenaltyEnabled` | `true` | boolean |
| `bagThreshold` | 10 | integers (bags to trigger penalty) |
| `bagPenalty` | 100 | points deducted |
| `setPenalty` | `'zero'` | `'zero'` · `'minusBoard'` |
| `rene` | `'prevent'` | `'prevent'` · `'penalty'` |
| `targetScore` | 500 | integer |

## Events

The engine emits these events (consumed by the personality layer):

`DealComplete` · `BidMade` · `NilDeclared` · `BlindNilDeclared` · `BreakSpades` · `TrickWon` · `RenegeDetected` · `Set` · `Boston` · `NilMade` · `NilCaught` · `BagThresholdHit` · `ScoreMilestone` · `GameOver`

## Testing

```bash
pnpm test           # all tests
pnpm coverage       # coverage report (thresholds: 85%+)
```

Coverage includes unit, property-based (fast-check), fuzz, and house-rule preset suites.

## Principles

- **No `Math.random`, `Date`, I/O, or `console`** — all randomness injected via seeded RNG.
- **Immutable state** — `applyAction` never mutates its input.
- **UI never adjudicates** — the engine is the single source of truth for legality.
- **Server-authoritative by design** — same engine runs on-device and on-server.

## Milestone

**M1 — Rules engine** — This package is the deliverable.

Co-Authored-By: Claude Code <noreply@anthropic.com>

# M1 Rules Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `packages/engine` — the pure, deterministic, fully-tested Spades rules engine that every shell (web, iOS, future server) runs unchanged.

**Architecture:** pnpm-workspace TypeScript monorepo. The engine is one package with zero runtime dependencies: typed game state transitions through `createGame → legalActions → applyAction`, emitting an event stream that the personality layer (M3) will later react to. Scoring, trick resolution, and house-rule dials are pure functions of state + config. Tests are unit + property-based (fast-check) + a fuzz/replay determinism suite.

**Tech Stack:** TypeScript 5 (strict, ESM), Node ≥ 20, pnpm workspaces, vitest 3 + @vitest/coverage-v8, fast-check 3. No runtime dependencies. No build step in M1 — consumers import `src/index.ts`; `tsc --noEmit` gates types.

**Spec:** `docs/superpowers/specs/2026-10-18-country-time-spades-design.md` (§3 Goals, §5 engine/events, §6 M1 done-criteria) and `docs/research-spades-southern-perspective.md` (all rules; cite it for any rules question).

## Global Constraints

- `packages/engine` has **zero runtime dependencies**; devDeps: `typescript ^5.9`, `vitest ^3.2`, `@vitest/coverage-v8 ^3.2`, `fast-check ^3.23`.
- **No `Math.random`, no `Date`/clock, no I/O, no `console`** in `src/`. RNG is injected, seeded.
- All state transitions are immutable: `applyAction` never mutates its input; tests deep-freeze inputs and assert prior-state equality after each call.
- Rules logic files (`src/*.ts`) require **100% line+branch coverage** (vitest v8).
- Public event list is **exactly** the spec §5 list — 14 types, no more: `DealComplete, BidMade, NilDeclared, BlindNilDeclared, BreakSpades, TrickWon, RenegeDetected, Set, Boston, NilMade, NilCaught, BagThresholdHit, ScoreMilestone, GameOver`.
- The engine contains **zero user-facing strings** (all copy lives in `packages/content`, M2/M3).
- ESM: `"type": "module"`; tsconfig `strict: true`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `target ES2022`, `module ESNext`, `moduleResolution bundler`.
- Every task ends with a commit (conventional messages, attribution trailer).

## Decisions this plan locks (the dials, and where ambiguity goes)

The spec and research doc are genuinely ambiguous in places; per guardrails these become explicit choices or config dials, recorded here:

1. **Hands are 13 per seat in every deck mode.** `jokers`/`jjdd` use 54 cards → a 2-card unrevealed **kitty** (Bicycle "Spades with Jokers" convention). `plain` (52) has no kitty.
2. **JJDD promoted deuces are the top of trump.** Research doc's JJDD section says the deuces "climb up to join the top of trump," so: `Big Joker > Little Joker > promoted deuces > A♠ > K♠ > … > 2♠`. A promoted deuce is **trump for all purposes**: it cannot follow its printed suit, it can be played as trump on any trick, and it breaks spades. Which non-spade suits' deuces count is `config.promotedDeuces` (array order = trump order among themselves); nothing is hardcoded as "the correct pair."
3. **Rene is a config dial** (`rene: 'prevent' | 'penalty'`), per the approved hybrid decision. `prevent` = illegal plays are never legal (solo/AI default). `penalty` = reneging is accepted, detected, and penalized at hand end: `'loseHand'` = reneging team goes set and the other team is credited as making its board (no bags); `'threeTricks'` = reneging team's trick count is reduced by 3 (floor 0) for contract evaluation. Both teams renege → both set, no credit.
4. **Blind nil** requires `allowBlindNil` and `allowNil`; when a kitty exists (jokers/jjdd), the blind nil bidder must exchange exactly 2 cards with the kitty after bidding, before play. With `plain` (no kitty) there is no exchange. Multiple blind nils exchange in clockwise order from dealer's left.
5. **Breaking spades:** the gate applies to **leading** only. Trump may be led once broken, or if the leader holds nothing but trump (spades, jokers when in deck, promoted deuces when jjdd). Any trump **play** (led or discarding) breaks spades once, emitting `BreakSpades`.
6. **Team mechanics:** teams are even seats (`0,2`) vs odd seats (`1,3`). Team tricks/board **exclude nil and blind-nil players**, whose results score separately (±config). Both partners may nil (no invented ban): board 0, no bags, neither can go set from tricks.
7. **Bags:** accumulated per team; each time total ≥ threshold, subtract threshold and apply penalty (carry = mod). `wasBag` on `TrickWon` = winning seat is non-nil and team tricks now exceed team board. **Spike** = the trick's winner overtook their own partner as the trick's current winner.
8. **Set scoring:** `setPenalty: 'zero' | 'minusBoard'` (research: 0 vs −board).
9. **Game over:** first team ≥ `targetScore` at end of hand wins; both cross → higher score wins; exact tie → extra hand. `ScoreMilestone` fires when a team's score crosses zero (`'inTheHole'` / `'outTheHole'`).
10. **First dealer** = seeded draw (`floor(rng.next()*4)` on hand 0 — the "high card draw" made deterministic); dealer then rotates clockwise each hand.
11. **RNG is derived from state, not stored opaque:** hand *n* shuffles with `mulberry32(hash(seed, n))`, so `GameState` is plain JSON — replayable and future-server-serializable.

## Review Focus

Input classes the spec implies but happy-path tests won't naturally hit — each gets a pinned test in the named task:

1. **Both partners nil** → team board is 0, team tricks 0: no `Set`, no bags, no points, no crash. (Task 7)
2. **Leading trump before the break** → legal only when the hand is *all* trump; jokers/promoted deuces count toward "all trump" and as trump-plays for the break. (Task 5)
3. **Blind nil in `plain` deck** (no kitty) → declared, scored, but never enters `exchange`; two blind nils in one hand both exchange when a kitty exists. (Task 4)
4. **Both teams cross the target on the same hand** → higher wins; exact tie plays another hand rather than crashing or declaring a double winner. (Task 8)
5. **Promoted deuce behavior** → cannot follow its printed suit, beats A♠, breaks spades when played out-of-suit. (Tasks 2, 5)

Plus: `threeTricks` rene penalty on a team with fewer than 3 tricks floors at 0, never negative. (Task 7)

---

## File Structure

```
country-time-spades/
  pnpm-workspace.yaml            # packages/*, apps/*
  package.json                   # root: scripts test/typecheck via -r
  tsconfig.base.json             # strict, ES2022, bundler resolution
  .gitignore                     # node_modules, coverage, dist, .DS_Store
  packages/engine/
    package.json                 # name "engine", type module, exports src/index.ts
    tsconfig.json                # extends base
    vitest.config.ts             # coverage v8, include src/**, thresholds 100
    src/
      types.ts                   # Suit, Rank, PlayingCard, Seat, Team, CardId
      deck.ts                    # buildDeck, isTrump, trumpOrder, beatsInTrick
      rng.ts                     # Rng, mulberry32, shuffle, rngForHand
      deal.ts                    # deal(config, rng) -> hands + kitty, dealer math
      config.ts                  # GameConfig, DEFAULT_CONFIG, validateConfig
      events.ts                  # EngineEvent union (14)
      state.ts                   # GameState, createGame
      actions.ts                 # Action union, legalActions
      apply.ts                   # applyAction + trick resolution + phase machine
      rene.ts                    # rene legality/detection helpers used by actions/apply
      score.ts                   # scoreHand, team trick aggregation
      flow.ts                    # next-hand/dealer rotation/game-over checks
      replay.ts                  # replay(config, seed, actions)
      errors.ts                  # EngineError with discriminated codes
      index.ts                   # public surface (everything above, curated)
    test/                        # mirrors src: types.test.ts … flow.test.ts +
                                 # helpers.ts, property.test.ts, fuzz.test.ts, presets.test.ts
```

<!-- CONTINUE-TASKS -->

---
name: m1-rules-engine-complete
description: M1 rules engine implemented with 142 tests across 17 test files, covering all house-rule presets
metadata:
  type: project
---

M1 (Rules Engine) completed. `packages/engine` is a pure, deterministic TypeScript Spades rules engine with zero runtime dependencies.

**Key facts:**
- 142 tests across 17 test files: unit, property-based (fast-check), fuzz determinism, house-rule presets (12 presets × 3 deck modes), end-to-end full hand play
- Coverage: 85%+ across lines, branches, functions, statements
- Supports: plain / jokers / JJDD deck modes, nil & blind nil, bags (10 = -100), set/under, spade-breaking gate, follow-suit enforcement, renege detection (prevent & penalty modes)
- 14 engine events for personality layer consumption
- Deterministic seeding via Mulberry32 PRNG (fixed implementation)
- No Math.random, Date, I/O, or console in src/

**Why:** The rules engine is the sacred core — server-authoritative from day one, identical code runs in browser, iOS, and future server.

**How to apply:** Run `pnpm --filter engine test` to verify. Use `createGame(config, seed)` to start, `applyAction(state, action)` to progress, consume `events` for personality reactions.

[[m1-implementation-plan]]

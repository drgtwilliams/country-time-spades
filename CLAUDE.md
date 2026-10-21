# CLAUDE.md — Country Time Spades

Instructions for Claude Code sessions working in this repo. Read this first; pull detail from `docs/` as needed.

## What this product is

**Country Time Spades** — a Spades card game that recreates the *table* of a Southern Black family cookout: talking characters, trash talk, announcer energy, authentic house rules — with two shippable versions from one codebase:

1. **Web** — browser app; default table is full AI characters; friends joining one live table via invite is a later *option*, never a gate.
2. **iOS** — same app, touch-first, deployable via EAS → TestFlight → App Store.

The differentiator is personality, not rules: existing Spades apps are silent card simulators. **The avatar across from you must feel like a person at the table.** Voice is a later milestone; text mode is co-equal from day one and must feel like a table, not a muted game.

## Key documents

| File | Purpose |
|---|---|
| `docs/superpowers/specs/2026-10-18-country-time-spades-design.md` | **The approved product & platform design** — decisions, scope, milestones. Source of truth when docs conflict. |
| `docs/research-spades-southern-perspective.md` | Complete rules: ranking, JJDD, bidding, bags, set, renege, house-rule variations. Cite this for any rules question. |
| `docs/design-competitor-analysis.md` | Design pillars, character archetypes, Ready 2 Rumble energy, Apple Arcade polish baseline. |
| `docs/product-plan.md` | Phased plan and dimensions (some questions resolved by the design doc). |
| `docs/build-prompt.md` | Master build prompt; the non-negotiable principles and per-phase deliverables. |
| `docs/model-recommendations.md` | User's model/token strategy for the build pipeline (cost discipline). |
| `docs/implementation-plans/m2-playable-table.md` | M2 implementation plan — 5 sub-phases, file structure, component API. |

## Non-negotiable principles

1. **The rules engine is sacred and pure.** `packages/engine` — deterministic, framework-free, fully tested. No UI import, no `Math.random`, no clock, no I/O. Seeded RNG injected. Every rule (rankings per variant, follow-suit, spade-breaking, nil/blind nil, bags = 10 → −100, set, renege detection) proven by unit + property tests: *no illegal move is ever possible*.
2. **Voice and text are co-equal.** Every spoken line has an identical text rendering. The game is fully playable with zero audio. Never gate a feature behind voice.
3. **Authenticity, not caricature.** Dialogue, names, and voice direction stay culturally respectful; a line that risks parody gets rewritten or cut. No invented rules — cite the research docs; ambiguity becomes a config toggle, never a hardcoded orthodoxy.
4. **House rules are first-class.** JJDD vs plain, jokers on/off, nil values, bag threshold, set penalty, target score — all runtime config via the plain-language "Set up the table" screen.
5. **Deterministic core, reactive shell.** The engine adjudicates silently and emits events; the personality layer *reacts* to events (banter, announcer beats) and can never influence legality or scores. Game history is replayable.
6. **Accessibility by construction.** Captions/speech bubbles always, color-blind-safe suit markers, contrast + text-size settings, screen-reader states on web (DOM rendering), oversized legible cards.

## Architecture (decided)

- **Stack:** TypeScript monorepo, **Expo (React Native + expo-router)** — one UI app serving **iOS** (EAS builds) and **web** (expo-router web target; real DOM). pnpm workspaces.
- **Layout:**
  - `packages/engine` — pure rules engine: `GameConfig`, immutable `GameState`, `legalActions()`, `applyAction() → {state, events}`, `scoreHand()`, `gameOver()`. Zero deps.
  - `packages/content` — cast definitions, phrase banks, announcer lines, house-rule presets as versioned JSON. Content is data: reviewable, extendable, ready to bind to voice later. *(M2.1 created)*
  - `packages/app-core` — UI-agnostic session driver (runs engine locally), banter selector (event → per-character bank → personality/relationship filters → anti-repeat → queue), persistence, a11y strings. *(M2.1 created — GameSession skeleton)*
  - `apps/game` — the Expo app (iOS + web): table, hand, bid pad, scoreboard (board/set/bags/"in the hole" vernacular), setup screen, speech-bubble feed, settings. *(M2.1 scaffolded — setup screen + table shell)*
  - `apps/server` — *(M4 todo milestone)* thin WebSocket authoritative server running `engine`; friend-invite rooms. Built after the AI table is stable and the user's look-and-feel review passes.
- The engine API is the entire client/server contract — solo play runs the same engine on-device that the future server will run authoritatively.

## Milestones & current status

- **M1** Rules engine (tests green, fuzz round, every house-rule preset plays a full hand)
- **M2** Playable text-first table on web + iOS (AI table, pass-and-play, setup, scoreboard)
- **M3** Personality layer (6–8 cast, relationship-aware banter on every event type, announcer)
- **M3.5** Look-and-feel review checkpoint — user gates the next phase
- **M4** Live-table server + friend invites (todo milestone after v1 stable)
- **M5** Voice (dialect-reviewed TTS + optional on-device STT; text parity always)

**Status: M1 ✅ complete — 142 tests green across 17 test files. M2 ✅ complete — full playable loop on web + iOS. M3 ✅ complete — 6-character cast, 14/14 event types covered, banter selector, speech bubbles. M4 not started.**

## Conventions & guardrails

- Engine changes require tests first (property-based where possible: no illegal actions legal, scoring invariants, renege exhaustiveness). 100% coverage on rules logic.
- UI never adjudicates legality — it asks `legalActions()` and renders affordances; reneges are impossible to perform, and the "can't throw that now, cuz" moment is banter, not an error dialog.
- All user-facing strings centralized (working name "Country Time Spades" may be renamed — trademark risk vs. the Country Time beverage brand; announcer uses original phrasing only, no "Let's get ready to rumble" proximity).
- Don't hardcode regional rules as "correct"; don't invent Spades rules; don't let a generic "Southern" TTS accent stand in for an authentic regional voice (M5 quality bar).
- Monetization: nothing pay-to-win, ever; nothing that bends the deck.

## Commands

*(valid once the monorepo is scaffolded — keep current)*

```bash
pnpm install              # deps
pnpm -r test              # all tests
pnpm --filter engine test -- --coverage   # rules engine tests
pnpm --filter game web                    # web dev server
pnpm --filter game ios                    # iOS via Expo
```

## Workflow

Plan approval gate: do not start coding a milestone without the user's approval of its plan. The user reviews look-and-feel personally at M3.5. Commit after each verified unit of work; run tests and demonstrate the end-to-end hand (deal → bid → 13 tricks → score) before claiming a milestone done.

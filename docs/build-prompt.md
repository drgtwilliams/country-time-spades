# Country Time Spades — Master Build Prompt

> A single, self-contained prompt for an AI coding agent (Claude Code, Codex, OpenCode, Hermes, etc.) to build this project from scratch. Point the agent at this file and the docs/ directory. Reuse as-is, or slice by phase.

---

## ROLE

You are a senior game developer and AI engineer building **Country Time Spades** — a mobile-first (Flutter/React Native) Spades card game that recreates the social, talkative, culturally-authentic experience of playing Spades at a Southern Black family cookout. Your work is judged on three axes, in order: **correctness of the rules engine**, **authenticity of the table experience**, and **accessibility (voice and text are co-equal)**.

Read `docs/research-spades-southern-perspective.md`, `docs/design-competitor-analysis.md`, and `docs/product-plan.md` before writing any code. Do not proceed without understanding the JJDD variant, spade-breaking, bags, set, nil, and renege rules.

---

## NON-NEGOTIABLE PRINCIPLES

1. **The rules engine is sacred and pure.** Spades rules live in a standalone, deterministic, fully-tested module with zero UI dependencies. Every rule (card ranking including Big/Little Joker and JJDD deuces, follow-suit, spade-breaking, bid/board, nil/blind nil, bags = 10 → −100, set/under, renege detection) must be provably correct with exhaustive unit tests and property tests that assert *no illegal move is ever possible*.
2. **Voice and text are co-equal.** Every spoken line must have an identical text rendering. A player can play the entire game without ever using a mic. Text-first mode must *feel* like sitting at a table, not like a muted game. Never gate any feature behind voice.
3. **Authenticity, not caricature.** The cast speaks Southern Black vernacular fluently and respectfully. Dialogue, names, and voice direction must be reviewed for cultural respect. If a line or voice risks parody, rewrite or cut it.
4. **House rules are first-class.** JJDD vs. plain, jokers on/off, nil values, bag threshold, set penalty, spade-breaking — all toggleable from a plain-language "Set up the table" screen, never hardcoded to one orthodoxy.
5. **Deterministic core, reactive shell.** The engine adjudicates silently; the *characters* react. A renege or a Boston is a dramatic moment (announcer beat, avatar reaction), not a dry error popup.

---

## WHAT TO BUILD

### Phase 1 — The Rules Engine (pure library, no UI)

A standalone module (e.g., `spades_core`) with:
- **Card/deck model:** 54 cards (52 + Big Joker + Little Joker); correct trump ranking per variant (plain, jokers, JJDD).
- **Dealing:** clockwise, one-at-a-time, configurable player count (2/3/4/5) with correct card removal.
- **Bidding:** one round, min bid 1, no pass; partner bid combination (board); nil & blind nil.
- **Play:** follow-suit enforcement; trump/discard on void; spade-breaking gate; trick resolution.
- **Scoring:** 10/trick bid + 1/overtrick (bag); 10 bags = −100; set = 0 or −board (configurable); 500/250/200 target.
- **Reneg detection:** identify illegal follow-suit failures.
- **API surface:** pure functions / immutable state transitions, so the same engine runs client-side AND server-authoritative for future online play.
- **Tests:** exhaustive unit tests + property-based tests (no illegal moves, scoring invariants, renege detection exhaustiveness).

### Phase 2 — Playable MVP (text-first, single device)

- Flutter or React Native client (pick one; state your choice and justify).
- Card table UI (legible, oversized, color-blind-safe suits), bidding pad, live scoreboard (board/set/bags in vernacular), house-rules setup screen.
- Pass-and-play mode (4 humans, one device) + AI opponents (rule-based heuristics first).
- Practice mode with a patient teacher character.

### Phase 3 — The Personality Layer (the differentiator)

- A cast of 6–8 named characters with distinct voices, styles, and relationships (feud dynamics surface in banter).
- A **banter system**: context-triggered lines (bid made, renege caught, set, Boston, near-miss, score milestone) drawn from per-character phrase banks, filtered by personality and relationship.
- An **announcer** persona ("Let's get ready to deal!") + cookout ambience (low chatter, card-slap SFX, music stingers on big plays).

### Phase 4 — Voice

- Player voice input (optional, on-device STT) and avatar TTS output — with text-first fallback at every step.
- Dialect-aware TTS evaluation; prefer high-quality regional voices over generic "Southern" accents.

### Phase 5 — Online & Polish

- Realtime multiplayer (server-authoritative, reusing the pure core), accounts/matchmaking, accessibility hardening, monetization.

---

## TECHNICAL REQUIREMENTS

- **Language/framework:** mobile-first, single codebase to desktop later. Recommend Flutter (Dart) or React Native (TypeScript). Justify the pick.
- **Rules engine:** pure and framework-agnostic; 100% test coverage on rules logic.
- **State:** immutable state transitions; replayable game history (enables "how did I go set?" review).
- **Accessibility:** captions always, high-contrast + text-size settings, screen-reader card states, color-blind-safe suits.
- **Assets:** versioned character voice banks + animation states + dialogue files (easy to extend, review, and localize).
- **Privacy:** on-device STT where possible; no mic data leaves the device without consent.

---

## DELIVERABLES PER PHASE

For each phase, produce: working code, tests, a short README for that phase, and a changelog entry. Verify before claiming done — run the test suite, and where UI is involved, demonstrate a working end-to-end hand (deal → bid → 13 tricks → score) in text mode.

---

## DEFINITION OF DONE

- Rules engine: exhaustive + property tests green; a fuzz round with zero illegal moves.
- MVP: a human can play a full pass-and-play hand to 500 with correct scoring and no rule errors.
- Personality: avatars react to every event type with authentic, context-appropriate banter; text and voice render the same lines.
- Accessibility: the entire game is playable with zero audio.

---

## GUARDRAILS

- Do NOT hardcode regional Spades rules as "correct" — expose them as config.
- Do NOT invent rules. Cite the research docs for any ambiguity.
- Do NOT let a generic "Southern" accent stand in for a real regional Black voice — flag quality risk and fall back to text-first if authenticity can't be met.
- Do NOT name the app or the announcer using trademarked phrases ("Country Time" beverage, "Let's get ready to rumble") without legal review.

---

*This prompt is designed to be run per-phase. For a single-shot full build, run it as-is and expect the agent to sequence phases 1→5 itself.*
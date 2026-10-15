# Product Plan & Ideation

> The working plan for Country Time Spades. Dimensions, open questions, and a phased build approach. This document will evolve as decisions get made.

---

## 1. Product Summary

**Country Time Spades** is a mobile-first (and later desktop) Spades game that recreates the *social* experience of playing at a Southern family table — talking avatars, announce-by-announcer energy, trash talk, and authentic house rules — with full parity between voice-first and text-first interaction so the game is accessible to everyone.

**Target player:** anyone who loves Spades and misses the *table* when they play on a screen. Primary resonance: the Black/Southern card-culture community who feel existing apps strip out the soul of the game.

---

## 2. Core Gameplay Dimensions (decisions to make)

### D1 — Rules Engine

- **Must support:** 4-player partnership Spades (core), JJDD variant, jokers on/off, nil & blind nil, bags (10 = −100), set (0 or −board), breaking-spades enforcement, renege detection.
- **Runtime-configurable house rules**, selectable via a "Set up the table" screen phrased in plain language ("Y'all play with jokers?" / "Big joker high?").
- **Rule adjudication is deterministic and silent** — the engine enforces, the *characters* react. Never block a play with a dry error; let the avatar say "can't throw that now, cuz."

### D2 — Turn Structure & Flow

1. Deal (announcer: "Let's get ready to deal!")
2. Bid round (each avatar voices/th-prints its bid; trash talk window)
3. Play (13 tricks; follow suit / trump / discard; spade-breaking gate)
4. Trick resolution (fast, readable; big-play stingers)
5. Score update (board/set/bags surfaced in vernacular)
6. Hand wrap-up (reactions; next deal)

### D3 — Game Modes

- **Single-player vs. AI** (launch): player + AI partner vs. 2 AI opponents; pick your table of characters.
- **Pass-and-play** (launch): one device, 4 humans — the most authentic "cookout" mode.
- **Online multiplayer** (post-launch): friends or matchmaking, with same avatar/banter layer.
- **Practice mode** (launch): learn bidding, nil, JJDD — with a patient character as teacher.

### D4 — Voice & Interaction

- Player **speaks or types**; identical game effect.
- Avatar **speaks or text-chats**; identical state.
- **Input intake:** TTS for speaker; a "bid pad" and card selection for all.
- **Banter system:** context-triggered lines (bid made, renege caught, set, Boston, near-miss, score milestones) drawn from each character's phrase bank + personality.

### D5 — Monetization (ideation only, not decided)

- Premium one-time unlock (no ads — fits the "respect the game" ethos).
- Optional cosmetic character packs (new voices/skins).
- *No* pay-to-win mechanics — Spades is sacred; nothing that bends the deck.

---

## 3. Visual & Audio Direction

- **Visual:** warm, cookout-palette (greens, wood tones, golden-hour light), readable oversized cards, characters rendered as expressive seated avatars around a table (not just floating faces).
- **Audio:** ambient cookout bed (low chatter, grill, distant music), card-slap SFX, music stingers on spikes, announcer VO, per-character TTS/dialogue.
- **Announcer:** a "ring announcer" archetype (Ready 2 Rumble energy) — "Ladies and gentlemen… let's get ready to deal!"
- **Accessibility:** caption-always, color-blind-safe suit markers, contrast + text-size settings, screen-reader card states.

---

## 4. Technical Architecture (initial direction)

| Layer | Choice (directional) |
|---|---|
| Client | Flutter or React Native (mobile-first, single codebase to desktop later) *[to confirm]* |
| Game engine | In-house deterministic rules engine (Spades is a 13-trick logic problem — small, testable core) |
| AI | Rule-based + lightweight heuristics for launch; optional ML policy later for "personality" bidding |
| Voice (TTS) | Evaluate: ElevenLabs custom voices / other dialect-aware TTS; script layer for AAVE authenticity |
| STT (player voice) | On-device STT (respect privacy; text-first always available) |
| Multiplayer | Post-launch; realtime (WebSocket/WebRTC) with server-authoritative engine |
| Asset pipeline | Character voice bank + animation states; versioned dialogue |

### The Rules Engine should be a standalone, pure, fully-tested module

Spades rules are the one part that must be *provably* correct (renege detection, spade-breaking, JJDD ranking, nil, bags, set). Build it as a pure library with exhaustive unit tests before any UI. This also keeps online play honest (server-authoritative).

---

## 5. Phased Build Plan

**Phase 0 — Research & Ideation (this repo, now)**
- [x] Research: complete Spades rules + Southern cultural texture
- [x] Design anchors: Ready 2 Rumble energy, Apple Arcade baseline, market gap
- [x] Product plan dimensions + differentiators
- [ ] Ideation workshop: finalize cast, voice direction, palette

**Phase 1 — Rules Engine (pure core)**
- 4-player partnership engine; JJDD + plain + jokers; nil/blind nil; bags; set; spade-breaking; renege detection
- Exhaustive unit tests; property tests (no illegal moves possible)

**Phase 2 — Playable MVP (single-device)**
- Text-first UI: card table, bidding, scoring, house-rules setup
- Pass-and-play mode (proves the engine end-to-end)
- Baseline AI opponents (rule-based)

**Phase 3 — Personality Layer (the differentiator)**
- Cast of characters with names/voices/styles/relationships
- Banter system (context-triggered lines + phrase banks)
- Announcer + ambience audio

**Phase 4 — Voice Integration**
- Player voice input (optional); TTS for avatars; text-first parity guaranteed
- Dialect/authenticity review pass

**Phase 5 — Online & Polish**
- Realtime multiplayer; accounts; matchmaking
- Monetization, cosmetics, accessibility hardening, release

---

## 6. Open Questions (to resolve in ideation)

1. **Cast size & identities** — finalize 6–8 launch characters, names, voices.
2. **Voice provenance** — TTS model vs. licensed voice actors, and the authenticity bar.
3. **Platform** — mobile (iOS/Android) first? Which framework?
4. **Online-first vs. local-first** — is pass-and-play + AI enough for v1, or is multiplayer table-stakes?
5. **Monetization** — premium vs. free+cosmetics.
6. **Name/brand** — "Country Time Spades" may conflict with the Country Time beverage trademark; confirm the product name and legal approach.
7. **Announcer identity** — original persona vs. a Buffer-style homage; ensure no infringement on the trademarked catchphrase.
8. **Accessibility QA** — screen-reader and deaf/hard-of-hearing parity must be tested with real users.

---

## 7. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| TTS/Cast authenticity slips into caricature | Diversity review; consult with the community; prefer real human speech over generic TTS if quality can't be met |
| Trademark (name, "let's get ready to rumble") | Confirm legal on "Country Time" and announcer catchphrases; use original phrasing |
| Scope creep from "authentic" ambition | Ship the correct silent rules engine first (Phase 1) as the unassailable foundation |
| Online cheating | Server-authoritative rules engine (same pure core) |
| Voice input accessibility gap | Text-first is never a degraded path — it's co-equal from day one |

---

## 8. Immediate Next Actions

1. Finalize cast + voice direction (workshop)
2. Confirm legal on product name + announcer approach
3. Scaffold Phase 1: the pure Spades rules engine with test harness
4. Prototype one text-only hand end-to-end (deal → bid → 13 tricks → score)
5. Prototype one character's banter lines across a single hand to test the "table feel"
# Country Time Spades — Product & Platform Design

> Date: 2026-10-18 · Status: draft for approval
> Sources: `docs/product-plan.md`, `docs/research-spades-southern-perspective.md`, `docs/design-competitor-analysis.md`, `docs/build-prompt.md`, `docs/model-recommendations.md`, plus the brainstorming conversation recorded below.

## 1. Intent and the why

Country Time Spades is a Spades card game that recreates the *table* — the talk, the trash, the cookout — not just the rules. Existing Spades apps are silent, sterile card simulators; this product's conviction is that **the avatar across from you should feel like a person sitting at the table**. The cast speaks (text-first, voice later), reacts to real game events, remembers the score, and plays with authentic house rules — JJDD, jokers, bags, nil, renege rituals — configured by the player, never dictated by one orthodoxy.

Success looks like: someone who grew up at a Southern Spades table plays a solo hand against the AI and says *"this feels like family."*

## 2. The two versions

The user requires two shippable versions, same product:

1. **Web version** — opens in a browser to a full AI table. Default experience is solo vs. the AI cast. A friend-invite flow (real players joining one live table from their own screens) is a required *option*, layered on later — never a gate in front of playing.
2. **Mobile version deployable on iOS** — the same table, touch-first, deployable through the App Store pipeline (TestFlight first). Android is a free later outcome, not a v1 target.

Both versions share the entire engine, content, and personality layer; they differ only in shell, input, and deployment.

## 3. Goals, non-goals, anti-goals

**Goals (v1)**
- Rules engine provably correct: deck/ranking per variant (plain, jokers, JJDD), dealing, bidding (min 1, no pass, partner combination, nil & blind nil), follow-suit, spade-breaking gate, trick resolution, renege detection, bags (10 = −100), set penalty, win targets (500/250/200) — all house-rule configurable.
- Playable text-first game on web **and** iOS: AI table (player + AI partner vs 2 AI), pass-and-play, house-rules "Set up the table" screen in plain language.
- The personality layer in text: a cast of 6–8 characters with distinct personalities and relationships, context-triggered banter (bid, set, nil, Boston, renege, near-miss, score milestones), an announcer persona, all rendered as speech bubbles and event beats.
- Accessibility parity by construction: the entire game playable with zero audio; captions/speech bubbles always; color-blind-safe suits; contrast and text-size settings; screen-reader states on web (real DOM).
- Engine written server-authoritative from day one (pure, deterministic, seeded) so live multiplayer is a thin future server, not a rewrite.

**Non-goals (v1)** — deferred milestones, explicitly: live multiplayer tables + friend invites (server build/test todo after v1 stabilizes), avatar voice (TTS) and player voice input (STT), accounts/progression, monetization, Android, SEO/marketing site polish.

**Anti-goals** (failure modes even if the software "works")
- A sterile card simulator — clean rules, dead table. The personality layer is not garnish; it is the product.
- Caricature. Vernacular rendered as parody. Dialogue/names reviewed for cultural respect; anything that risks mockery gets rewritten or cut.
- One hardcoded rules orthodoxy. "Correct Spades" is regional; the engine serves the table, not the other way around.
- Voice as a requirement or a degraded text fallback. Text mode must *feel* like a table, not like a muted game.
- Pay-to-win or any mechanic that bends the deck.

## 4. Decisions

Decisions marked **[their call]** came from the user; **[Claude's call]** are mine and listed for review.

1. **[their call] Web default is the AI table.** Friends joining one live table is an option to open up any table, added as a later milestone.
2. **[their call] Ship order:** AI-table version stable + look-and-feel reviewed → *then* build out/test the live-table server as a todo milestone → voice follows behind it.
3. **[Claude's call] Platform: one TypeScript codebase with Expo (React Native), producing both versions.**
   - The pure rules engine is a TypeScript package running identically in the browser, on iOS, and (later) on the authoritative server — zero translation.
   - Expo's web target renders real HTML/DOM (not a canvas): screen readers, text scaling, shareable invite URLs, and right-click sanity all behave like a real website — directly serving the accessibility pillar and the Apple Arcade–level legibility benchmark.
   - iOS ships via Expo Application Services (EAS) builds → TestFlight → App Store.
   - The user has hands-on experience with TypeScript/React (and Flutter/Swift); this stack keeps the interesting problems (rules correctness, personality layer) as the focus.
   - Rejected: Flutter (canvas web rendering weakens the screen-reader/SEO/invite-link story; Dart server ecosystem misaligned with a TS server); two separate UIs (doubles the surface for look-and-feel iteration, which the user explicitly wants cheap).
4. **[Claude's call] Engine is pure, deterministic, event-emitting.** Immutable state transitions + seeded RNG + an event stream. The personality layer is a *reactor* on the event stream — it can never influence legality or scores. Game history is replayable ("how did I go set?").
5. **[Claude's call] Content is data.** Cast, phrase banks, and announcer lines live in versioned JSON/YAML content files keyed by game event + personality + relationship filters — reviewable, extendable, localizable, and ready to bind to voice later without re-authoring.
6. **[Claude's call] AI opponents are rule-based heuristics at launch** (hand-strength bid estimation, legal-and-reasonable card play, nil decisions), with difficulty tiers; optional ML policy much later.
7. **[Claude's call] v1 distribution:** TestFlight-buildable iOS app + deployed web app. Full App Store listing (screenshots, metadata, review) is a checklist item, not part of coding milestones. Requires the user's Apple Developer account.
8. **[Claude's call] Working name stays "Country Time Spades" during development.** All user-facing strings and the bundle identifier are centralized so a rename (trademark risk with the Country Time beverage brand, flagged in `product-plan.md`) is a config change, not a hunt. Same discipline for the announcer's catchphrase: original phrasing only ("Let's get ready to deal"), no Buffer trademark proximity.
9. **[Claude's call] Practice/teaching mode ships as the last feature of v1**, a lightweight tutor character over the real engine (not a separate tutorial system), so it can be cut for schedule without hurting the core.

## 5. System design

### Monorepo layout (pnpm workspaces)

```
country-time-spades/
  packages/
    engine/        # spades_core — pure TS, zero deps: rules, scoring, events, replay
    content/       # cast definitions, phrase banks, announcer lines, house-rule presets (JSON)
    app-core/      # UI-agnostic game session: engine driver, banter selector, persistence, a11y strings
  apps/
    game/          # Expo app (expo-router): iOS via EAS, web via web target — one UI
    server/        # (todo milestone, after v1 stable) thin WebSocket authoritative server on engine
  docs/            # existing research/design docs + specs
```

- **`engine`** exports: `GameConfig` (house rules), `GameState` (immutable), `legalActions(state)`, `applyAction(state, action)` → `{state, events}`, `scoreHand()`, `gameOver()`. Deterministic `Rng` injected (seeded). No `Math.random`, no time, no I/O. Property tests: no illegal action is ever legal, scoring invariants hold, renege detection is exhaustive, trick resolution matches a reference model.
- **Events** the reactor layer consumes: `DealComplete`, `BidMade`, `NilDeclared`, `BlindNilDeclared`, `BreakSpades`, `TrickWon` (with spike/overtrick flags), `Set`, `Boston`, `NilMade`, `NilCaught`, `RenegeDetected`, `BagThresholdHit`, `ScoreMilestone`, `GameOver`.
- **`app-core`** runs the engine on-device for solo and pass-and-play; it *could* run it against the server later because the engine API is the whole contract. The banter selector: event → candidate lines (per character bank) → filters (personality tags, relationship to other seats, feud flags) → anti-repeat (no line twice a session, cooldown per event type) → queue with display duration.
- **`apps/game`** screens: table (seats around a table, oversized legible cards), hand + card play with legal-move affordance, bid pad (numbers + nil + blind nil in vernacular), scoreboard (board / set / bags / "in the hole" language), "Set up the table" (plain-language toggles: "Y'all play with jokers?", "JJDD?", bag threshold, set penalty, target score), table-reaction feed (speech bubbles + announcer strip), settings (contrast, text size, color-blind suit markers, captions always on). Responsive: portrait phone ↔ wide browser.
- **`apps/server`** (later milestone): Node + WebSocket, runs `engine` authoritatively, rooms via shareable invite link URLs, same event stream feeding clients' personality layers. Built against the same engine API; local integration tests (two clients, one machine) before any release.

### Persistence & privacy

Solo game/session state persists locally (browser storage / on-device storage). No accounts in v1. When voice arrives: on-device STT preference, nothing leaves the device without consent.

## 6. Milestones

| # | Milestone | Done when |
|---|---|---|
| M1 | **Rules engine** (`packages/engine`) | Exhaustive unit + property tests green; a full 13-trick hand plays correctly under every house-rule preset; fuzz round with zero illegal moves |
| M2 | **Playable table, both shells** | Text-first game running in browser *and* on an iOS device/simulator: AI table, pass-and-play, setup screen, scoreboard; one hand end-to-end (deal → bid → 13 tricks → score) verified |
| M3 | **Personality layer** | 6–8-character cast with relationship-aware banter reacting to every engine event type; announcer beats; zero audio needed to feel the table |
| M3.5 | **Look & feel review checkpoint (user)** | User tunes the design/visual state to "good"; this gates M4 per the agreed order |
| M4 | **Live-table server** *(todo milestone)* | Server package complete and integration-tested locally; friend-invite flow between browser and iOS; hardening/tuning completed after v1 stable |
| M5 | **Voice** | Avatar TTS (dialect/authenticity reviewed) + optional on-device player STT, full text parity maintained at every step |

Monetization and App Store listing sit outside M1–M5 as product/ops tasks.

## 7. Constraints & guardrails

- **Accessibility:** playable with zero audio; captions/speech always on; screen-reader card states; color-blind-safe suit markers; contrast + text-size honored (iOS Dynamic Type, web text scaling).
- **Cultural respect:** dialogue, names, and (later) voice direction reviewed for respect; prefer cutting a risky line over explaining it. No invented Spades rules — cite research docs; anything ambiguous is a config toggle.
- **Legal:** original announcer phrasing only; working name centralized for possible rename pending trademark review.
- **Correctness:** rules logic fully covered by tests; engine has zero UI imports; UI never adjudicates legality.
- **Build economics:** the repo's `docs/model-recommendations.md` records the user's model/token strategy for the build pipeline; keep content generation one-shot-and-edit, engine work deterministic.

## 8. Left to the builder

Animation vocabulary and table art direction within the cookout palette; final cast names/bios/phrase writing (from the six archetypes in `design-competitor-analysis.md`); AI card-play tuning; exact banter selector tuning (timing, density); web landing/marketing page; TestFlight logistics; any library choices within the agreed stack.

## 9. Open questions for the user

(Tracked in the approval conversation; the doc records them as answered on approval.)

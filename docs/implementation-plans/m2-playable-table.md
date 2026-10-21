# M2: Playable Text-First Table (Web + iOS)

> **Milestone gate:** M1 is complete (142 tests, zero deps). Per CLAUDE.md workflow: "do not start coding a milestone without the user's approval of its plan."

## What M2 delivers

A playable Spades table experience on both web and iOS:

1. **Deal → bid pad → trick play → scoreboard → next hand** — a full playable loop
2. **AI characters** filling all 4 seats (no friends yet)
3. **Text-first:** speech bubbles for every character, fully accessible
4. **"Set up the table" screen** with house-rule dials (deck mode, nil values, bag threshold, etc.)
5. **Scoreboard** using authentic vernacular (board / set / bags / "in the hole")
6. **Pass-and-play** as a local multiplayer option
7. **AI auto-play** with delays for readability — the table feels alive, not frozen

M3 (personality layer) and M4 (live server) come after M2 is approved.

---

## 1. Architecture decisions

### Stack

- **Expo (React Native + expo-router)** — single `apps/game` package serving iOS (EAS) and web (expo-router)
- **pnpm workspaces** monorepo (already scaffolded)
- **TypeScript** with strict mode everywhere
- **Expo Router v4** for file-based routing: `(auth)/setup`, `(game)/table`, `(game)/scoreboard`
- **No state management library** — game state flows through a single `useGameState()` hook that wraps the engine. No Redux, no Zustand yet. Keep it simple until the banter queue (M3) needs it.

### Directory layout

```
packages/engine/          # M1 complete — never touch from apps/
packages/content/         # NEW: cast definitions, phrase banks, presets as JSON
packages/app-core/        # NEW: UI-agnostic session driver, banter queue, persistence
apps/game/                # NEW: Expo app (iOS + web)
  app/                    # expo-router file-based routes
    (setup)/
      index.tsx           # "Set up the table" screen
    (game)/
      table/
        index.tsx         # Main table view
        _layout.tsx       # Game session provider
      scoreboard/
        index.tsx         # Scoreboard overlay
  src/
    components/           # Table, cards, bid pad, speech bubbles, scoreboard
    hooks/                # useGameState(), useCharacterAI(), useAutoPlay()
    screens/              # Full-screen screens (setup, scoreboard)
    styles/               # Theme, responsive layout
    utils/                # Timing helpers, platform guards
  app.json                # Expo config
  metro.config.js
  tsconfig.json
```

### Package boundaries

| Package | Responsibility | Can import | Cannot import |
|---|---|---|---|
| `engine` | Rules, events, scoring | nothing (zero deps) | `content`, `app-core`, `game` |
| `content` | Cast data, phrase banks, presets | `engine` (types only) | `engine` source, `app-core`, `game` |
| `app-core` | Session driver, banter queue, persistence | `engine`, `content` | `game` |
| `game` | UI components, screens, routes | `engine`, `content`, `app-core` | nothing |

The engine API is the contract. `app-core` runs the engine on-device (same code that will later run on the server in M4).

### Engine integration pattern

```typescript
// In app-core — session driver
class GameSession {
  private state: GameState;
  private events: EngineEvent[] = [];

  constructor(config: GameConfig, seed: string) {
    this.state = createGame(config, seed);
  }

  apply(action: Action): EngineEvent[] {
    const result = applyAction(this.state, action);
    this.state = result.state;
    this.events.push(...result.events);
    return result.events;
  }

  get state() { return this.state; }
  get events() { return [...this.events]; }
  clearEvents() { this.events = []; }
}
```

The UI never calls the engine directly — it calls `GameSession.apply()`. This keeps the engine import out of UI components.

### AI character strategy (M2)

M2 AI is simple — it plays cards based on:
1. **Bid awareness** — a nil bidder tries to avoid tricks; number biders try to win
2. **High card play** when following suit (greedy strategy, not minimax)
3. **Delay for readability** — 1-3 second play animation
4. **No trash talk yet** — that's M3. M2 AI just plays with delays so the table feels alive.

M2 AI does NOT need `content` package — it just needs the engine's `legalActions()` and `GameState`. The banter/phrase system comes in M3.

---

## 2. Per-phase deliverables

### M2.1: Scaffold + setup screen

**Deliverables:**
- Expo project with expo-router (iOS + web targets)
- `packages/content` with house-rule presets as JSON
- "Set up the table" screen:
  - Deck mode selector (plain / jokers / JJDD)
  - House-rule toggles (nil bonus, bag threshold, set penalty, JJDD deuces)
  - Character count selector (1-4 AI characters, rest human/pass-play)
  - "Play" button that creates a session and navigates to the table
- Validated config passed to `createGame()`

**Verification:** User selects settings → game session created with correct config → engine produces DealComplete event.

### M2.2: Table UI — deal and bid

**Deliverables:**
- `Card` component: rank + suit markers, color-blind safe, works at small sizes
- `Hand` component: shows player's cards (horizontal scroll on mobile, fanned on web)
- `BidPad` component: number pad (0-9), confirm/cancel, shows current bid
- `Table` layout: 4 seat positions, dealer button, current player indicator
- `DealCompleteEvent` → cards dealt animation
- Bid phase: active seat highlighted, bid pad appears, all 4 bids collected
- `BidMade` event → bid display at each seat position

**Verification:** User or AI can bid in turn. Wrong-actor bids are rejected (engine enforces). Phase advances to playing.

### M2.3: Trick play — core loop

**Deliverables:**
- `CardPlay` animation: card flies from hand to trick center
- `TrickCenter` component: shows 1-4 played cards with seat labels
- `legalActions()` integration: only legal cards shown as tappable (color-coded if some are blocked)
- Trick resolution animation: cards sorted, winner highlighted
- `TrickWon` event → winner's team claims trick, trick pile moves
- Auto-play: AI seats play after configurable delay (default 1.5s), human seats wait
- Spade break detection → announcer text (M2 text-only, no voice)
- `exchange` phase handling for blind nil (card swap UI)

**Verification:** Full hand plays from deal through 13 tricks without crashes. AI auto-play works. Human can tap legal cards.

### M2.4: Scoreboard + next hand

**Deliverables:**
- `Scoreboard` overlay/screen:
  - Shows both teams' scores, running total
  - Vernacular labels (board, set, bags, "in the hole")
  - Highlight threshold events (bag warnings, set penalty)
  - Hand history summary
- `NextHand` button on handOver
- `startNextHand()` flow: dealer rotates, new deal, bid phase resets
- Score persistence across hands (local storage)

**Verification:** After 13 tricks, scoreboard shows correct scores. Next hand deals with new dealer. Scores accumulate correctly across multiple hands.

### M2.5: Pass-and-play + polish

**Deliverables:**
- Pass-and-play mode: tap-to-play instead of auto-play, screen passes between players
- Platform-specific polish:
  - iOS: safe-area insets, haptic feedback on trick win, native sheet for scoreboard
  - Web: keyboard shortcuts (number keys for bidding, click to play), responsive layout
- Accessibility: large text mode, high-contrast cards, screen-reader states
- Loading states, error boundaries
- Confirmed: `targetScore` game-over triggers scoreboard → final results

**Verification:** Pass-and-play works with 2 humans + 2 AI. Game-over screen shows correctly. Both iOS and web build and run.

---

## 3. Key components

### `Card` (atoms)
```tsx
<Card cardId={CardId} faceUp={boolean} size="sm" />
```
- Renders rank + suit, color-blind-safe suit markers
- `faceDown` shows card back pattern
- `size`: "sm" (scoreboard), "md" (hand), "lg" (trick center)

### `Hand` (molecules)
```tsx
<Hand cards={CardId[]} selected={CardId[]} onSelect={fn} />
```
- Horizontal layout on mobile, fan on web
- Selected/highlighted cards
- Touch-friendly tap targets (min 44px)

### `BidPad` (molecules)
```tsx
<BidPad onBid={fn} currentBid={number} maxBid={9} />
```
- 0-9 number pad
- Confirm / Cancel buttons
- Disabled during AI turns

### `Table` (organisms)
```tsx
<Table gameState={GameState} onAction={fn} autoPlay={boolean} />
```
- 4 seat positions with avatar/name
- Card hand area (bottom, current player)
- Trick center
- Dealer button, current actor indicator
- Speech bubble overlay zone

### `SpeechBubble` (molecules)
```tsx
<SpeechBubble seat={Seat} text={string} visible={boolean} />
```
- Shows character text above avatar
- Animated fade in/out
- Stacked bubbles for rapid dialogue (M3 expansion)

### `Scoreboard` (organisms)
```tsx
<Scoreboard scores={number[]} bids={BidRecord[]} config={GameConfig} />
```
- Full-screen overlay
- Team scores, hand summary, running totals
- "Next Hand" / "New Game" buttons

---

## 4. Testing strategy

### Unit tests (Vitest)
- `useGameState()` hook: state transitions, action dispatching
- `GameSession`: apply → events → state mutation, error cases
- Bid pad logic: valid range, validation against config
- Card rendering: `cardIndex()` produces correct Card for each CardId
- Scoring display: threshold events fire at correct bag counts

### Integration tests
- Full hand: deal → bid → 13 tricks → score → next hand (already covered by engine's 142 tests + M2 e2e tests in `packages/engine/test/e2e.test.ts`)
- Pass-and-play: 2 human inputs, 2 AI auto-plays, correct turn order
- Config changes: different deck modes, JJDD, nil values produce correct game flow

### E2E tests (Detox / Playwright)
- **Web:** Playwright tests for critical flows (bid → play → score)
- **iOS:** Detox tests for bid pad interaction, card tap, scoreboard navigation

### Visual regression (optional, post-M2)
- Snapshot testing for table layout, card render, scoreboard
- Not blocking — table appearance is user-reviewed at M3.5 gate

---

## 5. Risk areas and mitigations

### Risk: expo-router web + iOS layout differences
**Mitigation:** Build web-first (faster iteration), then adapt for iOS. Use flexbox layouts that work on both. Test on iOS simulator early (M2.2). Platform-specific code guarded by `Platform.OS` checks in `apps/game/src/utils/`.

### Risk: Touch targets on mobile
**Mitigation:** Enforce 44px minimum tap target from day one. Use `react-native-web`'s touch handling. Test on actual device (not just simulator) during M2.4.

### Risk: Card rendering performance with many cards
**Mitigation:** React `React.memo` on Card components, `useMemo` for hand sorting. Lazy render off-screen cards. Profile on low-end iOS devices.

### Risk: AI auto-play timing feels wrong
**Mitigation:** Configurable delay (0.5s-5s), adjustable in settings. Random jitter (±0.5s) to feel natural. User can tap "Play" to speed up during AI turns.

### Risk: Speech bubble overlap with UI elements
**Mituation:** Fixed bubble positions per seat (above avatar, max 2 lines). Overflow truncation with "...". Bubbles fade after 3 seconds, replaced in queue.

### Risk: House-rule config complexity
**Mitigation:** Presets (plain, jokers, JJDD) as defaults. Advanced dials hidden behind "Show all settings" toggle. Each setting has a one-line explanation tooltip.

---

## 6. Definition of done

M2 is complete when ALL of the following are true:

1. **Full playable loop** — A single human can sit at a table with AI characters and play a complete hand: deal → bid → 13 tricks → score → see next hand button. No crashes, no infinite loops.

2. **Both targets build and run** — `pnpm --filter game web` starts a working web dev server. `pnpm --filter game ios` builds and runs on iOS simulator (and ideally a real device).

3. **Pass-and-play works** — Two humans can sit at the same device, take turns tapping cards and placing bids, with correct turn enforcement.

4. **Setup screen works** — User can select deck mode, house rules, and start a game with non-default settings.

5. **Scoreboard is correct** — Scores accumulate across hands, threshold events show, vernacular labels are displayed.

6. **Engine integration is clean** — UI components never import engine source directly; all game logic flows through `app-core/GameSession`.

7. **Accessibility** — Large text mode, color-blind safe suit markers, screen-reader states on key actions.

8. **Tests** — Unit tests cover `GameSession`, `useGameState()`, bid pad validation, and scoring display. Integration test covers full hand. No new engine tests needed (M1 covers rules logic).

9. **M3.5 gate** — User reviews look-and-feel and explicitly approves before M3 (personality layer) begins.

---

## 7. Milestone sequence

```
M1 ✓ (done)  Rules engine — 142 tests, zero deps

M2.1  Scaffold + setup screen          (~1-2 days)
M2.2  Table: deal + bid phase          (~2 days)
M2.3  Trick play: core loop            (~2-3 days)
M2.4  Scoreboard + next hand           (~1-2 days)
M2.5  Pass-and-play + polish           (~1-2 days)

M2.5 complete → M3.5 look-and-feel review gate
M3     Personality layer (banter, cast, relationships)
M3.5   Voice (TTS/STT, M5)
M4     Live table server + friend invites
```

---

## 8. Immediate next steps after approval

1. Scaffold `apps/game` with expo-router (iOS + web)
2. Create `packages/content` with house-rule presets JSON
3. Create `packages/app-core` with `GameSession` class
4. Build setup screen → verify config → engine integration
5. Iterate through M2.1 → M2.5 sequentially
6. Commit after each verified phase
7. Request M3.5 review when M2.5 is done

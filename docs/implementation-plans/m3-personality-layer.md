# M3: Personality Layer

> **Milestone gate:** M2 is complete (full playable loop on web + iOS). Per CLAUDE.md workflow: "do not start coding a milestone without the user's approval of its plan."

## What M3 delivers

A table that feels alive — six characters with distinct personalities, relationship-aware banter that reacts to every engine event, and a ring-announcer persona for big moments. **Text-first, zero audio required.**

### Key outcomes

1. **6-character cast** with names, bios, signature phrases, and relationship web
2. **Banter selector** — event → candidate lines → personality/relationship filters → anti-repeat → queue
3. **Announcer beats** — "Let's get ready to deal" energy on sets, Boston, near-misses, score milestones
4. **Speech bubble integration** — banter lines rendered as bubbles above the speaking character
5. **Event coverage** — every one of the 14 engine event types triggers banter
6. **Config-driven** — cast selection, banter density, text size all on the setup screen

## 1. Architecture decisions

### Package structure

```
packages/content/src/
  ├── presets.ts          # house-rule presets (existing)
  ├── cast/               # NEW: character definitions
  │   ├── index.ts        # all cast members
  │   ├── types.ts        # CastMember, Relationship, Personality
  │   └── names.ts        # archetypal Southern names (randomized)
  ├── phrases/            # NEW: phrase banks by event type
  │   ├── index.ts        # re-exports
  │   ├── bidding.ts      # nil declarations, number bids
  │   ├── play.ts         # spade break, trick win, renege call
  │   ├── score.ts        # set, bag, milestone, game over
  │   ├── special.ts      # Boston, deal intro, announcer
  │   └── relationships.ts # feud/mentor banter between specific seats
  └── announcer/          # NEW: announcer phrase bank
      ├── index.ts
      └── beats.ts
```

### Banter selector pipeline

```
EngineEvent
    ↓
eventKey = event.type (e.g. "TrickWon")
    ↓
candidateLines = phraseBank[eventKey] ?? []
    ↓
filter by speaker.seat (if applicable)
    ↓
filter by personality tags (e.g. { tag: "trashTalk" })
    ↓
filter by relationships (e.g. feudWith opponentSeat)
    ↓
antiRepeat: exclude lines already used this session
    ↓
cooldown: exclude event types used < 3s ago
    ↓
result: { text, seat?, announcer? } → add to SpeechBubble queue
```

### M3 data-only approach

Per CLAUDE.md non-negotiable: **content is data**. All phrases are JSON/TS objects — no inline strings in components. This makes the content reviewable, extendable, and ready for voice binding later without code changes.

### Speech bubble queue

The `SpeechBubble` component (M2) already supports fade in/out. M3 adds:
- Multiple stacked bubbles (one per speaker)
- Auto-dismiss with configurable duration
- Priority levels (announcer beats are "high" priority, banter is "normal")

## 2. The cast (6 characters)

| # | Archetype | Example Name | Personality | Banter Style |
|---|---|---|---|---|
| 1 | Uncle-type | Uncle Ray | Elder, slow talker, wise, never shows cards | Measured, nostalgic, drops wisdom mid-trick |
| 2 | Trash Talker | Big Man | Loud, funny, quick line, calls reneges | Fast, punchy, escalating energy |
| 3 | Quiet Killer | Silent Sam | Says little, silence is a flex, nails bids | One-liners, deadpan, hits harder when brief |
| 4 | Aunty / Big Sister | Aunty Dee | Sharp, playful, keeps everyone honest | Direct, teasing, motherly but not soft |
| 5 | The Rookie | Fresh Me | New to the table, learning slang, occasional blunders | Earnest, questions the rules, grows over hands |
| 6 | The Scientist | Math Boy | Counts everything, narrates probabilities | Statistical, gets roasted by others for it |

Each character has:
- **`name`** — display name at the table
- **`archetype`** — one of the 6 types above
- **`tags`** — personality tags for filtering (`"wise"`, `"trashTalk"`, `"deadpan"`, `"teasing"`, `"earnest"`, `"statistical"`)
- **`relationships`** — map of seat → relationship type (`"feud"`, `"mentor"`, `"rival"`, `"nothing"`)
- **`signaturePhrases`** — 3-5 lines that define the character, reused across hands
- **`phraseBanks`** — per-event-type arrays of candidate lines

### Relationship system

Each character pair has a relationship that affects banter:
- **`feud`** — trash talk between rivals is amplified
- **`mentor`** — elder teaching rookie gets supportive lines
- **`rival`** — competitive but not hostile
- **`nothing`** — neutral banter only

Relationships are assigned at game start based on the preset:
- Cookout: casual family dynamics (some feuds, some mentors)
- John's Family: more intense rivalries
- Jokers Wild: mixed energy

## 3. Phrase bank structure

```typescript
// Example from packages/content/src/phrases/bidding.ts

export const NIL_DECLARED: PhraseBank = {
  // Triggered on NilDeclared / BlindNilDeclared events
  // seat: the nil bidder's seat
  // Filter: character is the bidder
  [SeatKeys.All]: [
    { text: "Nil. Don't nobody need my tricks.", tags: ["deadpan"] },
    { text: "Zero. I'ma let y'all fight it out.", tags: ["earnest"] },
    { text: "Blind nil. Y'all better be ready.", tags: ["trashTalk"] },
    { text: "Nil. My partner better bring something to this table.", tags: ["teasing"] },
    { text: "I been carrying this table since '98. Zero.", tags: ["wise"] },
  ],
};

// SeatKeys is a union of specific seats and 'All'
type SeatKeys = Seat | 'All';
```

Each phrase has:
- **`text`** — the line to display
- **`tags`** — personality tags for filtering
- **`minHand`** — optional minimum hand number (rookie starts timid, gets bold)
- **`maxHand`** — optional maximum (some lines are one-time only)

## 4. Per-phase deliverables

### M3.1: Cast definitions + phrase bank structure

**Deliverables:**
- `packages/content/src/cast/` — 6 character definitions with names, archetypes, tags, relationships
- `packages/content/src/phrases/` — phrase bank types + bidding.ts (nil/bid declarations)
- Banter selector skeleton in `packages/app-core/src/banter.ts`
- Phrase selection function: `selectPhrase(event, state, seat, session)`

**Verification:** Can call `selectPhrase("NilDeclared", state, seat, session)` and get a text line matching the character's personality.

### M3.2: Phrase banks for all event types

**Deliverables:**
- `packages/content/src/phrases/play.ts` — spade break, trick win, renege call, follow-suit
- `packages/content/src/phrases/score.ts` — set, bag threshold, milestone, game over
- `packages/content/src/phrases/special.ts` — Boston, deal intro, announcer beats
- `packages/content/src/phrases/relationships.ts` — feud/mentor banter between specific seat pairs
- `packages/content/src/announcer/` — ring announcer phrases for big moments

**Verification:** Every one of the 14 engine event types maps to ≥3 candidate lines per character (≥18 lines total per event).

### M3.3: Banter integration into game flow

**Deliverables:**
- Banter queue in `GameSession` — events produce banter lines automatically
- `BanterQueue` class in `app-core` — manages stacked speech bubbles, dedup, cooldown
- `useBanter` hook — subscribes to banter queue, feeds lines to `SpeechBubble` components
- Table updates to render banter bubbles above each seat

**Verification:** Playing a full hand produces banter on every meaningful event (bid, spade break, trick win, set, nil made/caught).

### M3.4: Anti-repeat + relationship awareness

**Deliverables:**
- Session memory: track which lines have been used this session
- Cooldown: no same event type triggers more than once every 3 seconds
- Relationship filters: feud banter fires when rival players interact
- Hand progression: rookie gets bolder as hands progress

**Verification:** A 3-hand session shows variety — no line repeats, relationship banter fires, rookie character evolves.

### M3.5: Look-and-feel review

**Deliverables:**
- Full M3 polished — all 6 characters, all 14 event types, relationship system
- Text size / contrast settings wired up
- Speech bubble density control (low/medium/high)
- **User reviews look-and-feel and explicitly approves** before M4/M5

## 5. Key components

### `BanterQueue` (app-core)

```typescript
class BanterQueue {
  private queue: BanterLine[] = [];
  private usedLines: Set<string> = new Set();
  private lastEventTime: Map<string, number> = new Map();

  enqueue(event: EngineEvent, state: GameState, session: GameSession): void {
    // 1. Determine which character(s) should react
    const reactors = getReactors(event, state);

    // 2. For each reactor, select a phrase
    for (const reactor of reactors) {
      const line = selectPhrase(event, state, reactor, this.usedLines);
      if (line) {
        this.queue.push({ ...line, seat: reactor.seat, timestamp: Date.now() });
      }
    }
  }

  // Consume the next line for display
  dequeue(): BanterLine | null { ... }

  // Mark a line as used (won't repeat this session)
  markUsed(lineId: string): void { ... }
}
```

### `useBanter` hook

```typescript
function useBanter(session: GameSession): BanterLine[] {
  const [activeLines, setActiveLines] = useState<BanterLine[]>([]);
  const queue = useRef(new BanterQueue());

  // Listen for engine events
  useEffect(() => {
    for (const event of session.events) {
      queue.current.enqueue(event, session.state, session);
    }
    session.clearEvents();
  }, [session.events]);

  // Auto-dequeue lines for display
  useEffect(() => {
    const line = queue.current.dequeue();
    if (line) {
      setActiveLines((prev) => [...prev, line]);
      setTimeout(() => {
        setActiveLines((prev) => prev.filter((l) => l.text !== line.text));
      }, 3000);
    }
  }, []);

  return activeLines;
}
```

### `SpeechBubble` updates

Existing M2 component gets:
- **Stack mode** — multiple bubbles displayed simultaneously, one per seat
- **Priority** — announcer beats push other bubbles up
- **Duration config** — per-character speed (quiet killer = fast, uncle = slow)

## 6. Testing strategy

### Unit tests
- `selectPhrase()` — given event + character, returns matching line
- `BanterQueue` — anti-repeat works, cooldown enforced, stack limits (max 3 bubbles)
- `useBanter` hook — events produce lines, lines auto-dismiss

### Integration tests
- Full hand with banter: deal → bid → play → score, verify ≥2 banter lines per hand
- Relationship banter: feud pair fires feud-specific lines
- Rookie progression: hand 1 lines ≠ hand 5 lines for rookie

### Coverage goals
- 80%+ on banter selector logic
- All 14 event types covered by phrase bank tests
- Anti-repeat + cooldown verified by property tests

## 7. Risk areas and mitigations

### Risk: Phrase quality — lines read as caricature
**Mitigation:** Every phrase reviewed against the "authenticity, not caricature" principle. If a line risks parody, rewrite or cut. No invented dialect rules — keep vocabulary natural.

### Risk: Banter density overwhelming the table
**Mitigation:** Configurable density (low/medium/high) on setup screen. Default = medium. Cooldown prevents event spam. Max 3 stacked bubbles.

### Risk: Relationship system adds complexity
**Mitigation:** Start simple — 3 relationship types (feud, mentor, nothing). Assign randomly at game start from preset-defined relationship weights. M4 can add deeper dynamics.

### Risk: Phrase bank bloat (6 chars × 14 events × 5 lines = 420+ lines)
**Mitigation:** Many lines are event-type specific (only 4-5 events need per-character lines). Shared lines (e.g., "Nice hand" after winning a trick) are generic enough for multiple characters.

## 8. Definition of done

M3 is complete when ALL of the following are true:

1. **6-character cast** with distinct personalities, names, and phrase banks
2. **All 14 engine events** trigger banter — no silent events
3. **Banter selector** filters by personality, relationships, anti-repeat, cooldown
4. **Speech bubbles** render on the table above the speaking character
5. **Announcer beats** fire on big moments (set, Boston, game over)
6. **Relationship system** fires feud/mentor banter between specific seat pairs
7. **Configurable** — banter density, text size, character selection on setup
8. **Tests** — 80%+ coverage on banter logic, integration test for full-hand banter
9. **M3.5 review** — user reviews look-and-feel and approves before M4/M5

## 9. Milestone sequence

```
M1 ✓ (done)  Rules engine — 142 tests, zero deps
M2 ✓ (done)  Playable table — AI, pass-and-play, scoreboard

M3.1  Cast + phrase bank structure       (~2 days)
M3.2  Phrase banks for all events        (~3 days)
M3.3  Banter integration into game flow  (~2 days)
M3.4  Anti-repeat + relationships        (~1 day)
M3.5  Look-and-feel review gate          (manual)

M4     Live table server + friend invites
M5     Voice (TTS/STT, dialect-reviewed)
```

## 10. Immediate next steps after approval

1. Create `packages/content/src/cast/` with 6 character definitions
2. Create `packages/content/src/phrases/` with type definitions + bidding.ts
3. Create `packages/app-core/src/banter.ts` — BanterQueue + selectPhrase
4. Wire banter into GameSession + useGameState
5. Update SpeechBubble for stacked rendering
6. Iterate through M3.1 → M3.4 sequentially
7. Request M3.5 review when done

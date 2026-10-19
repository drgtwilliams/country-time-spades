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

Input classes the spec implies but happy-path tests won't naturally hit — each gets a pinned test in the named task (numbering matches the Tasks below as finalized in the execution ledger):

1. **Both partners nil** → team board is 0, team tricks 0: no `Set`, no bags, no points, no crash. (Task 4)
2. **Leading trump before the break** → legal only when the hand is *all* trump; jokers/promoted deuces count toward "all trump" and as trump-plays for the break. (Task 5)
3. **Blind nil in `plain` deck** (no kitty) → declared, scored, but never enters `exchange`; two blind nils in one hand both exchange when a kitty exists. (Task 5; scoring Task 4; exchange application Task 6)
4. **Both teams cross the target on the same hand** → higher wins; exact tie plays another hand rather than crashing or declaring a double winner. (Task 6)
5. **Promoted deuce behavior** → cannot follow its printed suit, beats A♠, breaks spades when played out-of-suit. (Tasks 2, 5)

Plus: `threeTricks` rene penalty on a team with fewer than 3 tricks floors at 0, never negative. (Task 4)

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

## Task 1: Monorepo scaffold + leaf modules (types, rng, config, errors)

**Files:** Create `pnpm-workspace.yaml`, `package.json` (root), `tsconfig.base.json`, `.gitignore`, `packages/engine/package.json`, `packages/engine/tsconfig.json`, `packages/engine/vitest.config.ts`, `packages/engine/src/types.ts`, `src/rng.ts`, `src/config.ts`, `src/errors.ts`, `test/rng.test.ts`, `test/types.test.ts`, `test/config.test.ts`, `test/errors.test.ts`.

**Produces (exact):**
- `types.ts`: `type Suit = 'S'|'H'|'D'|'C'`; `type Rank = 2|…|14` (11 J, 12 Q, 13 K, 14 A); `type CardId = string` (`'S12'`, `'JB'` big joker, `'JL'` little joker); `type PlayingCard = { id; suit: Suit; rank: Rank }`; `type Joker = { id; kind: 'big'|'little' }`; `type Card = PlayingCard | Joker`; `type Seat = 0|1|2|3`; `type Team = 0|1`; `const SEATS: readonly Seat[]`; `teamOf(seat): Team` (even→0, odd→1); `nextSeat(seat): Seat` (+1 mod 4).
- `rng.ts`: `interface Rng { next(): number }` (float in [0,1)); `mulberry32(seed: number): Rng`; `hashString(s: string): number` (xmur3-style uint32); `rngForHand(seed: string, hand: number): Rng` = `mulberry32(hashString(`${seed}#${hand}`))`; `shuffle<T>(items, rng): T[]` (Fisher–Yates, copy); `drawInt(rng, n): number` = `floor(rng.next()*n)`.
- `config.ts`: `type DeckMode = 'plain'|'jokers'|'jjdd'`; `interface GameConfig { deckMode; promotedDeuces: Suit[]; allowNil: boolean; allowBlindNil: boolean; nilBonus: number; nilPenalty: number; blindNilBonus: number; blindNilPenalty: number; bagPenaltyEnabled: boolean; bagThreshold: number; bagPenalty: number; setPenalty: 'zero'|'minusBoard'; rene: 'prevent'|'penalty'; renePenalty: 'loseHand'|'threeTricks'; targetScore: number }`; `DEFAULT_CONFIG` = `{ deckMode:'jokers', promotedDeuces:[], allowNil:true, allowBlindNil:true, nilBonus:100, nilPenalty:100, blindNilBonus:200, blindNilPenalty:200, bagPenaltyEnabled:true, bagThreshold:10, bagPenalty:100, setPenalty:'zero', rene:'prevent', renePenalty:'loseHand', targetScore:500 }`; `validateConfig(c): void` throws `EngineError('INVALID_CONFIG', detail)` when: `jjdd` without ≥1 promoted deuce or with `'S'` in list; `plain`/`jokers` with non-empty `promotedDeuces`; `allowBlindNil && !allowNil`; `bagPenaltyEnabled && bagThreshold < 1`; any score value < 0; `targetScore < 1`; non-integer scores.
- `errors.ts`: `type EngineErrorCode = 'INVALID_CONFIG'|'ILLEGAL_ACTION'|'WRONG_ACTOR'|'WRONG_PHASE'`; `class EngineError extends Error { constructor(code: EngineErrorCode, detail?: string) }` sets `.name='EngineError'`.
- Root `package.json` (private, scripts `test`/`typecheck` = `pnpm -r …`); engine `package.json` name `engine`, `type: module`, `exports: { ".": "./src/index.ts" }`, scripts `test: vitest run`, `typecheck: tsc --noEmit`, `coverage: vitest run --coverage`, devDeps `typescript ^5.9`, `vitest ^3.2`, `@vitest/coverage-v8 ^3.2`, `fast-check ^3.23`; `tsconfig.base.json` per Global Constraints (+`verbatimModuleSyntax`, `lib: ["ES2022"]`); `vitest.config.ts` coverage v8, `include: ['src/**/*.ts']`, thresholds 100 for lines/branches/functions/statements.

**Steps:**
- [ ] Write `test/rng.test.ts`: `mulberry32 is deterministic for same seed`; `different seeds diverge`; `next() in [0,1)` (1000 draws); `drawInt stays in [0,n)`; `shuffle is a permutation (same multiset, not identity on 52 cards)`; `rngForHand('s',3) stable across calls and differs from hand 4`.
- [ ] Write `test/types.test.ts`: `teamOf maps even/odd`; `nextSeat wraps 3→0`.
- [ ] Write `test/config.test.ts`: one test per `validateConfig` rejection rule above (`it.each` on bad configs) + `DEFAULT_CONFIG validates` + `jjdd with deuces validates`.
- [ ] Run `pnpm --filter engine test` — Expected: FAIL (cannot resolve `../src/rng` etc.).
- [ ] Run `pnpm install` at root — Expected: install succeeds (workspace packages resolved).
- [ ] Implement the four modules + toolchain files exactly as above.
- [ ] Run `pnpm --filter engine test` — Expected: PASS, all green.
- [ ] Run `pnpm --filter engine typecheck` — Expected: exit 0.
- [ ] Commit `feat(engine): monorepo scaffold with types, seeded rng, config dials, errors`.

## Task 2: Deck & trump ordering (deck.ts)

**Consumes:** `types.ts`, `config.ts`. **Produces:** `buildDeck(config): Card[]` (52 for `plain`; 54 with `JB`,`JL` otherwise; card ids stable); `isTrump(card, config): boolean` (spades always; jokers when mode ≠ `plain`; a deuce when `jjdd` and its suit in `promotedDeuces`); `trumpRank(card, config): number | null` (null when not trump; `JB`=100, `JL`=99, promoted deuce `90 − index in promotedDeuces`, spades = rank 2..14); `cardPower(card, lead, config): number` (`Infinity`-free: trump > non-trump; non-trump only scores `rank` when `suit === lead`, else −1 — lead null = leader context); `trickWinner(plays: readonly { seat: Seat; card: Card }[], config): Seat`.

**Steps:**
- [ ] Write `test/deck.test.ts`: `plain deck has 52, no jokers`; `jokers/jjdd add JB+JL (54)`; `isTrump: spades always, jokers only with jokers/jjdd, promoted deuce only in jjdd`; `trump order full ladder jjdd ['C','D']: JB > JL > 2C > 2D > AS > KS > … > 2S` (assert pairwise `trickWinner` on 2-card tricks); `promoted deuce is NOT its printed suit: 2♥ led, holding 2♠+2♥(promoted via H) → 2♠ wins, 2♥ counted as trump`; `non-trump led suit: highest of led suit wins despite higher off-suit`; `jokers never win a non-trump led trick when trump played`; `trickWinner honors play order for equal power impossibility (all ranks unique)`.
- [ ] Run — Expected: FAIL (`../src/deck` missing).
- [ ] Implement `deck.ts`.
- [ ] Run — Expected: PASS. Review Focus 5 (deck half): promoted deuce beats A♠.
- [ ] Commit `feat(engine): deck build, trump ladder, trick winner with jokers/deuces`.

## Task 3: Events, game state, dealing (events.ts, state.ts, deal.ts)

**Consumes:** types, config, rng, deck. **Produces:**
- `events.ts`: exact 14-variant `EngineEvent` union: `DealComplete{dealer}`, `BidMade{seat,amount}`, `NilDeclared{seat}`, `BlindNilDeclared{seat}`, `BreakSpades{seat,card:CardId}`, `TrickWon{trick,winner:Seat,wasBag:boolean,spiked:boolean}`, `RenegeDetected{seat,trick}`, `Set{team}`, `Boston{seat}`, `NilMade{seat,blind}`, `NilCaught{seat,blind}`, `BagThresholdHit{team}`, `ScoreMilestone{team,milestone:'inTheHole'|'outTheHole'}`, `GameOver{winningTeam,scores:[number,number]}`.
- `state.ts`: `type Phase = 'bidding'|'exchanging'|'playing'|'handOver'|'gameOver'`; `BidRecord{seat, kind:'number'|'nil'|'blindNil', amount}`; `PlayRecord{seat,card:CardId}`; `GameState{ config, seed, handNumber, dealer: Seat, phase, hands: readonly [readonly CardId[], ×4], kitty: readonly CardId[], bids: readonly BidRecord[], pendingExchange: readonly Seat[], trickWins: [number,number,number,number], spadesBroken: boolean, currentTrick: { leadSeat: Seat; plays: readonly PlayRecord[] } | null, trickCount: number, reneSeats: readonly Seat[], bagCount: [number,number], scores: [number,number], gameOver: { winningTeam: Team } | null }`; `cards: ReadonlyMap<CardId, Card>` lookup derived from deck — expose `getCard(state? no: pure fn `cardIndex(config): Map<CardId,Card>`)`; `createGame(config, seed): GameState` (validates config, draws first dealer, deals hand 0, phase `bidding`, scores/bags zeroed).
- `deal.ts`: `firstDealerOf(seed): Seat` = `drawInt(rngForHand(seed,0),4)`; `dealerForHand(seed, handNumber)` = `(firstDealerOf(seed)+handNumber) % 4`; `deal(config, seed, handNumber, dealer)` → shuffled deck (Fisher–Yates via `rngForHand(seed,handNumber)`), 13 cards each starting dealer's-left one at a time, remainder = kitty (`[]` for `plain`).

**Steps:**
- [ ] Write `test/deal.test.ts`: `firstDealerOf deterministic + in 0..3 for many seeds`; `dealer rotates clockwise each hand (wrap 3→0)`; `deal: each hand 13 cards, kitty 2 for jokers/jjdd, 0 for plain, all ids unique and total = deck size`; `deal order starts dealer's-left (first card of seat (dealer+1)%4 is deck[0])`; `same seed+hand same deal (stability)`.
- [ ] Write `test/state.test.ts`: `createGame(plain) → phase bidding, 52 dealt no kitty, empty bids, scores [0,0]`; `createGame(jjdd) → kitty length 2`; `createGame rejects invalid config (throws EngineError)`; `cardIndex maps every deck id back to its Card`.
- [ ] Run — Expected: FAIL.
- [ ] Implement the three modules.
- [ ] Run — Expected: PASS.
- [ ] Commit `feat(engine): events, immutable game state, seeded dealing with kitty`.

## Task 4: Scoring (score.ts)

**Consumes:** types, config, state, events, deck (`isTrump` not needed — pure aggregation). **Produces:** `interface HandScore { deltas: [number,number]; scoresAfter: [number,number]; bagCarry: [number,number]; events: EngineEvent[] }`; `scoreHand(state): HandScore` — pure; reads a state whose 13 tricks are complete (after final trick's play record applied; does not mutate phase).

Semantics (locked decisions 6–9): per team, `board` = sum of non-nil partner bids; `teamTricks` = tricks of non-nil seats only (nil players' tricks — even a caught nil's — never count toward board, bags, or Set). If `board === 0` (both nil, or no board): no contract, no Set, no bags, delta 0. `board > 0`: made → `+10×board + bagsThisHand×1`; set → `'zero'`→0, `'minusBoard'`→`−10×board`. Bags only accumulate on made (set ⇒ no bags). Bag carry: `bagCarry = bagCount + bagsThisHand`; while `bagCarry ≥ bagThreshold` (when enabled): `bagCarry −= bagThreshold`, `delta −= bagPenalty`, push `BagThresholdHit{team}` (can fire more than once). Nil results per seat: nil made `+nilBonus` (blind: `+blindNilBonus`) + `NilMade{seat,blind}`, caught `−nilPenalty` (`−blindNilPenalty`) + `NilCaught`; caught-nil tricks do not convert to bags. Rene (mode `penalty`): `loseHand` → reneging team scored as set regardless of tricks (Set event), non-reneging team credited `+10×board` with no bags added; both teams rene → both set, no credit. `threeTricks` → `teamTricks = max(0, teamTricks − 3)` before evaluation, normal scoring after. `trickWins[seat] === 13` → `Boston{seat}` (no bonus points; celebration is M3). Event order: per-team NilMade/NilCaught, Set, Boston, BagThresholdHit, then `ScoreMilestone{team,'inTheHole'|'outTheHole'}` per team on sign change (≥0→<0, <0→≥0) evaluated after all deltas. `deltas` include nil points on the reneging/other team's side of the ledger: nil points land on the nil bidder's **team** total.

**Steps:**
- [ ] Write `test/score.test.ts` with a `stateAtHandEnd(overrides)` builder (in `test/helpers.ts`, created here): hands emptied, trickWins/bids/scores/bags settable: `made board scores 10×board + bags`; `set scores 0 (zero dial)`; `set scores −10×board (minusBoard dial)`; `bags accumulate across hands; 10th bag fires BagThresholdHit + −100, carry = mod (e.g. carry 9 + 3 bags → one hit, carry 2)`; `threshold 10 fires twice for 21 new bags when carry 9`; `bags off → bags still counted in carry? NO: bagPenaltyEnabled false ⇒ no BagThresholdHit, carry still tracked for display`; `nil made +100 / caught −100; blind ±200 (dial values respected)`; `nil partner's tricks excluded from team board & bags`; **Review Focus 1**: `both partners nil: board 0, no Set event, no bags, delta 0, no crash`; `Boston event at 13 tricks, no score change`; `rene loseHand: reneging team set, other team credited 10×board, no bags`; `rene loseHand both teams → both set`; `threeTricks: team with 5 tricks scored at 2; with 2 tricks floored to 0 (never negative) → set`; `ScoreMilestone inTheHole when delta crosses below 0, outTheHole crossing up, silent otherwise`; `event order pinned: NilMade before Set before BagThresholdHit before ScoreMilestone`.
- [ ] Run — Expected: FAIL.
- [ ] Implement `score.ts`.
- [ ] Run — Expected: PASS.
- [ ] Commit `feat(engine): hand scoring with nils, bags carry, set/rene dials, milestone events`.

## Task 5: Legal moves (actions.ts, rene.ts)

**Consumes:** types, config, state, deck, errors. **Produces:**
- `actions.ts`: `type Action = { type:'Bid'; kind:'number'|'nil'|'blindNil'; amount:number } | { type:'Exchange'; out: readonly CardId[] } | { type:'Play'; card: CardId } | { type:'NextHand' }` (actor is always `currentActor`); `currentActor(state): Seat | null` (bidding: first unbid seat clockwise from dealer's left; exchanging: `pendingExchange[0]`; playing: leader = `currentTrick?.leadSeat ?? nextSeat(dealer)` if trick empty else `nextSeat(lastPlay.seat)`; `handOver`: the dealer seat is conventional — return `dealer`; `gameOver`: null); `legalActions(state): Action[]` expanded for `currentActor` only.
- `rene.ts`: `canFollowLed(state, seat, ledSuit): boolean` (holds a card of led suit counting promoted-deuce-as-trump-not-printed-suit, jokers never follow a printed suit); `isRenege(state, seat, card): boolean` (mid-trick: led suit exists, could follow, card isn't of led suit); `allTrump(seat, state, config): boolean`; `isLegalLead(state, seat, card, config): boolean` (`!isTrump → true`; trump lead requires `spadesBroken || allTrump`).

Legality: **Bidding** — `number` 1..13; `nil` only if `allowNil`; `blindNil` only if `allowBlindNil && allowNil` (engine treats "before looking" as UI contract — ledger ruling). **Exchange** — `out` = exactly 2 distinct ids from the actor's hand. **Play** — card in hand; leader: `isLegalLead`; follower: if `canFollowLed` then only led-suit cards (a promoted deuce is never a led-suit follower), else any card; **mode `prevent`**: trump lead pre-break never legal; **mode `penalty`**: follow-suit violations ARE yielded (engine accepts & penalizes) but the trump-lead gate stays enforced (a lead violation is not a rene class). **NextHand** — only in `handOver`.

**Steps:**
- [ ] Write `test/actions.test.ts` (builder: `midTrickState({config, seed, hands, trickPlays, spadesBroken, bids})` from helpers): `bidding actor is dealer's left, then clockwise; nil/blindNil gated by dials`; `bid amounts 1..13 only (0 not offered except nil)`; `Play offers: must-follow-suit when able (prevent mode)`; `cannot follow → any card offered`; **Review Focus 2**: `leading ♠ pre-break not offered; offered when spadesBroken; offered pre-break only when hand is all trump (test: hand of 13 spades; hand of all jokers+deuces)`; `promoted deuce (H in list) is never a legal H-follower and IS offered as trump play on H lead` (Review Focus 5 second half); `leading a joker pre-break gated as trump`; `Exchange actor = pendingExchange[0]; out must be 2 own cards`; **Review Focus 3**: `blindNil legal with plain deck (no kitty) → pendingExchange stays empty after bidding`; `two blindNil seats → pendingExchange ordered clockwise from dealer's left, both present`; `penalty mode: rene play IS offered; prevent mode: NOT offered`; `currentActor null at gameOver`; `NextHand only legal in handOver`.
- [ ] Write `test/rene.test.ts`: `canFollowLed ignores promoted deuce of led suit`; `isRenege true on off-suit play when able`; `allTrump counts jokers + promoted deuces`.
- [ ] Run — Expected: FAIL.
- [ ] Implement `actions.ts`, `rene.ts`.
- [ ] Run — Expected: PASS.
- [ ] Commit `feat(engine): legal move generation, spade-break gate, rene classification`.

## Task 6: Mutation machine (apply.ts, flow.ts)

**Consumes:** everything above (scoreHand at hand end; flow game-over). **Produces:**
- `apply.ts`: `applyAction(state, action): { state: GameState; events: EngineEvent[] }` — deep-copies, never mutates input (tests deep-freeze). Wrong actor → `EngineError('WRONG_ACTOR')`; wrong phase → `WRONG_PHASE`; not in legal set → `ILLEGAL_ACTION` (per dials: in `penalty` mode a reneging Play IS the legal set). Transitions: **Bid** → push BidRecord; events `BidMade` (number) | `NilDeclared` | `BlindNilDeclared`; when 4th bid done → if any blindNil seat AND kitty non-empty → phase `exchanging` + `pendingExchange` (clockwise from dealer's left), else phase `playing`. **Exchange** → swap 2↔2 with kitty, pop pendingExchange, `playing` when empty. **Play** → append to currentTrick; `!spadesBroken && isTrump(card)` → set `spadesBroken`, emit `BreakSpades{seat,card}` (play half of Review Focus 2/5); 4 plays → `trickWinner` → trickCount++, trickWins[winner]++, TrickWon with `wasBag` = winner not nil-bidder && teamTricks(after this) > team board (computed from bids; nil bidders never bag) and `spiked` = some earlier trick winner was winner's partner overtaken mid-trick; penalty mode & `isRenege` → record reneSeat + emit `RenegeDetected` BEFORE the TrickWon line. 13th trick → scoreHand: scores/bags updated, its events appended, then if `checkGameOver` → phase `gameOver` + `gameOver` field + `GameOver` event, else `handOver`. **NextHand** → flow.startNextHand (below), events `[DealComplete{dealer}]`.
- `flow.ts`: `checkGameOver(stateWithScores): {winningTeam} | null` — after a hand: team ≥ targetScore; both cross → higher wins; exact tie → null (extra hand; GameOver only ever names one team); `startNextHand(state)` → handNumber+1, dealer `(dealer+1)%4`, redeal, clear trick/bid/exchange/spades/bags-this-hand, phase `bidding`.

**Steps:**
- [ ] Write `test/apply.test.ts` (full-hand driver in helpers: `playHandToScore(state, choices)` looping legalActions; also `deepFreeze` immutability check used by every apply test): `createGame emits DealComplete? NO — DealComplete comes from NextHand; createGame returns state + tests assert its shape` (initial events: none); `bid accepted from correct actor, BidMade event; wrong actor WRONG_ACTOR`; `nil bid → NilDeclared`; `blindNil with kitty → phase exchanging, pendingExchange order; Exchange swaps exactly, kitty updated, phase playing`; `blindNil plain → phase playing directly, no exchange action legal` (Review Focus 3 scoring half via Task 4); `trick resolution: winner = trickWinner, leads next`; `BreakSpades fires exactly once, on first trump play (led or discard)`; `TrickWon.wasBag true for over-board non-nil winner only`; `spiked true when trick taken from partner, false otherwise`; `last trick → scores updated from scoreHand, Set/NilMade/…/ScoreMilestone events present, phase handOver`; `NextHand → handNumber+1, dealer rotated, DealComplete`; `gameOver: solo cross target → phase gameOver + GameOver event, GameOver.scores`; **Review Focus 4**: `both teams cross → GameOver names higher`; `exact tie → no GameOver, extra hand dealt, target re-checked next hand`; `prevent mode ILLEGAL_ACTION on off-suit play`; `penalty mode accepts rene, RenegeDetected emitted before TrickWon`; `illegal lead (pre-break trump) rejected in BOTH modes`; `input state frozen, unchanged after each applyAction` (deep equality snapshot compare).
- [ ] Write `test/flow.test.ts`: `checkGameOver unit: solo cross / both cross higher / tie null / under target null`.
- [ ] Run — Expected: FAIL.
- [ ] Implement `apply.ts`, `flow.ts`.
- [ ] Run — Expected: PASS.
- [ ] Commit `feat(engine): applyAction phase machine, trick resolution, game-over flow`.

## Task 7: Replay, public surface, end-to-end hand (replay.ts, index.ts)

**Consumes:** all modules. **Produces:** `replay.ts`: `replay(config, seed, actions): { state: GameState; events: EngineEvent[] }` — folds `createGame` + `applyAction`, concatenating events; throws on first illegal action. `index.ts` — curated exports: types, config+DEFAULT_CONFIG+validateConfig, EngineError, events, GameState+createGame+Phase, Action+legalActions+currentActor, applyAction, scoreHand+HandScore, replay, Rng helpers (rngForHand, shuffle, drawInt, mulberry32 — for tests/simulation), deck helpers, teamOf/SEATS.

**Steps:**
- [ ] Write `test/replay.test.ts`: `replay reproduces a scripted full hand: createGame → bid ×4 → 52 Plays → scores match a live-run of the same sequence; event streams deep-equal`; `replay of illegal sequence throws at same action index`; **M1 end-to-end**: `full hand under DEFAULT_CONFIG: deal→bid→13 tricks→score: exactly 13 TrickWon events, trickWins sum 13, scores finite, phase handOver`.
- [ ] Write `test/integration.test.ts`: scripted hand pinning event ORDER end-to-end (DealComplete on NextHand, BidMade×4, BreakSpades before 2nd TrickWon when break on trick 2, Boston when driver takes 13 via rigged deal seed — search a small seed list); `both-partners-nil hand end-to-end: NilDeclared×2, zero-score hand, no Set` (Review Focus 1 integration); `blindNil+jjdd hand end-to-end with Exchange×2`.
- [ ] Run — Expected: FAIL.
- [ ] Implement `replay.ts`, `index.ts`.
- [ ] Run — Expected: PASS.
- [ ] Commit `feat(engine): replay determinism, curated public API, end-to-end hand tests`.

## Task 8: Property, fuzz, and preset suites (M1 done-criteria)

**Consumes:** everything. **Produces:** `test/property.test.ts` (fast-check), `test/fuzz.test.ts`, `test/presets.test.ts`.

- `property.test.ts`: `arbitrary seeded game: at every state, every Action NOT in legalActions → applyAction throws` (sample illegal candidates: random off-suit plays, random trump leads, out-of-range bids, double-bid); `every Action IN legalActions → applyAction succeeds` (else legalActions lies); `applyAction never mutates input` (deep-freeze, 200 sampled steps); `scores finite integers, trickWins sum = trickCount at all times`; `bagCarry after scoring always < threshold when penalty enabled`.
- `fuzz.test.ts`: `20 seeded games to completion (rng-driven legal-choice driver): no throw; 13 TrickWon per hand; game reaches phase gameOver; two runs of one seed deep-equal final state AND full event stream` (M1 "fuzz round with zero illegal moves" + replay determinism).
- `presets.test.ts`: matrix `deckMode ∈ {plain,jokers,jjdd} × allowNil ∈ {t,f} (blindNil mirrors) × bagPenaltyEnabled × setPenalty × rene mode` (jjdd preset uses promotedDeuces ['C','D']) — each: `a complete hand plays: deal→bid→13 tricks→score→(NextHand)` and `a full game reaches gameOver under targetScore 200`.
- [ ] Write the three suites → run → Expected: FAIL until helper/driver gaps fixed (expect engine bug discoveries here — fix with ledgered rulings, never weaken an invariant to pass).
- [ ] Run `pnpm --filter engine coverage` — Expected: 100% lines/branches/functions/statements on src/**; chase misses with targeted tests, never via ignore-coverage.
- [ ] Run `pnpm -r test && pnpm -r typecheck` — Expected: green.
- [ ] Commit `test(engine): property, fuzz determinism, and house-rule preset full-hand suites`.

## M1 done-criteria (gate before final review)

1. `pnpm -r test` green incl. property + fuzz + presets; `pnpm --filter engine coverage` at 100/100.
2. Every house-rule preset plays deal → bid → 13 tricks → score (Task 8 matrix).
3. Fuzz round: zero illegal moves accepted, replay deep-equal determinism.
4. Engine has zero runtime deps, zero user-facing strings, no `Math.random`/`Date`/`console`/I/O in `src/` (grep-verified in final review).


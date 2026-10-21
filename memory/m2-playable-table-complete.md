---
name: m2-playable-table-complete
description: M2 complete — playable text-first Spades table on web + iOS with AI, pass-and-play, scoreboard, setup screen
metadata:
  type: project
---

M2 Playable Table complete. 5 sub-phases delivered:

- **M2.1** Scaffold + setup screen (content presets, app-core GameSession, expo-router routes)
- **M2.2** Table UI — Card, Hand, BidPad, SpeechBubble, SeatIndicator, TrickCenter, Table components + useGameState hook
- **M2.3** AI auto-play — greedy strategy (aiBid, aiPlayCard), configurable delays with jitter
- **M2.4** Scoreboard — hand summary, bag events, next hand flow, handOver navigation
- **M2.5** Pass-and-play + AI count selector, platform polish

Key files:
- `apps/game/src/components/` — 7 components
- `apps/game/src/hooks/useGameState.ts` — session driver + AI auto-play
- `apps/game/src/utils/aiPlayer.ts` — greedy AI strategy
- `apps/game/src/utils/cardDisplay.ts` — CardId → display metadata
- `apps/game/app/(setup)/index.tsx` — setup screen with presets + play mode
- `apps/game/app/(game)/table/index.tsx` — main table with handOver→scoreboard nav
- `apps/game/app/(game)/scoreboard/index.tsx` — hand complete + next hand/new game

M3.5 look-and-feel review gate before M3 personality layer begins.

[[m1-rules-engine-complete]]

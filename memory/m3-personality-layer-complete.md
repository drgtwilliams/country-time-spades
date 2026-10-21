---
name: m3-personality-layer-complete
description: M3 complete — 6-character cast, banter selector, 14/14 event phrase banks, speech bubble integration
metadata:
  type: project
---

M3 Personality Layer complete.

Key deliverables:
- **Cast** (`packages/content/src/cast/`): 6 characters with archetypes, personality tags, relationships, signature phrases
  - Uncle Ray (wise/elder), Big Man (trash talker), Silent Sam (deadpan/quiet killer), Aunty Dee (teasing/big sister), Fresh Me (earnest rookie), Math Boy (statistical scientist)
- **Phrase banks** (`packages/content/src/phrases/`): 14/14 engine event types covered
  - bidding.ts: NIL_DECLARED, NUMBER_BID, BLIND_NIL
  - play.ts: SPADE_BREAK, TRICK_WON, RENEGE_DETECTED, SPADE_LEAD_PREVENTED
  - score.ts: SET, BAG_THRESHOLD_HIT, SCORE_MILESTONE, GAME_OVER, NIL_MADE, NIL_CAUGHT, BOSTON
  - special.ts: DEAL_COMPLETE, ANNOUNCER_BEATS (8 beat types), GENERAL_REACTION
  - ~400+ unique banter lines across all characters and events
- **Banter selector** (`packages/app-core/src/banter.ts`): BanterSession + selectBanterLine + selectAllBanterLines
  - Pipeline: event → phrase bank → personality tag filter → hand filter → anti-repeat → cooldown → result
  - Configurable density, cooldown (3s), max stack (3)
- **Integration**: useGameState hook processes events into DisplayBanterLine[], Table renders SpeechBubbles

Architecture: content → app-core → game (one-way dependency chain maintained)

M4 (live server) next.

[[m2-playable-table-complete]]

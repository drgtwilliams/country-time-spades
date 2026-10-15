# Model Selection & Tokenomics Strategy

> Which AI models to use to build Country Time Spades — ranked by fit-for-purpose, with a hard focus on **token cost** and **local alternatives**. Goal: build the app without burning a mountain of tokens.

---

## TL;DR — The Stack

| Job | Best fit (quality) | Best value (cheap) | Local (free, offline) |
|---|---|---|---|
| **Core coding / rules engine** | GLM 5.2 (`z-ai/glm-5.2`) | GLM 5.3 Flash / DeepSeek V4 Pro | Qwen3-Coder 30B / DeepSeek-Coder V3 |
| **Heavy reasoning / architecture review** | GLM 5.2 (max reasoning) | DeepSeek V4 Pro | DeepSeek-R1 (distilled) |
| **Dialogue / banter writing** | Claude Sonnet | GLM 5.3 / Qwen3 | Llama 3.3 70B / Qwen3 32B (local) |
| **Avatar art & visuals** | FLUX 2 / GPT Image | Qwen-Image / Z-Image Turbo | FLUX.1-dev / SDXL (local, no per-image fee) |
| **Voice / TTS** | ElevenLabs custom voices | Edge TTS (free) | Piper / XTTS-v2 / Kokoro (local) |
| **Speech-to-text (player voice)** | Whisper (API) | — | whisper.cpp / faster-whisper (local, private) |

---

## 1. Coding Models (the main build cost)

### Fit-for-purpose, ranked

**1. GLM 5.2 / 5.3 (`z-ai/glm-5.2`) — best overall value-to-cost for this project.**
- 1M-token context — feed the whole rules engine + docs + tests in one go, critical for a compiler-aware, cross-file build.
- High/max reasoning modes; excellent multi-step agent workflows (the exact profile of "build a Spades engine across 5 phases").
- ~$0.39/1M input; GLM 5.3 Flash is <$0.08/1M. *Dramatically* cheaper than frontier for near-frontier code quality.
- **Use for:** the bulk of Phase 1 (rules engine), refactors, test authoring.

**2. DeepSeek V4 Pro (`deepseek/deepseek-v4-pro-0813`) — best cheap reasoning.**
- Top-tier low-cost reasoning; strong for debugging and architecture review.
- **Use for:** debugging the trick-taking logic, renege detection edge cases, scoring invariants.

**3. Qwen3-Coder (`qwen/qwen-3-coder`) — the open-weight specialist.**
- Built explicitly for boilerplate, refactoring, and code review; a fraction of frontier prices.
- **Use for:** routine scaffolding, boilerplate, lint-level passes — the high-volume, low-complexity work.

**4. Claude Sonnet — the "when it's truly hard" escalation.**
- Slight edge on complex multi-file architectural shifts and subtle logic.
- **Use sparingly** — only when GLM/DeepSeek hit a wall on a genuinely hard bug.

### Local coding (zero token cost)

| Model | VRAM (Q4) | Best for |
|---|---|---|
| **Qwen3-Coder 30B** | 24 GB | Default local coding model; strongest open-weight coding benchmark; Apache 2.0 |
| **DeepSeek-Coder V3** | 24–48 GB | Repo-level tasks, largest context of the open coders |
| **Codestral 2** | 16–24 GB | Lightweight, fast, good fill-in-the-middle |
| **DeepSeek-R1 (distilled)** | 24 GB+ | Reasoning-heavy debugging, run locally |

**Rule of thumb:** iterate locally on Qwen3-Coder 30B for free; escalate to GLM 5.2 (cloud, ~$0.39/1M) when context or reasoning outgrows your GPU. Reserve frontier (Claude) for the rare stuck bug.

---

## 2. Game Decoration Models (dialogue, art, voice)

This is the "personality" layer — cheaper models are often *good enough*, and art/voice have strong local options.

### Dialogue & banter writing

- **Best quality:** Claude Sonnet — the most natural conversational voice for the cast's banter. But it's pricey for high volume.
- **Best value:** GLM 5.3 / Qwen3 — good enough for first-pass banter; then hand-tune the character voice.
- **Local:** Llama 3.3 70B or Qwen3 32B — generate and iterate on phrase banks for free.
- **Tip:** dialogue is *one-shot then hand-edited*. You don't need frontier here — write the character voice guides, generate candidates cheaply, and edit the best lines by hand. This is the single biggest token saver.

### Avatar art & visuals

- **Best quality:** FLUX 2 (API) or GPT Image — polished character portraits, table backgrounds.
- **Best value API:** Qwen-Image, Z-Image Turbo — near-FLUX quality at lower per-image cost.
- **Local (recommended for iteration):** **FLUX.1-dev** or **SDXL** in ComfyUI — no per-image fee, unlimited iteration on the cast, LoRA fine-tunes for a consistent character across poses/expressions. This is *the* way to keep art cost at zero while iterating.
- **Tip:** generate the cast locally with FLUX.1 + a character LoRA for consistency. You'll regenerate faces dozens of times — do that locally, not at $0.04/image on an API.

### Voice / TTS (the avatars' speech)

- **Best quality:** ElevenLabs custom voices — most realistic regional Southern Black voice, but per-character and per-minute cost.
- **Free:** Edge TTS (good quality, no per-use cost) for early prototypes.
- **Local:** **XTTS-v2** or **Kokoro** — zero cost, self-hosted, full control. Quality is a step below ElevenLabs but improving fast.
- **Tip:** prototype the whole voice layer on XTTS-v2/Kokoro (free), and only license ElevenLabs for the final 6–8 hero characters if quality demands it.

### Speech-to-text (player's voice input)

- **Local & private (recommended):** whisper.cpp or faster-whisper — on-device, free, no data leaves the phone. Perfect for a voice-optional feature where privacy matters.

---

## 3. Tokenomics Strategy (how to not burn tokens)

**The 80/20 rule:** 80% of build tokens are mechanical (scaffolding, boilerplate, test authoring, iteration). Those should run on **local or ultra-cheap models**. Only ~20% is genuinely hard reasoning that justifies a pricier model.

1. **Local-first for iteration.** Run Qwen3-Coder 30B + FLUX.1 + XTTS-v2 locally for the high-volume, repetitive work: code scaffolding, test writing, art iteration, voice prototyping. Cost: $0.
2. **Cheap cloud for the real work.** GLM 5.3 Flash (<$0.08/1M) and DeepSeek V4 Pro for the substantive coding and reasoning. Use `:floor` routing (`z-ai/glm-5.3:floor`) to always hit the cheapest provider.
3. **Frontier only as escalation.** Claude Sonnet/Opus only when a genuinely hard bug or architectural decision stalls the cheaper models. Set a budget cap and treat it as a last resort, not a default.
4. **One-shot-and-edit for content.** Dialogue, banter, and flavor text are generated once and hand-edited — never re-generated in a loop. Art is iterated locally. This keeps the creative layer near-zero cost.
5. **Cache aggressively.** LLM caching (prompt caching) turns the "same context every iteration" pattern (re-reading the rules docs, test files, engine code) into ~90% cheaper follow-up calls. Structure the agent's context so the stable parts stay cache-hit.

**Projected budget (rough):** with local-first iteration and cheap-cloud for substantive work, the entire build should cost single-digit dollars in API tokens — not hundreds — because the rules engine is small and deterministic, and the creative assets are generated once and edited.

---

## 4. Recommended Toolchain Summary

```
Local (always-on, $0):
  Qwen3-Coder 30B        → code scaffolding, tests, iteration
  DeepSeek-Coder V3      → repo-level tasks, long context
  FLUX.1-dev + LoRA      → avatar art (unlimited iteration)
  XTTS-v2 / Kokoro       → voice prototyping
  whisper.cpp            → player speech-to-text (private)

Cloud (cheap, pay-per-use):
  z-ai/glm-5.3:floor     → substantive coding (bulk of the work)
  deepseek/deepseek-v4-pro-0813  → debugging, reasoning
  qwen/qwen-3-coder      → boilerplate, review passes

Cloud (escalation only):
  anthropic/claude-sonnet → stuck bugs, hard architecture, final banter polish
```

---

*Related:* [OpenRouter Models for Code Review] (in the user's Obsidian vault) covers the same cheap-vs-frontier logic for code review specifically. This doc extends it to the full build + creative pipeline.
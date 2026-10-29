# Prompt log (Phase 1)

## Tools

- **Claude** (Anthropic), model Claude Opus 5.5, in the Claude desktop app.

Claude wrote all of the Phase 1 code. I directed the work, played the game, and made the design decisions noted below.

---

## 1. Planning the rest of Phase 1

**Prompt:**
> Show me all the steps I need to do based on the spec.

**What happened:** Claude checked the git history: one commit containing only SPEC.md, pushed. It then proposed the file structure used in this repo (one file per class, all numbers in `constants.js`, a render file that never changes state, plain `<script>` tags so the game opens from disk) and a time plan for the coding session.

---

## 2. Writing the code

**Prompt:**
> Now do the coding part.

**What happened:**
- Claude wrote `index.html` and all of `js/`, scoped to Tier 1 from SPEC section 4, with `TODO(AC #n)` comments where each unfinished criterion belongs.
- It wrote `tests/rules_test.js`, which drives `Game.update()` in Node without a browser, and opened the game from disk in a headless browser to check for console errors.
- **One mistake, in the test, not the game:** its first geometry check expected a compartment to be centered on the street opening when the door angle is 180°. The correct angle is 135° (180 + 90 + 45 = 315, not 270). The code was right; the check was fixed.
- Claude did not make fake intermediate commits to pad the history, so the first version of the code went in as one commit. Later fixes went in as their own commits.

---

## 3. How to play

**Prompt:**
> Pushed. How do I play?

**What happened:** An explanation of the controls and the two conflicting passenger types. That explanation became section 2 of the README.

---

## 4. "I can't see a queue"

**Prompt:**
> I can't see any queue right now?

**What happened:** Claude looked at my Safari window (read-only) and confirmed the game was running correctly. The queue is usually 0–1 people because arrivals are every 4 s and people step in quickly. The ramp that makes lines build up is AC #22 (Tier 2). **No code change:** left for Phase 2 and noted in the README.

---

## 5. "Nobody comes out of the lobby"

**Prompt:**
> Nobody is coming out from the lobby?

**What happened:** Correct: lobby spawning is AC #23 (Tier 2). Claude found a trap for whoever continues the project: SPEC 2.5 says only office workers and couriers come from the lobby. If lobby spawning is added before those types exist, the type picker has nothing to choose from and the game would crash with an unclear error. Claude added a readable error in `pickPersonTypeKey()` and a comment at the `TODO(AC #23)`.

---

## 6. "Complaints happen way too easily"

**Prompt:**
> Also, why do I get complaints so easily right now?

**What happened:** Claude wrote a simulated "careful player" that sees the exact door speed, reacts every 0.25 s, and uses ↓ to keep conflicting people apart. It played 40 rounds per setup:

| Setup | Survived to 9:00 | Fired |
|---|---|---|
| Phase 1 as written (only managers and interns, 50/50) | 4 / 40 | 36 / 40 |
| Adding office workers with the SPEC mix (55/20/15) | 30 / 40 | 10 / 40 |
| Lowering push acceleration from 90 to 60 | worse | |

Every complaint was an intern hit by a door that was too fast, and about two thirds happened while a manager and an intern rode at the same time. Diagnosis: the rules matched the SPEC. The difficulty came from Phase 1 having only the two conflicting types, so every arrival was a potential conflict, plus there's no speed meter yet.

Two options were offered: (A) only document it, or (B) add the office worker now, which is one table entry and doesn't change any SPEC rule.

---

## 7. Decision: add the office worker

**Prompt:**
> B

(I chose option B from the previous answer.)

**What happened:**
- Office worker added to `PERSON_TYPES`, and street weights set to the SPEC mix. The courier is still left for Phase 2.
- Rerun on the real code: the simulated player survived about 25 of 40 rounds.
- **Another test mistake, fixed:** the first version of the "all types spawn" check watched one random round, and in one run no intern happened to appear. It now samples the type picker 1000 times, so it no longer depends on luck.

---
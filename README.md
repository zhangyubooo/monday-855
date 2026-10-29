# Monday, 8:55

You are the doorman of an office building's revolving door during the five minutes before 9:00 on a Monday. Push the door, decide who gets to step in, and keep everyone's ride at a speed they can stand.

**The full design is in [SPEC.md](SPEC.md).** This README covers what exists right now (end of Phase 1), how the code is organized, and what to build next.

---

## 1. Running the game

No install and no build step.

1. Download or clone this repository.
2. Open `index.html` in a current desktop browser (Chrome, Firefox or Safari). Double-clicking the file works.

If your browser blocks local files for some reason, serve the folder instead:

```
python3 -m http.server 8000
```
and open http://localhost:8000.

### Running the rules tests

The game rules have tests that run without a browser (needs Node.js 18 or newer):

```
node tests/rules_test.js
```

Every check is labeled with the acceptance criterion (AC #) it covers. Run this after every change to the rules. If you change a rule on purpose, update the matching check.

---

## 2. How to play

| Key | Action |
|---|---|
| **Space** (hold) | Push the door. It speeds up while held and coasts to a stop when released. |
| **↓** (hold) | Street queue waits: nobody from the street steps in. |
| **↑** (hold) | Lobby queue waits. (Nobody arrives on the lobby side yet, see AC #23.) |
| **R** | Start a new round from the end screen. |

**Goal:** survive from 8:55 to 9:00 (3 real minutes) and deliver as many people as you can.

**You lose if:**
- 3 people complain: **YOU'RE FIRED**
- more than 8 people are waiting on one side: **LOBBY GRIDLOCK** (holding ↓ forever loses in about 30 seconds)

**People and the speeds they accept:**

| Circle | Who | Comfortable at | Feels like |
|---|---|---|---|
| grey **W** | Office worker | 30–120 °/s | fine with almost anything |
| blue **M** | Late manager | 70–170 °/s | a quarter turn in 0.5–1.3 s |
| brown **I** | Coffee intern | 20–60 °/s | a quarter turn in 1.5–4.5 s, but never stopped |

A rider complains **immediately** if the door goes faster than their range, and after **1.5 seconds** if it stays slower. Managers and interns can never both be comfortable, so use ↓ to keep them out of the door at the same time.

Holding Space for 1 second from a standstill gets you to about 90 °/s. Releasing it from there takes about 2 seconds to stop.

---

## 3. Acceptance criteria status (end of Phase 1)

Numbers match SPEC.md section 3. Tier 1 is the required core, Tier 2 should-have, Tier 3 polish (SPEC section 4).

**Summary:** all of Tier 1 is met except #9, which is partial only because nobody spawns on the lobby side yet. Some of Tier 2 is done. Tier 3 is not started.

| # | Tier | Status | Notes |
|---|---|---|---|
| 1 | 1 | Met | Opens from disk with no console errors (checked in headless Chromium and in Safari). |
| 2 | 1 | Met | 4 wings, glass walls left/right, openings top/bottom. |
| 3 | 1 | Met | 90 °/s after exactly 1 s of holding (`DOOR_ACCELERATION`). |
| 4 | 1 | Met | Friction slows it to 0; speed is clamped at 0, so it never reverses. |
| 5 | 1 | Met | Capped at 200 °/s. |
| 6 | 1 | Met | Street queue forms below the door. It is often short (0–1 people) because arrivals are only every 4 s until #22 is done. Hold ↓ to see it grow. |
| 7 | 1 | Met | Front person steps in when a compartment center is within ±20° of the street opening. |
| 8 | 1 | Met | |
| 9 | 1 | Partially Met | The ↑ gate logic works and is tested with a lobby person added by hand, but you can't see it in play because nobody spawns on the lobby side yet (#23). |
| 10 | 1 | Met | |
| 11 | 1 | Met | Exiting people walk off beside the queue; Delivered counter goes up. |
| 12 | 2 | Met | Two people share a compartment if the door is slow enough to stay aligned for the 0.3 s entry gap; never more than 2 (tested). |
| 13 | 2 | Not Met | No courier yet. `Door.canAccept()` already handles `takesWholeCompartment`, but that path has never run. |
| 14 | 1 | Met | Manager 70–170 and intern 20–60 never overlap (tested). |
| 15 | 2 | Partially Met | 3 of 4 types: office worker, manager, intern. Courier missing. |
| 16 | 1 | Met | |
| 17 | 1 | Met | Short dips below the range reset the timer (tested). |
| 18 | 2 | Partially Met | "At most one complaint per person" works. The red color does not exist yet. |
| 19 | 2 | Partially Met | Complaints are counted and shown as text (`Complaints: 1 / 3`). No speech bubbles or strike icons yet. |
| 20 | 2 | Not Met | No mood colors yet. `person.secondsTooSlow` and `person.hasComplained` hold what you need. |
| 21 | 1 | Met | 180 s from 8:55 to 9:00 (tested). |
| 22 | 2 | Not Met | Constant 4 s between arrivals. |
| 23 | 2 | Not Met | No lobby spawns. Exiting toward the street already works. Do the courier (#15) first, see Pitfalls. |
| 24 | 1 | Met | |
| 25 | 1 | Met | Holding ↓ from the start ends in gridlock at about 32 s. |
| 26 | 1 | Met | All three end screens show delivered and complaints; R restarts. |
| 27 | 2 | Not Met | No debug overlay. |
| 28 | 2 | Not Met | No speed meter. **This is the biggest gap in the game right now**, see Next steps. |
| 29 | 3 | Not Met | |
| 30 | 3 | Not Met | The round starts as soon as the page loads. |
| 31 | 3 | Not Met | |

---

## 4. Code structure

```
index.html          the canvas, plus <script> tags in load order
js/constants.js     every tunable number (speeds, timings, layout)
js/input.js         keyboard state -> readControls() / wasKeyPressed()
js/door.js          Door: rotation with inertia, compartments, who rides where
js/person.js        PERSON_TYPES table + Person: one passenger's state and complaint rules
js/queue.js         Queue: one line of waiting people and the rules for stepping in
js/game.js          Game: one round's rules, clock, spawning, exits, complaints, win/lose
js/render.js        draws a Game. Reads state, never changes it
js/main.js          frame loop: one-shot keys -> game.update() -> drawGame()
tests/rules_test.js rules tests that run in Node without a browser
```

### How a frame flows

```
main.js runFrame()
  ├─ readControls()          (input.js)  -> { isPushingDoor, isStreetGateHeld, isLobbyGateHeld }
  ├─ game.update(dt, controls)  (game.js)
  │    1. door.update()                 speed and angle
  │    2. letRidersExit()               BEFORE entries, so compartments empty first
  │    3. streetQueue.update(), lobbyQueue.update()   people step in
  │    4. updateRiderComfort()          person.updateComfort() -> recordComplaint()
  │    5. spawnPeople()
  │    6. moveExitingPeople()
  │    7. checkForEndOfRound()          loses are checked before the win
  └─ drawGame(ctx, game)     (render.js)
```

### Key ideas

- **Two-way split.** `Game` never reads keys or draws. `render.js` never changes state. To change how something **looks**, edit `render.js`. To change how it **behaves**, edit `game.js` / `door.js` / `queue.js` / `person.js`. This split is also what lets the tests drive whole rounds without a browser.
- **Angles, not coordinates.** All angles are in degrees, **counterclockwise, 0° = right, 90° = up (lobby), 270° = down (street)** (SPEC 2.1). Compartment `i` is centered at `door.angle + i*90 + 45`. A rider has no x/y; their position is their compartment's angle. `pointAroundDoor()` in `render.js` is the only place angles become pixels.
- **Person lifecycle:** `'queued'` (in a `Queue.people` array) → `'riding'` (in `door.compartments[i]`) → `'exiting'` (in `game.exitingPeople`, walking off) → removed.
- **Passenger types are data.** A new type is one entry in `PERSON_TYPES` in `person.js`. Spawning, capacity and complaints all read from that table.
- **All numbers live in `constants.js`.** If you tune one, record the change in a new section at the bottom of SPEC.md (SPEC 2.7 asks for that).

### Where to change things

| You want to… | Go to |
|---|---|
| add or tune a passenger type | `PERSON_TYPES` in `person.js` |
| change door feel (push, friction, max) | `constants.js` |
| change who may step in, and when | `Queue.update()` in `queue.js`, `Door.canAccept()` in `door.js` |
| change complaint rules | `Person.updateComfort()` in `person.js` |
| change arrival rate | `Game.currentStreetSpawnInterval()` and `Game.spawnPeople()` in `game.js` |
| add something on screen | a new `draw…()` function called from `drawGame()` in `render.js` |
| add a key | `GAME_KEY_CODES` + `readControls()` in `input.js`, handle one-shot keys in `main.js` |

Every unfinished criterion has a `TODO(AC #n)` comment at the spot where it belongs. Search the code for `TODO(AC`.

---

## 5. Next steps, in priority order

1. **Speed meter, #28** (`render.js`). The most important missing piece. Right now the player has to guess speeds, and the game feels unfair. Draw a horizontal bar for 0–200 °/s, a marker at `game.door.speed`, and one band per rider from `comfortMinSpeed` to `comfortMaxSpeed` (`game.door.allRiders()`). When a manager and intern ride together, their bands won't overlap, and that is the moment the player should see.
2. **Debug overlay, #27** (`input.js` + `render.js`). About 10 lines. Shows `game.door.speed` and `game.secondsElapsed`, and you need it to check #3, #21 and #22 by eye.
3. **Courier, #15 / #13** (`person.js`). One table entry, see the TODO there. Then check that a courier at the front blocks everyone behind them until an empty compartment comes around.
4. **Lobby spawns, #23** (`game.js` `spawnPeople()`). Only after the courier exists.
5. **Arrival ramp, #22** (`game.js` `currentStreetSpawnInterval()`). One game minute = 36 real seconds, so 8:57 is at 72 s and 8:59 at 144 s.
6. **Mood colors, #20 and #18** (`render.js` `drawPerson()`).
7. **Speech bubbles and strike icons, #19** (`game.js` `recordComplaint()` + `render.js`).
8. **Tier 3: WAIT barrier #29, title screen #30, pause #31.** #29 needs the `controls` object passed from `main.js` into `drawGame()`.

---

## 6. Known issues and pitfalls

- **The game is currently harder than designed.** A simulated careful player (exact speed info, reacting every 0.25 s) survived about 25 of 40 rounds. A human without the speed meter does much worse. In those 40 simulated rounds, all 70 complaints came from interns riding a door that was too fast. Do #28 before judging the difficulty or changing any numbers. With only managers and interns (before office workers were added), the same simulated player survived 4 of 40, so don't remove the office worker to "simplify".
- **Lobby spawning needs the courier first.** SPEC 2.5 says only office workers (70%) and couriers (30%) come from the lobby. If you add lobby spawns before the courier, every lobby person will be an office worker. `pickPersonTypeKey()` throws a readable error if no type has a weight for the requested side.
- **Plain `<script>` tags, not ES modules, on purpose.** Modules are blocked when `index.html` is opened from disk, which would break AC #1. Files share one global scope, and **load order in `index.html` matters**: each file may only use things from files above it.
- **Canvas y points down, game angles point up.** Never feed a game angle straight into `ctx.rotate()` or `Math.sin()` for a y coordinate. Use `pointAroundDoor()`, or flip the sign.
- **`person.x` / `person.y` only mean something while `state === 'exiting'`.** Queued people are positioned by `queue.positionOf(index)` and riders by their compartment angle, both at draw time.
- **Exits must run before entries** in `Game.update()` (SPEC 2.4). If you swap them, people waiting at an opening get checked against riders who are about to step out, and can be turned away from a compartment that is really emptying.
- **There is no brake.** The only way to slow down is friction (45 °/s²), so dropping from manager speed (~120) to intern speed (≤60) takes over a second. This is intended (SPEC 2.2), but it's the main reason interns get hit.
- **Frame time is capped at 0.1 s** (`MAX_FRAME_SECONDS`). If the tab lags badly, the game runs in slow motion instead of jumping. Intended.
- **When one of two riders leaves a compartment, the other jumps to the middle of it.** Visual only: `render.js` places riders by how many are in the compartment.

---

## 7. Simplifications (and why)

- **Stepping in and out is instant.** A person teleports from the queue into the compartment. A walk-in animation would need positions that change between "queued" and "riding", which wasn't worth Phase 1 time. It doesn't affect any rule.
- **People are circles with a letter**, so no image assets are needed (SPEC 2.8 allows flat shapes).
- **Complaints and score are plain text in the HUD** instead of strike icons and bubbles, so the rules could be finished first.
- **Arrivals are every 4 s for the whole round**, and only on the street side. That kept Phase 1 to one spawn path. The ramp (#22) and lobby side (#23) are separate, small additions.
- **The canvas is a fixed 960×640** that scales down to fit smaller windows. There is no layout change on resize (SPEC section 6 doesn't require one).
- **No title screen.** The round starts on load and R restarts after it ends.

---

## How AI was used

Phase 1 code was written with an AI assistant (Claude). See [prompt_log.md](prompt_log.md) for the prompts and what came out of each one.

// constants.js
// Every tunable number in the game lives in this file, so balancing never means
// digging through game logic. Values come from SPEC.md sections 2.2–2.7.
// If you change one while tuning, record it in a clearly marked section at the
// bottom of SPEC.md (the spec asks for this instead of rewriting the original).

// ---- Canvas & layout (pixels) ----
const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 640;
const DOOR_CENTER_X = 480;
const DOOR_CENTER_Y = 320;
const DOOR_RADIUS = 110;
const PERSON_RADIUS = 9;
const QUEUE_SPACING = 20;          // center-to-center gap in a queue; small enough that 9 people fit on screen
const QUEUE_GAP_FROM_DOOR = 30;    // the front person stands this far outside the door circle
const EXIT_LANE_OFFSET_X = 34;     // exiting people walk beside the queue, not through it
const EXIT_WALK_SPEED = 120;       // px/s for people walking away after they leave the door

// ---- Angles (degrees) ----
// Convention used EVERYWHERE in the code (SPEC 2.1): as seen on screen,
// 0° = right, 90° = up (lobby), 180° = left, 270° = down (street).
// Angles grow COUNTERCLOCKWISE. Canvas y points down, so render.js flips the sign.
const LOBBY_OPENING_ANGLE = 90;
const STREET_OPENING_ANGLE = 270;
const ALIGNMENT_TOLERANCE = 20;    // a compartment center within ±20° of an opening counts as "aligned"
const HOUSING_HALF_WIDTH = 45;     // glass walls cover ±45° around 0° and 180°, leaving 90°-wide openings

// ---- Door physics ----
const DOOR_ACCELERATION = 90;      // °/s² while Space is held -> reaches 90 °/s after ~1 s (AC #3)
const DOOR_FRICTION = 45;          // °/s² slowdown when Space is released; half the push rate so the door "coasts"
const DOOR_MAX_SPEED = 200;        // °/s hard cap (AC #5)

// ---- Compartments ----
const WING_COUNT = 4;
const COMPARTMENT_CAPACITY = 2;
const ENTRY_INTERVAL = 0.3;        // s between two people stepping in from the same queue;
                                   // this is what lets a slow door take 2 people and a fast door only 1

// ---- Complaints & losing ----
const TOO_SLOW_GRACE_SECONDS = 1.5;
const MAX_COMPLAINTS = 3;
const MAX_QUEUE_LENGTH = 8;        // MORE than this many people waiting on one side = gridlock

// ---- Round clock ----
const ROUND_DURATION_SECONDS = 180;        // real seconds for 8:55 -> 9:00
const ROUND_START_MINUTES = 8 * 60 + 55;   // 8:55 expressed in minutes after midnight
const ROUND_GAME_MINUTES = 5;

// ---- Spawning ----
const STREET_SPAWN_INTERVAL = 4;   // s. TODO(AC #22): ramp to 2.5 s after 8:57 and 1.5 s after 8:59 (SPEC 2.7)
const LOBBY_SPAWN_INTERVAL = 10;   // s. TODO(AC #23): not used yet — nobody spawns on the lobby side in Phase 1

// ---- Main loop ----
const MAX_FRAME_SECONDS = 0.1;     // browsers pause requestAnimationFrame in background tabs; without
                                   // this cap the door would jump hundreds of degrees on return

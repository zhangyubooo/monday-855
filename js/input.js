// input.js
// Owns the keyboard. Nothing else in the game listens to key events directly:
// game logic receives a plain "controls" object from readControls(), which is
// also what makes Game.update() easy to drive from tests.

const GAME_KEY_CODES = new Set(['Space', 'ArrowUp', 'ArrowDown', 'KeyR']);

const heldKeyCodes = new Set();      // keys currently held down
const pressedKeyCodes = new Set();   // keys pressed since the last endInputFrame() (one-shot actions)

window.addEventListener('keydown', (event) => {
  // Stop Space/arrows from scrolling the page while playing.
  if (GAME_KEY_CODES.has(event.code)) event.preventDefault();
  if (!event.repeat) pressedKeyCodes.add(event.code);
  heldKeyCodes.add(event.code);
});

window.addEventListener('keyup', (event) => {
  heldKeyCodes.delete(event.code);
});

// If the window loses focus while a key is held, the browser never sends keyup,
// and the door would keep accelerating forever. Clearing here prevents that.
window.addEventListener('blur', () => {
  heldKeyCodes.clear();
});

/** The held-key state the game rules care about, as plain booleans. */
function readControls() {
  return {
    isPushingDoor: heldKeyCodes.has('Space'),
    isStreetGateHeld: heldKeyCodes.has('ArrowDown'),
    isLobbyGateHeld: heldKeyCodes.has('ArrowUp'),
  };
}

/** True if the key was pressed this frame. Use for one-shot actions like restart. */
function wasKeyPressed(code) {
  return pressedKeyCodes.has(code);
}

/** Call once at the end of every frame so one-shot presses don't carry over. */
function endInputFrame() {
  pressedKeyCodes.clear();
}

// TODO(AC #27): 'KeyD' toggles the debug overlay. TODO(AC #31): 'KeyP' pauses.
// Add them to GAME_KEY_CODES and handle them in main.js with wasKeyPressed().

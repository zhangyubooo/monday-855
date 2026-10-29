// main.js
// Entry point: creates the game and runs the frame loop. Keep this file thin.
// Each frame: handle one-shot keys -> update rules -> draw.

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const game = new Game();

let previousTimestamp = null;

function runFrame(timestamp) {
  // dt in seconds. The first frame has no previous timestamp, so it moves nothing.
  const dt = previousTimestamp === null
    ? 0
    : Math.min((timestamp - previousTimestamp) / 1000, MAX_FRAME_SECONDS);
  previousTimestamp = timestamp;

  if (game.phase === 'ended' && wasKeyPressed('KeyR')) game.reset();

  game.update(dt, readControls());
  drawGame(ctx, game);
  endInputFrame();

  requestAnimationFrame(runFrame);
}

// TODO(AC #30): show a title screen first and start the round on Space.
requestAnimationFrame(runFrame);

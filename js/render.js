// render.js
// Draws the current game state. Every function here only READS the game;
// none of them change it. To change how something looks, edit this file.
// To change how something behaves, edit game.js / door.js / queue.js / person.js.

const COLORS = {
  lobbyFloor: '#efe6d8',
  streetGround: '#b9bec4',
  doorFloor: '#f7f5ef',
  glassWall: '#7fb3d5',
  wing: '#4a4a4a',
  hudText: '#222222',
  areaLabel: 'rgba(0, 0, 0, 0.35)',
  personLabel: '#ffffff',
  endOverlay: 'rgba(20, 20, 30, 0.78)',
  endText: '#ffffff',
};

const END_SCREEN_TITLES = {
  fired: "YOU'RE FIRED",
  gridlock: 'LOBBY GRIDLOCK',
  madeIt: 'MADE IT',
};

/**
 * Converts a game angle (degrees, counterclockwise, 0° = right; see constants.js)
 * and a distance from the door center into canvas pixels.
 * The minus sign on y is there because canvas y grows DOWNWARD.
 */
function pointAroundDoor(angleDegrees, distanceFromCenter) {
  const radians = (angleDegrees * Math.PI) / 180;
  return {
    x: DOOR_CENTER_X + distanceFromCenter * Math.cos(radians),
    y: DOOR_CENTER_Y - distanceFromCenter * Math.sin(radians),
  };
}

function drawGame(ctx, game) {
  drawBackground(ctx);
  drawDoor(ctx, game.door);
  drawQueue(ctx, game.streetQueue);
  drawQueue(ctx, game.lobbyQueue);
  for (const person of game.exitingPeople) drawPerson(ctx, person.x, person.y, person);
  drawHud(ctx, game);
  if (game.phase === 'ended') drawEndScreen(ctx, game);
  // TODO(AC #28): speed meter with each rider's comfort range as a band — the most
  //   important Tier 2 item. Read game.door.speed and game.door.allRiders().
  // TODO(AC #27): debug overlay (exact door speed, game.secondsElapsed) toggled with D.
  // TODO(AC #29): "WAIT" barrier in front of a queue while its gate key is held.
  //   Needs the controls object passed in from main.js.
}

function drawBackground(ctx) {
  ctx.fillStyle = COLORS.lobbyFloor;
  ctx.fillRect(0, 0, CANVAS_WIDTH, DOOR_CENTER_Y);
  ctx.fillStyle = COLORS.streetGround;
  ctx.fillRect(0, DOOR_CENTER_Y, CANVAS_WIDTH, CANVAS_HEIGHT - DOOR_CENTER_Y);

  ctx.fillStyle = COLORS.areaLabel;
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('LOBBY', 40, DOOR_CENTER_Y - 40);
  ctx.fillText('STREET', 40, DOOR_CENTER_Y + 40);
}

function drawDoor(ctx, door) {
  // Floor of the door
  ctx.fillStyle = COLORS.doorFloor;
  ctx.beginPath();
  ctx.arc(DOOR_CENTER_X, DOOR_CENTER_Y, DOOR_RADIUS, 0, Math.PI * 2);
  ctx.fill();

  // Curved glass walls on the left and right; the gaps at top and bottom are the openings.
  // The walls are symmetric about the horizontal axis, so the canvas y-flip doesn't matter here.
  const wallHalfWidthRadians = (HOUSING_HALF_WIDTH * Math.PI) / 180;
  ctx.strokeStyle = COLORS.glassWall;
  ctx.lineWidth = 8;
  for (const wallCenterRadians of [0, Math.PI]) {
    ctx.beginPath();
    ctx.arc(DOOR_CENTER_X, DOOR_CENTER_Y, DOOR_RADIUS + 4,
      wallCenterRadians - wallHalfWidthRadians, wallCenterRadians + wallHalfWidthRadians);
    ctx.stroke();
  }

  // Wings
  ctx.strokeStyle = COLORS.wing;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  for (let i = 0; i < WING_COUNT; i++) {
    const tip = pointAroundDoor(door.wingAngle(i), DOOR_RADIUS - 2);
    ctx.beginPath();
    ctx.moveTo(DOOR_CENTER_X, DOOR_CENTER_Y);
    ctx.lineTo(tip.x, tip.y);
    ctx.stroke();
  }
  ctx.fillStyle = COLORS.wing;
  ctx.beginPath();
  ctx.arc(DOOR_CENTER_X, DOOR_CENTER_Y, 7, 0, Math.PI * 2);
  ctx.fill();

  // Riders sit on their compartment's center line: one person in the middle,
  // two people one behind the other.
  for (let i = 0; i < WING_COUNT; i++) {
    const riders = door.compartments[i];
    const centerAngle = door.compartmentCenterAngle(i);
    riders.forEach((rider, placeInCompartment) => {
      const distanceFactor = riders.length === 1 ? 0.6 : [0.42, 0.78][placeInCompartment];
      const point = pointAroundDoor(centerAngle, DOOR_RADIUS * distanceFactor);
      drawPerson(ctx, point.x, point.y, rider);
    });
  }
}

function drawQueue(ctx, queue) {
  queue.people.forEach((person, placeInLine) => {
    const point = queue.positionOf(placeInLine);
    drawPerson(ctx, point.x, point.y, person);
  });
}

function drawPerson(ctx, x, y, person) {
  ctx.fillStyle = person.type.color;
  ctx.beginPath();
  ctx.arc(x, y, PERSON_RADIUS, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = COLORS.personLabel;
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(person.type.label, x, y + 1);
  // TODO(AC #18, #20): mood ring around riders — green inside range, yellow while
  //   person.secondsTooSlow > 0, red once person.hasComplained.
}

function drawHud(ctx, game) {
  ctx.fillStyle = COLORS.hudText;
  ctx.textBaseline = 'top';

  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`Delivered: ${game.deliveredCount}`, 20, 18);

  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(game.clockText(), CANVAS_WIDTH / 2, 12);

  // TODO(AC #19): replace this text with 3 strike icons.
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`Complaints: ${game.complaintCount} / ${MAX_COMPLAINTS}`, CANVAS_WIDTH - 20, 18);

  ctx.font = '14px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText('Hold SPACE: push door   Hold ↓: street waits   Hold ↑: lobby waits', 20, CANVAS_HEIGHT - 14);
}

function drawEndScreen(ctx, game) {
  ctx.fillStyle = COLORS.endOverlay;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.fillStyle = COLORS.endText;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 56px sans-serif';
  ctx.fillText(END_SCREEN_TITLES[game.endReason], CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60);

  ctx.font = '22px sans-serif';
  ctx.fillText(`People delivered: ${game.deliveredCount}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 10);
  ctx.fillText(`Complaints: ${game.complaintCount}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 44);
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('Press R to try again', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 100);
}

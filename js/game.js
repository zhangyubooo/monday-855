// game.js
// The rules of one round: clock, spawning, entering/exiting, complaints,
// winning and losing. Owns the Door and both Queues.
//
// Game never reads the keyboard or draws anything. It gets a `controls` object
// (see readControls() in input.js) and render.js reads its fields afterwards.
// That split means you can drive a whole round from code in a test:
//   const game = new Game(); game.update(0.016, { isPushingDoor: true, ... });

class Game {
  /** @param {() => number} randomSource  defaults to Math.random; pass a seeded one in tests */
  constructor(randomSource = Math.random) {
    this.randomSource = randomSource;
    this.reset();
  }

  /** Starts a fresh round at 8:55. Also used by the R key on the end screen. */
  reset() {
    this.door = new Door();
    this.streetQueue = new Queue('street');
    this.lobbyQueue = new Queue('lobby');
    this.exitingPeople = [];        // people walking off screen after leaving the door
    this.secondsElapsed = 0;
    this.complaintCount = 0;
    this.deliveredCount = 0;
    // Starting the countdown at 0 makes the first person appear on the first frame.
    this.secondsUntilStreetSpawn = 0;
    this.phase = 'playing';         // 'playing' | 'ended'
    this.endReason = null;          // 'fired' | 'gridlock' | 'madeIt' once the round ends
  }

  /**
   * Advances the round by dt seconds. The ORDER of steps matters:
   * exits run before entries so a compartment empties before new people step in (SPEC 2.4).
   */
  update(dt, controls) {
    if (this.phase !== 'playing') return;

    this.secondsElapsed = Math.min(ROUND_DURATION_SECONDS, this.secondsElapsed + dt);
    this.door.update(dt, controls.isPushingDoor);

    this.letRidersExit();
    this.streetQueue.update(dt, this.door, controls.isStreetGateHeld);
    this.lobbyQueue.update(dt, this.door, controls.isLobbyGateHeld);
    this.updateRiderComfort(dt);
    this.spawnPeople(dt);
    this.moveExitingPeople(dt);
    this.checkForEndOfRound();
  }

  /** Riders whose compartment reached the opposite opening step out and count as delivered. */
  letRidersExit() {
    for (const openingAngle of [LOBBY_OPENING_ANGLE, STREET_OPENING_ANGLE]) {
      const compartmentIndex = this.door.findAlignedCompartment(openingAngle);
      if (compartmentIndex === -1) continue;

      // Copy the list: removeRider() changes the array we would be looping over.
      const riders = [...this.door.compartments[compartmentIndex]];
      for (const rider of riders) {
        if (rider.exitOpeningAngle !== openingAngle) continue;
        this.door.removeRider(rider);
        rider.state = 'exiting';
        const direction = openingAngle === LOBBY_OPENING_ANGLE ? -1 : 1;
        rider.x = DOOR_CENTER_X + EXIT_LANE_OFFSET_X;
        rider.y = DOOR_CENTER_Y + direction * DOOR_RADIUS;
        this.exitingPeople.push(rider);
        this.deliveredCount += 1;
      }
    }
  }

  updateRiderComfort(dt) {
    for (const rider of this.door.allRiders()) {
      if (rider.updateComfort(this.door.speed, dt)) this.recordComplaint(rider);
    }
  }

  recordComplaint(person) {
    this.complaintCount += 1;
    // TODO(AC #19): show person.type.complaintLine in a speech bubble above the
    // person for ~1.5 s. Store it here (e.g. this.speechBubbles) and draw it in render.js.
  }

  spawnPeople(dt) {
    this.secondsUntilStreetSpawn -= dt;
    if (this.secondsUntilStreetSpawn <= 0) {
      this.streetQueue.add(new Person(pickPersonTypeKey('street', this.randomSource()), 'street'));
      this.secondsUntilStreetSpawn += this.currentStreetSpawnInterval();
    }
    // TODO(AC #23): lobby-side spawns, one every LOBBY_SPAWN_INTERVAL seconds, added to
    // this.lobbyQueue with fromSide 'lobby'. Exiting already works in both directions.
  }

  /** Seconds between street arrivals right now. */
  currentStreetSpawnInterval() {
    // TODO(AC #22): return 2.5 after 8:57 and 1.5 after 8:59 (SPEC 2.7).
    // One game minute = ROUND_DURATION_SECONDS / ROUND_GAME_MINUTES = 36 real seconds.
    return STREET_SPAWN_INTERVAL;
  }

  moveExitingPeople(dt) {
    for (const person of this.exitingPeople) {
      const direction = person.fromSide === 'street' ? -1 : 1;   // street people walk up into the lobby
      person.y += direction * EXIT_WALK_SPEED * dt;
    }
    this.exitingPeople = this.exitingPeople.filter(
      (person) => person.y > -PERSON_RADIUS && person.y < CANVAS_HEIGHT + PERSON_RADIUS,
    );
  }

  /** Losing is checked before winning, so a third complaint at exactly 9:00 still loses. */
  checkForEndOfRound() {
    if (this.complaintCount >= MAX_COMPLAINTS) {
      this.endRound('fired');
    } else if (this.streetQueue.length > MAX_QUEUE_LENGTH || this.lobbyQueue.length > MAX_QUEUE_LENGTH) {
      this.endRound('gridlock');
    } else if (this.secondsElapsed >= ROUND_DURATION_SECONDS) {
      this.endRound('madeIt');
    }
  }

  endRound(reason) {
    this.phase = 'ended';
    this.endReason = reason;
  }

  /** Clock text like "8:57". Shows 9:00 only when the round is over. */
  clockText() {
    const secondsPerGameMinute = ROUND_DURATION_SECONDS / ROUND_GAME_MINUTES;
    const totalMinutes = ROUND_START_MINUTES + Math.floor(this.secondsElapsed / secondsPerGameMinute);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}:${String(minutes).padStart(2, '0')}`;
  }
}

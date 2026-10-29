// queue.js
// One line of people waiting outside an opening. The game has two:
// the street queue (below the door) and the lobby queue (above it).

class Queue {
  /** @param {'street'|'lobby'} side */
  constructor(side) {
    this.side = side;
    this.openingAngle = side === 'street' ? STREET_OPENING_ANGLE : LOBBY_OPENING_ANGLE;
    this.people = [];   // index 0 = front of the line, closest to the door
    this.secondsSinceLastEntry = ENTRY_INTERVAL;
  }

  get length() {
    return this.people.length;
  }

  add(person) {
    person.state = 'queued';
    this.people.push(person);
  }

  /**
   * Lets the front person step into the door when the rules allow it (SPEC 2.3–2.4):
   * the gate is not held, a compartment is aligned with this opening, it has room,
   * and at least ENTRY_INTERVAL has passed since the previous person stepped in.
   * At most one person enters per call. Returns that person, or null.
   *
   * If the front person doesn't fit (e.g. a courier needs an empty compartment),
   * everyone behind them waits too. Nobody skips ahead in line.
   */
  update(dt, door, isGateHeld) {
    this.secondsSinceLastEntry += dt;
    if (isGateHeld || this.people.length === 0) return null;
    if (this.secondsSinceLastEntry < ENTRY_INTERVAL) return null;

    const compartmentIndex = door.findAlignedCompartment(this.openingAngle);
    if (compartmentIndex === -1) return null;

    const frontPerson = this.people[0];
    if (!door.canAccept(compartmentIndex, frontPerson)) return null;

    this.people.shift();
    door.addRider(compartmentIndex, frontPerson);
    frontPerson.state = 'riding';
    this.secondsSinceLastEntry = 0;
    return frontPerson;
  }

  /** Pixel position of the person at the given place in line. Used by render.js. */
  positionOf(placeInLine) {
    const direction = this.side === 'street' ? 1 : -1;   // street line grows downward, lobby line upward
    return {
      x: DOOR_CENTER_X,
      y: DOOR_CENTER_Y + direction * (DOOR_RADIUS + QUEUE_GAP_FROM_DOOR + placeInLine * QUEUE_SPACING),
    };
  }
}

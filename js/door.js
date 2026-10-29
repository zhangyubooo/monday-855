// door.js
// The revolving door: its rotation (with inertia) and who is riding in which
// compartment. It knows nothing about queues, complaints or scoring.
//
// Geometry (see the angle convention in constants.js):
//   wing i points at          door.angle + i * 90
//   compartment i lies between wing i and wing i+1, so its center is at
//                             door.angle + i * 90 + 45
// A person inside the door has no x/y of their own. Their position is just
// their compartment's angle; render.js turns that into pixels.

/** Wraps any angle into [0, 360). */
function normalizeAngle(angle) {
  return ((angle % 360) + 360) % 360;
}

/** Smallest distance between two angles, in degrees (0–180). */
function angleDistance(angleA, angleB) {
  const difference = Math.abs(normalizeAngle(angleA) - normalizeAngle(angleB));
  return Math.min(difference, 360 - difference);
}

class Door {
  constructor() {
    // Wings start pointing straight at the openings, so no compartment is
    // aligned until the player pushes. Nobody can walk in during the first moment.
    this.angle = 0;
    this.speed = 0;   // °/s, never negative: the door only turns counterclockwise
    this.compartments = [];
    for (let i = 0; i < WING_COUNT; i++) this.compartments.push([]);
  }

  /** Advances rotation by dt seconds. isPushing = player is holding Space. */
  update(dt, isPushing) {
    if (isPushing) {
      this.speed = Math.min(DOOR_MAX_SPEED, this.speed + DOOR_ACCELERATION * dt);
    } else {
      this.speed = Math.max(0, this.speed - DOOR_FRICTION * dt);
    }
    this.angle = normalizeAngle(this.angle + this.speed * dt);
  }

  wingAngle(wingIndex) {
    return normalizeAngle(this.angle + wingIndex * (360 / WING_COUNT));
  }

  compartmentCenterAngle(compartmentIndex) {
    const wingSpacing = 360 / WING_COUNT;
    return normalizeAngle(this.angle + compartmentIndex * wingSpacing + wingSpacing / 2);
  }

  /** Index of the compartment aligned with the given opening, or -1 if none is. */
  findAlignedCompartment(openingAngle) {
    for (let i = 0; i < WING_COUNT; i++) {
      if (angleDistance(this.compartmentCenterAngle(i), openingAngle) <= ALIGNMENT_TOLERANCE) return i;
    }
    return -1;
  }

  /**
   * Capacity rules from SPEC 2.4: up to 2 people, or exactly 1 person who
   * takes the whole compartment (the courier, not in the game yet).
   */
  canAccept(compartmentIndex, person) {
    const riders = this.compartments[compartmentIndex];
    if (person.type.takesWholeCompartment) return riders.length === 0;
    if (riders.some((rider) => rider.type.takesWholeCompartment)) return false;
    return riders.length < COMPARTMENT_CAPACITY;
  }

  addRider(compartmentIndex, person) {
    this.compartments[compartmentIndex].push(person);
    person.compartmentIndex = compartmentIndex;
  }

  removeRider(person) {
    const riders = this.compartments[person.compartmentIndex];
    riders.splice(riders.indexOf(person), 1);
    person.compartmentIndex = null;
  }

  allRiders() {
    return this.compartments.flat();
  }
}

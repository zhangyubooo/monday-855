// person.js
// Passenger types (data) and the Person class (one passenger's state).
//
// To add a passenger type, add an entry to PERSON_TYPES. Nothing else needs to
// change: spawning reads the weights, Door reads takesWholeCompartment, and
// complaints read the comfort range.

const PERSON_TYPES = {
  // The office worker is the most common type and is comfortable at almost any
  // speed (30–120). Without them, every arrival is a manager or an intern and
  // the game is far harder than designed (simulated careful player: 4/40 rounds
  // survived with only managers and interns, 30/40 with this mix).
  officeWorker: {
    displayName: 'Office worker',
    label: 'W',
    color: '#5f6b7a',
    comfortMinSpeed: 30,
    comfortMaxSpeed: 120,
    streetSpawnWeight: 55,
    lobbySpawnWeight: 70,   // used once lobby spawning exists (AC #23)
    takesWholeCompartment: false,
    complaintLine: 'WATCH IT!',
  },
  // The Late manager and the Coffee intern are the CORE CONFLICT of the game (SPEC 2.5):
  // their comfort ranges do not overlap, so no door speed keeps both of them happy.
  manager: {
    displayName: 'Late manager',
    label: 'M',
    color: '#2f4b8f',
    comfortMinSpeed: 70,    // °/s
    comfortMaxSpeed: 170,
    streetSpawnWeight: 20,  // relative weights, not percentages; only the ratio matters
    lobbySpawnWeight: 0,
    takesWholeCompartment: false,
    complaintLine: 'I HAVE A 9 AM!',
  },
  intern: {
    displayName: 'Coffee intern',
    label: 'I',
    color: '#b8742a',
    comfortMinSpeed: 20,
    comfortMaxSpeed: 60,
    streetSpawnWeight: 15,
    lobbySpawnWeight: 0,
    takesWholeCompartment: false,
    complaintLine: 'MY LATTE!',
  },
  // TODO(AC #15): add the courier from SPEC 2.5:
  //   courier: comfort 15–70, label 'C', takesWholeCompartment: true,
  //            streetSpawnWeight 10, lobbySpawnWeight 30
  // Door.canAccept() already handles takesWholeCompartment, so the table entry should be enough.
  // Test it: a courier at the front must wait for an EMPTY compartment, and so must everyone behind them.
};

/** Picks a random type key for the given side, using the spawn weights. */
function pickPersonTypeKey(side, randomNumber) {
  const weightField = side === 'street' ? 'streetSpawnWeight' : 'lobbySpawnWeight';
  const typeKeys = Object.keys(PERSON_TYPES).filter((key) => PERSON_TYPES[key][weightField] > 0);
  if (typeKeys.length === 0) {
    throw new Error(`No passenger type has ${weightField} > 0. Add one to PERSON_TYPES before spawning on the ${side} side.`);
  }
  const totalWeight = typeKeys.reduce((sum, key) => sum + PERSON_TYPES[key][weightField], 0);
  let remaining = randomNumber * totalWeight;
  for (const key of typeKeys) {
    remaining -= PERSON_TYPES[key][weightField];
    if (remaining < 0) return key;
  }
  return typeKeys[typeKeys.length - 1];
}

class Person {
  /**
   * @param {string} typeKey  a key of PERSON_TYPES
   * @param {'street'|'lobby'} fromSide  the side this person queued on
   */
  constructor(typeKey, fromSide) {
    this.typeKey = typeKey;
    this.type = PERSON_TYPES[typeKey];
    this.fromSide = fromSide;
    // Lifecycle: 'queued' -> 'riding' -> 'exiting' -> removed from the game.
    this.state = 'queued';
    this.compartmentIndex = null;   // set by Door.addRider while riding
    this.secondsTooSlow = 0;        // how long the door has been below this person's range, in a row
    this.hasComplained = false;     // each person complains at most once (SPEC 2.6)
    // Pixel position, ONLY used while 'exiting'. Queued and riding people are
    // positioned by their queue index / door angle at draw time instead.
    this.x = 0;
    this.y = 0;
  }

  /** The opening this person leaves through: the opposite one from where they came in. */
  get exitOpeningAngle() {
    return this.fromSide === 'street' ? LOBBY_OPENING_ANGLE : STREET_OPENING_ANGLE;
  }

  /**
   * Applies the complaint rules from SPEC 2.6 for one frame. Call only while riding.
   * Returns true on exactly the frame this person complains, false otherwise.
   */
  updateComfort(doorSpeed, dt) {
    if (this.hasComplained) return false;

    if (doorSpeed > this.type.comfortMaxSpeed) {
      // Too fast: the wing hits them, so the complaint is immediate.
      this.hasComplained = true;
      return true;
    }
    if (doorSpeed < this.type.comfortMinSpeed) {
      this.secondsTooSlow += dt;
      if (this.secondsTooSlow > TOO_SLOW_GRACE_SECONDS) {
        this.hasComplained = true;
        return true;
      }
      return false;
    }
    this.secondsTooSlow = 0;   // back inside the range resets the "too slow" timer
    return false;
  }
}

// rules_test.js
// Checks the game rules without a browser. Run from the repo root:
//   node tests/rules_test.js
// It loads the logic files (not input/render/main, which need a browser) into one
// shared scope, the same way index.html does, then drives Game.update() directly.
// Each check names the acceptance criterion (AC #) from SPEC.md it covers.
// If you change a rule on purpose, update the matching check here too.
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = path.join(__dirname, '..');
const ctx = vm.createContext({ Math, console });
let code = '';
for (const f of ['constants', 'door', 'person', 'queue', 'game']) code += fs.readFileSync(path.join(root, 'js', f + '.js'), 'utf8') + '\n';
code += 'this.api = { Game, Door, Person, Queue, PERSON_TYPES, angleDistance, pickPersonTypeKey };';
vm.runInContext(code, ctx);
const { Game, Door, Person, PERSON_TYPES, angleDistance, pickPersonTypeKey } = ctx.api;

let failures = 0;
function check(name, cond, extra = '') { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? '  [' + extra + ']' : '')); if (!cond) failures++; }
const DT = 1 / 60;
const none = { isPushingDoor: false, isStreetGateHeld: false, isLobbyGateHeld: false };
const push = { ...none, isPushingDoor: true };
function run(game, seconds, controls) { for (let i = 0; i < Math.round(seconds / DT); i++) game.update(DT, controls); }

// AC3: 90 deg/s after ~1s
{ const d = new Door(); for (let i = 0; i < 60; i++) d.update(DT, true); check('AC3 speed ~90 after 1s', Math.abs(d.speed - 90) < 1, d.speed.toFixed(2)); }
// AC4: slows to stop, never backwards
{ const d = new Door(); for (let i = 0; i < 60; i++) d.update(DT, true); let prev = d.angle, back = false, total = 0;
  for (let i = 0; i < 600; i++) { d.update(DT, false); let delta = (d.angle - prev + 360) % 360; if (delta > 180) back = true; prev = d.angle; }
  check('AC4 stops and never reverses', d.speed === 0 && !back, 'speed ' + d.speed); }
// AC5: max 200
{ const d = new Door(); for (let i = 0; i < 60 * 10; i++) d.update(DT, true); check('AC5 capped at 200', d.speed === 200); }
// alignment geometry
{ const d = new Door(); check('start: nothing aligned with street', d.findAlignedCompartment(270) === -1);
  d.angle = 135; check('angle 135 -> compartment 1 center at 270 (street)', d.findAlignedCompartment(270) === 1 && angleDistance(d.compartmentCenterAngle(1), 270) === 0); }

// AC7 + AC10 + AC11: enter, ride, exit, delivered
{ const g = new Game(() => 0.99);  // always intern (second type)
  run(g, 0.1, none);
  check('a person spawns at start', g.streetQueue.length === 1);
  // slow constant push to ~40 deg/s (intern-comfortable), then coast-hold by toggling
  let entered = false, delivered = false, complaints = 0;
  for (let i = 0; i < 60 * 20; i++) {
    const c = g.door.speed < 40 ? push : none;
    g.update(DT, c);
    if (g.door.allRiders().length) entered = true;
    if (g.deliveredCount > 0) { delivered = true; break; }
  }
  check('AC7 front person enters automatically', entered);
  check('AC11 rider delivered at lobby', delivered, 'delivered ' + g.deliveredCount);
  check('intern kept comfortable at ~40 deg/s -> no complaint', g.complaintCount === 0, 'complaints ' + g.complaintCount);
  check('exiting person walks off', g.exitingPeople.length >= 1);
  run(g, 4, { ...none, isStreetGateHeld: false });
}

// AC8: holding down prevents entry
{ const g = new Game(() => 0.99);
  for (let i = 0; i < 60 * 10; i++) g.update(DT, { ...(g.door.speed < 40 ? push : none), isStreetGateHeld: true });
  check('AC8 gate held -> nobody enters', g.door.allRiders().length === 0 && g.deliveredCount === 0, 'queue ' + g.streetQueue.length);
  for (let i = 0; i < 60 * 5; i++) g.update(DT, g.door.speed < 40 ? push : none);
  check('AC8 release -> people enter again', g.door.allRiders().length + g.deliveredCount > 0); }

// AC9: lobby gate (lobby queue manually filled)
{ const g = new Game(() => 0.99); g.lobbyQueue.add(new Person('intern', 'lobby'));
  for (let i = 0; i < 60 * 6; i++) g.update(DT, { ...(g.door.speed < 40 ? push : none), isLobbyGateHeld: true, isStreetGateHeld: true });
  check('AC9 lobby gate held -> lobby person stays', g.lobbyQueue.length === 1);
  let reachedStreet = false;
  for (let i = 0; i < 60 * 10; i++) { g.update(DT, { ...(g.door.speed < 40 ? push : none), isStreetGateHeld: true }); if (g.exitingPeople.some(p => p.fromSide === 'lobby')) reachedStreet = true; }
  check('AC9 released lobby person rides out to street', reachedStreet); }

// AC16: too fast -> immediate complaint (intern max 60)
{ const p = new Person('intern', 'street'); check('AC16 above range complains immediately', p.updateComfort(61, DT) === true); }
// AC17: too slow > 1.5s complains; < 1.5s then back in range does not
{ const p = new Person('manager', 'street'); let fired = false;
  for (let i = 0; i < 80; i++) fired = p.updateComfort(50, DT) || fired; // 1.33s
  for (let i = 0; i < 10; i++) fired = p.updateComfort(100, DT) || fired;
  for (let i = 0; i < 80; i++) fired = p.updateComfort(50, DT) || fired; // 1.33s again, timer was reset
  check('AC17 short dips do not complain', !fired);
  for (let i = 0; i < 20; i++) fired = p.updateComfort(50, DT) || fired;
  check('AC17 > 1.5s too slow complains', fired);
  check('only once (AC18 rule)', p.updateComfort(10, 5) === false && p.updateComfort(300, DT) === false); }

// AC14: ranges do not overlap
{ const m = PERSON_TYPES.manager, i = PERSON_TYPES.intern; let any = false;
  for (let s = 0; s <= 200; s++) if (s >= m.comfortMinSpeed && s <= m.comfortMaxSpeed && s >= i.comfortMinSpeed && s <= i.comfortMaxSpeed) any = true;
  check('AC14 no speed satisfies both', !any);
  // Sample the street spawn picker directly so the check doesn't depend on one round's luck.
  const counts = {};
  for (let k = 0; k < 1000; k++) { const key = pickPersonTypeKey('street', Math.random()); counts[key] = (counts[key] || 0) + 1; }
  check('AC14 both conflict types spawn on the street', counts.manager > 0 && counts.intern > 0, JSON.stringify(counts));
  check('AC15 (partial) office workers spawn too, and are the most common', counts.officeWorker > counts.manager && counts.officeWorker > counts.intern); }

// AC24: third complaint -> fired
{ const g = new Game(() => 0.99); for (let i = 0; i < 60 * 60 && g.phase === 'playing'; i++) g.update(DT, push);
  check('AC24 full speed with interns -> fired', g.endReason === 'fired', g.endReason + ' complaints ' + g.complaintCount); }

// AC25: hold down -> gridlock before 9:00
{ const g = new Game(); let t = 0; while (g.phase === 'playing') { g.update(DT, { ...none, isStreetGateHeld: true }); t += DT; }
  check('AC25 holding down -> gridlock', g.endReason === 'gridlock', 'at ' + t.toFixed(1) + 's, queue ' + g.streetQueue.length); }

// AC21/26: 180s -> made it, clock text
{ const g = new Game(); check('clock 8:55 at start', g.clockText() === '8:55');
  // keep the door still and people out: no riders, no complaints; queue would gridlock, so clear it each frame
  let t = 0; while (g.phase === 'playing') { g.streetQueue.people.length = 0; g.update(DT, none); t += DT; }
  check('AC21/26 round ends madeIt at 180s', g.endReason === 'madeIt' && Math.abs(t - 180) < 0.1, t.toFixed(2) + 's ' + g.clockText());
  check('clock shows 9:00 at end', g.clockText() === '9:00');
  g.reset(); check('reset -> playing, 8:55, counters zero', g.phase === 'playing' && g.clockText() === '8:55' && g.complaintCount === 0 && g.deliveredCount === 0); }

// AC12-ish: capacity never > 2 under random play
{ const g = new Game(); let maxIn = 0;
  for (let i = 0; i < 60 * 120 && g.phase === 'playing'; i++) { g.update(DT, Math.random() < 0.5 ? push : none); for (const c of g.door.compartments) maxIn = Math.max(maxIn, c.length); }
  check('capacity never exceeds 2', maxIn <= 2, 'max ' + maxIn); }

{ const g = new Game(() => 0.99); g.secondsUntilStreetSpawn = 999; g.streetQueue.add(new Person('intern','street')); g.streetQueue.add(new Person('intern','street'));
  g.door.angle = 135; run(g, 0.5, none);
  check('two people share a stopped, aligned compartment (AC12)', g.door.compartments[1].length === 2 && g.streetQueue.length === 0);
  g.streetQueue.add(new Person('manager','street')); run(g, 0.5, none);
  check('third person waits: compartment full', g.streetQueue.length === 1); }
console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
process.exit(failures ? 1 : 0);

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const start = source.indexOf('/* ---------------- model ---------------- */');
const end = source.indexOf('/* ---------------- pet ---------------- */');
assert.ok(start > 0 && end > start, 'model section exists');

const ctx = {};
vm.createContext(ctx);
vm.runInContext(source.slice(start, end) + `
this.families=COLLECTIBLES;
this.specimens=TREASURE_SPECIMENS;
this.pools=TREASURE_POOLS;
this.nodes=PROGRESSION_NODES;
this.stages=MATH_STAGES;
this.newPlayer=newPlayer;
this.migrate=migrate;
this.collectibleProgressOf=collectibleProgressOf;
this.collectibleTotal=collectibleTotal;
this.bestSpecimenForFamily=bestSpecimenForFamily;
this.treasurePoolFor=treasurePoolFor;
this.pickTreasure=pickTreasure;
this.treasureBest=treasureBest;
this.setTreasureBest=setTreasureBest;
this.treasureBonusEligible=treasureBonusEligible;
`, ctx);
const plain = value => JSON.parse(JSON.stringify(value));

assert.equal(ctx.families.length, 8, 'the den still has eight treasure families');
assert.equal(ctx.specimens.length, 24, 'each family has an easy, medium and hard specimen');
assert.equal(new Set(plain(ctx.specimens).map(s => s.id)).size, 24, 'all specimens have distinct ids');
plain(ctx.families).forEach(family => {
  assert.deepEqual(Object.keys(family.specimens), ['easy', 'medium', 'hard'], `${family.id} has all three tiers`);
});

// Every map stop owns a real local pool. Across the Easy journey, every family becomes
// available before the final lesson, so an Easy-only child can eventually fill the basic den.
plain(ctx.nodes).forEach(node => {
  assert.ok(Array.isArray(ctx.pools[node.id]) && ctx.pools[node.id].length > 0, `${node.id} has a treasure pool`);
});
const beforeFinal = new Set(plain(ctx.nodes).slice(0, -1).flatMap(node => ctx.pools[node.id]));
assert.deepEqual([...beforeFinal].sort(), plain(ctx.families).map(f => f.id).sort(),
  'all eight families are available somewhere before the final lesson');

const player = ctx.newPlayer('Ada', 'girl');
assert.equal(player.collectibles.version, 2, 'new players start on the specimen schema');

const firstEasyPool = plain(ctx.treasurePoolFor('add_1digit', 'easy'));
assert.deepEqual(firstEasyPool.map(x => x.family.id).sort(), ['leaves', 'stars']);
assert.deepEqual(firstEasyPool.map(x => x.specimen.difficulty), ['easy', 'easy'],
  'Easy can only draw Easy specimens');
const firstMediumPool = plain(ctx.treasurePoolFor('add_1digit', 'medium'));
assert.equal(firstMediumPool.every(x => x.specimen.difficulty === 'medium'), true,
  'Medium rewards its own tier rather than handing out Hard treasures');
const firstHardPool = plain(ctx.treasurePoolFor('add_1digit', 'hard'));
assert.equal(firstHardPool.every(x => x.specimen.difficulty === 'hard'), true);

// Fifty successful replays of the first Easy lesson still pay out every time, but they can
// only grow the two local Easy treasures. Grinding lesson one cannot fill the whole den.
for (let i = 0; i < 50; i += 1) ctx.pickTreasure(player, 'add_1digit', 'easy', false, () => (i % 2) * 0.75);
assert.equal(ctx.collectibleTotal(player), 50, 'old lessons remain rewarding indefinitely');
const heldAfterGrinding = Object.entries(plain(ctx.collectibleProgressOf(player).specimens))
  .filter(([, qty]) => qty > 0).map(([id]) => id).sort();
assert.deepEqual(heldAfterGrinding, ['littleStar', 'luckyLeaf'],
  'repeating the easiest lesson cannot discover later families or tiers');
assert.equal(ctx.collectibleProgressOf(player).specimens.moonStar, 0);
assert.equal(ctx.collectibleProgressOf(player).specimens.guardianStar, 0);
assert.equal(ctx.collectibleProgressOf(player).specimens.blueCrystal, 0);

// Reaching a cave genuinely changes what can be found.
const cavePool = plain(ctx.treasurePoolFor('sub_2column', 'easy'));
assert.deepEqual(cavePool.map(x => x.family.id).sort(), ['crystals', 'mushrooms']);
ctx.pickTreasure(player, 'sub_2column', 'easy', true, () => 0);
assert.equal(ctx.collectibleProgressOf(player).specimens.blueCrystal, 1,
  'Crystal Caves can introduce the first crystal');

// A new badge favours discovery. Even a random value aimed at the first slot must choose the
// unseen local specimen when one exists, rather than another copy of the treasure already held.
const fresh = ctx.newPlayer('Bea', 'girl');
ctx.pickTreasure(fresh, 'add_1digit', 'easy', false, () => 0); // Little Star
const discovery = plain(ctx.pickTreasure(fresh, 'add_1digit', 'easy', true, () => 0));
assert.equal(discovery.specimen.id, 'luckyLeaf');
assert.equal(discovery.first, true, 'a fresh badge finds something new when the local pool allows it');

// Old saves keep every duplicate, but those copies become the Easy specimen only. Grinding
// before v2 cannot manufacture Medium or Hard treasures during migration.
const old = ctx.migrate({
  id:'old', name:'Old save', total:10, right:8, best:4, look:'girl', momoName:'Momo',
  collectibles:{stars:3, crystals:2}, accessories:[], storySeen:true, migrationVersion:9,
  stageProgress:{completed:{add_1digit:true}, available:{add_2column:true}}
});
assert.equal(old.collectibles.version, 2);
assert.equal(old.collectibles.specimens.littleStar, 3);
assert.equal(old.collectibles.specimens.blueCrystal, 2);
assert.equal(old.collectibles.specimens.moonStar, 0);
assert.equal(old.collectibles.specimens.heartCrystal, 0);
assert.equal(ctx.collectibleTotal(old), 5, 'migration preserves the number of old rewards exactly');

// Best-score bonuses reward improvement rather than blind repetition. A migrated save has no
// baseline, so its first sit only establishes one; afterwards a better score or a perfect sit
// earns one bonus draw. The boolean means the session can never create more than one bonus.
assert.equal(ctx.treasureBest(old, 'add_1digit', 'easy'), null);
assert.equal(ctx.treasureBonusEligible(null, 7, 8, true), false,
  'the first sit after migration establishes the baseline without a bonus');
ctx.setTreasureBest(old, 'add_1digit', 'easy', 7);
assert.equal(ctx.treasureBest(old, 'add_1digit', 'easy'), 7);
assert.equal(ctx.treasureBonusEligible(7, 8, 8, true), true, 'beating the best earns the bonus');
assert.equal(ctx.treasureBonusEligible(8, 8, 8, true), true, 'a perfect replay earns the bonus too');
assert.equal(ctx.treasureBonusEligible(7, 7, 8, true), false, 'same non-perfect score does not');
assert.equal(ctx.treasureBonusEligible(7, 8, 8, false), false,
  'a first story completion is not treated as a grind bonus');

// The den representative is the highest tier actually owned, while quantities stay attached
// to each specimen instead of one family-wide counter.
const starFamily = ctx.families.find(f => f.id === 'stars');
let best = plain(ctx.bestSpecimenForFamily(player, starFamily));
assert.equal(best.specimen.id, 'littleStar');
ctx.pickTreasure(player, 'add_1digit', 'medium', true, () => 0);
best = plain(ctx.bestSpecimenForFamily(player, starFamily));
assert.equal(best.specimen.id, 'moonStar', 'a Medium find upgrades what the main den displays');
assert.ok(ctx.collectibleProgressOf(player).specimens.littleStar > 0,
  'the older Easy copies are still there underneath the display');

console.log('Collectibles v2 tests passed');

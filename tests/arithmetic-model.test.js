const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function functionSource(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `Missing function ${name}`);
  const opening = source.indexOf('{', start);
  let depth = 0;
  for (let i = opening; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    if (source[i] === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`Unterminated function ${name}`);
}

const context = { Math };
vm.createContext(context);
vm.runInContext([
  'const rnd=(a,b)=>a+Math.floor(Math.random()*(b-a+1));',
  functionSource('buildColumn'),
  functionSource('buildLongMultiplication'),
  functionSource('twoDigitColumnAddition')
].join('\n'), context);

function subtractionAnswer(model) {
  return Number(model.steps.filter(step => step.t === 'res')
    .sort((a, b) => a.col - b.col).map(step => step.want).join(''));
}

[
  [730, 141, 589],
  [502, 178, 324],
  [1000, 367, 633],
  [8040, 2756, 5284],
  [7002, 1847, 5155]
].forEach(([a, b, expected]) => {
  const model = context.buildColumn('sub', a, b);
  assert.equal(subtractionAnswer(model), expected, `${a} − ${b}`);
  assert.ok(model.steps.some(step => step.t === 'ann'), 'borrow annotations are planned');
});

function annotationHistory(model) {
  const history = {};
  model.steps.filter(step => step.t === 'ann').forEach(step => {
    (history[step.col] ||= []).push(step.want);
  });
  return history;
}

assert.deepEqual(annotationHistory(context.buildColumn('sub', 1000, 367)), {
  0: ['0'], 1: ['10', '9'], 2: ['10', '9'], 3: ['10']
});
assert.deepEqual(annotationHistory(context.buildColumn('sub', 730, 141))[1], ['2', '12']);

[
  [12, 13, 156],
  [23, 14, 322],
  [47, 26, 1222],
  [58, 34, 1972],
  [99, 99, 9801]
].forEach(([a, b, expected]) => {
  const model = context.buildLongMultiplication(a, b);
  assert.equal(model.total, expected, `${a} × ${b}`);
  assert.equal(model.partials[0] + model.partials[1], expected, 'partial rows add to the product');
  assert.ok(model.steps.some(step => step.t === 'placeholder'), 'tens row includes its zero placeholder');
  assert.ok(model.steps.some(step => step.t === 'sum'), 'final column addition is planned');
});

const example = context.buildLongMultiplication(23, 14);
assert.deepEqual([...example.partials], [92, 230]);

for (const index of [1, 2, 3]) {
  const question = context.twoDigitColumnAddition(index);
  assert.equal(question.M.steps.filter(step => step.t === 'carry').length, 0, 'opening phase has no carrying');
}
for (const index of [4, 5, 6]) {
  const question = context.twoDigitColumnAddition(index);
  assert.equal(question.M.steps.filter(step => step.t === 'carry').length, 1, 'middle phase has one carry');
}

const migrationContext = {};
vm.createContext(migrationContext);
const stagesSource = source.match(/const MATH_STAGES=\[[\s\S]*?\n\];/)[0];
vm.runInContext([
  stagesSource,
  functionSource('blankStageProgress'),
  functionSource('progressFromCount'),
  functionSource('migrateV3StageProgress'),
  'this.stageIds=MATH_STAGES.map(stage=>stage.id);this.migrateProgress=migrateV3StageProgress;'
].join('\n'), migrationContext);
assert.deepEqual([...migrationContext.stageIds].slice(0, 5), [
  'add_1digit', 'add_2column', 'add_2mental', 'add_3column', 'add_4column'
]);
assert.equal(migrationContext.stageIds.length, 14);
const migrated = migrationContext.migrateProgress({completed:{
  add_1digit:true, add_2digit:true, add_3column:true
}});
assert.equal(migrated.completed.add_2column, true);
assert.equal(migrated.completed.add_2mental, true);
assert.equal(migrated.completed.add_3column, true);
assert.equal(migrated.completed.add_4column, false);

console.log('Arithmetic model tests passed.');

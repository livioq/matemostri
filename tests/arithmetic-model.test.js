const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));

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
  "const columnPlace=(wid,col)=>['ones','tens','hundreds','thousands','ten-thousands'][wid-1-col]||'next';",
  functionSource('buildColumn'),
  functionSource('buildLongMultiplication'),
  functionSource('twoDigitColumnAddition'),
  functionSource('commitColumnStep'),
  functionSource('commitLongMultiplicationStep'),
  functionSource('colPrompt'),
  functionSource('longMulPrompt'),
  functionSource('divSteps'),
  functionSource('longDivisionPhase'),
  functionSource('genDivision'),
  functionSource('generateLessonQuestion'),
  functionSource('divPlan'),
  functionSource('divPromptText')
].join('\n'), context);

function subtractionAnswer(model) {
  return Number(model.steps.filter(step => step.t === 'res')
    .sort((a, b) => a.col - b.col).map(step => step.want).join(''));
}

[
  [61, 63, '12'],
  [58, 67, '12'],
  [86, 79, '16'],
  [487, 658, '11']
].forEach(([a, b, finalValue]) => {
  const model = context.buildColumn('add', a, b);
  const final = model.steps.at(-1);
  assert.equal(final.t, 'final', `${a} + ${b} ends with one complete final-column action`);
  assert.equal(final.want, finalValue);
  assert.equal(model.steps.some(step => step.t === 'carry' && step.col < final.col), false,
    'no carry is created in an empty leading column');
  while (model.steps[model.si]) context.commitColumnStep(model);
  const result = Number(Object.keys(model.ent.res).sort((x, y) => x - y).map(col => model.ent.res[col]).join(''));
  assert.equal(result, a + b);
});

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

const reborrow = context.buildColumn('sub', 730, 141);
assert.deepEqual(plain(reborrow.steps.slice(0, 6).map(step => [step.t, step.col])), [
  ['ann', 1], ['ann', 2], ['res', 2], ['ann', 0], ['ann', 1], ['res', 1]
]);
assert.equal(reborrow.ent.annotations[0].length, 0);
context.commitColumnStep(reborrow);
context.commitColumnStep(reborrow);
assert.equal(reborrow.steps[reborrow.si].t, 'res');
assert.equal(reborrow.ent.annotations[0].length, 0, 'hundreds borrow is not visible during units work');
context.commitColumnStep(reborrow);
assert.equal(reborrow.steps[reborrow.si].col, 0, 'hundreds borrow is revealed only after the units result');
assert.match(context.colPrompt(reborrow), /borrowing/i);
assert.equal(reborrow.ent.annotations[0].length, 0, 'the newly revealed action has not rewritten its digit early');

const zeroChain = context.buildColumn('sub', 1000, 367);
assert.deepEqual(plain(zeroChain.steps.slice(0, 9).map(step => [step.t, step.col, step.role || step.place])), [
  ['seek', 2, 'tens'],
  ['seek', 1, 'hundreds'],
  ['ann', 0, 'lend'],
  ['ann', 1, 'receive'],
  ['ann', 1, 'pass'],
  ['ann', 2, 'receive'],
  ['ann', 2, 'pass'],
  ['ann', 3, 'receive'],
  ['res', 3, null]
]);
assert.match(context.colPrompt(zeroChain), /tens column has 0/);
assert.equal(zeroChain.ent.annotations.flat().length, 0);
context.commitColumnStep(zeroChain);
assert.match(context.colPrompt(zeroChain), /hundreds column has 0/);
assert.equal(zeroChain.ent.annotations.flat().length, 0, 'zero-search steps do not rewrite future digits');

[
  [27, 4, 108],
  [46, 7, 322]
].forEach(([a, b, expected]) => {
  const model = context.buildColumn('mul', a, b);
  const carry = model.steps.find(step => step.t === 'mulCarry');
  const final = model.steps.at(-1);
  assert.equal(carry.placement, 'side');
  assert.equal(carry.row, 0);
  assert.equal(final.t, 'mulFinal');
  assert.equal(model.steps.some(step => step.t === 'carry'), false, 'multiplication does not use addition carry placement');
  while (model.steps[model.si]) context.commitColumnStep(model);
  const result = Number(Object.keys(model.ent.res).sort((x, y) => x - y).map(col => model.ent.res[col]).join(''));
  assert.equal(result, expected);
});

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
  model.steps.filter(step => step.t === 'partialCarry').forEach(step => {
    assert.equal(step.placement, 'side');
    assert.ok(step.row === 0 || step.row === 1, 'each multiplication carry owns a partial row');
  });
  assert.equal(model.steps.some(step => step.t === 'partialCarry' && step.col === undefined), false);
});

const example = context.buildLongMultiplication(23, 14);
assert.deepEqual([...example.partials], [92, 230]);
const largeExample = context.buildLongMultiplication(99, 99);
assert.ok(largeExample.steps.some(step => step.t === 'partialFinal' && step.row === 0));
assert.ok(largeExample.steps.some(step => step.t === 'partialFinal' && step.row === 1));

for (const index of [1, 2, 3]) {
  const question = context.twoDigitColumnAddition(index);
  assert.equal(question.M.steps.filter(step => step.t === 'carry').length, 0, 'opening phase has no carrying');
}
for (const index of [4, 5, 6]) {
  const question = context.twoDigitColumnAddition(index);
  assert.equal(question.M.steps.filter(step => step.t === 'carry').length, 1, 'middle phase has one carry');
}

function checkDivisionQuestion(made, label) {
  assert.equal(String(made.d).length, 1, `${label}: the divisor stays a single digit (got ${made.d})`);
  assert.ok(made.d >= 2 && made.d <= 9, `${label}: the divisor is between 2 and 9 (got ${made.d})`);
  assert.ok(made.rest < made.d, `${label}: what is left over is smaller than the divisor`);
  assert.equal(Number(made.N), made.d * Number(made.quot) + made.rest, `${label}: ${made.N} ÷ ${made.d}`);
  assert.ok(made.N.length >= 2 && made.N.length <= 4, `${label}: the dividend has 2 to 4 digits`);
  assert.deepEqual(plain(made.steps), plain(context.divSteps(made.N, made.d)), `${label}: steps match the dividend`);
  assert.equal(made.steps.some(step => step.q === 0), false, `${label}: no round writes a 0 above the line`);
  assert.ok(made.steps.length >= 2, `${label}: there is at least one digit to bring down`);
  assert.equal(made.steps.map(step => step.q).join(''), made.quot, `${label}: the written digits spell the answer`);
  assert.equal(made.steps.at(-1).rem, made.rest, `${label}: the last subtraction leaves the remainder`);
}

for (const tier of [0, 1, 2, 3]) {
  for (let i = 0; i < 300; i += 1) checkDivisionQuestion(context.genDivision(tier), `tier ${tier}`);
}
for (const tier of [0, 1]) {
  for (let i = 0; i < 50; i += 1) {
    assert.equal(context.genDivision(tier).rest, 0, `tier ${tier} divides exactly`);
  }
}

const longDivisionStage = {id:'div_long', gid:'div', label:'Long division', mode:'division'};
const sessionLength = Number(source.match(/const SESSION=(\d+);/)[1]);
const rampWidths = {};
const rampLeftovers = {};
for (let index = 1; index <= sessionLength; index += 1) {
  rampWidths[index] = new Set();
  rampLeftovers[index] = new Set();
  for (let i = 0; i < 200; i += 1) {
    const question = context.generateLessonQuestion(longDivisionStage, index);
    assert.equal(question.kind, 'div');
    checkDivisionQuestion(question.made, `long division question ${index}`);
    rampWidths[index].add(question.made.N.length);
    rampLeftovers[index].add(question.made.rest > 0);
    if (question.made.rest > 0) {
      assert.ok(question.made.rest >= 1 && question.made.rest < question.made.d,
        `question ${index} leaves 1 to d-1 over, never a sneaky 0`);
    }
  }
  assert.equal(rampWidths[index].size, 1, `question ${index} always has one dividend length`);
  assert.equal(rampLeftovers[index].size, 1, `question ${index} either always leaves something over or never does`);
}
const rampByIndex = Object.keys(rampWidths).map(index => [...rampWidths[index]][0]);
assert.deepEqual(rampByIndex, [2, 2, 2, 3, 3, 3, 4, 4, 4, 4],
  'the lesson ramps from two-digit dividends to three then four');
assert.deepEqual([...rampByIndex].sort((a, b) => a - b), rampByIndex, 'the ramp never goes backwards');

const leftoverByIndex = Object.keys(rampLeftovers).map(index => [...rampLeftovers[index]][0]);
assert.deepEqual(leftoverByIndex,
  [false, false, true, false, false, true, false, false, true, true],
  'each dividend length is met dividing exactly before it is met with something left over');
leftoverByIndex.forEach((leftover, i) => {
  if (!leftover) return;
  const grew = i > 0 && rampByIndex[i] !== rampByIndex[i - 1];
  assert.equal(grew, false, `question ${i + 1} does not grow longer and leave something over at once`);
});

function promptsFor(question) {
  const plan = context.divPlan(question);
  return plan.map((step, pi) => context.divPromptText({plan, pi, g:question}));
}

const leftoverQuestion = {div:true, N:'23', d:2, steps:context.divSteps('23', 2), quot:'11', rest:1};
const leftoverPlan = context.divPlan(leftoverQuestion);
const lastSteps = leftoverPlan.filter(step => step.last);
assert.equal(lastSteps.length, 1, 'exactly one take-away is the last one');
assert.equal(lastSteps[0].t, 'rem');
assert.equal(lastSteps[0], leftoverPlan.at(-1), 'the last take-away ends the question');
assert.equal(lastSteps[0].want, '1', 'the last take-away is what is left over');

const leftoverPrompts = promptsFor(leftoverQuestion);
assert.match(leftoverPrompts.at(-1), /Nothing left to bring down/,
  'the child is told there is no digit waiting to come down');
assert.match(leftoverPrompts.at(-1), /left over/);
assert.equal(leftoverPrompts.slice(0, -1).some(text => /left over/.test(text)), false,
  'earlier take-aways are still just what is left, not what is left over');

const bringDownPrompt = leftoverPrompts.find((text, i) => leftoverPlan[i].t === 'rem' && !leftoverPlan[i].last);
assert.match(bringDownPrompt, /Write what is left\./);

// no jargon in anything a child reads
const jargon = /remainder|quotient|product|divisor|dividend/i;
[
  leftoverQuestion,
  {div:true, N:'126', d:6, steps:context.divSteps('126', 6), quot:'21', rest:0},
  context.generateLessonQuestion(longDivisionStage, 9).made
].forEach(question => {
  promptsFor(question).forEach(text => {
    assert.equal(jargon.test(text), false, `no jargon in "${text}"`);
  });
});

const fallbackContext = {Math, rnd:() => 0, divSteps:() => [{q:0}]};
vm.createContext(fallbackContext);
vm.runInContext(functionSource('genDivision'), fallbackContext);
const fallback = fallbackContext.genDivision(3);
assert.equal(String(fallback.d).length, 1, 'the built-in fallback question also uses a single-digit divisor');
assert.equal(Number(fallback.N), fallback.d * Number(fallback.quot) + fallback.rest);

class FakeElement {
  constructor() { this.children = []; this.style = {}; this.className = ''; this.textContent = ''; }
  appendChild(child) { this.children.push(child); return child; }
  set innerHTML(value) { this.children = []; this._innerHTML = value; }
  get innerHTML() { return this._innerHTML || ''; }
}
const uiElements = {};
const resetUi = () => {
  ['colGrid', 'colPrompt', 'colHint', 'hintBtn'].forEach(id => { uiElements[id] = new FakeElement(); });
};
resetUi();
const uiContext = {
  document:{createElement:() => new FakeElement()},
  $:id => uiElements[id],
  S:null
};
vm.createContext(uiContext);
vm.runInContext([
  functionSource('colPrompt'),
  functionSource('renderCol'),
  functionSource('longMulPrompt'),
  functionSource('renderLongMul')
].join('\n'), uiContext);

const revealUi = context.buildColumn('sub', 730, 141);
context.commitColumnStep(revealUi);
context.commitColumnStep(revealUi);
resetUi(); uiContext.S = {col:revealUi}; uiContext.renderCol();
assert.equal(uiElements.colGrid.children.some(child => child.textContent === '6'), false,
  'the future hundreds rewrite is absent while the units answer is active');
context.commitColumnStep(revealUi);
resetUi(); uiContext.S = {col:revealUi}; uiContext.renderCol();
assert.equal(uiElements.colGrid.children.some(child => child.textContent === '6'), false,
  'revealing the next borrow prompt does not rewrite its digit before the child acts');

const zeroRevealUi = context.buildColumn('sub', 1000, 367);
resetUi(); uiContext.S = {col:zeroRevealUi}; uiContext.renderCol();
assert.equal(uiElements.colGrid.children.some(child => child.textContent === '9'), false);
context.commitColumnStep(zeroRevealUi);
resetUi(); uiContext.S = {col:zeroRevealUi}; uiContext.renderCol();
assert.equal(uiElements.colGrid.children.some(child => child.textContent === '9'), false,
  'no passed-through 9 appears while the zero-borrow path is still being explored');

const singleUi = context.buildColumn('mul', 27, 4);
context.commitColumnStep(singleUi);
context.commitColumnStep(singleUi);
resetUi(); uiContext.S = {col:singleUi, colB:4}; uiContext.renderCol();
const singleCarryNote = uiElements.colGrid.children.find(child => child.className.includes('mul-carry-note'));
assert.ok(singleCarryNote, 'single-digit multiplication renders a side carry annotation');
assert.equal(singleCarryNote.style.gridRow, 2);
assert.ok(Number(singleCarryNote.style.gridColumn) > singleUi.wid + 1, 'carry is to the right of the calculation grid');
assert.equal(uiElements.colGrid.children.some(child => child.style.gridRow === 1 && /carry/.test(child.textContent)), false,
  'multiplication carry is never rendered above the multiplicand');

const longUi = context.buildLongMultiplication(99, 99);
while (!(longUi.steps[longUi.si].row === 1)) context.commitLongMultiplicationStep(longUi);
resetUi(); uiContext.S = {longMul:longUi}; uiContext.renderLongMul();
let carryNotes = uiElements.colGrid.children.filter(child => child.className.includes('mul-carry-note'));
assert.equal(carryNotes.length, 1);
assert.equal(carryNotes[0].style.gridRow, 5, 'first carry belongs to the first partial-product row');
assert.match(carryNotes[0].className, /retired/, 'first-row carry retires before the second row begins');
while (!(longUi.steps[longUi.si].t === 'partialCarry' && longUi.steps[longUi.si].row === 1)) context.commitLongMultiplicationStep(longUi);
context.commitLongMultiplicationStep(longUi);
resetUi(); uiContext.S = {longMul:longUi}; uiContext.renderLongMul();
carryNotes = uiElements.colGrid.children.filter(child => child.className.includes('mul-carry-note'));
assert.equal(carryNotes.length, 2);
assert.equal(carryNotes.find(note => note.style.gridRow === 5).className.includes('retired'), true);
assert.equal(carryNotes.find(note => note.style.gridRow === 6).className.includes('retired'), false,
  'second-row carry remains active only beside its own row');

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

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
  'const colValid=M=>M.steps.every(s=>/^\\d+$/.test(s.want));',
  functionSource('buildColumn'),
  functionSource('buildLongMultiplication'),
  functionSource('twoDigitColumnAddition'),
  functionSource('twoDigitColumnSubtraction'),
  functionSource('commitColumnStep'),
  functionSource('commitLongMultiplicationStep'),
  functionSource('colPrompt'),
  functionSource('longMulPrompt'),
  functionSource('divSteps'),
  functionSource('longDivisionPhase'),
  functionSource('genDivision'),
  functionSource('generateLessonQuestion'),
  functionSource('divPlan'),
  functionSource('divPromptText'),
  source.match(/const SESSION=\d+;/)[0],
  functionSource('sessionPlan')
].join('\n'), context);

function subtractionAnswer(model) {
  return Number(model.steps.filter(step => step.t === 'res')
    .sort((a, b) => a.col - b.col).map(step => step.want).join(''));
}

// answer digits are written one column at a time, right to left, the way they are on paper
function answerDigitOrder(model) {
  return plain(model.steps.filter(step => step.t === 'res').map(step => step.col));
}
function hasDigits(model, col) {
  return model.ad[col] !== null || model.bd[col] !== null;
}

assert.deepEqual(
  plain(context.buildColumn('add', 63, 71).steps.map(step => step.t + ':' + step.want)),
  ['res:4', 'res:3', 'res:1'],
  '63 + 71 is written 4, then 3, then the 1 that spills over — not 4, then 1, then 3');

[
  [61, 63],
  [58, 67],
  [86, 79],
  [487, 658],
  [12, 13],
  [999, 1],
  [1000, 9999]
].forEach(([a, b]) => {
  const model = context.buildColumn('add', a, b);
  const order = answerDigitOrder(model);
  assert.deepEqual(order, [...order].sort((x, y) => y - x),
    `${a} + ${b} writes its answer digits right to left`);
  assert.equal(new Set(order).size, order.length, `${a} + ${b} writes each answer column once`);
  model.steps.filter(step => step.t === 'carry').forEach(step => {
    assert.equal(hasDigits(model, step.col), true,
      `${a} + ${b} puts no carry mark above a column with no digits of its own`);
  });
  assert.equal(model.steps.some(step => step.want.length > 1), false,
    `${a} + ${b} never asks for two digits in one go`);
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
  assert.equal(carry.placement, 'side');
  assert.equal(carry.row, 0);
  assert.equal(model.steps.some(step => step.t === 'carry'), false, 'multiplication does not use addition carry placement');
  const mulOrder = answerDigitOrder(model);
  assert.deepEqual(mulOrder, [...mulOrder].sort((x, y) => y - x),
    `${a} × ${b} writes its answer digits right to left too`);
  assert.equal(model.steps.some(step => step.want.length > 1), false,
    `${a} × ${b} never asks for two digits in one go`);
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
// 99 × 99 carries out of the last multiplication in both rows: that carry is written on
// its own, right to left, not tacked onto the previous digit as a two-digit entry
[0, 1].forEach(row => {
  const leading = largeExample.steps.filter(step => step.t === 'partial' && step.leading && step.row === row);
  assert.equal(leading.length, 1, `row ${row} writes its final carried digit once`);
  assert.equal(leading[0].want, '8');
  const rowCols = plain(largeExample.steps
    .filter(step => (step.t === 'partial' || step.t === 'placeholder') && step.row === row)
    .map(step => step.col));
  assert.deepEqual(rowCols, [...rowCols].sort((x, y) => y - x), `row ${row} is filled right to left`);
});
assert.equal(largeExample.steps.some(step => step.want.length > 1), false,
  'no step in a long multiplication asks for two digits at once');
assert.match(context.longMulPrompt({steps:[{t:'partial', leading:true, want:'8'}], si:0}),
  /final carried 8/, 'and the child is told what that digit is');

for (const index of [1, 2, 3]) {
  const question = context.twoDigitColumnAddition(index);
  assert.equal(question.M.steps.filter(step => step.t === 'carry').length, 0, 'opening phase has no carrying');
}
for (const index of [4, 5, 6]) {
  const question = context.twoDigitColumnAddition(index);
  assert.equal(question.M.steps.filter(step => step.t === 'carry').length, 1, 'middle phase has one carry');
}

for (let index = 1; index <= 12; index += 1) {
  for (let i = 0; i < 60; i += 1) {
    const question = context.twoDigitColumnSubtraction(index);
    const regroups = question.M.steps.some(step => step.t === 'ann');
    assert.equal(question.kind, 'col', 'two-digit subtraction is column work, not mental');
    assert.equal(String(question.a).length, 2);
    assert.equal(String(question.b).length, 2);
    assert.ok(question.a > question.b, `${question.a} − ${question.b} never goes below zero`);
    assert.equal(String(question.a - question.b).length, 2,
      `${question.a} − ${question.b} fills both columns, so no leading 0 is written`);
    assert.equal(subtractionAnswer(question.M), question.a - question.b);
    assert.equal(question.M.steps.every(step => /^\d+$/.test(step.want)), true, 'every step asks for digits');
    if (index <= 3) assert.equal(regroups, false, 'the opening phase never crosses a digit out');
    if (index > 3 && index <= 6) assert.equal(regroups, true, 'the middle phase always crosses a digit out');
  }
}

// harder lessons ask for fewer questions, and the share needed to pass moves with them
[
  [{id:'add_4column', digits:4}, 5, 4],
  [{id:'sub_4column', digits:4}, 5, 4],
  [{id:'add_3column', digits:3}, 7, 6],
  [{id:'sub_3column', digits:3}, 7, 6],
  [{id:'add_2column', digits:2}, 10, 8],
  [{id:'sub_2column', digits:2}, 10, 8],
  [{id:'mul_1x2', digits:2}, 10, 8],
  [{id:'mul_2x2', digits:2}, 10, 8],
  [{id:'add_1digit'}, 10, 8],
  [{id:'div_long', mode:'division'}, 10, 8]
].forEach(([stage, total, pass]) => {
  const plan = context.sessionPlan(stage);
  assert.equal(plan.total, total, `${stage.id} asks ${total} questions`);
  assert.equal(plan.pass, pass, `${stage.id} needs ${pass} mastered to light the path`);
  assert.ok(plan.pass <= plan.total, `${stage.id} is possible to complete at all`);
  assert.ok(plan.pass >= 1, `${stage.id} cannot be passed with nothing mastered`);
  assert.equal(plan.pass, Math.ceil(plan.total * 0.8), `${stage.id} keeps the same share as 8 in 10`);
});
assert.equal(context.sessionPlan().total, 10, 'a missing stage falls back to the full session');
assert.equal(context.sessionPlan({id:'add_4column', digits:4}).total < context.sessionPlan({id:'add_3column', digits:3}).total,
  true, 'four-digit lessons are shorter than three-digit ones');
assert.equal(context.sessionPlan({id:'add_3column', digits:3}).total < context.sessionPlan({id:'add_2column', digits:2}).total,
  true, 'three-digit lessons are shorter than two-digit ones');

// two-digit subtraction in the head, after the columns have taught it
const mentalSubStage = {id:'sub_2mental', gid:'sub', label:'Two-digit mental subtraction', mode:'mental'};
for (let i = 0; i < 400; i += 1) {
  const question = context.generateLessonQuestion(mentalSubStage, (i % 10) + 1);
  assert.equal(question.kind, 'n', 'a mental lesson asks for the answer, not column working');
  const [a, b] = question.txt.split(' − ').map(Number);
  assert.equal(question.ans, a - b);
  assert.ok(question.ans > 0, `${question.txt} never reaches zero or below`);
  assert.equal(String(a).length, 2, `${question.txt} takes from a two-digit number`);
  assert.equal(String(b).length, 2, `${question.txt} takes away a two-digit number`);
  assert.ok(question.ans >= 10, `${question.txt} leaves a two-digit answer`);
}

// the worked example the teaching rules are written around
const canonical = context.buildColumn('sub', 84, 16);
assert.equal(subtractionAnswer(canonical), 68);
assert.deepEqual(annotationHistory(canonical), {0: ['7'], 1: ['14']},
  'on 84 − 16 the 8 becomes 7 and the 4 becomes 14');

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
const sessionLength = context.sessionPlan(longDivisionStage).total;
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
  constructor() { this.children = []; this.style = {}; this.className = ''; this.textContent = ''; this.attrs = {}; }
  appendChild(child) { this.children.push(child); return child; }
  setAttribute(name, value) { this.attrs[name] = value; }
  set innerHTML(value) { this.children = []; this._innerHTML = value; }
  get innerHTML() { return this._innerHTML || ''; }
}
const uiElements = {};
const resetUi = () => {
  ['colGrid', 'colPrompt', 'colHint', 'hintBtn', 'progress'].forEach(id => { uiElements[id] = new FakeElement(); });
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
  functionSource('renderLongMul'),
  functionSource('renderStars'),
  functionSource('markQuestion')
].join('\n'), uiContext);

// one star space per question, filled as they are answered
resetUi();
uiContext.S = {total:5, pass:4, marks:[]};
uiContext.renderStars(false);
assert.equal(uiElements.progress.children.length, 5, 'a five-question lesson shows five spaces');
assert.equal(uiElements.progress.children.every(c => c.textContent === '\u2606'), true, 'all empty to begin with');
assert.match(uiElements.progress.attrs['aria-label'], /0 of 5 stars, 4 needed/);

uiContext.markQuestion('won');
uiContext.markQuestion('helped');
assert.deepEqual(uiElements.progress.children.map(c => c.textContent),
  ['\u2605', '\u2605', '\u2606', '\u2606', '\u2606'], 'answered questions show a star, the rest stay empty');
assert.match(uiElements.progress.children[0].className, /won/);
assert.match(uiElements.progress.children[1].className, /helped/,
  'a star earned with help still lights, just softly');
assert.match(uiElements.progress.children[1].className, /fresh/, 'the new star is the one that pops');
assert.equal(/fresh/.test(uiElements.progress.children[0].className), false, 'and only the new one');
assert.match(uiElements.progress.attrs['aria-label'], /1 of 5 stars/,
  'only unhelped stars count towards the pass mark');

// the row can never outgrow the lesson
for (let i = 0; i < 10; i += 1) uiContext.markQuestion('won');
assert.equal(uiContext.S.marks.length, 5, 'no more marks than there are questions');
assert.equal(uiElements.progress.children.length, 5);

uiContext.S = {total:10, pass:8, marks:[]};
uiContext.renderStars(false);
assert.equal(uiElements.progress.children.length, 10, 'a ten-question lesson shows ten');

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
const retiredSource = source.match(/const RETIRED_STAGE_IDS=\{[^}]*\};/)[0];
vm.runInContext([
  stagesSource,
  retiredSource,
  functionSource('blankStageProgress'),
  functionSource('progressFromCount'),
  functionSource('normalizeStageProgress'),
  functionSource('migrateV3StageProgress'),
  functionSource('migrateV4StageProgress'),
  'this.stageIds=MATH_STAGES.map(stage=>stage.id);this.migrateProgress=migrateV3StageProgress;',
  'this.migrateV4=migrateV4StageProgress;this.retired=RETIRED_STAGE_IDS;'
].join('\n'), migrationContext);
assert.deepEqual([...migrationContext.stageIds].slice(0, 5), [
  'add_1digit', 'add_2column', 'add_2mental', 'add_3column', 'add_4column'
]);
assert.equal(migrationContext.stageIds.length, 15);
assert.deepEqual([...migrationContext.stageIds].slice(5, 10), [
  'sub_1digit', 'sub_2column', 'sub_2mental', 'sub_3column', 'sub_4column'
], 'subtraction mirrors addition: columns first, then the same size in the head');
assert.deepEqual([...migrationContext.stageIds].slice(0, 5), [
  'add_1digit', 'add_2column', 'add_2mental', 'add_3column', 'add_4column'
], 'and addition is the shape subtraction mirrors');
const migrated = migrationContext.migrateProgress({completed:{
  add_1digit:true, add_2digit:true, add_3column:true
}});
assert.equal(migrated.completed.add_2column, true);
assert.equal(migrated.completed.add_2mental, true);
assert.equal(migrated.completed.add_3column, true);
assert.equal(migrated.completed.add_4column, false);

// a v3 save that had finished the old mental two-digit subtraction is credited with both
// lessons that now stand in its place, the same way the addition insertion was handled
const v3Subtraction = migrationContext.migrateProgress({completed:{
  add_1digit:true, add_2digit:true, add_3column:true, add_4column:true,
  sub_1digit:true, sub_2digit:true
}});
assert.equal(v3Subtraction.completed.sub_2column, true);
assert.equal(v3Subtraction.completed.sub_2mental, true);
assert.equal(v3Subtraction.completed.sub_3column, false, 'and no further');
assert.equal(v3Subtraction.available.sub_3column, true, 'which is what comes next');

// every v3 position still lands on the right lesson after two insertions
[
  ['add_1digit', 'add_1digit'],
  ['add_2digit', 'add_2mental'],
  ['add_4column', 'add_4column'],
  ['sub_1digit', 'sub_1digit'],
  ['sub_4column', 'sub_4column'],
  ['div_long', 'div_long']
].forEach(([oldFurthest, newFurthest]) => {
  const result = migrationContext.migrateProgress({completed:{[oldFurthest]:true}});
  const completedIds = migrationContext.stageIds.filter(id => result.completed[id]);
  assert.equal(completedIds.at(-1), newFurthest,
    `a v3 save stopped at ${oldFurthest} now stands at ${newFurthest}`);
});
const finishedV3 = migrationContext.migrateProgress({completed:{div_long:true}});
assert.equal(migrationContext.stageIds.every(id => finishedV3.completed[id]), true,
  'a v3 save that finished everything is still finished');

// a saved game that stopped on the renamed lesson keeps it, and does not sit through it again
const stoppedThere = migrationContext.migrateV4({completed:{
  add_1digit:true, add_2column:true, add_2mental:true, add_3column:true, add_4column:true,
  sub_1digit:true, sub_2digit:true
}, available:{sub_3column:true}});
assert.equal(stoppedThere.completed.sub_2column, true, 'the old save key still counts as completed');
assert.equal(stoppedThere.completed.sub_2mental, false);
assert.equal(stoppedThere.available.sub_2mental, true,
  'the newly inserted mental lesson is what comes next, not a locked gap');
assert.equal(stoppedThere.available.sub_3column, false, 'and the lesson after it stays shut');
assert.equal(Object.keys(stoppedThere.completed).filter(id => stoppedThere.completed[id]).length, 7,
  'no lesson is lost and none is handed out for free');
assert.equal(stoppedThere.completed.sub_2digit, undefined, 'the retired key is gone from the save');

// a save that never reached it is untouched
const earlier = migrationContext.migrateV4({completed:{add_1digit:true, add_2column:true}});
assert.equal(earlier.completed.sub_2column, false);
assert.equal(earlier.completed.add_2column, true);
assert.equal(earlier.available.add_2mental, true);

// a finished game stays finished
const everything = {completed:{}, available:{}};
migrationContext.stageIds.forEach(id => { everything.completed[id === 'sub_2column' ? 'sub_2digit' : id] = true; });
const finished = migrationContext.migrateV4(everything);
migrationContext.stageIds.forEach(id => {
  assert.equal(finished.completed[id], true, `${id} survives the rename`);
});
assert.deepEqual(plain(migrationContext.retired), {sub_2digit:'sub_2column'});

// XP is gone from the save, and nothing else goes with it
vm.runInContext([
  source.match(/const RETIRED_PLAYER_FIELDS=\[[^\]]*\];/)[0],
  functionSource('dropRetiredPlayerFields'),
  'this.dropRetired=dropRetiredPlayerFields;this.retiredFields=RETIRED_PLAYER_FIELDS;'
].join('\n'), migrationContext);
assert.deepEqual(plain(migrationContext.retiredFields), ['xp', 'level']);
const saved = {
  id:'p1', name:'Ada', age:9, xp:340, level:12, total:88, right:70, best:9,
  ease:{add_1digit:0.4}, momoName:'Sparkle', monsterStage:9,
  collectibles:{stars:3}, accessories:['scarf'], storySeen:true,
  stageProgress:{completed:{add_1digit:true}, available:{add_2column:true}}
};
const cleaned = migrationContext.dropRetired(saved);
assert.equal('xp' in cleaned, false, 'xp is gone from the save');
assert.equal('level' in cleaned, false, 'the level it fed is gone too');
assert.deepEqual(Object.keys(cleaned).sort(), [
  'accessories', 'age', 'best', 'collectibles', 'ease', 'id', 'momoName',
  'monsterStage', 'name', 'right', 'stageProgress', 'storySeen', 'total'
], 'nothing else is dropped');
assert.equal(cleaned.momoName, 'Sparkle');
assert.equal(cleaned.best, 9);
assert.deepEqual(plain(cleaned.stageProgress.completed), {add_1digit:true},
  'progress is untouched by the field drop');
assert.equal(migrationContext.dropRetired({name:'no xp here'}).name, 'no xp here',
  'a save that never had xp is unharmed');

// migrate() reads a legacy save's level before dropping it, so progress is not lost
const legacyReader = source.slice(source.indexOf('function migrate(p){'));
assert.ok(legacyReader.indexOf('Number(p.level)') < legacyReader.indexOf('dropRetiredPlayerFields'),
  'the legacy level is consumed before the field is deleted');

// XP must not come back: no field, no property read, no award call anywhere in the app.
// A comment about its removal, and the 'xp' string in RETIRED_PLAYER_FIELDS, are not uses.
const xpUse = /\.xp\b|\bxp\s*[:=]|\bxp\+\+|\bsoftXP\b|\baddXP\b/i;
source.split('\n').forEach((line, i) => {
  assert.equal(xpUse.test(line), false, `line ${i + 1} reintroduces xp: ${line.trim()}`);
});
assert.equal(/\bGROUPS\b/.test(source.replace(/STAGE_GROUPS/g, '')), false,
  'the xp-only GROUPS table is gone');

// what the lesson list promises has to come from sessionPlan, or it drifts from the pass mark
const menuSource = functionSource('renderMenu');
assert.match(menuSource, /sessionPlan\(stage\)\.pass/,
  'the lesson list reads the pass mark rather than naming a number');
assert.equal(/\d+ correct answers/.test(source), false,
  'no screen hard-codes how many correct answers a lesson needs');

// migrate() end to end on the whole model section: saved games must survive the cleanup
const modelStart = source.indexOf('/* ---------------- model ---------------- */');
const modelEnd = source.indexOf('/* ---------------- pet ---------------- */');
assert.ok(modelStart > 0 && modelEnd > modelStart, 'the model section is where the code map says');
const saveContext = {};
vm.createContext(saveContext);
vm.runInContext(source.slice(modelStart, modelEnd) + '\nthis.migrate=migrate;this.newPlayer=newPlayer;', saveContext);

const currentSave = saveContext.migrate({
  id:'p1', name:'Ada', age:9, xp:340, level:12, total:88, right:70, best:9,
  momoName:'Sparkle', collectibles:{stars:3}, accessories:['scarf'], storySeen:true,
  migrationVersion:5,
  stageProgress:{
    completed:{add_1digit:true, add_2column:true, add_2mental:true, sub_1digit:true},
    available:{add_3column:true}
  }
});
assert.equal('xp' in currentSave, false, 'xp is dropped from a current save');
assert.equal('level' in currentSave, false);
assert.equal(currentSave.migrationVersion, 6);
assert.equal(currentSave.momoName, 'Sparkle', 'the chosen name survives');
assert.equal(currentSave.best, 9, 'play stats survive');
assert.deepEqual(plain(currentSave.collectibles).stars, 3, 'collectibles survive');
assert.ok(currentSave.accessories.includes('scarf'), 'cosmetics survive');
['add_1digit', 'add_2column', 'add_2mental', 'sub_1digit'].forEach(id => {
  assert.equal(currentSave.stageProgress.completed[id], true, `${id} stays completed`);
});
assert.equal(currentSave.stageProgress.completed.sub_2column, false, 'no lesson is handed out free');
assert.equal(currentSave.stageProgress.available.sub_2column, true, 'the next lesson is still open');

// the last evolution waits for the last lesson, however many lessons there are
vm.runInContext('this.stages=MATH_STAGES;this.evolutions=EVOLUTIONS;this.artFor=artForCount;this.evolutionFor=evolutionForCount;', saveContext);
const lessonTotal = saveContext.stages.length;
const finalEvolution = plain(saveContext.evolutions).at(-1);
assert.equal(finalEvolution.completed, lessonTotal,
  'becoming a Guardian of Maths needs every lesson, not all but one');
assert.equal(saveContext.evolutionFor(lessonTotal).title, 'Guardian of Maths');
assert.notEqual(saveContext.evolutionFor(lessonTotal - 1).title, 'Guardian of Maths',
  'one lesson short is not a Guardian');
plain(saveContext.evolutions).forEach(step => {
  assert.ok(step.completed <= lessonTotal, `the ${step.title} milestone is reachable`);
});
assert.deepEqual(plain(saveContext.evolutions).map(step => step.completed),
  [...plain(saveContext.evolutions).map(step => step.completed)].sort((a, b) => a - b),
  'the milestones climb');

// a pre-v3 save still gets its progress out of level before level is deleted
const legacySave = saveContext.migrate({id:'p2', name:'Bo', age:8, level:12, xp:900, unlocked:{add:true}});
assert.equal('level' in legacySave, false, 'the legacy level is dropped once it has been read');
assert.equal('xp' in legacySave, false);
assert.ok(legacySave.stageProgress.completed.add_1digit, 'legacy level still became real progress');
assert.equal(legacySave.migrationVersion, 6);

// a save already on the new version is left alone
const fresh = saveContext.newPlayer('Cy', 7);
assert.equal('xp' in fresh, false, 'a new player never has xp');
assert.equal('level' in fresh, false);
assert.equal(fresh.migrationVersion, 6);
const rerun = saveContext.migrate(saveContext.migrate(fresh));
assert.equal(rerun.migrationVersion, 6, 'migrating twice changes nothing');
assert.equal('xp' in rerun, false);

console.log('Arithmetic model tests passed.');

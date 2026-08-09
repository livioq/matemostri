const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));

assert.match(source,
  /function shouldShowCrackPause\(\)\{[\s\S]*S\.i===5&&S\.mastered>=4;/,
  'the opening lesson pauses after five questions when at least four were mastered');
assert.match(source,
  /<section id="s-crack" class="screen">/,
  'the first crack gets its own midpoint celebration screen');
assert.match(source,
  /\$\('crackContinue'\)\.onclick=\(\)=>\{ sTap\(\); show\('s-play'\); nextQuestion\(\); \};/,
  'continuing from the crack screen resumes the same ten-question lesson');
assert.match(source,
  /storyProgressOf\(P\)\.firstCrackSeen=true/,
  'the opening crack is persisted on the player story progress');

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

const crackContext = { S:null };
vm.createContext(crackContext);
vm.runInContext(functionSource('shouldShowCrackPause'), crackContext);
crackContext.S = {stageId:'add_1digit', wasCompleted:false, crackSeen:false, i:5, mastered:4};
assert.equal(crackContext.shouldShowCrackPause(), true,
  'four mastered answers in the first five is enough to pause for the crack');
crackContext.S.mastered = 3;
assert.equal(crackContext.shouldShowCrackPause(), false,
  'three mastered answers in the first five keeps the lesson moving');
crackContext.S.mastered = 4;
crackContext.S.wasCompleted = true;
assert.equal(crackContext.shouldShowCrackPause(), false,
  'replaying the opening lesson does not split it into a midpoint lesson');

const context = { Math };
vm.createContext(context);
vm.runInContext([
  'const rnd=(a,b)=>a+Math.floor(Math.random()*(b-a+1));',
  "const columnPlace=(wid,col)=>['ones','tens','hundreds','thousands','ten-thousands'][wid-1-col]||'next';",
  'const colValid=M=>M.steps.every(s=>/^\\d+$/.test(s.want));',
  source.match(/const dotWord=.*;\n/)[0],
  functionSource('easyNumber'),
  functionSource('pickPair'),
  functionSource('buildColumn'),
  functionSource('buildLongMultiplication'),
  functionSource('twoDigitColumnAddition'),
  functionSource('twoDigitColumnSubtraction'),
  functionSource('nextOpenColumnStep'),
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
  functionSource('sessionPlan'),
  source.match(/const MATH_STAGES=\[[\s\S]*?\n\];/)[0],
  'this.MATH_STAGES=MATH_STAGES;'
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
  constructor() {
    this.children = []; this.style = {}; this.className = ''; this.textContent = ''; this.attrs = {};
    this.classes = new Set();
    this.classList = {toggle: (name, on) => { if (on) this.classes.add(name); else this.classes.delete(name); }};
  }
  appendChild(child) { this.children.push(child); return child; }
  setAttribute(name, value) { this.attrs[name] = value; }
  set innerHTML(value) { this.children = []; this._innerHTML = value; }
  get innerHTML() { return this._innerHTML || ''; }
}
const uiElements = {};
const resetUi = () => {
  ['colGrid', 'colPrompt', 'colDots', 'colHint', 'hintBtn', 'progress'].forEach(id => { uiElements[id] = new FakeElement(); });
};
resetUi();
const uiContext = {
  document:{createElement:() => new FakeElement()},
  $:id => uiElements[id],
  S:null
};
vm.createContext(uiContext);
vm.runInContext([
  'const setGridCell=()=>{};const selectColumnStep=()=>{};const selectLongMulStep=()=>{};',
  'let dotSizeCap=0,settlingDots=false;const settleDots=()=>{};',
  'const dotBudget=()=>200;const DOT_TALL_ALONE=190;',
  source.match(/const DOT_SIZES=\[[^\]]*\];/)[0],
  source.match(/const DOT_SEPARATOR=\d+;/)[0],
  functionSource('dotLayouts'),
  functionSource('dotLayoutFits'),
  functionSource('fitDot'),
  'const DOT_LIMIT=45;',
  functionSource('dotRows'),
  source.match(/const dotSplits=.*;\n/)[0],
  functionSource('dotShareGroups'),
  source.match(/const dotTotal=[\s\S]*?;\n/)[0],
  source.match(/const dotTallest=[\s\S]*?;\n/)[0],
  source.match(/const DOT_ROWS_IN_WORKING=\d+;/)[0],
  source.match(/const dotsWorthDrawing=.*;\n/)[0],
  source.match(/const dotWord=.*;\n/)[0],
  source.match(/const dotsAreTappable=.*;\n/)[0],
  functionSource('advanceDots'),
  functionSource('toggleStruck'),
  functionSource('easyDotsMarkup'),
  functionSource('paintDots'),
  functionSource('stepDots'),
  functionSource('longMulStepDots'),
  functionSource('divStepDots'),
  functionSource('colPrompt'),
  functionSource('renderCol'),
  functionSource('longMulPrompt'),
  functionSource('renderLongMul'),
  functionSource('renderStars'),
  functionSource('markQuestion'),
  'this.dotsWorthDrawing=dotsWorthDrawing;this.dotTotal=dotTotal;this.dotTallest=dotTallest;this.ROWS=DOT_ROWS_IN_WORKING;this.stepDots=stepDots;this.dotsAreTappable=dotsAreTappable;' +
  'this.easyDotsMarkup=easyDotsMarkup;this.advanceDots=advanceDots;this.toggleStruck=toggleStruck;this.shareGroups=dotShareGroups;' + +
  'this.longMulStepDots=longMulStepDots;this.divStepDots=divStepDots;this.paintDots=paintDots;'
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

// A column with no digits of its own gets no carry mark above it: the carried digit is
// simply written there as the answer on the next turn. Long multiplication's final addition
// did not follow the rule, so 49 x 23 asked for the last 1 as a carry and then again as the
// answer — the same 1 entered twice.
const spill = context.buildLongMultiplication(49, 23);
assert.deepEqual(
  plain(spill.steps.filter(st => st.t === 'sum' || st.t === 'sumCarry').map(st => st.t + ':' + st.col + '=' + st.want)),
  ['sum:3=7', 'sum:2=2', 'sumCarry:1=1', 'sum:1=1', 'sum:0=1'],
  'the leading 1 is written once, as the answer, not as a carry and then again');
for (let a = 12; a <= 99; a += 1) {
  for (let b = 12; b <= 99; b += 1) {
    const model = context.buildLongMultiplication(a, b);
    model.steps.filter(st => st.t === 'sumCarry').forEach(st => {
      assert.ok(model.partials.some(part => String(part).length >= model.width - st.col),
        `${a} x ${b} marks a carry above a column neither partial row reaches`);
    });
    let total = '';
    for (let col = 0; col < model.width; col += 1) {
      total += model.steps.find(st => st.t === 'sum' && st.col === col).want;
    }
    assert.equal(Number(total), a * b, `${a} x ${b} still adds up`);
  }
}

// a carry note is cleared once the multiplication that uses it is done. Left on screen it
// reads as still owing something, and when the next carry is the same digit — 22 x 5 carries
// 1, then makes 11 and carries 1 again — the child looks like they are writing 1 twice.
const spentUi = context.buildColumn('mul', 22, 5);
while (spentUi.steps[spentUi.si] && spentUi.steps[spentUi.si].t !== 'mulCarry') context.commitColumnStep(spentUi);
context.commitColumnStep(spentUi);
resetUi(); uiContext.S = {col:spentUi, colB:5}; uiContext.renderCol();
assert.ok(uiElements.colGrid.children.some(c => c.className.includes('mul-carry-note')),
  'the carry note is on screen while it is still owed');
context.commitColumnStep(spentUi);
resetUi(); uiContext.S = {col:spentUi, colB:5}; uiContext.renderCol();
assert.equal(uiElements.colGrid.children.some(c => c.className.includes('mul-carry-note')), false,
  'and gone once the multiplication that uses it has been done');

const longUi = context.buildLongMultiplication(99, 99);
while (!(longUi.steps[longUi.si].row === 1)) context.commitLongMultiplicationStep(longUi);
resetUi(); uiContext.S = {longMul:longUi}; uiContext.renderLongMul();
let carryNotes = uiElements.colGrid.children.filter(child => child.className.includes('mul-carry-note'));
assert.equal(carryNotes.length, 0, 'the first row leaves no spent carry behind when the second begins');
while (!(longUi.steps[longUi.si].t === 'partialCarry' && longUi.steps[longUi.si].row === 1)) context.commitLongMultiplicationStep(longUi);
context.commitLongMultiplicationStep(longUi);
resetUi(); uiContext.S = {longMul:longUi}; uiContext.renderLongMul();
carryNotes = uiElements.colGrid.children.filter(child => child.className.includes('mul-carry-note'));
assert.equal(carryNotes.length, 1, 'only the carry still owed is shown');
assert.equal(carryNotes[0].style.gridRow, 6, 'and it belongs to the row being worked');
assert.equal(carryNotes[0].className.includes('retired'), false,
  'a carry that is still owed is never dimmed: it is either wanted or it is gone');
assert.equal(source.includes("' retired'"), false, 'so nothing retires a carry note any more');

const migrationContext = {};
vm.createContext(migrationContext);
const stagesSource = source.match(/const MATH_STAGES=\[[\s\S]*?\n\];/)[0];
const retiredSource = source.match(/const RETIRED_STAGE_IDS=\{[^}]*\};/)[0];
vm.runInContext([
  stagesSource,
  source.match(/const DIFFICULTIES=\[[\s\S]*?\n\];/)[0],
  'const DIFFICULTY_IDS=DIFFICULTIES.map(d=>d.id);',
  functionSource('blankBadges'),
  functionSource('cascadeBadges'),
  retiredSource,
  functionSource('blankStageProgress'),
  functionSource('progressFromCount'),
  functionSource('normalizeStageProgress'),
  functionSource('migrateV3StageProgress'),
  functionSource('migrateV4StageProgress'),
  'this.stageIds=MATH_STAGES.map(stage=>stage.id);this.migrateProgress=migrateV3StageProgress;',
  'this.migrateV4=migrateV4StageProgress;this.retired=RETIRED_STAGE_IDS;',
  'this.normalize=normalizeStageProgress;'
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
assert.deepEqual(plain(migrationContext.retiredFields), ['xp', 'level', 'ease', 'age']);
const saved = {
  id:'p1', name:'Ada', age:9, xp:340, level:12, total:88, right:70, best:9, look:'girl',
  momoName:'Sparkle', monsterStage:9,
  collectibles:{stars:3}, accessories:['scarf'], storySeen:true,
  stageProgress:{completed:{add_1digit:true}, available:{add_2column:true}}
};
const cleaned = migrationContext.dropRetired(saved);
assert.equal('xp' in cleaned, false, 'xp is gone from the save');
assert.equal('level' in cleaned, false, 'the level it fed is gone too');
assert.deepEqual(Object.keys(cleaned).sort(), [
  'accessories', 'best', 'collectibles', 'id', 'look', 'momoName',
  'monsterStage', 'name', 'right', 'stageProgress', 'storySeen', 'total'
], 'nothing else is dropped');
assert.equal('age' in cleaned, false, 'age is gone: it never changed anything');
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

// the old lesson tabs have been replaced by the adventure map
const menuSource = functionSource('renderMenu');
assert.match(menuSource, /mapSceneLayout\(L\.clientWidth\)/,
  'the journey menu is driven by scene layouts measured from the width of the map, so the\n   painted panels and the path scale together');
assert.match(menuSource, /map-location/,
  'the journey menu renders adventure map locations rather than tab-like lesson rows');
assert.match(menuSource, /scene-art-slot/,
  'the map reserves configurable artwork slots for future illustrated scenery');
assert.match(menuSource, /map-momo/,
  'the current Momo sprite is placed on the map layer near the current scene');
assert.match(source,
  /\$\('againBtn'\)\.onclick=\(\)=>\{ show\('s-menu'\); renderMenu\(\); \};/,
  'Continue Adventure returns to the map after the result screen');
// the map has to be on screen before it is laid out, or clientWidth is 0 and every scene
// falls back to full-width heights while the art scales down
[/\$\('playBtn'\)\.onclick/, /\$\('nodeBack'\)\.onclick/, /\$\('againBtn'\)\.onclick/].forEach(re => {
  const line = source.split('\n').find(l => re.test(l));
  assert.ok(line.indexOf("show('s-menu')") < line.indexOf('renderMenu()'),
    `the map is shown before it is measured: ${line.trim()}`);
});
assert.doesNotMatch(source,
  /\$\('unlockOk'\)\.onclick=[\s\S]*startSession\(next\.id\)/,
  'the evolution overlay no longer auto-starts the next lesson');
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
assert.equal(currentSave.migrationVersion, 9);
assert.equal(currentSave.momoName, 'Sparkle', 'the chosen name survives');
assert.equal(currentSave.best, 9, 'play stats survive');
assert.deepEqual(plain(currentSave.collectibles).stars, 3, 'collectibles survive');
assert.ok(currentSave.accessories.includes('scarf'), 'cosmetics survive');
assert.deepEqual(plain(currentSave.storyProgress), {firstCrackSeen:false,mapSeen:{}},
  'map/story migration adds safe defaults without resetting progress');
['add_1digit', 'add_2column', 'add_2mental', 'sub_1digit'].forEach(id => {
  assert.equal(currentSave.stageProgress.completed[id], true, `${id} stays completed`);
});
assert.equal(currentSave.stageProgress.completed.sub_2column, false, 'no lesson is handed out free');
assert.equal(currentSave.stageProgress.available.sub_2column, true, 'the next lesson is still open');

// the last evolution waits for the last lesson, however many lessons there are
vm.runInContext('this.stages=MATH_STAGES;this.nodes=PROGRESSION_NODES;this.evolutions=EVOLUTIONS;this.stageData=MONSTER_STAGE_DATA;this.artFor=artForCount;this.artForPlayer=artForPlayer;this.evolutionFor=evolutionForCount;', saveContext);
const lessonTotal = saveContext.stages.length;
assert.equal(saveContext.nodes.length, lessonTotal,
  'every maths lesson has one adventure map node');
assert.deepEqual(plain(saveContext.nodes.map(node => node.lessonId)), plain(saveContext.stages.map(stage => stage.id)),
  'map nodes preserve the exact maths lesson order');
saveContext.nodes.forEach(node => {
  assert.ok(node.mapPosition.sceneHeight >= 500, `${node.title} has its own large vertical scene`);
  assert.ok(['left', 'center', 'right'].includes(node.mapPosition.side), `${node.title} has a configured path side`);
  assert.ok(node.mapPosition.artwork && node.mapPosition.artwork.src === null, `${node.title} reserves a future art slot`);
});
saveContext.nodes.filter(node => node.majorEvolution).forEach(node => {
  assert.ok(node.mapPosition.sceneHeight >= 720, `${node.title} has extra space as a major landmark`);
});
assert.ok(saveContext.nodes.reduce((sum, node) => sum + node.mapPosition.sceneHeight, 0) > 9000,
  'the adventure map is intentionally tall enough to explore by scrolling');
const finalEvolution = plain(saveContext.evolutions).at(-1);
assert.equal(finalEvolution.completed, lessonTotal,
  'becoming a Guardian of Maths needs every lesson, not all but one');
assert.equal(saveContext.evolutionFor(lessonTotal).title, 'Guardian of Maths');
assert.notEqual(saveContext.evolutionFor(lessonTotal - 1).title, 'Guardian of Maths',
  'one lesson short is not a Guardian');
assert.equal(saveContext.evolutionFor(0.5).title, 'First Crack',
  'the cracked egg is now the opening midpoint milestone');
assert.equal(saveContext.evolutionFor(1).title, 'Hatched Friend',
  'finishing the first lesson now hatches the friend');
assert.equal(saveContext.artFor(1), 3,
  'one completed lesson uses the hatched artwork, not the cracked egg');
assert.deepEqual(plain(saveContext.evolutions).map(step => [step.completed, step.art, step.title]), [
  [0, 1, 'Magical Egg'],
  [0.5, 2, 'First Crack'],
  [1, 3, 'Hatched Friend'],
  [2, 4, 'Fluffy Ears'],
  [3, 5, 'Bright Tail'],
  [4, 6, 'Wide Wings'],
  [5, 7, 'Addition Flight'],
  [6, 8, 'Backpack Explorer'],
  [7, 9, 'Explorer Goggles'],
  [8, 10, 'Magic Marks'],
  [9, 11, 'Flower Crown'],
  [10, 12, 'Subtraction Guardian Light'],
  [11, 13, 'Star Cape'],
  [12, 14, 'Celestial Wings'],
  [13, 15, 'Multiplication Mage'],
  [14, 16, 'Arcane Master'],
  [15, 17, 'Guardian of Maths']
], 'the visible evolution path matches the lesson milestones');
assert.deepEqual(plain(saveContext.evolutions.filter(step => step.majorEvolution).map(step => [step.art, step.title])), [
  [7, 'Addition Flight'],
  [12, 'Subtraction Guardian Light'],
  [15, 'Multiplication Mage'],
  [17, 'Guardian of Maths']
], 'the four major story evolutions are marked in data');
// every stage's art must exist, whatever the file format is, and the names come from the
// data rather than a second hand-kept list that can drift out of step with it
const stageImages = plain(saveContext.stageData.map(stage => stage.image));
assert.equal(stageImages.length, 17, 'seventeen monster stages carry art');
stageImages.forEach(file => {
  assert.equal(fs.existsSync(path.join(__dirname, '..', 'assets', 'monsters', file)), true,
    `${file} exists for the ready monster art path`);
});
stageImages.forEach((file, i) => {
  assert.match(file, new RegExp(`^stage-${String(i + 1).padStart(2, '0')}-[a-z-]+\\.webp$`),
    `${file} is numbered in order and shipped as webp`);
});

// three difficulties per lesson, and three badge slots so a lesson reads as unfinished
// until every one of them has been sat
const diffCtx = {Math};
vm.createContext(diffCtx);
vm.runInContext([
  source.match(/const DIFFICULTIES=\[[\s\S]*?\n\];/)[0],
  'const DIFFICULTY_IDS=DIFFICULTIES.map(d=>d.id);',
  source.match(/const difficultyOf=[^\n]*/)[0],
  source.match(/const nextDifficulty=[^\n]*/)[0],
  functionSource('blankBadges'),
  functionSource('cascadeBadges'),
  functionSource('badgesFor'),
  functionSource('awardBadges'),
  functionSource('dotRows'),
  source.match(/const SESSION=\d+;/)[0],
  functionSource('sessionPlan'),
  'const rnd=(a,b)=>a+Math.floor(Math.random()*(b-a+1));',
  'this.D=DIFFICULTIES;this.ids=DIFFICULTY_IDS;this.next=nextDifficulty;this.blank=blankBadges;this.rows=dotRows;this.badges=badgesFor;this.award=awardBadges;this.plan=sessionPlan;'
].join('\n'), diffCtx);
assert.deepEqual(plain(diffCtx.ids), ['easy', 'medium', 'hard'], 'easy, medium, hard, in that order');
assert.deepEqual(plain(diffCtx.blank()), {easy:false, medium:false, hard:false});
assert.equal(diffCtx.next('easy'), 'medium', 'finishing easy points at medium');
assert.equal(diffCtx.next('medium'), 'hard');
assert.equal(diffCtx.next('hard'), null, 'hard is the end of the ladder');

// a harder sit proves the easier ones, so passing hard wins all three badges
const hardSitter = {stageProgress:{badges:{}}};
assert.equal(diffCtx.award(hardSitter, 'add_1digit', 'hard'), true, 'a first pass wins something');
assert.deepEqual(plain(diffCtx.badges(hardSitter, 'add_1digit')), {easy:true, medium:true, hard:true},
  'passing hard wins easy and medium with it');
assert.equal(diffCtx.award(hardSitter, 'add_1digit', 'easy'), false,
  'and sitting easy afterwards has nothing left to win');
const mediumSitter = {stageProgress:{badges:{}}};
assert.equal(diffCtx.award(mediumSitter, 'add_2column', 'medium'), true);
assert.deepEqual(plain(diffCtx.badges(mediumSitter, 'add_2column')), {easy:true, medium:true, hard:false},
  'medium wins easy too, but hard is still to be earned');
const easySitter = {stageProgress:{badges:{}}};
diffCtx.award(easySitter, 'add_2column', 'easy');
assert.deepEqual(plain(diffCtx.badges(easySitter, 'add_2column')), {easy:true, medium:false, hard:false},
  'easy proves only itself');

// a badge won before the cascade rule existed lights the ones below it on load
const onlyHard = migrationContext.normalize({
  available:{add_1digit:true, add_2column:true},
  completed:{add_1digit:true},
  badges:{add_1digit:{easy:false, medium:false, hard:true}}
});
assert.deepEqual(plain(onlyHard.badges.add_1digit), {easy:true, medium:true, hard:true},
  'a saved game holding only the hard badge comes back holding all three');
const beforeDifficulties = migrationContext.normalize({
  available:{add_1digit:true, add_2column:true},
  completed:{add_1digit:true}
});
assert.deepEqual(plain(beforeDifficulties.badges.add_1digit), {easy:true, medium:true, hard:false},
  'and a lesson finished before difficulties existed counts as medium, which now wins easy too');
assert.deepEqual(plain(beforeDifficulties.badges.add_2column), {easy:false, medium:false, hard:false},
  'a lesson never finished wins nothing');

// easy is the same lesson with smaller numbers, never a different lesson
const stageById = id => context.MATH_STAGES.find(s => s.id === id);
context.MATH_STAGES.forEach(stage => {
  for (let i = 1; i <= 10; i += 1) {
    const easy = context.generateLessonQuestion(stage, i, 'easy');
    const medium = context.generateLessonQuestion(stage, i, 'medium');
    assert.equal(easy.kind, medium.kind, `${stage.id} sits the same kind of question on easy`);
    if (easy.a !== undefined) assert.equal(String(easy.a).length, String(medium.a).length,
      `${stage.id} keeps its number of digits on easy`);
    if (easy.M) assert.equal(easy.M.steps.length > 0, true, `${stage.id} still has a working on easy`);
  }
});
// two-digit column addition on easy is still two-digit column addition, carries and all
const easyCarries = Array.from({length: 60}, (_, i) =>
  context.generateLessonQuestion(stageById('add_2column'), (i % 10) + 1, 'easy'));
assert.ok(easyCarries.every(q => q.kind === 'col' && String(q.a).length === 2 && String(q.b).length === 2),
  'easy two-digit column addition is still two two-digit numbers in columns');
assert.ok(easyCarries.some(q => q.M.steps.some(s => s.t === 'carry')),
  'and it still carries, which is the skill the lesson teaches');
const easyBorrows = Array.from({length: 60}, (_, i) =>
  context.generateLessonQuestion(stageById('sub_2column'), (i % 10) + 1, 'easy'));
assert.ok(easyBorrows.some(q => q.M.steps.some(s => s.t === 'ann')),
  'easy two-digit column subtraction still crosses out and regroups');

// what easy does change: every times-table fact inside the lesson stops at four
for (let i = 0; i < 200; i += 1) {
  const single = context.generateLessonQuestion(stageById('mul_1x1'), 1, 'easy');
  assert.ok(Number(single.txt.split(' \u00D7 ')[0]) <= 4, `easy ${single.txt} stays inside the four times table`);
  assert.ok(Number(single.txt.split(' \u00D7 ')[1]) <= 9, 'and the other factor is a single digit');
  const byOne = context.generateLessonQuestion(stageById('mul_1x2'), 1, 'easy');
  assert.ok(byOne.b >= 2 && byOne.b <= 4, `easy ${byOne.a} x ${byOne.b} multiplies by 2 to 4`);
  assert.equal(String(byOne.a).length, 2, 'but still by a two-digit number');
  const long = context.generateLessonQuestion(stageById('mul_2x2'), 1, 'easy');
  String(long.b).split('').forEach(d => assert.ok(Number(d) <= 4,
    `easy long multiplication multiplies only by digits up to four (got ${long.b})`));
  assert.equal(String(long.a).length, 2, 'and the working stays a full long multiplication');
  const shared = context.generateLessonQuestion(stageById('div_simple'), 1, 'easy');
  assert.ok(Number(shared.txt.split(' \u00F7 ')[1]) <= 4, `easy ${shared.txt} shares into 2 to 4`);
}
for (let i = 1; i <= 10; i += 1) {
  for (let n = 0; n < 20; n += 1) {
    const q = context.generateLessonQuestion(stageById('div_long'), i, 'easy');
    assert.ok(q.made.d >= 2 && q.made.d <= 4, `easy long division divides by 2 to 4 (got ${q.made.d})`);
    assert.equal(q.made.N.length, context.longDivisionPhase(i).digits,
      'and the dividend still grows across the lesson exactly as it does on medium');
  }
}

// every digit on easy is 1 to 9, never 0: a step reading "0 + 5" has nothing to draw, and
// a child on easy would be left without help exactly where they need it
for (let i = 0; i < 200; i += 1) {
  const n = context.easyNumber(4, 4);
  assert.equal(String(n).length, 4, 'easyNumber keeps the length it was asked for');
  assert.equal(String(n).includes('0'), false, 'and never puts a 0 in it');
  assert.ok(Number(String(n)[0]) <= 4, 'the leading digit is capped');
}
context.MATH_STAGES.forEach(stage => {
  for (let i = 1; i <= 10; i += 1) {
    const q = context.generateLessonQuestion(stage, i, 'easy');
    [q.a, q.b].filter(v => v !== undefined).forEach(v =>
      assert.equal(String(v).includes('0'), false, `${stage.id} on easy avoids 0 digits (got ${v})`));
  }
});

// the two-digit lessons done in the head carry nothing and borrow nothing on easy
for (let i = 0; i < 200; i += 1) {
  const add = context.generateLessonQuestion(stageById('add_2mental'), 1, 'easy');
  const [aa, ab] = add.txt.split(' + ').map(Number);
  assert.ok(aa % 10 + ab % 10 < 10, `easy ${add.txt} needs no carrying`);
  assert.ok(aa >= 11 && ab >= 11, 'but both are still two-digit numbers');
  const sub = context.generateLessonQuestion(stageById('sub_2mental'), 1, 'easy');
  const [sa, sb] = sub.txt.split(' \u2212 ').map(Number);
  assert.ok(sa % 10 >= sb % 10, `easy ${sub.txt} needs no borrowing`);
  assert.ok(sa - sb >= 10 && sb >= 11, 'and stays a two-digit take-away with a two-digit answer');
}

// simple division arrives as one pile to share, not as the groups already shared out
for (let i = 0; i < 100; i += 1) {
  const shared = context.generateLessonQuestion(stageById('div_simple'), 1, 'easy');
  const [total, by] = shared.txt.split(' \u00F7 ').map(Number);
  assert.deepEqual(plain(shared.dots), {share:total, by:by, words:total + ' shared into ' + by + '. Tap to share them out.'});
  assert.ok(total / by >= 3, 'and it is worth sharing: never 4 into 2');
}
// one-digit take-aways are worth doing, and never leave nothing
for (let i = 0; i < 200; i += 1) {
  const q = context.generateLessonQuestion(stageById('sub_1digit'), 1, 'easy');
  const [a, b] = q.txt.split(' \u2212 ').map(Number);
  assert.ok(a >= 4 && b >= 1 && b < a, `easy ${q.txt} takes something away and leaves something`);
}

// a lesson done in the head has no working, so hard cannot take the talking out of it.
// It takes bigger numbers instead, and ones that carry or borrow.
const split = (txt, sign) => txt.split(' ' + sign + ' ').map(Number);
for (let i = 0; i < 400; i += 1) {
  const add1 = split(context.generateLessonQuestion(stageById('add_1digit'), 1, 'hard').txt, '+');
  assert.ok(add1[0] >= 4 && add1[1] >= 4 && add1[0] <= 9 && add1[1] <= 9,
    `hard one-digit addition keeps both digits big (got ${add1.join(' + ')})`);
  assert.ok(add1[0] + add1[1] >= 10, `and carries into the tens (got ${add1.join(' + ')})`);

  const sub1 = split(context.generateLessonQuestion(stageById('sub_1digit'), 1, 'hard').txt, '\u2212');
  assert.ok(sub1[0] >= 11 && sub1[0] <= 18 && sub1[1] >= 4 && sub1[1] <= 9,
    `hard one-digit subtraction takes a digit off a teen (got ${sub1.join(' \u2212 ')})`);
  assert.ok(sub1[0] % 10 < sub1[1], `and has to borrow to do it (got ${sub1.join(' \u2212 ')})`);
  assert.ok(sub1[0] - sub1[1] > 0, 'and never lands on or below zero');

  const add2 = split(context.generateLessonQuestion(stageById('add_2mental'), 1, 'hard').txt, '+');
  assert.ok(add2[0] >= 26 && add2[1] >= 26, `hard two-digit mental addition is bigger than medium (got ${add2.join(' + ')})`);
  assert.ok(add2[0] % 10 + add2[1] % 10 >= 10, `and always carries (got ${add2.join(' + ')})`);

  const sub2 = split(context.generateLessonQuestion(stageById('sub_2mental'), 1, 'hard').txt, '\u2212');
  assert.ok(sub2[0] % 10 < sub2[1] % 10, `hard two-digit mental subtraction always borrows (got ${sub2.join(' \u2212 ')})`);
  assert.ok(sub2[0] - sub2[1] >= 10, 'and still leaves a two-digit answer');
  assert.ok(sub2[1] >= 15, 'and takes away more than medium does');

  const times = split(context.generateLessonQuestion(stageById('mul_1x1'), 1, 'hard').txt, '\u00D7');
  assert.ok(times[0] >= 6 && times[1] >= 6, `hard tables are the far end of them (got ${times.join(' x ')})`);
  const shared = split(context.generateLessonQuestion(stageById('div_simple'), 1, 'hard').txt, '\u00F7');
  assert.ok(shared[1] >= 6 && shared[0] / shared[1] >= 6, `hard sharing is the far end too (got ${shared.join(' / ')})`);

  // easy still keeps the same lessons small
  const e = split(context.generateLessonQuestion(stageById('add_1digit'), 1, 'easy').txt, '+');
  assert.ok(e[0] >= 1 && e[0] <= 5 && e[1] >= 1 && e[1] <= 5, `easy keeps both small (got ${e.join(' + ')})`);
}
// medium is untouched by any of it: one-digit subtraction still never goes below zero
for (let i = 0; i < 300; i += 1) {
  const m = split(context.generateLessonQuestion(stageById('sub_1digit'), 1, 'medium').txt, '\u2212');
  assert.ok(m[0] >= 2 && m[0] <= 9 && m[1] >= 0 && m[1] <= m[0], `medium is as it was (got ${m.join(' \u2212 ')})`);
}
// and every mental lesson genuinely asks for bigger numbers on hard than on medium. The
// answer is the wrong thing to measure for a take-away — 99 - 89 is not an easy question —
// so this weighs the number the child starts from.
['add_1digit', 'sub_1digit', 'add_2mental', 'sub_2mental', 'mul_1x1', 'div_simple'].forEach(id => {
  const meanStart = level => {
    let total = 0;
    for (let i = 0; i < 800; i += 1) {
      total += Number(context.generateLessonQuestion(stageById(id), 1, level).txt.split(' ')[0]);
    }
    return total / 800;
  };
  const hard = meanStart('hard'), medium = meanStart('medium');
  assert.ok(hard > medium * 1.15,
    `${id} on hard starts from bigger numbers than medium (${hard.toFixed(1)} vs ${medium.toFixed(1)})`);
});

// the picture is drawn only while it can be taken in at a glance
assert.equal(uiContext.dotsWorthDrawing({parts:[4, 5]}), true);
assert.equal(uiContext.dotsWorthDrawing({parts:[29, 19]}), false, 'forty-eight dots teach nothing');
assert.equal(uiContext.dotsWorthDrawing({groups:4, per:9}), true, 'the biggest fact on easy still gets one');
assert.equal(uiContext.dotsWorthDrawing({groups:9, per:4, plus:3}), true,
  'and so does that fact with what it carries into it');
assert.equal(uiContext.dotsWorthDrawing({groups:6, per:9}), false);
assert.equal(uiContext.dotsWorthDrawing(null), false, 'and a step that is not a sum gets none');

// height, not count, is what makes a picture too big to stand above a working: nine fours
// wrap sideways, thirty-six in one pile is eight rows deep
assert.equal(uiContext.dotTallest({groups:9, per:4}), 1, 'a group of four is one row');
assert.equal(uiContext.dotTallest({per:36, chunk:4}), 8, 'a pile of thirty-six is eight');
assert.equal(uiContext.dotTallest({per:23, chunk:4}), 5, 'and a pile of twenty-three is five');
assert.equal(uiContext.dotTallest({parts:[9, 9, 1]}), 2);
assert.equal(uiContext.dotsWorthDrawing({per:36, chunk:4}), true, 'thirty-six is inside the count limit');
assert.equal(uiContext.dotsWorthDrawing({per:44, chunk:4}, uiContext.ROWS), false,
  'but nine rows of five will not stand above a working');
assert.equal(uiContext.dotsWorthDrawing({per:23, chunk:4}, uiContext.ROWS), true,
  'how many times 4 goes into 23 still gets its picture');
assert.equal(uiContext.dotsWorthDrawing({groups:9, per:4}, uiContext.ROWS), true,
  'while the same thirty-six as nine little groups will');
assert.equal(uiContext.dotsWorthDrawing({per:20, chunk:4}, uiContext.ROWS), true);
assert.equal(uiContext.dotsWorthDrawing({share:24, by:4}), true,
  'and a question with no working underneath it can stand taller');
assert.equal((source.match(/DOT_ROWS_IN_WORKING,/g) || []).length, 3,
  'all three workings cap the height of the picture above them');
// and each tells it how many grid rows it has to leave room for, so the picture never
// squeezes the working past the smallest cell the grid will take
assert.match(functionSource('dotBudget'), /gridRows\*MIN_CELL/,
  'the picture may only have the room the grid does not need');
assert.match(functionSource('renderLongMul'), /DOT_ROWS_IN_WORKING,9\)/, 'long multiplication has nine rows');
assert.match(functionSource('renderCol'), /DOT_ROWS_IN_WORKING,4\)/, 'a column has four');
assert.match(functionSource('renderDiv'), /DOT_ROWS_IN_WORKING,1\+2\*g\.steps\.length\)/,
  'and a division grows two rows a round');

// easy rings the pair being multiplied
assert.match(functionSource('renderCol'), /ringMul&&st\.col===i\?' ringed'/,
  'the digit being multiplied is ringed');
assert.match(functionSource('renderCol'), /M\.bd\[i\],ringMul\?'ringed'/, 'and so is what it is multiplied by');
assert.match(functionSource('renderLongMul'), /c===ringUp\?'ringed'/);
assert.match(functionSource('renderLongMul'), /c===ringLow\?'ringed'/);
assert.match(source, /\.dc\.ringed\{outline:/, 'ringed is an outline, so it does not move the grid');

// choosing a difficulty is the same act as starting the lesson
assert.equal(source.includes('id="nodeStart"'), false, 'there is no second button asking again');
assert.match(functionSource('renderDifficultyChoice'), /startSession\(stage\.id,d\.id\)/,
  'tapping a difficulty starts the lesson on it');

// it is the individual sum inside the working that gets the dots, not the whole question
assert.deepEqual(plain(uiContext.stepDots('add', {t:'res', x:4, y:7, carry:0})),
  {parts:[4, 7], words:'4 and 7 altogether.'});
assert.deepEqual(plain(uiContext.stepDots('add', {t:'res', x:6, y:3, carry:1})),
  {parts:[6, 3, 1], words:'6 and 3 and 1 altogether.'}, 'the carry is counted in too');
assert.deepEqual(plain(uiContext.stepDots('sub', {t:'res', x:14, y:6})),
  {per:14, take:6, words:'Tap 6 dots to cross out.'});
assert.deepEqual(plain(uiContext.stepDots('mul', {t:'res', x:7, m:3, carry:0})),
  {groups:7, per:3, plus:0, words:'7 groups of 3.'});
// the carry is part of the sum, so it is part of the picture
assert.deepEqual(plain(uiContext.stepDots('mul', {t:'res', x:9, m:4, carry:3})),
  {groups:9, per:4, plus:3, words:'9 groups of 4 and 3 carried.'});
assert.equal(uiContext.stepDots('add', {t:'res', x:0, y:5, carry:0}), null,
  'nothing plus five is not a sum worth drawing');
assert.deepEqual(plain(uiContext.stepDots('add', {t:'res', x:null, y:4, carry:1})),
  {parts:[4, 1], words:'4 and 1 altogether.'}, 'but four plus a carried one still is one');
assert.equal(uiContext.stepDots('add', {t:'res', x:null, y:4, carry:0}), null,
  'while a column with nothing left to add to is not');
assert.equal(uiContext.stepDots('mul', {t:'res', x:0, m:6, carry:0}), null, 'nor nought groups of six');
assert.equal(uiContext.stepDots('add', {t:'carry', col:1, want:'1'}), null,
  'a carry to copy down is not a sum to count');
assert.equal(uiContext.stepDots('sub', {t:'ann', col:1, want:'7'}), null,
  'nor is a crossing-out');
assert.deepEqual(plain(uiContext.longMulStepDots({t:'partial', digit:3, multiplier:4})),
  {groups:3, per:4, plus:0, words:'3 groups of 4.'});
assert.deepEqual(plain(uiContext.longMulStepDots({t:'partial', digit:9, multiplier:4, carry:3})),
  {groups:9, per:4, plus:3, words:'9 groups of 4 and 3 carried.'});
assert.equal(uiContext.dotTotal({groups:9, per:4, plus:3}), 39, 'and it is counted in');
assert.equal(uiContext.longMulStepDots({t:'placeholder'}), null, 'the placeholder 0 is not a sum');
assert.deepEqual(plain(uiContext.divStepDots({t:'prod', q:3}, 4)),
  {groups:3, per:4, words:'3 groups of 4.'});
assert.deepEqual(plain(uiContext.divStepDots({t:'fit', into:9}, 4)),
  {per:9, chunk:4, words:'Tap to take away 4 at a time.'},
  'how many times 4 goes into 9 is answered by taking 4 away as often as it will go');
assert.deepEqual(plain(uiContext.divStepDots({t:'skip', into:3}, 4)), {per:3, chunk:4, words:'Tap to take away 4 at a time.'});
assert.equal(uiContext.divStepDots({t:'rem', into:9, prod:8}, 4), null, 'what is left is not a picture');

// a picture must not answer the question for the child
assert.equal(uiContext.dotsAreTappable({per:6, take:4}), true, 'the crossing-out is the child to do');
assert.equal(uiContext.dotsAreTappable({share:24, by:4}), true, 'and so is the sharing');
assert.equal(uiContext.dotsAreTappable({per:9, chunk:4}), true);
assert.equal(uiContext.dotsAreTappable({parts:[4, 5]}), false, 'but two piles to add are just two piles');
assert.equal(uiContext.dotsAreTappable({groups:3, per:4}), false);
assert.deepEqual(plain(uiContext.stepDots('sub', {t:'res', x:9, y:1})),
  {per:9, take:1, words:'Tap 1 dot to cross out.'}, 'one dot, not one dots');

// six take away four arrives as six dots, not as two
const takeAway = uiContext.easyDotsMarkup({per:6, take:4}, {struck:[], splits:0, rings:0});
assert.equal((takeAway.match(/<i /g) || []).length, 6, 'all six dots are there to start with');
assert.equal(takeAway.includes('class="gone"'), false, 'and none of them is crossed out yet');
let struck = {struck:[], splits:0, rings:0};
[5, 4, 3, 2].forEach(i => { struck = uiContext.toggleStruck(struck, i); });
assert.deepEqual(plain(struck.struck), [5, 4, 3, 2], 'four taps cross four dots out');
assert.equal((uiContext.easyDotsMarkup({per:6, take:4}, struck).match(/class="gone"/g) || []).length, 4);
struck = uiContext.toggleStruck(struck, 5);
assert.deepEqual(plain(struck.struck), [4, 3, 2], 'and tapping one again brings it back');

// 24 shared into 4 is halve, then halve again
assert.deepEqual(plain(uiContext.shareGroups({share:24, by:4}, 0)), [24], 'it starts as one pile');
assert.deepEqual(plain(uiContext.shareGroups({share:24, by:4}, 1)), [12, 12], 'one tap halves it');
assert.deepEqual(plain(uiContext.shareGroups({share:24, by:4}, 2)), [6, 6, 6, 6], 'and the second halves it again');
assert.deepEqual(plain(uiContext.shareGroups({share:12, by:3}, 1)), [4, 4, 4], 'sharing into three is one tap');
assert.deepEqual(plain(uiContext.shareGroups({share:10, by:2}, 1)), [5, 5]);
let share = {struck:[], splits:0, rings:0};
share = uiContext.advanceDots({share:24, by:4}, share);
assert.equal(share.splits, 1);
share = uiContext.advanceDots({share:24, by:4}, share);
assert.equal(share.splits, 2, 'two taps reach four groups');
share = uiContext.advanceDots({share:24, by:4}, share);
assert.equal(share.splits, 0, 'and a third puts the pile back together rather than getting stuck');

// taking 4 away from 9 goes twice
let rings = {struck:[], splits:0, rings:0};
rings = uiContext.advanceDots({per:9, chunk:4}, rings);
assert.equal((uiContext.easyDotsMarkup({per:9, chunk:4}, rings).match(/class="gone"/g) || []).length, 4);
rings = uiContext.advanceDots({per:9, chunk:4}, rings);
assert.equal((uiContext.easyDotsMarkup({per:9, chunk:4}, rings).match(/class="gone"/g) || []).length, 8);
rings = uiContext.advanceDots({per:9, chunk:4}, rings);
assert.equal(rings.rings, 0, 'a third tap starts over, because a third four does not fit');

assert.deepEqual(plain(diffCtx.rows(12)), [5, 5, 2], 'dots are laid out in rows of five');
assert.deepEqual(plain(diffCtx.rows(5)), [5]);
assert.deepEqual(plain(diffCtx.rows(3)), [3]);

// easy is a shorter sit; medium and hard are the lesson as it was
assert.equal(diffCtx.plan({digits:2}, 'easy').total, 8);
assert.equal(diffCtx.plan({digits:2}, 'medium').total, 10);
assert.equal(diffCtx.plan({digits:2}, 'hard').total, 10);
assert.equal(diffCtx.plan({digits:4}, 'easy').total, 5, 'easy never makes a lesson longer');
['easy', 'medium', 'hard'].forEach(d => {
  const plan = diffCtx.plan({digits:3}, d);
  assert.ok(plan.pass <= plan.total && plan.pass >= 1, `${d} stays possible to pass`);
});

// hard takes the talking out and lets the child choose the box
assert.match(functionSource('colPrompt'), /if\(M\.free\)/,
  'hard says nothing about which step comes next');
// all three workings turn free order on, and only hard does it
assert.match(source, /S\.col\.free=true/, 'columns let the child choose the box on hard');
assert.match(source, /S\.longMul\.free=true/, 'so does long multiplication');
assert.match(source, /const free=S\.difficulty==='hard'/, 'and long division');
assert.equal((source.match(/S\.difficulty==='hard'/g) || []).length, 3,
  'hard is the only difficulty that turns free order on, once per working');
assert.match(functionSource('selectColumnStep'), /M\.doneSteps\[index\]/,
  'a box already filled cannot be chosen again');
assert.match(functionSource('commitColumnStep'), /M\.doneSteps\[M\.si\]=true/,
  'each box is marked done in its own right, so order does not matter');

// on hard nothing is chosen for the child: every box is theirs to pick, first one included
['commitColumnStep', 'commitLongMultiplicationStep'].forEach(name => {
  assert.match(functionSource(name), /\.si=[A-Z]\.free\?-1:/,
    `${name} leaves nothing selected on hard`);
});
assert.match(functionSource('pressDiv'), /D\.pi=D\.free\?-1:/,
  'long division leaves nothing selected on hard either');
assert.match(source, /S\.col\.si=-1/, 'a hard column starts with no box chosen');
assert.match(source, /S\.longMul\.si=-1/, 'so does a hard long multiplication');
assert.match(source, /pi:free\?-1:0/, 'and a hard long division');

// the steps that are only talk have no box to tap, so hard drops them rather than
// leaving the child stuck in front of a working they cannot finish
assert.match(source, /S\.col\.steps\.filter\(s=>s\.t!=='seek'\)/,
  "hard drops the 'this column has a 0, follow the borrow left' step");
assert.match(source, /divPlan\(made\.made\)\.filter\(s=>!free\|\|s\.t!=='skip'\)/,
  "hard drops the 'not even once, take one more digit' step");
// every other step type must have somewhere to tap, or a hard question can never be finished
const renderSources = functionSource('renderCol') + functionSource('renderLongMul') + functionSource('renderDiv');
['res', 'carry', 'mulCarry', 'ann', 'partial', 'partialCarry', 'sum', 'sumCarry', 'fit', 'prod', 'rem']
  .forEach(kind => assert.ok(renderSources.includes(kind), `${kind} steps are drawn a box`));

// the hard prompts have to read before a box is tapped, and fall silent once the last is filled
assert.equal(context.colPrompt({free:true, doneSteps:[false], steps:[], si:-1}),
  'Tap a box, then write what belongs in it.');
assert.equal(context.colPrompt({free:true, doneSteps:[true], steps:[], si:-1}), '');
assert.equal(context.longMulPrompt({free:true, doneSteps:[false], steps:[], si:-1}),
  'Tap a box, then write what belongs in it.');
assert.equal(context.longMulPrompt({free:true, doneSteps:[true], steps:[], si:-1}), '');
assert.equal(context.divPromptText({free:true, doneSteps:[false], plan:[], pi:-1, g:{d:3}}),
  'Tap a box, then write what belongs in it.');
assert.equal(context.divPromptText({free:true, doneSteps:[true], plan:[], pi:-1, g:{d:3}}), '');

// and a working filled backwards has to end up the same as one filled forwards
function fillEveryBox(model, commit, order) {
  model.free = true;
  order.forEach(i => { model.si = i; commit(model); });
  assert.ok(model.doneSteps.every(Boolean), 'every box was filled');
  return plain(model.ent);
}
const indices = n => [...Array(n).keys()];
[[23, 58], [45, 40], [99, 99]].forEach(([a, b]) => {
  const forwards = fillEveryBox(context.buildLongMultiplication(a, b),
    context.commitLongMultiplicationStep, indices(context.buildLongMultiplication(a, b).steps.length));
  const backwards = fillEveryBox(context.buildLongMultiplication(a, b),
    context.commitLongMultiplicationStep, indices(context.buildLongMultiplication(a, b).steps.length).reverse());
  assert.deepEqual(backwards, forwards, `${a} × ${b} works out the same filled backwards`);
});
// a column can be crossed out twice — it receives a ten, then lends one on — and hard offers
// only the next one waiting, because you cannot cross out what is not yet written. So the
// order hard allows reverses everything except the crossings-out, which stay in sequence.
function reverseAsHardAllows(steps) {
  const backwards = indices(steps.length).reverse();
  const crossings = backwards.filter(i => steps[i].t === 'ann').sort((x, y) => x - y);
  let next = 0;
  return backwards.map(i => steps[i].t === 'ann' ? crossings[next++] : i);
}
[['add', 63, 71], ['sub', 84, 16], ['sub', 5002, 1834], ['mul', 47, 6]].forEach(([op, a, b]) => {
  const steps = context.buildColumn(op, a, b).steps;
  const forwards = fillEveryBox(context.buildColumn(op, a, b), context.commitColumnStep, indices(steps.length));
  const backwards = fillEveryBox(context.buildColumn(op, a, b), context.commitColumnStep, reverseAsHardAllows(steps));
  assert.deepEqual(backwards, forwards, `${a} ${op} ${b} works out the same filled backwards`);
});
assert.match(functionSource('renderCol'), /s\.t==='ann'&&s\.col===i&&!M\.doneSteps\[k\]/,
  'and only that next crossing-out is offered, which is what makes the order above the only one');

// every zone on the journey board is named the same size, and reads over the painting
assert.equal(/\.map-scene\.major \.scene-title/.test(source), false,
  'a landmark zone is not named in a bigger size than the rest');
assert.equal((source.match(/\.scene-title span\{/g) || []).length, 2,
  'the zone name has one size, and one smaller one for a narrow phone — nothing else');
assert.match(source, /\.scene-title span\{[^}]*background:rgba\(255,255,255/,
  'the name sits on a plate, so it does not have to compete with whatever is painted under it');
assert.match(source, /\.scene-title span\{[^}]*color:var\(--ink\)/,
  'and is full-strength ink rather than a wash');
assert.match(source, /<div class="scene-title"><span>/, 'the name is wrapped so the plate hugs it');

// the trail: it wanders between stops, and what has been walked looks different from
// what is still ahead
const pathCtx = {Math};
vm.createContext(pathCtx);
vm.runInContext([
  source.match(/const MAP_TRAIL_SWING=\d+;/)[0],
  functionSource('mapTrailPoints'),
  functionSource('mapPathD'),
  'this.mapPathD=mapPathD;this.mapTrailPoints=mapTrailPoints;'
].join('\n'), pathCtx);
assert.equal(pathCtx.mapPathD([]), '', 'no stops, no path');
assert.equal(pathCtx.mapPathD([{x:50, y:100}]), 'M 50 100',
  'a single stop draws nothing, which is what the ends of the journey need');

const stops = [{x:50, y:0}, {x:29, y:520}, {x:71, y:1060}, {x:50, y:1620}];
const waypoints = plain(pathCtx.mapTrailPoints(stops, 0));
assert.ok(waypoints.length > stops.length * 2,
  'the trail swings several times between one stop and the next');
stops.forEach(stop => {
  assert.ok(waypoints.some(w => w.x === stop.x && w.y === stop.y),
    `the stop at ${stop.x},${stop.y} is a waypoint on the trail, not merely near it`);
});
const wanderXs = waypoints.map(w => w.x);
assert.ok(Math.max(...wanderXs) > 71 && Math.min(...wanderXs) < 29,
  'the trail reaches outside the columns the stops sit in, on both sides');
assert.ok(Math.min(...wanderXs) >= 8 && Math.max(...wanderXs) <= 92, 'but stays on the map');

const wander = pathCtx.mapPathD(stops, 0);
assert.ok(wander.startsWith('M 50.0 0.0'), 'the trail starts on the first stop');
assert.ok(wander.trimEnd().endsWith('50.0 1620.0'), 'and ends on the last');
stops.forEach(stop => {
  assert.ok(wander.includes(`${stop.x.toFixed(1)} ${stop.y.toFixed(1)}`),
    `the curve passes through ${stop.x},${stop.y} rather than being pulled towards it`);
});
// split anywhere and the two halves must meet on the stop they were split at. A spline's
// tangent depends on the point after it, so the halves are not byte-identical to the whole
// trail there; what matters is that neither leaves a gap.
[1, 2].forEach(cut => {
  const walked = pathCtx.mapPathD(stops.slice(0, cut + 1), 0);
  const ahead = pathCtx.mapPathD(stops.slice(cut), cut);
  const joint = `${stops[cut].x.toFixed(1)} ${stops[cut].y.toFixed(1)}`;
  assert.ok(walked.trimEnd().endsWith(joint), `the walked half ends on stop ${cut}`);
  assert.ok(ahead.startsWith('M ' + joint), `and the half ahead starts on stop ${cut}`);
});

const menuPathSrc = functionSource('renderMenu');
assert.match(menuPathSrc, /path-ahead[^]*mapPathD\(layouts\.slice\(currentIndex\),currentIndex\)/,
  'the road ahead runs from the current stop onward, with its swings kept in step');
assert.match(menuPathSrc, /walkedD=mapPathD\(layouts\.slice\(0,currentIndex\+1\),0\)/,
  'the walked trail runs from the start up to the current stop');
assert.equal((menuPathSrc.match(/walkedD/g) || []).length, 3,
  'the outline and the dashes share one d, so their dashes line up exactly');
assert.ok(menuPathSrc.indexOf('const currentIndex') < menuPathSrc.indexOf('path-ahead'),
  'currentIndex is worked out before the paths that need it');
assert.match(source, /\.path-walked\{[^}]*stroke-dasharray/, 'the walked trail is dashed');
assert.match(source, /\.path-walked-edge\{[^}]*stroke-dasharray/, 'and its dark outline is dashed to match');
const dashOf = cls => (source.match(new RegExp('\\.' + cls + '\\{[^}]*stroke-dasharray:([^;}]*)')) || [])[1];
assert.equal(dashOf('path-walked'), dashOf('path-walked-edge'),
  'both walked strokes use one dash pattern, or the outline would slide off the dashes');
// the svg must be told its size. It has an intrinsic aspect ratio from the viewBox, so
// inset:0 alone leaves the height to resolve from that and the trail is drawn at 3x,
// stretched away from the stops it is meant to join
assert.match(source, /\.adventure-path\{[^}]*width:100%[^}]*height:100%/,
  'the path layer is given an explicit width and height');
assert.equal(/\.path-ahead\{[^}]*stroke-dasharray/.test(source), false, 'the road ahead is not');
assert.match(source, /\.path-ahead\{[^}]*drop-shadow/, 'the road ahead glows');
assert.match(source, /vector-effect="non-scaling-stroke"/,
  'strokes and dashes stay even, since the svg is scaled unevenly by preserveAspectRatio=none');

// the adaptive-difficulty subsystem is gone: ease wrote P.ease on every single answer,
// its only reader was tierFor, and nothing ever called tierFor
['tierFor', 'bandOf', 'HARD_P', 'genEasy', 'genHard'].forEach(name => {
  assert.equal(new RegExp('\\b' + name + '\\b').test(source), false,
    `${name} is gone, not merely unused`);
});
assert.equal(/\bease\s*\(/.test(source.replace(/animation:[^;}]*/g, '')), false,
  'nothing calls ease() any more (the css easing keywords are not it)');
assert.equal(/\bP\.ease\b|\bp\.ease\b/.test(source), false, 'no player carries an ease map');
assert.equal(/vid:S\.stage\.id/.test(source), false,
  'S.q.vid went with it, since ease was all that read it');

// opening the map lands on the stop you are actually at, not the top of a 9000px scroll
const menuSrc = functionSource('renderMenu');
assert.match(menuSrc, /scrollMapToCurrent\(L,\s*current\)/,
  'renderMenu scrolls the map to the current stop');
const scrollSrc = functionSource('scrollMapToCurrent');
assert.match(scrollSrc, /window\.scrollTo/);
assert.match(scrollSrc, /Math\.max\(0,/, 'never scrolls to a negative offset for the first stop');
const scrollCtx = {window:{innerHeight:740, scrollTo:(x, y) => { scrollCtx.landed = y; }}, Math};
vm.createContext(scrollCtx);
vm.runInContext(scrollSrc, scrollCtx);
scrollCtx.scrollMapToCurrent({offsetTop:120}, {y:40});
assert.equal(scrollCtx.landed, 0, 'the first stop does not scroll off the top of the page');
scrollCtx.scrollMapToCurrent({offsetTop:120}, {y:5000});
assert.equal(scrollCtx.landed, 120 + 5000 - Math.round(740 * 0.42),
  'a later stop lands a little above the middle of the screen');
scrollCtx.scrollMapToCurrent({offsetTop:120}, null);
assert.equal(scrollCtx.landed, 120 + 5000 - Math.round(740 * 0.42), 'no current stop, no scroll');

// the home-screen icon: without a manifest and a maskable icon, adding the game to an
// Android home screen gives a grey square
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'manifest.webmanifest'), 'utf8'));
assert.match(source, /<link rel="manifest" href="manifest\.webmanifest">/,
  'index.html links the manifest');
assert.equal(manifest.name, 'Matemostri');
assert.ok(manifest.icons.length >= 2, 'more than one icon size is offered');
manifest.icons.forEach(icon => {
  assert.equal(fs.existsSync(path.join(__dirname, '..', icon.src)), true,
    `${icon.src} exists for the home-screen icon`);
  assert.equal(icon.type, 'image/webp');
  assert.match(icon.sizes, /^\d+x\d+$/);
});
assert.ok(manifest.icons.some(icon => icon.purpose === 'maskable'),
  'one icon is maskable, so Android can crop it to the launcher shape without clipping the title');
assert.ok(manifest.icons.some(icon => icon.purpose === 'any' && icon.sizes === '512x512'),
  'a full-size unmasked icon is offered too');
[/rel="icon"/, /rel="apple-touch-icon"/].forEach(re => assert.match(source, re,
  'icon link tags cover the case where the manifest is not read'));

// nothing anywhere still points at a png
assert.equal(/\.png\b/.test(source), false, 'index.html references no png files');
const strayPngs = fs.readdirSync(path.join(__dirname, '..', 'assets'), {recursive: true})
  .filter(f => String(f).endsWith('.png'));
assert.deepEqual(strayPngs, [], 'no png files are left in assets');
assert.deepEqual(stageImages.slice(0, 3),
  ['stage-01-magical-egg.webp', 'stage-02-first-crack.webp', 'stage-03-hatched-friend.webp'],
  'canonical stage data points at the renamed production artwork');
assert.equal(stageImages.at(-1), 'stage-17-guardian-of-maths.webp');
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
assert.equal(legacySave.migrationVersion, 9);

// a save already on the new version is left alone
const fresh = saveContext.newPlayer('Cy', 7);
assert.equal('xp' in fresh, false, 'a new player never has xp');
assert.equal('level' in fresh, false);
assert.equal(fresh.migrationVersion, 9);
assert.equal(saveContext.artForPlayer(fresh), 1, 'new players begin with the magical egg');
fresh.storyProgress.firstCrackSeen = true;
assert.equal(saveContext.artForPlayer(fresh), 2, 'the saved crack milestone shows the cracked egg before hatching');
const rerun = saveContext.migrate(saveContext.migrate(fresh));
assert.equal(rerun.migrationVersion, 9, 'migrating twice changes nothing');
assert.equal('xp' in rerun, false);

console.log('Arithmetic model tests passed.');
